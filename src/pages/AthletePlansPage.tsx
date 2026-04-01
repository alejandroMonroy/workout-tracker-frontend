import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import type { CoachPublic, CoachTier, Plan, WorkoutTemplate } from "@/types/api";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  Play,
  Star,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Tab = "all" | "mine" | "coaches";

const MODALITY_LABEL: Record<string, string> = {
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For Time",
  tabata: "Tabata",
  custom: "Custom",
};

export default function AthletePlansPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  // Plans state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actingPlanId, setActingPlanId] = useState<number | null>(null);

  // Progress: plan_id -> Set of completed plan_workout_ids
  const [progress, setProgress] = useState<Record<number, Set<number>>>({});
  const [startingWorkoutId, setStartingWorkoutId] = useState<number | null>(null);

  // Coaches state
  const [coaches, setCoaches] = useState<CoachPublic[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [coachesLoaded, setCoachesLoaded] = useState(false);
  const [actingCoachId, setActingCoachId] = useState<number | null>(null);
  // tier picker: coachId -> selected tier id
  const [expandedCoachId, setExpandedCoachId] = useState<number | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);

  const loadPlans = async (t: Tab) => {
    setLoadingPlans(true);
    try {
      const url = t === "mine" ? "/api/plans?subscribed_only=true" : "/api/plans";
      const data = await api.get<Plan[]>(url);
      setPlans(data);
    } catch {
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadCoaches = async () => {
    if (coachesLoaded) return;
    setLoadingCoaches(true);
    try {
      const data = await api.get<CoachPublic[]>("/api/coaches");
      setCoaches(data);
    } catch {
      setCoaches([]);
    } finally {
      setLoadingCoaches(false);
      setCoachesLoaded(true);
    }
  };

  const loadProgress = async (planId: number) => {
    if (progress[planId] !== undefined) return;
    try {
      const ids = await api.get<number[]>(`/api/plans/${planId}/progress`);
      setProgress((prev) => ({ ...prev, [planId]: new Set(ids) }));
    } catch {
      setProgress((prev) => ({ ...prev, [planId]: new Set() }));
    }
  };

  useEffect(() => {
    if (tab === "coaches") {
      loadCoaches();
    } else {
      loadPlans(tab);
    }
  }, [tab]);

  const handleExpand = (planId: number, isSubscribed: boolean) => {
    const isExpanded = expandedId === planId;
    setExpandedId(isExpanded ? null : planId);
    if (!isExpanded && isSubscribed) {
      loadProgress(planId);
    }
  };

  const handleSubscribePlan = async (plan: Plan) => {
    setActingPlanId(plan.id);
    try {
      const updated = await api.post<Plan>(`/api/plans/${plan.id}/subscribe`);
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
    } catch {}
    setActingPlanId(null);
  };

  const handleUnsubscribePlan = async (plan: Plan) => {
    setActingPlanId(plan.id);
    try {
      await api.delete(`/api/plans/${plan.id}/subscribe`);
      if (tab === "mine") {
        setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      } else {
        setPlans((prev) =>
          prev.map((p) => (p.id === plan.id ? { ...p, subscription_id: null } : p))
        );
      }
    } catch {}
    setActingPlanId(null);
  };

  const handleStartWorkout = async (planWorkoutId: number, templateId: number, template?: WorkoutTemplate) => {
    setStartingWorkoutId(planWorkoutId);
    try {
      const session = await api.post<{ id: number }>("/api/sessions", {
        template_id: templateId,
        plan_workout_id: planWorkoutId,
      });
      navigate(`/sessions/${session.id}`, { state: { template } });
    } catch {
      setStartingWorkoutId(null);
    }
  };

  const handleSubscribeCoach = async (coach: CoachPublic, tier: CoachTier) => {
    setActingCoachId(coach.id);
    try {
      await api.post(`/api/coaches/${coach.id}/subscribe`, { tier_id: tier.id });
      setCoaches((prev) =>
        prev.map((c) =>
          c.id === coach.id
            ? { ...c, is_subscribed: true, current_tier_id: tier.id, subscriber_count: c.subscriber_count + 1 }
            : c
        )
      );
      setExpandedCoachId(null);
      setSelectedTierId(null);
      if (tab !== "coaches") loadPlans(tab);
    } catch {}
    setActingCoachId(null);
  };

  const handleChangeTier = async (coach: CoachPublic, tier: CoachTier) => {
    setActingCoachId(coach.id);
    try {
      await api.patch(`/api/coaches/${coach.id}/subscribe`, { tier_id: tier.id });
      setCoaches((prev) =>
        prev.map((c) =>
          c.id === coach.id ? { ...c, current_tier_id: tier.id } : c
        )
      );
      setExpandedCoachId(null);
      setSelectedTierId(null);
      loadPlans(tab === "coaches" ? "all" : tab);
    } catch {}
    setActingCoachId(null);
  };

  const handleUnsubscribeCoach = async (coach: CoachPublic) => {
    setActingCoachId(coach.id);
    try {
      await api.delete(`/api/coaches/${coach.id}/subscribe`);
      setCoaches((prev) =>
        prev.map((c) =>
          c.id === coach.id
            ? { ...c, is_subscribed: false, subscriber_count: Math.max(0, c.subscriber_count - 1) }
            : c
        )
      );
    } catch {}
    setActingCoachId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BookOpen className="h-6 w-6 text-primary" />
          Planes de entrenamiento
        </h1>
        <p className="text-muted-foreground">
          Explora planes de coaches y suscríbete a los que te interesen
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/40 p-1 w-fit">
        {(["all", "mine", "coaches"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "all" ? "Todos" : t === "mine" ? "Mis planes" : "Coaches"}
          </button>
        ))}
      </div>

      {/* Coaches tab */}
      {tab === "coaches" && (
        <>
          {loadingCoaches ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : coaches.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                No hay coaches con suscripción disponible todavía
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {coaches.map((coach) => {
                const isActing = actingCoachId === coach.id;
                const isExpanded = expandedCoachId === coach.id;
                return (
                  <div key={coach.id} className="rounded-lg border border-border bg-card shadow-sm">
                    {/* Coach header */}
                    <div className="px-4 py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {coach.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{coach.name}</p>
                            {coach.is_subscribed && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 shrink-0">
                                Suscrito
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {coach.plan_count} plan{coach.plan_count !== 1 ? "es" : ""} ·{" "}
                            {coach.subscriber_count} suscriptor{coach.subscriber_count !== 1 ? "es" : ""} ·{" "}
                            {coach.tiers.length} tier{coach.tiers.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {coach.is_subscribed ? (
                          <>
                            <button
                              onClick={() => {
                                setExpandedCoachId(isExpanded ? null : coach.id);
                                setSelectedTierId(null);
                              }}
                              disabled={isActing || coach.tiers.length <= 1}
                              className="flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                            >
                              {isExpanded ? "Cerrar" : "Cambiar tier"}
                            </button>
                            <button
                              onClick={() => handleUnsubscribeCoach(coach)}
                              disabled={isActing}
                              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-50"
                            >
                              {isActing && <Loader2 className="h-3 w-3 animate-spin" />}
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setExpandedCoachId(isExpanded ? null : coach.id);
                              setSelectedTierId(null);
                            }}
                            disabled={isActing || coach.tiers.length === 0}
                            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {isActing && <Loader2 className="h-3 w-3 animate-spin" />}
                            {isExpanded ? "Cerrar" : "Ver suscripciones"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tier picker */}
                    {isExpanded && (
                      <div className="border-t border-border px-4 py-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {coach.is_subscribed ? "Cambiar tier" : "Elige un tier"}
                        </p>
                        <div className="space-y-2">
                          {coach.tiers
                            .filter((t) => !coach.is_subscribed || t.id !== coach.current_tier_id)
                            .map((tier) => (
                            <button
                              key={tier.id}
                              onClick={() => setSelectedTierId(tier.id === selectedTierId ? null : tier.id)}
                              className={cn(
                                "w-full rounded-md border p-3 text-left transition-colors",
                                selectedTierId === tier.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">{tier.name}</p>
                                <p className="text-sm font-bold text-primary">
                                  {tier.xp_per_month.toLocaleString()} XP/mes
                                </p>
                              </div>
                              {tier.description && (
                                <p className="mt-0.5 text-xs text-muted-foreground">{tier.description}</p>
                              )}
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {tier.tags.length === 0 ? (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground italic">
                                    <Star className="h-3 w-3" />
                                    Acceso total a planes privados
                                  </span>
                                ) : (
                                  tier.tags.map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                      style={{ backgroundColor: tag.color }}
                                    >
                                      {tag.name}
                                    </span>
                                  ))
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        {selectedTierId != null && (
                          <button
                            onClick={() => {
                              const tier = coach.tiers.find((t) => t.id === selectedTierId);
                              if (!tier) return;
                              if (coach.is_subscribed) {
                                handleChangeTier(coach, tier);
                              } else {
                                handleSubscribeCoach(coach, tier);
                              }
                            }}
                            disabled={isActing}
                            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {isActing && <Loader2 className="h-3 w-3 animate-spin" />}
                            {coach.is_subscribed ? "Confirmar cambio" : "Confirmar suscripción"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Plans tabs */}
      {tab !== "coaches" && (
        <>
          {loadingPlans ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                {tab === "mine"
                  ? "Aún no estás suscrito a ningún plan"
                  : "No hay planes disponibles"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const myPlans = plans.filter((p) => p.created_by === currentUser?.id);
                const coachPlans = plans.filter((p) => p.created_by !== currentUser?.id);
                const coachGroups: { coachId: number; coachName: string; plans: Plan[] }[] = [];
                for (const plan of coachPlans) {
                  const existing = coachGroups.find((g) => g.coachId === plan.created_by);
                  if (existing) {
                    existing.plans.push(plan);
                  } else {
                    coachGroups.push({ coachId: plan.created_by, coachName: plan.creator_name, plans: [plan] });
                  }
                }

                const renderPlan = (plan: Plan) => {
                const isExpanded = expandedId === plan.id;
                const isSubscribed = plan.subscription_id != null;
                const isActing = actingPlanId === plan.id;
                const isPrivate = !plan.is_public;
                const planProgress = progress[plan.id];
                const completedCount = planProgress?.size ?? 0;

                return (
                  <div
                    key={plan.id}
                    className="rounded-lg border border-border bg-card shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div
                        className="flex flex-1 cursor-pointer items-center gap-3"
                        onClick={() => handleExpand(plan.id, isSubscribed)}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{plan.name}</p>
                            {isPrivate && (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Plan privado" />
                            )}
                            {isSubscribed && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                Suscrito
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {plan.workouts.length} workout
                            {plan.workouts.length !== 1 ? "s" : ""}
                            {isSubscribed && plan.workouts.length > 0 && planProgress !== undefined && (
                              <span className="ml-1">
                                · {completedCount}/{plan.workouts.length} completados
                              </span>
                            )}
                          </p>
                          {plan.tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {plan.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSubscribed ? (
                          <button
                            onClick={() => handleUnsubscribePlan(plan)}
                            disabled={isActing}
                            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-50"
                          >
                            {isActing && <Loader2 className="h-3 w-3 animate-spin" />}
                            Cancelar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSubscribePlan(plan)}
                            disabled={isActing}
                            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {isActing && <Loader2 className="h-3 w-3 animate-spin" />}
                            Suscribirse
                          </button>
                        )}
                        <button
                          onClick={() => handleExpand(plan.id, isSubscribed)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded */}
                    {isExpanded && (
                      <div className="border-t border-border px-4 py-3">
                        {plan.description && (
                          <p className="mb-3 text-sm text-muted-foreground">
                            {plan.description}
                          </p>
                        )}
                        <div className="space-y-2">
                          {plan.workouts.length === 0 ? (
                            <p className="py-2 text-sm text-muted-foreground">
                              Este plan no tiene workouts
                            </p>
                          ) : (
                            plan.workouts.map((pw) => {
                              const isDone = planProgress?.has(pw.id) ?? false;
                              const isStarting = startingWorkoutId === pw.id;
                              return (
                                <div
                                  key={pw.id}
                                  className={cn(
                                    "rounded-md border px-3 py-2 flex items-center justify-between gap-2",
                                    isDone
                                      ? "border-green-200 bg-green-50"
                                      : "border-border"
                                  )}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      {isDone && (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                                      )}
                                      <p className="text-sm font-medium truncate">
                                        {pw.order}.{" "}
                                        {pw.template?.name ?? `Workout #${pw.template_id}`}
                                      </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {[
                                        pw.template?.modality &&
                                          MODALITY_LABEL[pw.template.modality],
                                        pw.template?.rounds &&
                                          `${pw.template.rounds} rondas`,
                                        pw.day != null && `Día ${pw.day}`,
                                        pw.template?.blocks.length &&
                                          `${pw.template.blocks.length} ejercicio${
                                            pw.template.blocks.length !== 1 ? "s" : ""
                                          }`,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </p>
                                  </div>
                                  {isSubscribed && pw.template_id && (
                                    <button
                                      onClick={() =>
                                        handleStartWorkout(pw.id, pw.template_id, pw.template)
                                      }
                                      disabled={isStarting}
                                      className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                    >
                                      {isStarting ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Play className="h-3 w-3" />
                                      )}
                                      Iniciar
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
                };

                return (
                  <>
                    {myPlans.map(renderPlan)}
                    {coachGroups.map((group) => (
                      <div key={group.coachId} className="space-y-2">
                        <div className="flex items-center gap-2 pt-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Coach: {group.coachName}
                          </p>
                          <div className="flex-1 border-t border-border" />
                        </div>
                        {group.plans.map(renderPlan)}
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
