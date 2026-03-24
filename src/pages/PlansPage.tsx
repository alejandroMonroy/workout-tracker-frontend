import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type {
    Plan,
    PlanListItem,
    PlanSession,
    Subscription,
} from "@/types/api";
import {
    BookOpen,
    Calendar,
    ChevronDown,
    ChevronUp,
    Loader2,
    Play,
    Star,
    Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BLOCK_TYPE_COLORS: Record<string, string> = {
  warmup: "bg-orange-100 text-orange-700 border-orange-200",
  skill: "bg-cyan-100 text-cyan-700 border-cyan-200",
  strength: "bg-indigo-100 text-indigo-700 border-indigo-200",
  wod: "bg-red-100 text-red-700 border-red-200",
  cardio: "bg-green-100 text-green-700 border-green-200",
  cooldown: "bg-purple-100 text-purple-700 border-purple-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
};

const MODALITY_COLORS: Record<string, string> = {
  amrap: "bg-red-100 text-red-700",
  emom: "bg-blue-100 text-blue-700",
  for_time: "bg-green-100 text-green-700",
  tabata: "bg-purple-100 text-purple-700",
  custom: "bg-gray-100 text-gray-700",
};

type Tab = "subscriptions" | "browse";

export default function PlansPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [publicPlans, setPublicPlans] = useState<PlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);
  const [expandedPlanData, setExpandedPlanData] = useState<Plan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<Subscription[]>("/api/plans/subscriptions/mine"),
      api.get<PlanListItem[]>("/api/plans"),
    ])
      .then(([subs, plans]) => {
        setSubscriptions(subs);
        setPublicPlans(plans);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const subscribedPlanIds = new Set(subscriptions.map((s) => s.plan_id));

  const loadPlanDetail = async (planId: number) => {
    if (expandedPlan === planId) {
      setExpandedPlan(null);
      setExpandedPlanData(null);
      return;
    }
    setExpandedPlan(planId);
    setLoadingPlan(true);
    try {
      const plan = await api.get<Plan>(`/api/plans/${planId}`);
      setExpandedPlanData(plan);
    } catch {
      setExpandedPlanData(null);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleSubscribe = async (planId: number) => {
    setActionMsg("");
    try {
      await api.post("/api/plans/subscribe", { plan_id: planId });
      const subs = await api.get<Subscription[]>(
        "/api/plans/subscriptions/mine",
      );
      setSubscriptions(subs);
      setActionMsg("✅ Suscrito correctamente");
    } catch (err) {
      setActionMsg(
        `❌ ${err instanceof Error ? err.message : "Error al suscribirse"}`,
      );
    }
  };

  const handleUnsubscribe = async (subId: number) => {
    setActionMsg("");
    try {
      await api.delete(`/api/plans/subscriptions/${subId}`);
      setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
      setActionMsg("Suscripción cancelada");
    } catch {
      /* empty */
    }
  };

  const startSessionFromPlan = async (planSession: PlanSession) => {
    try {
      const session = await api.post<{ id: number }>("/api/sessions", {
        plan_session_id: planSession.id,
      });
      navigate(`/sessions/${session.id}`);
    } catch (err) {
      setActionMsg(
        `❌ ${err instanceof Error ? err.message : "Error al crear sesión"}`,
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BookOpen className="h-6 w-6 text-primary" />
          Planes de Entrenamiento
        </h1>
        <p className="text-muted-foreground">
          Suscríbete a planes creados por tu coach
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
        <button
          onClick={() => setTab("subscriptions")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "subscriptions"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Star className="h-4 w-4" />
          Mis Planes
        </button>
        <button
          onClick={() => setTab("browse")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "browse"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <BookOpen className="h-4 w-4" />
          Explorar
        </button>
      </div>

      {actionMsg && (
        <p className="rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
          {actionMsg}
        </p>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : tab === "subscriptions" ? (
        /* ── My subscriptions ── */
        subscriptions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No estás suscrito a ningún plan aún
            </p>
            <button
              onClick={() => setTab("browse")}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Explorar planes
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-lg border border-border bg-card shadow-sm"
              >
                <div
                  className="flex cursor-pointer items-center justify-between p-5"
                  onClick={() => loadPlanDetail(sub.plan_id)}
                >
                  <div>
                    <h3 className="font-semibold">
                      {sub.plan?.name ?? `Plan #${sub.plan_id}`}
                    </h3>
                    {sub.plan?.coach_name && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                        <Users className="h-3 w-3" />
                        {sub.plan.coach_name}
                      </p>
                    )}
                    {sub.plan?.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                        {sub.plan.description}
                      </p>
                    )}
                    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                      {sub.plan && (
                        <span>
                          <Calendar className="mr-1 inline h-3 w-3" />
                          {sub.plan.session_count} sesiones
                        </span>
                      )}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          sub.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700",
                        )}
                      >
                        {sub.status === "active" ? "Activo" : sub.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnsubscribe(sub.id);
                      }}
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      Eliminar suscripción
                    </button>
                    {expandedPlan === sub.plan_id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded plan sessions */}
                {expandedPlan === sub.plan_id && (
                  <PlanDetail
                    loadingPlan={loadingPlan}
                    planData={expandedPlanData}
                    onStartSession={startSessionFromPlan}
                  />
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── Browse public plans ── */
        publicPlans.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No hay planes disponibles todavía
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicPlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-lg border border-border bg-card p-5 shadow-sm"
              >
                <h3 className="font-semibold">{plan.name}</h3>
                {plan.coach_name && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                    <Users className="h-3 w-3" />
                    {plan.coach_name}
                  </p>
                )}
                {plan.description && (
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                    {plan.description}
                  </p>
                )}
                <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                  <span>{plan.session_count} sesiones</span>
                  {plan.duration_weeks && (
                    <span>{plan.duration_weeks} semanas</span>
                  )}
                </div>
                {subscribedPlanIds.has(plan.id) ? (
                  <span className="mt-3 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    ✓ Suscrito
                  </span>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Suscribirme
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Plan detail with sessions and "start" buttons ──

function PlanDetail({
  loadingPlan,
  planData,
  onStartSession,
}: {
  loadingPlan: boolean;
  planData: Plan | null;
  onStartSession: (ps: PlanSession) => void;
}) {
  if (loadingPlan) {
    return (
      <div className="flex h-24 items-center justify-center border-t border-border">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }
  if (!planData) return null;

  return (
    <div className="border-t border-border px-5 pb-5">
      <div className="mt-4 space-y-3">
        {planData.sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin sesiones</p>
        ) : (
          planData.sessions.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-border bg-secondary/30 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    Día {s.day_number}
                  </span>
                  <p className="text-sm font-medium">{s.name}</p>
                </div>
                <button
                  onClick={() => onStartSession(s)}
                  className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  Iniciar
                </button>
              </div>
              {s.description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.description}
                </p>
              )}
              <div className="mt-2 space-y-1.5">
                {s.blocks.map((b) => (
                  <div
                    key={b.id}
                    className={cn(
                      "rounded-md border px-3 py-2",
                      BLOCK_TYPE_COLORS[b.block_type] ??
                        BLOCK_TYPE_COLORS.other,
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{b.name}</span>
                      {b.modality && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium",
                            MODALITY_COLORS[b.modality],
                          )}
                        >
                          {b.modality.toUpperCase()}
                        </span>
                      )}
                      {b.modality === "amrap" && b.time_cap_sec && (
                        <span className="text-[10px]">
                          {Math.floor(b.time_cap_sec / 60)} min
                        </span>
                      )}
                      {b.modality === "emom" && b.time_cap_sec && b.rounds && (
                        <span className="text-[10px]">
                          cada {Math.floor(b.time_cap_sec / b.rounds)}s × {b.rounds} rondas
                        </span>
                      )}
                      {b.modality === "for_time" && (
                        <span className="text-[10px]">
                          {b.time_cap_sec
                            ? `Cap: ${Math.floor(b.time_cap_sec / 60)} min`
                            : ""}
                          {b.time_cap_sec && b.rounds ? " · " : ""}
                          {b.rounds ? `${b.rounds} rondas` : ""}
                        </span>
                      )}
                      {b.modality === "tabata" && (
                        <span className="text-[10px]">
                          {b.work_sec ?? 20}s / {b.rest_sec ?? 10}s
                          {b.rounds ? ` × ${b.rounds} rondas` : ""}
                        </span>
                      )}
                      {(!b.modality || b.modality === "custom") && (
                        <>
                          {b.rounds && (
                            <span className="text-[10px]">{b.rounds} rondas</span>
                          )}
                          {b.time_cap_sec && (
                            <span className="text-[10px]">
                              Cap: {Math.floor(b.time_cap_sec / 60)} min
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {b.exercises.map((e) => (
                        <p key={e.id} className="text-[11px] opacity-80">
                          {e.order}.{" "}
                          {e.exercise?.name ?? `Ejercicio #${e.exercise_id}`}
                          {e.target_reps && ` × ${e.target_reps}`}
                          {e.target_weight_kg && ` @ ${e.target_weight_kg}kg`}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
