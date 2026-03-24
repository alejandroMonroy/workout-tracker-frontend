import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatDuration } from "@/lib/utils";
import { api } from "@/services/api";
import type { CoachInvite, DashboardSummary, EventType } from "@/types/api";
import {
    Activity,
    Calendar,
    Check,
    ChevronLeft,
    ChevronRight,
    Flame,
    Loader2,
    Mail,
    MapPin,
    Shield,
    Trophy,
    X,
    Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ── Constants ── */

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

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/* ── Helpers ── */

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const s = new Date(d);
  s.setDate(d.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ── Stat Card ── */

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  onClick?: () => void;
}

function StatCard({ icon: Icon, label, value, sub, color, onClick }: StatCardProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-xl bg-card p-5 shadow-sm text-left ${onClick ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </Wrapper>
  );
}

/* ── Main Component ── */

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [invites, setInvites] = useState<CoachInvite[]>([]);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const fetchInvites = () => {
    api.get<CoachInvite[]>("/api/coach/invites/pending").then(setInvites).catch(() => {});
  };

  useEffect(() => {
    api.get<DashboardSummary>("/api/dashboard/summary")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
    fetchInvites();
  }, []);

  const handleAcceptInvite = async (inviteId: number) => {
    setAcceptingId(inviteId);
    try {
      await api.post(`/api/coach/invite/${inviteId}/accept`);
      setInvites((prev) => prev.filter((i) => i.invite_id !== inviteId));
    } catch { /* empty */ }
    finally { setAcceptingId(null); }
  };

  const handleDeclineInvite = (inviteId: number) => {
    setInvites((prev) => prev.filter((i) => i.invite_id !== inviteId));
  };

  /* Calendar grid */
  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
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
  }, [calMonth]);

  /* Session dates set */
  const sessionDateSet = useMemo(() => {
    if (!data) return new Set<string>();
    return new Set(data.session_dates.map((d) => d.date));
  }, [data]);

  /* Event dates map */
  type UpcomingEvent = DashboardSummary["upcoming_events"][number];
  const eventDateMap = useMemo(() => {
    if (!data) return new Map<string, UpcomingEvent[]>();
    const map = new Map<string, UpcomingEvent[]>();
    for (const ev of data.upcoming_events) {
      const key = ev.event_date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [data]);

  const today = new Date();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const t = data?.training;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hola, {user?.name} 👋</h1>
          <p className="text-muted-foreground">Tu resumen de actividad</p>
        </div>
        {data && data.streak > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-4 py-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-bold text-orange-700">{data.streak} días</p>
              <p className="text-[10px] text-orange-600">racha activa</p>
            </div>
          </div>
        )}
      </div>

      {/* Coach invites */}
      {invites.length > 0 && (
        <div className="rounded-xl bg-indigo-50 p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-indigo-800">
            <Mail className="h-5 w-5" />
            Invitaciones de Coach ({invites.length})
          </h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.invite_id} className="flex items-center justify-between rounded-md bg-white px-4 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.coach.name}</p>
                  <p className="text-xs text-muted-foreground">{inv.coach.email} · {formatDate(inv.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleAcceptInvite(inv.invite_id)} disabled={acceptingId === inv.invite_id} className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50">
                    {acceptingId === inv.invite_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Aceptar
                  </button>
                  <button onClick={() => handleDeclineInvite(inv.invite_id)} className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary">
                    <X className="h-3.5 w-3.5" /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top row: Sessions + XP + League */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Activity}
          label="Sesiones (30d)"
          value={String(t?.total_sessions ?? 0)}
          color="bg-primary/10 text-primary"
          onClick={() => navigate("/sessions")}
        />

        {/* XP Progress card */}
        <button onClick={() => navigate("/xp")} className="rounded-xl bg-card p-5 shadow-sm text-left hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Experiencia</p>
              <p className="text-xl font-bold">{(data?.xp.total_xp ?? 0).toLocaleString()} XP</p>
            </div>
            <span className="text-sm font-semibold text-muted-foreground">Nv. {data?.xp.level ?? 1}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-yellow-500 transition-all" style={{ width: `${data?.xp.progress_pct ?? 0}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {data?.xp.xp_progress ?? 0} / {data?.xp.xp_needed ?? 0} XP para el siguiente nivel
          </p>
        </button>

        {/* League card */}
        <button onClick={() => navigate("/divisions")} className="rounded-xl bg-card p-5 shadow-sm text-left hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Liga Semanal</p>
              <p className="text-xl font-bold">{data?.league?.division_display ?? "—"}</p>
            </div>
          </div>
          {data?.league && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Posición <span className="font-semibold text-foreground">#{data.league.rank}</span> de {data.league.group_size}</span>
              <span><span className="font-semibold text-purple-600">{data.league.weekly_xp} XP</span> · {data.league.days_remaining}d</span>
            </div>
          )}
        </button>
      </div>

      {/* Main grid: Calendar + XP/League */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Calendar */}
        <div className="rounded-2xl bg-card shadow-sm p-4 sm:p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="rounded-full p-2 hover:bg-secondary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold tracking-tight">{MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</h2>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="rounded-full p-2 hover:bg-secondary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{d}</div>
            ))}
          </div>
          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = day.getMonth() === calMonth.getMonth();
              const isToday = isSameDay(day, today);
              const isPast = !isToday && day < today;
              const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
              const hasSession = sessionDateSet.has(dayStr);
              const dayEvents = eventDateMap.get(dayStr) || [];
              const hasContent = hasSession || dayEvents.length > 0;

              return (
                <div
                  key={i}
                  className={`relative flex flex-col items-center justify-start rounded-lg p-1 min-h-[48px] transition-colors ${
                    isToday ? "bg-primary/5" : hasContent && isCurrentMonth ? "bg-secondary/40" : ""
                  } ${!isCurrentMonth ? "opacity-20" : isPast ? "opacity-40" : ""}`}
                >
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? "bg-primary text-white shadow-sm"
                      : isPast && isCurrentMonth
                        ? "text-muted-foreground"
                        : "text-foreground"
                  }`}>
                    {day.getDate()}
                  </span>
                  {hasContent && (
                    <div className="mt-auto flex items-center justify-center gap-[3px] pb-0.5">
                      {hasSession && <span className="h-[5px] w-[5px] rounded-full bg-primary" title="Entrenamiento" />}
                      {dayEvents.map((ev: UpcomingEvent) => (
                        <span key={ev.id} className={`h-[5px] w-[5px] rounded-full ${EVENT_TYPE_COLORS[ev.event_type]}`} title={ev.name} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-[6px] w-[6px] rounded-full bg-primary" /> Entreno</span>
            <span className="flex items-center gap-1.5"><span className="h-[6px] w-[6px] rounded-full bg-red-500" /> Comp.</span>
            <span className="flex items-center gap-1.5"><span className="h-[6px] w-[6px] rounded-full bg-blue-500" /> Taller</span>
            <span className="flex items-center gap-1.5"><span className="h-[6px] w-[6px] rounded-full bg-purple-500" /> Exhib.</span>
            <span className="flex items-center gap-1.5"><span className="h-[6px] w-[6px] rounded-full bg-yellow-500" /> Social</span>
          </div>
        </div>

        {/* Right column: Upcoming events — stretch to match calendar */}
        <div className="flex flex-col">
          <div className="rounded-xl bg-card shadow-sm flex flex-col flex-1">
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <Calendar className="h-4 w-4 text-primary" />
                Próximos Eventos
              </h2>
              <button onClick={() => navigate("/events")} className="text-xs text-primary hover:underline">Ver todos</button>
            </div>
            <div className="space-y-0.5">
              {(!data?.upcoming_events || data.upcoming_events.length === 0) ? (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">No tienes eventos próximos</p>
              ) : (
                data.upcoming_events.map((ev) => (
                  <div key={ev.id} className="px-5 py-3 flex items-start gap-3">
                    <span className={`mt-1 inline-block h-2.5 w-2.5 rounded-full shrink-0 ${EVENT_TYPE_COLORS[ev.event_type]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{ev.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(ev.event_date)}</p>
                      {ev.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                          <MapPin className="h-3 w-3" /> {ev.location}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${EVENT_TYPE_COLORS[ev.event_type]} text-white`}>
                      {EVENT_TYPE_LABELS[ev.event_type]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Recent sessions + Records */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent sessions */}
        <div className="rounded-xl bg-card shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold">Sesiones Recientes</h2>
            <button onClick={() => navigate("/sessions")} className="text-xs text-primary hover:underline">Ver todas</button>
          </div>
          <div className="space-y-0.5">
            {(!data?.recent_sessions || data.recent_sessions.length === 0) ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Aún no tienes sesiones. ¡Empieza a entrenar!
              </p>
            ) : (
              data.recent_sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/sessions/${s.id}`)}
                  className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-secondary/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">Sesión #{s.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(s.started_at)} · {s.exercise_count} ejercicios · {s.set_count} series
                    </p>
                  </div>
                  {s.total_duration_sec && (
                    <span className="text-xs text-muted-foreground">{formatDuration(s.total_duration_sec)}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Records */}
        <div className="rounded-xl bg-card shadow-sm">
          <div className="px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Records Personales
            </h2>
          </div>
          <div className="space-y-0.5">
            {(!data?.records || data.records.length === 0) ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Completa sesiones para establecer records
              </p>
            ) : (
              data.records.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">Ejercicio #{r.exercise_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.record_type.replace("_", " ")} · {formatDate(r.achieved_at)}
                    </p>
                  </div>
                  <span className="rounded-md bg-yellow-50 px-2.5 py-1 text-sm font-semibold text-yellow-700">
                    {r.value}{r.record_type === "best_time" ? "s" : "kg"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
