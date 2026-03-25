import { api } from "@/services/api";
import type { EventListItem, EventType } from "@/types/api";
import {
    Calendar,
    CalendarCheck,
    CalendarX,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Filter,
    List,
    MapPin,
    Users,
    Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ── Constants ── */

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-gray-100 text-gray-600",
  draft: "bg-yellow-100 text-yellow-700",
};

const STATUS_LABELS: Record<string, string> = {
  published: "Publicado",
  cancelled: "Cancelado",
  completed: "Finalizado",
  draft: "Borrador",
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  competition: "Competición",
  workshop: "Taller",
  exhibition: "Exhibición",
  social: "Social",
  open_day: "Puertas Abiertas",
  seminar: "Seminario",
  other: "Otro",
};

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  competition: "bg-red-500",
  workshop: "bg-blue-500",
  exhibition: "bg-purple-500",
  social: "bg-yellow-500",
  open_day: "bg-green-500",
  seminar: "bg-indigo-500",
  other: "bg-gray-400",
};

const EVENT_TYPE_BADGE: Record<EventType, string> = {
  competition: "bg-red-100 text-red-700",
  workshop: "bg-blue-100 text-blue-700",
  exhibition: "bg-purple-100 text-purple-700",
  social: "bg-yellow-100 text-yellow-700",
  open_day: "bg-green-100 text-green-700",
  seminar: "bg-indigo-100 text-indigo-700",
  other: "bg-gray-100 text-gray-600",
};

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type View = "calendar" | "list";

/* ── Helpers ── */

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/* ── Component ── */

