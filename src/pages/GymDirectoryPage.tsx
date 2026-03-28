import { api } from "@/services/api";
import type {
  GymMembership,
  GymPlan,
  GymPublic,
  GymSchedule,
  MembershipStatus,
  PlanType,
  WeeklySlot,
} from "@/types/api";
import {
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Phone,
  Search,
  Ticket,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  monthly: "Mensual",
  annual: "Anual",
  tickets: "Tickets",
};

function getTicketDisplay(m: GymMembership): { label: string; unlimited: boolean } | null {
  if (m.plan_type === "tickets" || m.is_trial) {
    if (m.tickets_remaining !== null) {
      return { label: `${m.tickets_remaining} tickets`, unlimited: false };
    }
    return null;
  }
  if (m.plan_type === "monthly" || m.plan_type === "annual") {
    const extraTickets = m.tickets_remaining ? ` · ${m.tickets_remaining} ticket${m.tickets_remaining !== 1 ? "s" : ""} extra` : "";
    if (m.sessions_included !== null) {
      const remaining = m.sessions_included - m.sessions_used_this_period;
      return { label: `${remaining} sesiones${extraTickets}`, unlimited: false };
    }
    return { label: `Ilimitado${extraTickets}`, unlimited: !m.tickets_remaining };
  }
  return null;
}

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa",
  trial: "Prueba",
  frozen: "Congelada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const STATUS_COLORS: Record<MembershipStatus, string> = {
  active: "bg-green-100 text-green-700",
  trial: "bg-blue-100 text-blue-700",
  frozen: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-600",
};

function getWeekDays(): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type ConfirmBook = {
  schedId: number;
  name: string;
  startsAt: string;
  gymId: number;
  isWaitlist: boolean;
  waitlistCount: number;
};

type ConfirmReplace = {
  gymId: number;
  planId: number;
  planName: string;
  currentPlanName: string | null;
};

type ConfirmCancel = {
  schedId: number;
  name: string;
  startsAt: string;
  gymId: number;
};

export default function GymDirectoryPage() {
  const navigate = useNavigate();
  const [gyms, setGyms] = useState<GymPublic[]>([]);
  const [memberships, setMemberships] = useState<GymMembership[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedGymId, setExpandedGymId] = useState<number | null>(null);
  const [expandedMembershipGymId, setExpandedMembershipGymId] = useState<number | null>(null);
  const [gymDetails, setGymDetails] = useState<
    Record<number, { plans: GymPlan[]; schedules: GymSchedule[]; weeklySlots: WeeklySlot[]; loading: boolean }>
  >({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"directory" | "memberships" | "historial">("directory");
  const [confirmBook, setConfirmBook] = useState<ConfirmBook | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<ConfirmCancel | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<ConfirmReplace | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [gs, ms] = await Promise.all([
        api.get<GymPublic[]>(`/api/gyms?search=${encodeURIComponent(search)}`),
        api.get<GymMembership[]>("/api/gyms/memberships/mine").catch(() => [] as GymMembership[]),
      ]);
      setGyms(gs);
      setMemberships(ms);
      if (ms.some((m) => ["active", "trial", "frozen"].includes(m.status))) {
        setActiveTab("memberships");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const loadGymDetails = async (gymId: number) => {
    setGymDetails((prev) => ({ ...prev, [gymId]: { plans: [], schedules: [], weeklySlots: [], loading: true } }));
    // Fetch schedules from Monday of the current week so all days of the week are visible
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);
    const [plans, schedules, weeklySlots] = await Promise.all([
      api.get<GymPlan[]>(`/api/gyms/${gymId}/plans`).catch(() => []),
      api.get<GymSchedule[]>(`/api/gyms/${gymId}/schedule?from_dt=${encodeURIComponent(monday.toISOString())}`).catch(() => []),
      api.get<WeeklySlot[]>(`/api/gyms/${gymId}/weekly-slots`).catch(() => []),
    ]);
    setGymDetails((prev) => ({ ...prev, [gymId]: { plans, schedules, weeklySlots, loading: false } }));
  };

  const refreshSchedules = async (gymId: number) => {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);
    const schedules = await api.get<GymSchedule[]>(`/api/gyms/${gymId}/schedule?from_dt=${encodeURIComponent(monday.toISOString())}`).catch(() => []);
    setGymDetails((prev) => ({ ...prev, [gymId]: { ...prev[gymId], schedules } }));
  };

  const refreshMemberships = async () => {
    const ms = await api.get<GymMembership[]>("/api/gyms/memberships/mine").catch(() => [] as GymMembership[]);
    setMemberships(ms);
  };

  const toggleGym = async (gymId: number) => {
    if (expandedGymId === gymId) { setExpandedGymId(null); return; }
    setExpandedGymId(gymId);
    if (!gymDetails[gymId]) await loadGymDetails(gymId);
  };

  const toggleMembershipGym = async (gymId: number) => {
    if (expandedMembershipGymId === gymId) { setExpandedMembershipGymId(null); return; }
    setExpandedMembershipGymId(gymId);
    if (!gymDetails[gymId]) await loadGymDetails(gymId);
  };

  const getMembership = (gymId: number) =>
    memberships.find((m) => m.gym_id === gymId && ["active", "trial", "frozen"].includes(m.status));

  const handleSubscribe = async (gymId: number, planId: number) => {
    setActionLoading(`sub-${gymId}-${planId}`);
    setError("");
    try {
      await api.post<GymMembership>(`/api/gyms/${gymId}/subscribe/${planId}`, {});
      await refreshMemberships();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al suscribirse");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTrial = async (gymId: number) => {
    setActionLoading(`trial-${gymId}`);
    setError("");
    try {
      const m = await api.post<GymMembership>(`/api/gyms/${gymId}/trial`, {});
      setMemberships((prev) => [...prev, m]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const executeBook = async (schedId: number, gymId: number) => {
    setActionLoading(`book-${schedId}`);
    setError("");
    try {
      await api.post(`/api/gyms/schedules/${schedId}/book`, {});
      await Promise.all([refreshSchedules(gymId), refreshMemberships()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al reservar");
    } finally {
      setActionLoading(null);
    }
  };


  const handleCancelBook = async (schedId: number, gymId?: number) => {
    setActionLoading(`cancel-book-${schedId}`);
    setError("");
    try {
      await api.delete(`/api/gyms/schedules/${schedId}/book`);
      const gid = gymId ?? expandedGymId ?? expandedMembershipGymId;
      await Promise.all([
        gid !== null ? refreshSchedules(gid) : Promise.resolve(),
        refreshMemberships(),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cancelar");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFreeze = async (membershipId: number) => {
    setActionLoading(`freeze-${membershipId}`);
    try {
      await api.post(`/api/gyms/memberships/${membershipId}/freeze`, {});
      await refreshMemberships();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfreeze = async (membershipId: number) => {
    setActionLoading(`unfreeze-${membershipId}`);
    try {
      await api.post(`/api/gyms/memberships/${membershipId}/unfreeze`, {});
      await refreshMemberships();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (membershipId: number) => {
    setActionLoading(`cancel-mem-${membershipId}`);
    try {
      await api.post(`/api/gyms/memberships/${membershipId}/cancel`, {});
      await refreshMemberships();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const weekDays = getWeekDays();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Gimnasios
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Encuentra y únete a gimnasios</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <X className="h-4 w-4 shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Booking confirmation dialog */}
      {confirmBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <p className="font-semibold text-foreground">
                {confirmBook.isWaitlist ? "Apuntarse a lista de espera" : "Confirmar reserva"}
              </p>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{confirmBook.name}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {new Date(confirmBook.startsAt).toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              {" · "}
              {new Date(confirmBook.startsAt).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {confirmBook.isWaitlist && (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2.5 mb-4 text-sm text-yellow-800">
                <p className="font-medium mb-0.5">Clase completa</p>
                <p>
                  Hay <span className="font-semibold">{confirmBook.waitlistCount}</span>{" "}
                  {confirmBook.waitlistCount === 1 ? "persona" : "personas"} en lista de espera.
                  Ocuparías la posición{" "}
                  <span className="font-semibold">#{confirmBook.waitlistCount + 1}</span>.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmBook(null)}
                className="flex-1 rounded-xl border border-border py-2 text-sm text-muted-foreground hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const { schedId, gymId } = confirmBook;
                  setConfirmBook(null);
                  executeBook(schedId, gymId);
                }}
                disabled={!!actionLoading}
                className="flex-1 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {confirmBook.isWaitlist ? "Apuntarme" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace membership confirmation dialog */}
      {confirmReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="h-5 w-5 text-primary" />
              <p className="font-semibold text-foreground">Cambiar membresía</p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Vas a suscribirte al plan <span className="font-semibold text-foreground">{confirmReplace.planName}</span>.
              {confirmReplace.currentPlanName && (
                <> Tu membresía actual <span className="font-semibold text-foreground">{confirmReplace.currentPlanName}</span> quedará cancelada desde este momento.</>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReplace(null)}
                className="flex-1 rounded-xl border border-border py-2 text-sm text-muted-foreground hover:bg-secondary"
              >
                Volver
              </button>
              <button
                onClick={() => {
                  const { gymId, planId } = confirmReplace;
                  setConfirmReplace(null);
                  handleSubscribe(gymId, planId);
                }}
                disabled={!!actionLoading}
                className="flex-1 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel booking confirmation dialog */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <X className="h-5 w-5 text-destructive" />
              <p className="font-semibold text-foreground">Cancelar reserva</p>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{confirmCancel.name}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {new Date(confirmCancel.startsAt).toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              {" · "}
              {new Date(confirmCancel.startsAt).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 mb-4 text-sm text-red-800">
              ¿Seguro que quieres desapuntarte de esta clase?
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmCancel(null)}
                className="flex-1 rounded-xl border border-border py-2 text-sm text-muted-foreground hover:bg-secondary"
              >
                Volver
              </button>
              <button
                onClick={() => {
                  const { schedId, gymId } = confirmCancel;
                  setConfirmCancel(null);
                  handleCancelBook(schedId, gymId);
                }}
                disabled={!!actionLoading}
                className="flex-1 rounded-xl bg-destructive py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
              >
                Desapuntarme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {(() => {
        const activeMemberships = memberships.filter((m) => ["active", "trial", "frozen"].includes(m.status));
        const historicMemberships = memberships.filter((m) => ["cancelled", "expired"].includes(m.status));
        const tabs: { key: "directory" | "memberships" | "historial"; label: string }[] = [
          ...(activeMemberships.length > 0
            ? [
                { key: "memberships" as const, label: `Mis membresías (${activeMemberships.length})` },
                { key: "directory" as const, label: "Directorio" },
              ]
            : [
                { key: "directory" as const, label: "Directorio" },
                { key: "memberships" as const, label: "Mis membresías" },
              ]),
          ...(historicMemberships.length > 0
            ? [{ key: "historial" as const, label: `Historial (${historicMemberships.length})` }]
            : []),
        ];
        return (
          <div className="flex gap-1 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Directory tab */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar gimnasios..."
              className="block w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : gyms.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay gimnasios disponibles.</p>
          ) : (
            <div className="space-y-3">
              {gyms.map((gym) => {
                const membership = getMembership(gym.id);
                const details = gymDetails[gym.id];
                const isExpanded = expandedGymId === gym.id;

                return (
                  <div key={gym.id} className="rounded-xl border border-border bg-white overflow-hidden">
                    <button
                      onClick={() => toggleGym(gym.id)}
                      className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/30 transition-colors text-left"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{gym.name}</p>
                          {membership && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[membership.status]}`}>
                              {STATUS_LABELS[membership.status]}
                            </span>
                          )}
                        </div>
                        {gym.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{gym.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {gym.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{gym.phone}</span>}
                          {gym.free_trial_enabled && (
                            <span className="text-green-600 font-medium">✓ Clase de prueba</span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border">
                        {details?.loading ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="p-4 space-y-4">
                            {!membership && (
                              <div className="flex flex-wrap gap-2">
                                {gym.free_trial_enabled && (
                                  <button
                                    onClick={() => handleTrial(gym.id)}
                                    disabled={actionLoading === `trial-${gym.id}`}
                                    className="flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                                  >
                                    {actionLoading === `trial-${gym.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" />}
                                    Clase de prueba gratis
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Plans */}
                            {details?.plans && details.plans.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Planes</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {details.plans.map((p) => (
                                    <div key={p.id} className="rounded-lg border border-border p-3 flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {PLAN_TYPE_LABELS[p.plan_type]}
                                          {p.sessions_included ? ` · ${p.sessions_included} ses.` : ""}
                                          {p.ticket_count ? ` · ${p.ticket_count} tickets` : ""}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-primary">{p.xp_price.toLocaleString()} XP</p>
                                        {(() => {
                                          const isTickets = p.plan_type === "tickets";
                                          const label = membership
                                            ? isTickets ? "Añadir tickets" : "Cambiar plan"
                                            : "Suscribirse";
                                          return (
                                            <button
                                              onClick={() => {
                                                if (membership && !isTickets) {
                                                  setConfirmReplace({
                                                    gymId: gym.id,
                                                    planId: p.id,
                                                    planName: p.name,
                                                    currentPlanName: membership.plan_name,
                                                  });
                                                } else {
                                                  handleSubscribe(gym.id, p.id);
                                                }
                                              }}
                                              disabled={!!actionLoading}
                                              className="mt-1 rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                            >
                                              {actionLoading === `sub-${gym.id}-${p.id}` ? <Loader2 className="h-3 w-3 animate-spin inline" /> : label}
                                            </button>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Weekly timetable */}
                            {details?.weeklySlots && details.weeklySlots.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Horario semanal</p>
                                <div className="grid grid-cols-7 gap-0.5 text-center">
                                  {DAY_LABELS.map((d, dayIdx) => {
                                    const todayIdx = (new Date().getDay() + 6) % 7;
                                    const isToday = dayIdx === todayIdx;
                                    return (
                                      <div key={d} className={`py-1 text-[10px] font-semibold uppercase text-center ${
                                        isToday ? "rounded border border-primary text-primary" : "text-muted-foreground/70"
                                      }`}>{d}</div>
                                    );
                                  })}
                                  {DAY_LABELS.map((_, dayIdx) => {
                                    const daySlots = details.weeklySlots.filter((s) => s.day_of_week === dayIdx);
                                    return (
                                      <div key={dayIdx} className="flex flex-col gap-0.5 divide-y divide-gray-100">
                                        {daySlots.length === 0 ? (
                                          <div className="h-6" />
                                        ) : (
                                          daySlots.map((slot) => (
                                            <div key={slot.id} className="rounded bg-primary/8 px-1 py-1.5 text-center leading-tight">
                                              <p className="text-[11px] font-semibold text-foreground truncate">{slot.name}</p>
                                              <p className="text-[9px] text-muted-foreground mt-0.5">{slot.start_time}–{slot.end_time}</p>
                                              <div className="flex items-center justify-center gap-1 mt-0.5">
                                                <span className="text-[9px] text-muted-foreground">{slot.capacity}p</span>
                                                {slot.cost > 0 && <span className="text-[9px] text-primary font-semibold">{slot.cost}t</span>}
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {!details?.plans?.length && !details?.weeklySlots?.length && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                Este gimnasio aún no ha publicado planes ni horario.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Memberships tab */}
      {activeTab === "memberships" && (
        <div className="space-y-3">
          {memberships.filter((m) => ["active", "trial", "frozen"].includes(m.status)).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="mx-auto h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No tienes membresías activas.</p>
              <button
                onClick={() => setActiveTab("directory")}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Explorar gimnasios
              </button>
            </div>
          ) : (
            memberships.filter((m) => ["active", "trial", "frozen"].includes(m.status)).map((m) => {
              const isExpanded = expandedMembershipGymId === m.gym_id;
              const details = gymDetails[m.gym_id];
              const canBook = ["active", "trial"].includes(m.status);

              return (
                <div key={m.id} className="rounded-xl border border-border bg-white overflow-hidden">
                  {/* Membership header */}
                  <div
                    className={`p-4 ${canBook ? "cursor-pointer hover:bg-secondary/30 transition-colors" : ""}`}
                    onClick={() => canBook && toggleMembershipGym(m.gym_id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{m.gym_name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[m.status]}`}>
                            {STATUS_LABELS[m.status]}
                          </span>
                          {(() => {
                            const td = getTicketDisplay(m);
                            if (!td) return null;
                            return (
                              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                {!td.unlimited && <Ticket className="h-3 w-3" />}
                                {td.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {m.plan_name ?? "Sin plan"}
                          {m.expires_at ? ` · Expira ${new Date(m.expires_at).toLocaleDateString("es-ES")}` : ""}
                          {m.auto_renew && m.status === "active" && <span className="text-green-600"> · Autorenovación activa</span>}
                        </p>
                        {m.is_trial && (
                          <p className="mt-1 text-xs text-blue-600">
                            {(m.tickets_remaining ?? 0) > 0
                              ? "Tu primera reserva será la clase de prueba · no descuenta sesiones contratadas."
                              : "Has consumido tu clase de prueba."}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Sesiones: {m.sessions_used_this_period}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {(m.status === "active" || m.status === "trial" || m.status === "frozen") && (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            {m.status === "active" && (
                              <button
                                onClick={() => handleFreeze(m.id)}
                                disabled={actionLoading === `freeze-${m.id}`}
                                className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
                              >
                                {actionLoading === `freeze-${m.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Congelar"}
                              </button>
                            )}
                            {m.status === "frozen" && (
                              <button
                                onClick={() => handleUnfreeze(m.id)}
                                disabled={actionLoading === `unfreeze-${m.id}`}
                                className="rounded-md border border-primary px-2.5 py-1.5 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
                              >
                                {actionLoading === `unfreeze-${m.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reactivar"}
                              </button>
                            )}
                            <button
                              onClick={() => handleCancel(m.id)}
                              disabled={actionLoading === `cancel-mem-${m.id}`}
                              className="rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            >
                              {actionLoading === `cancel-mem-${m.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancelar"}
                            </button>
                          </div>
                        )}
                        {canBook && (
                          isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Weekly calendar */}
                  {isExpanded && canBook && (
                    <div className="border-t border-border">
                      {details?.loading ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Horario semanal
                            </p>
                            {(() => {
                              const td = getTicketDisplay(m);
                              if (!td) return null;
                              return (
                                <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                                  {!td.unlimited && <Ticket className="h-3 w-3" />}
                                  {td.unlimited ? td.label : `${td.label} restantes`}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="grid grid-cols-7 gap-0.5 text-center">
                            {weekDays.map((day, dayIdx) => {
                              const isToday = isSameDay(day, new Date());
                              return (
                                <div
                                  key={dayIdx}
                                  className={`py-1 text-[10px] font-semibold uppercase text-center ${
                                    isToday
                                      ? "rounded border border-primary text-primary"
                                      : "text-muted-foreground/70"
                                  }`}
                                >
                                  <div>{DAY_LABELS[dayIdx]}</div>
                                  <div className="text-[9px] font-normal normal-case leading-tight">{day.getDate()} {day.toLocaleDateString("es-ES", { month: "short" })}</div>
                                </div>
                              );
                            })}
                            {weekDays.map((day, dayIdx) => {
                              const daySchedules = (details?.schedules ?? []).filter((s) =>
                                isSameDay(new Date(s.starts_at), day)
                              );
                              return (
                                <div key={dayIdx} className="flex flex-col gap-0.5 divide-y divide-gray-100">
                                  {daySchedules.length === 0 ? (
                                    <div className="h-6" />
                                  ) : (
                                    daySchedules.map((s) => {
                                      const isBooked =
                                        s.user_booking_status === "confirmed" ||
                                        s.user_booking_status === "attended";
                                      const isFull = s.booked_count >= s.effective_capacity;
                                      const isOnWaitlist = s.user_on_waitlist;
                                      const isBookingLoading =
                                        actionLoading === `book-${s.id}` ||
                                        actionLoading === `cancel-book-${s.id}`;
                                      const available = s.effective_capacity - s.booked_count;

                                      let chipClass = "bg-primary/8 hover:ring-1 hover:ring-primary hover:text-primary cursor-pointer text-foreground";
                                      if (isBooked) {
                                        chipClass = "ring-1 ring-green-400 bg-green-50 text-green-700 cursor-pointer hover:bg-green-100";
                                      } else if (isOnWaitlist) {
                                        chipClass = "ring-1 ring-yellow-300 bg-yellow-50 text-yellow-700 cursor-default";
                                      } else if (isFull) {
                                        chipClass = "bg-gray-50 text-gray-400 cursor-pointer hover:ring-1 hover:ring-gray-300";
                                      }

                                      return (
                                        <button
                                          key={s.id}
                                          disabled={isBookingLoading || isOnWaitlist}
                                          onClick={() => {
                                            if (isBooked) {
                                              setConfirmCancel({
                                                schedId: s.id,
                                                name: s.template_name ?? "Clase",
                                                startsAt: s.starts_at,
                                                gymId: m.gym_id,
                                              });
                                            } else if (!isFull) {
                                              setConfirmBook({
                                                schedId: s.id,
                                                name: s.template_name ?? "Clase",
                                                startsAt: s.starts_at,
                                                gymId: m.gym_id,
                                                isWaitlist: false,
                                                waitlistCount: s.waitlist_count,
                                              });
                                            } else {
                                              setConfirmBook({
                                                schedId: s.id,
                                                name: s.template_name ?? "Clase",
                                                startsAt: s.starts_at,
                                                gymId: m.gym_id,
                                                isWaitlist: true,
                                                waitlistCount: s.waitlist_count,
                                              });
                                            }
                                          }}
                                          className={`w-full rounded px-1 py-1.5 leading-tight text-center transition-all disabled:opacity-60 ${chipClass}`}
                                        >
                                          {isBookingLoading ? (
                                            <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                                          ) : (
                                            <>
                                              <p className="text-[11px] font-semibold truncate">{s.template_name}</p>
                                              <p className="text-[9px] opacity-80 mt-0.5">
                                                {new Date(s.starts_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                                                {"–"}
                                                {new Date(s.ends_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                                              </p>
                                              <div className="flex items-center justify-center gap-1 mt-0.5">
                                                {isBooked ? (
                                                  <span className="text-[9px]">✓ reservado</span>
                                                ) : isOnWaitlist ? (
                                                  <span className="text-[9px]">#{s.user_waitlist_position} espera</span>
                                                ) : isFull ? (
                                                  <span className="text-[9px]">{s.waitlist_count} esp.</span>
                                                ) : (
                                                  <span className="text-[9px] opacity-80">{available}p</span>
                                                )}
                                                {s.tickets_cost > 0 && (
                                                  <span className="text-[9px] font-semibold">{s.tickets_cost}t</span>
                                                )}
                                              </div>
                                            </>
                                          )}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {!details?.schedules?.length && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No hay clases programadas esta semana.
                            </p>
                          )}

                          {/* Live class banner */}
                          {details?.schedules?.filter((s) =>
                            (s.live_status === "active" || s.live_status === "paused") &&
                            (s.user_booking_status === "confirmed" || s.user_booking_status === "attended")
                          ).map((s) => (
                            <div key={s.id} className="mt-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                  {s.template_name} — en vivo
                                </p>
                                <p className="text-xs text-green-700 mt-0.5">
                                  {new Date(s.starts_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                                  {"–"}
                                  {new Date(s.ends_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                              <button
                                onClick={() => navigate(`/class/${s.id}`)}
                                className="rounded-lg bg-green-600 text-white text-xs font-semibold px-3 py-2 hover:bg-green-700"
                              >
                                Seguir en vivo
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Historial tab */}
      {activeTab === "historial" && (
        <div className="space-y-3">
          {memberships.filter((m) => ["cancelled", "expired"].includes(m.status)).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="mx-auto h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Sin membresías anteriores.</p>
            </div>
          ) : (
            memberships
              .filter((m) => ["cancelled", "expired"].includes(m.status))
              .map((m) => (
                <div key={m.id} className="rounded-xl border border-border bg-white p-4 opacity-80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{m.gym_name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[m.status]}`}>
                          {STATUS_LABELS[m.status]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.plan_name ?? "Sin plan"}
                        {m.plan_type ? ` · ${PLAN_TYPE_LABELS[m.plan_type]}` : ""}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>
                          Inicio: {new Date(m.started_at).toLocaleDateString("es-ES")}
                        </span>
                        {m.expires_at && (
                          <span>
                            {m.status === "cancelled" ? "Cancelada" : "Expiró"}: {new Date(m.expires_at).toLocaleDateString("es-ES")}
                          </span>
                        )}
                        <span>Sesiones usadas: {m.sessions_used_this_period}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