export default function EventsPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("calendar");
  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(new Set());
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<EventListItem[]>("/api/events?limit=200");
      setEvents(data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const register = async (id: number) => {
    try { await api.post(`/api/events/${id}/register`); fetchEvents(); } catch { /* empty */ }
  };
  const unregister = async (id: number) => {
    try { await api.delete(`/api/events/${id}/register`); fetchEvents(); } catch { /* empty */ }
  };

  const toggleType = (t: EventType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (activeTypes.size === 0) return events;
    return events.filter((ev) => activeTypes.has(ev.event_type));
  }, [events, activeTypes]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const gridStart = startOfWeek(firstDay);
    const days: Date[] = [];
    const d = new Date(gridStart);
    while (d <= lastDay || days.length % 7 !== 0) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
      if (days.length > 42) break;
    }
    return days;
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventListItem[]>();
    for (const ev of filtered) {
      const key = new Date(ev.event_date).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [filtered]);

  const selectedEvents = useMemo(() => {
    if (selectedDay) return eventsByDate.get(selectedDay.toDateString()) || [];
    return [];
  }, [selectedDay, eventsByDate]);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const today = new Date();

  const presentTypes = useMemo(() => {
    const types = new Set<EventType>();
    events.forEach((ev) => types.add(ev.event_type));
    return Array.from(types);
  }, [events]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Eventos</h1>
          <p className="text-sm text-muted-foreground">Descubre y gestiona eventos de centros y empresas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("calendar")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${view === "calendar" ? "bg-primary text-white" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
          >
            <Calendar className="h-4 w-4" /> Calendario
          </button>
          <button
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${view === "list" ? "bg-primary text-white" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
          >
            <List className="h-4 w-4" /> Lista
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">Tipo:</span>
        {presentTypes.map((t) => (
          <button
            key={t}
            onClick={() => toggleType(t)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${activeTypes.size === 0 || activeTypes.has(t) ? EVENT_TYPE_BADGE[t] : "bg-gray-50 text-gray-400"}`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${EVENT_TYPE_COLORS[t]}`} />
            {EVENT_TYPE_LABELS[t]}
          </button>
        ))}
        {activeTypes.size > 0 && (
          <button onClick={() => setActiveTypes(new Set())} className="text-xs text-muted-foreground underline ml-1">Limpiar</button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-12">Cargando...</p>
      ) : view === "calendar" ? (
        /* ── Calendar View ── */
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-2xl bg-card shadow-sm p-4 sm:p-6">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="rounded-full p-2 hover:bg-secondary transition-colors"><ChevronLeft className="h-4 w-4" /></button>
              <h2 className="text-base font-semibold tracking-tight">{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h2>
              <button onClick={nextMonth} className="rounded-full p-2 hover:bg-secondary transition-colors"><ChevronRight className="h-4 w-4" /></button>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{d}</div>
              ))}
            </div>
            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(day, today);
                const isPast = !isToday && day < today;
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const dayEvents = eventsByDate.get(day.toDateString()) || [];
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(day)}
                    className={`group relative flex flex-col items-center rounded-xl p-1 pt-2 min-h-[72px] transition-all ${
                      isSelected
                        ? "bg-primary/10 ring-1 ring-primary/40"
                        : isToday
                          ? "bg-primary/5"
                          : "hover:bg-secondary/60"
                    } ${!isCurrentMonth ? "opacity-20" : isPast ? "opacity-40" : ""}`}
                  >
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                      isToday
                        ? "bg-primary text-white shadow-sm"
                        : isSelected
                          ? "font-semibold text-primary"
                          : isPast
                            ? "text-muted-foreground"
                            : "text-foreground group-hover:font-semibold"
                    }`}>
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="mt-auto flex items-center justify-center gap-[3px] pb-1">
                        {dayEvents.slice(0, 4).map((ev) => (
                          <span key={ev.id} className={`h-[5px] w-[5px] rounded-full ${EVENT_TYPE_COLORS[ev.event_type]}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side panel */}
          <div className="rounded-2xl bg-card shadow-sm">
            <div className="p-4">
              <h3 className="text-sm font-semibold">
                {selectedDay ? selectedDay.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }) : "Selecciona un día"}
              </h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {selectedEvents.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {selectedDay ? "No hay eventos este día." : "Haz clic en un día del calendario."}
                </p>
              ) : (
                <div className="space-y-2 px-3 pb-3">
                  {selectedEvents.map((ev) => (
                    <EventCard key={ev.id} ev={ev} onRegister={register} onUnregister={unregister} compact />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── List View ── */
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-xl bg-card shadow-sm p-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">No hay eventos.</p>
            </div>
          ) : filtered.map((ev) => (
            <EventCard key={ev.id} ev={ev} onRegister={register} onUnregister={unregister} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Event Card ── */

function EventCard({ ev, onRegister, onUnregister, compact = false }: { ev: EventListItem; onRegister: (id: number) => void; onUnregister: (id: number) => void; compact?: boolean }) {
  const isPast = new Date(ev.event_date) < new Date();

  if (compact) {
    return (
      <div className="rounded-xl border bg-secondary/30 p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${EVENT_TYPE_COLORS[ev.event_type]}`} />
          <h4 className="text-sm font-medium flex-1 truncate">{ev.name}</h4>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground pl-4">
          <span>{fmtShort(ev.event_date)}{ev.end_date ? ` – ${fmtShort(ev.end_date)}` : ""}</span>
          {ev.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{ev.location}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs pl-4">
          <span className={`rounded-full px-2 py-0.5 font-medium ${EVENT_TYPE_BADGE[ev.event_type]}`}>{EVENT_TYPE_LABELS[ev.event_type]}</span>
          <span className="flex items-center gap-0.5 text-muted-foreground"><Users className="h-3 w-3" />{ev.registered_count}{ev.capacity ? `/${ev.capacity}` : ""}</span>
          {ev.xp_cost != null && ev.xp_cost > 0 && (
            <span className="flex items-center gap-0.5 text-yellow-600 font-medium"><Zap className="h-3 w-3" />{ev.xp_cost} XP</span>
          )}
          <span className="ml-auto">
            {ev.is_registered ? (
              <button onClick={() => onUnregister(ev.id)} className="text-xs text-red-600 hover:underline">Cancelar</button>
            ) : ev.status === "published" && !isPast ? (
              <button onClick={() => onRegister(ev.id)} className="text-xs text-primary hover:underline font-medium">
                {ev.xp_cost != null && ev.xp_cost > 0 ? `Inscribirme (${ev.xp_cost} XP)` : "Inscribirme"}
              </button>
            ) : null}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-card p-5 shadow-sm transition ${isPast ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block h-3 w-3 rounded-full ${EVENT_TYPE_COLORS[ev.event_type]}`} />
            <h3 className="font-semibold text-lg">{ev.name}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${EVENT_TYPE_BADGE[ev.event_type]}`}>{EVENT_TYPE_LABELS[ev.event_type]}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[ev.status] ?? ""}`}>{STATUS_LABELS[ev.status] ?? ev.status}</span>
          </div>
          {ev.description && <p className="text-sm text-muted-foreground line-clamp-2">{ev.description}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(ev.event_date)}{ev.end_date && ` – ${fmtDate(ev.end_date)}`}</span>
            {ev.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ev.location}</span>}
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{ev.registered_count}{ev.capacity ? `/${ev.capacity}` : ""} inscritos</span>
            {ev.xp_cost != null && ev.xp_cost > 0 && (
              <span className="flex items-center gap-1 text-yellow-600 font-medium"><Zap className="h-3.5 w-3.5" />{ev.xp_cost.toLocaleString()} XP para inscribirse</span>
            )}
          </div>
          {(ev.center_name || ev.company_name) && (
            <p className="text-xs text-muted-foreground">Organiza: <span className="font-medium text-foreground">{ev.center_name ?? ev.company_name}</span></p>
          )}
        </div>
        <div className="shrink-0">
          {ev.is_registered ? (
            <button onClick={() => onUnregister(ev.id)} className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
              <CalendarX className="h-4 w-4" /> Cancelar inscripción
            </button>
          ) : ev.status === "published" && !isPast ? (
            <button onClick={() => onRegister(ev.id)} disabled={ev.capacity != null && ev.registered_count >= ev.capacity} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
              <CalendarCheck className="h-4 w-4" />
              {ev.xp_cost != null && ev.xp_cost > 0 ? `Inscribirme · ${ev.xp_cost} XP` : "Inscribirme"}
            </button>
          ) : isPast ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> Finalizado</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
