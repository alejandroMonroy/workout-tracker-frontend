import { cn, formatDate, formatDuration } from "@/lib/utils";
import { api } from "@/services/api";
import type {
    BlockType,
    CoachRequest,
    Exercise,
    Plan,
    PlanListItem,
    SessionListItem,
    TrainingSummary,
    User,
    WorkoutModality,
} from "@/types/api";
import {
    Activity,
    BookOpen,
    Calendar,
    Check,
    ChevronDown,
    ChevronUp,
    Dumbbell,
    Loader2,
    Plus,
    Send,
    Trash2,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";

// ── Types ──

interface Athlete {
  id: number;
  athlete_id: number;
  athlete: User;
  status: string;
  created_at: string;
}

type Tab = "athletes" | "plans";

const BLOCK_TYPE_OPTIONS: { value: BlockType; label: string }[] = [
  { value: "warmup", label: "🔥 Calentamiento" },
  { value: "skill", label: "🎯 Técnica" },
  { value: "strength", label: "💪 Fuerza" },
  { value: "wod", label: "⚡ WOD" },
  { value: "cardio", label: "🏃 Cardio" },
  { value: "cooldown", label: "🧘 Vuelta a la calma" },
  { value: "other", label: "📋 Otro" },
];

const MODALITY_OPTIONS: { value: WorkoutModality; label: string }[] = [
  { value: "amrap", label: "AMRAP" },
  { value: "emom", label: "EMOM" },
  { value: "for_time", label: "For Time" },
  { value: "tabata", label: "Tabata" },
  { value: "custom", label: "Custom" },
];

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

// ══════════════════════════════════════════════
// Main CoachPage
// ══════════════════════════════════════════════

export default function CoachPage() {
  const [tab, setTab] = useState<Tab>("athletes");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
        <button
          onClick={() => setTab("athletes")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "athletes"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Users className="h-4 w-4" />
          Mis Atletas
        </button>
        <button
          onClick={() => setTab("plans")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "plans"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <BookOpen className="h-4 w-4" />
          Mis Planes
        </button>
      </div>

      {tab === "athletes" ? <AthletesTab /> : <PlansTab />}
    </div>
  );
}

// ══════════════════════════════════════════════
// Athletes Tab
// ══════════════════════════════════════════════

function AthletesTab() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState<number | null>(null);
  const [athleteSessions, setAthleteSessions] = useState<SessionListItem[]>([]);
  const [athleteStats, setAthleteSummary] = useState<TrainingSummary | null>(null);
  const [athletePlans, setAthletePlans] = useState<PlanListItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Assign plan state
  const [coachPlans, setCoachPlans] = useState<PlanListItem[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState("");

  // Athlete requests state
  const [requests, setRequests] = useState<CoachRequest[]>([]);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Athlete[]>("/api/coach/athletes"),
      api.get<CoachRequest[]>("/api/coach/requests/pending"),
    ])
      .then(([ath, reqs]) => {
        setAthletes(ath);
        setRequests(reqs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAcceptRequest = async (requestId: number) => {
    setRespondingId(requestId);
    try {
      await api.post(`/api/coach/requests/${requestId}/accept`);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      const list = await api.get<Athlete[]>("/api/coach/athletes");
      setAthletes(list);
    } catch {}
    setRespondingId(null);
  };

  const handleRejectRequest = async (requestId: number) => {
    setRespondingId(requestId);
    try {
      await api.post(`/api/coach/requests/${requestId}/reject`);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {}
    setRespondingId(null);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg("");
    try {
      await api.post("/api/coach/invite", { athlete_email: inviteEmail });
      setInviteMsg("✅ Invitación enviada");
      setInviteEmail("");
      const list = await api.get<Athlete[]>("/api/coach/athletes");
      setAthletes(list);
    } catch (err) {
      setInviteMsg(
        `❌ ${err instanceof Error ? err.message : "Error al invitar"}`,
      );
    } finally {
      setInviting(false);
    }
  };

  const viewAthlete = async (athleteId: number) => {
    setSelectedAthlete(athleteId);
    setDetailLoading(true);
    try {
      const [sessions, stats, plans] = await Promise.all([
        api.get<SessionListItem[]>(
          `/api/coach/athletes/${athleteId}/sessions?limit=10`,
        ),
        api.get<TrainingSummary>(
          `/api/coach/athletes/${athleteId}/stats?days=30`,
        ),
        api.get<PlanListItem[]>(
          `/api/coach/athletes/${athleteId}/plans`,
        ),
      ]);
      setAthleteSessions(sessions);
      setAthleteSummary(stats);
      setAthletePlans(plans);
    } catch {
      setAthleteSessions([]);
      setAthleteSummary(null);
      setAthletePlans([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const openAssignModal = async () => {
    setAssignMsg("");
    setShowAssignModal(true);
    try {
      const plans = await api.get<PlanListItem[]>("/api/plans?mine_only=true");
      setCoachPlans(plans);
    } catch {
      setCoachPlans([]);
    }
  };

  const handleAssignPlan = async (planId: number) => {
    if (!selectedAthlete) return;
    setAssigning(true);
    setAssignMsg("");
    try {
      await api.post(
        `/api/coach/assign-plan?plan_id=${planId}&athlete_id=${selectedAthlete}`,
      );
      setAssignMsg("✅ Plan asignado correctamente");
      const plans = await api.get<PlanListItem[]>(
        `/api/coach/athletes/${selectedAthlete}/plans`,
      );
      setAthletePlans(plans);
      setTimeout(() => setShowAssignModal(false), 1000);
    } catch (err) {
      setAssignMsg(
        `❌ ${err instanceof Error ? err.message : "Error al asignar"}`,
      );
    } finally {
      setAssigning(false);
    }
  };

  const activeAthletes = athletes.filter((a) => a.status === "active");
  const pendingAthletes = athletes.filter((a) => a.status === "pending");

  const selectedAthleteName =
    activeAthletes.find((a) => a.athlete_id === selectedAthlete)?.athlete
      .name ?? "";

  return (
    <>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6 text-primary" />
          Mis Atletas
        </h1>
        <p className="text-muted-foreground">
          Gestiona y supervisa a tus atletas
        </p>
      </div>

      {/* Invite */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <UserPlus className="h-4 w-4" />
          Invitar Atleta
        </h2>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="correo@atleta.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={handleInvite}
            disabled={inviting}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
            Invitar
          </button>
        </div>
        {inviteMsg && (
          <p className="mt-2 text-sm text-muted-foreground">{inviteMsg}</p>
        )}
      </div>

      {/* Athlete requests */}
      {requests.length > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-indigo-800">
            <Send className="h-4 w-4" />
            Solicitudes de atletas ({requests.length})
          </h2>
          <div className="space-y-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-md bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {req.athlete.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {req.athlete.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAcceptRequest(req.id)}
                    disabled={respondingId === req.id}
                    className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
                  >
                    {respondingId === req.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Aceptar
                  </button>
                  <button
                    onClick={() => handleRejectRequest(req.id)}
                    disabled={respondingId === req.id}
                    className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: athlete list */}
          <div className="space-y-4 lg:col-span-1">
            {pendingAthletes.length > 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <h3 className="mb-2 text-sm font-semibold text-yellow-700">
                  Pendientes ({pendingAthletes.length})
                </h3>
                {pendingAthletes.map((a) => (
                  <div key={a.id} className="py-1 text-sm text-yellow-800">
                    {a.athlete.name} — {a.athlete.email}
                  </div>
                ))}
              </div>
            )}

            {activeAthletes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No tienes atletas activos aún
              </p>
            ) : (
              activeAthletes.map((a) => (
                <button
                  key={a.id}
                  onClick={() => viewAthlete(a.athlete_id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedAthlete === a.athlete_id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-secondary/50"
                  }`}
                >
                  <p className="font-medium">{a.athlete.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.athlete.email}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Right: athlete detail */}
          <div className="lg:col-span-2">
            {selectedAthlete === null ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
                <p className="text-muted-foreground">
                  Selecciona un atleta para ver su progreso
                </p>
              </div>
            ) : detailLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary cards */}
                {athleteStats && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <Activity className="mb-1 h-4 w-4 text-primary" />
                      <p className="text-xl font-bold">
                        {athleteStats.total_sessions}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sesiones (30d)
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <Dumbbell className="mb-1 h-4 w-4 text-accent" />
                      <p className="text-xl font-bold">
                        {(athleteStats.total_volume_kg / 1000).toFixed(1)}t
                      </p>
                      <p className="text-xs text-muted-foreground">Volumen</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xl font-bold">
                        {athleteStats.total_sets}
                      </p>
                      <p className="text-xs text-muted-foreground">Series</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xl font-bold">
                        {athleteStats.avg_rpe?.toFixed(1) ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        RPE promedio
                      </p>
                    </div>
                  </div>
                )}

                {/* Assigned plans */}
                <div className="rounded-lg border border-border bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h3 className="font-semibold">Planes asignados</h3>
                    <button
                      onClick={openAssignModal}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Asignar plan
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {athletePlans.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No has asignado planes a este atleta
                      </p>
                    ) : (
                      athletePlans.map((plan) => (
                        <div
                          key={plan.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{plan.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {plan.session_count} sesiones
                              {plan.duration_weeks &&
                                ` · ${plan.duration_weeks} semanas`}
                            </p>
                          </div>
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Activo
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sessions */}
                <div className="rounded-lg border border-border bg-card shadow-sm">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="font-semibold">Sesiones recientes</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {athleteSessions.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                        Sin sesiones
                      </p>
                    ) : (
                      athleteSessions.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              Sesión #{s.id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(s.started_at)} · {s.exercise_count}{" "}
                              ejercicios · {s.set_count} series
                            </p>
                          </div>
                          {s.total_duration_sec && (
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(s.total_duration_sec)}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign plan modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Asignar plan a {selectedAthleteName}
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="rounded-md p-1 hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {assignMsg && (
              <p className="mb-3 text-sm text-muted-foreground">{assignMsg}</p>
            )}
            {coachPlans.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No tienes planes creados. Ve a la pestaña "Mis Planes" para
                crear uno.
              </p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {coachPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.session_count} sesiones
                        {plan.duration_weeks &&
                          ` · ${plan.duration_weeks} semanas`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAssignPlan(plan.id)}
                      disabled={assigning}
                      className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                    >
                      {assigning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Asignar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// Plans Tab
// ══════════════════════════════════════════════

// --- Form types ---

interface ExerciseForm {
  exercise_id: number;
  exercise_name: string;
  order: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  target_distance_m: number | null;
  target_duration_sec: number | null;
  rest_sec: number | null;
  notes: string;
}

interface BlockForm {
  name: string;
  block_type: BlockType;
  modality: WorkoutModality | null;
  rounds: number | null;
  time_cap_sec: number | null;
  work_sec: number | null;
  rest_sec: number | null;
  order: number;
  exercises: ExerciseForm[];
  collapsed: boolean;
}

interface SessionForm {
  name: string;
  description: string;
  day_number: number;
  blocks: BlockForm[];
  collapsed: boolean;
}

function PlansTab() {
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);
  const [expandedPlanData, setExpandedPlanData] = useState<Plan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Create form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState<string>("");
  const [sessions, setSessions] = useState<SessionForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState("");

  // Exercise search
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseResults, setExerciseResults] = useState<Exercise[]>([]);
  const [searchingExercises, setSearchingExercises] = useState(false);
  const [activeBlockRef, setActiveBlockRef] = useState<{
    sessionIdx: number;
    blockIdx: number;
  } | null>(null);

  const loadPlans = async () => {
    try {
      const result = await api.get<PlanListItem[]>("/api/plans?mine_only=true");
      setPlans(result);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

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

  const searchExercises = async (q: string) => {
    setExerciseSearch(q);
    if (q.length < 2) {
      setExerciseResults([]);
      return;
    }
    setSearchingExercises(true);
    try {
      const results = await api.get<Exercise[]>(
        `/api/exercises?search=${encodeURIComponent(q)}&limit=10`,
      );
      setExerciseResults(results);
    } catch {
      setExerciseResults([]);
    } finally {
      setSearchingExercises(false);
    }
  };

  // --- Session management ---

  const addSession = () => {
    setSessions((prev) => [
      ...prev,
      {
        name: `Sesión ${prev.length + 1}`,
        description: "",
        day_number: prev.length + 1,
        blocks: [],
        collapsed: false,
      },
    ]);
  };

  const removeSession = (idx: number) => {
    setSessions((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, day_number: i + 1 })),
    );
  };

  const updateSession = (
    idx: number,
    field: keyof SessionForm,
    value: string | number,
  ) => {
    setSessions((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  };

  const toggleSessionCollapse = (idx: number) => {
    setSessions((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, collapsed: !s.collapsed } : s,
      ),
    );
  };

  // --- Block management ---

  const addBlock = (sessionIdx: number) => {
    setSessions((prev) =>
      prev.map((s, si) =>
        si === sessionIdx
          ? {
              ...s,
              blocks: [
                ...s.blocks,
                {
                  name: "Nuevo bloque",
                  block_type: "wod" as BlockType,
                  modality: null,
                  rounds: null,
                  time_cap_sec: null,
                  work_sec: null,
                  rest_sec: null,
                  order: s.blocks.length + 1,
                  exercises: [],
                  collapsed: false,
                },
              ],
            }
          : s,
      ),
    );
  };

  const removeBlock = (sessionIdx: number, blockIdx: number) => {
    setSessions((prev) =>
      prev.map((s, si) =>
        si === sessionIdx
          ? {
              ...s,
              blocks: s.blocks
                .filter((_, bi) => bi !== blockIdx)
                .map((b, i) => ({ ...b, order: i + 1 })),
            }
          : s,
      ),
    );
  };

  const updateBlock = (
    sessionIdx: number,
    blockIdx: number,
    field: keyof BlockForm,
    value: string | number | null,
  ) => {
    setSessions((prev) =>
      prev.map((s, si) =>
        si === sessionIdx
          ? {
              ...s,
              blocks: s.blocks.map((b, bi) =>
                bi === blockIdx ? { ...b, [field]: value } : b,
              ),
            }
          : s,
      ),
    );
  };

  const toggleBlockCollapse = (sessionIdx: number, blockIdx: number) => {
    setSessions((prev) =>
      prev.map((s, si) =>
        si === sessionIdx
          ? {
              ...s,
              blocks: s.blocks.map((b, bi) =>
                bi === blockIdx ? { ...b, collapsed: !b.collapsed } : b,
              ),
            }
          : s,
      ),
    );
  };

  // --- Exercise management ---

  const addExercise = (
    sessionIdx: number,
    blockIdx: number,
    exercise: Exercise,
  ) => {
    setSessions((prev) =>
      prev.map((s, si) =>
        si === sessionIdx
          ? {
              ...s,
              blocks: s.blocks.map((b, bi) =>
                bi === blockIdx
                  ? {
                      ...b,
                      exercises: [
                        ...b.exercises,
                        {
                          exercise_id: exercise.id,
                          exercise_name: exercise.name,
                          order: b.exercises.length + 1,
                          target_sets: null,
                          target_reps: 10,
                          target_weight_kg: null,
                          target_distance_m: null,
                          target_duration_sec: null,
                          rest_sec: null,
                          notes: "",
                        },
                      ],
                    }
                  : b,
              ),
            }
          : s,
      ),
    );
    setExerciseSearch("");
    setExerciseResults([]);
    setActiveBlockRef(null);
  };

  const removeExercise = (
    sessionIdx: number,
    blockIdx: number,
    exIdx: number,
  ) => {
    setSessions((prev) =>
      prev.map((s, si) =>
        si === sessionIdx
          ? {
              ...s,
              blocks: s.blocks.map((b, bi) =>
                bi === blockIdx
                  ? {
                      ...b,
                      exercises: b.exercises
                        .filter((_, ei) => ei !== exIdx)
                        .map((e, i) => ({ ...e, order: i + 1 })),
                    }
                  : b,
              ),
            }
          : s,
      ),
    );
  };

  const updateExercise = (
    sessionIdx: number,
    blockIdx: number,
    exIdx: number,
    field: keyof ExerciseForm,
    value: string | number | null,
  ) => {
    setSessions((prev) =>
      prev.map((s, si) =>
        si === sessionIdx
          ? {
              ...s,
              blocks: s.blocks.map((b, bi) =>
                bi === blockIdx
                  ? {
                      ...b,
                      exercises: b.exercises.map((e, ei) =>
                        ei === exIdx ? { ...e, [field]: value } : e,
                      ),
                    }
                  : b,
              ),
            }
          : s,
      ),
    );
  };

  // --- Form actions ---

  const resetForm = () => {
    setName("");
    setDescription("");
    setDurationWeeks("");
    setSessions([]);
    setFormMsg("");
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setFormMsg("❌ El nombre es obligatorio");
      return;
    }
    if (sessions.length === 0) {
      setFormMsg("❌ Añade al menos una sesión");
      return;
    }
    for (const s of sessions) {
      if (s.blocks.length === 0) {
        setFormMsg(`❌ La sesión "${s.name}" necesita al menos un bloque`);
        return;
      }
      for (const b of s.blocks) {
        if (b.exercises.length === 0) {
          setFormMsg(
            `❌ El bloque "${b.name}" en "${s.name}" necesita al menos un ejercicio`,
          );
          return;
        }
      }
    }

    setSaving(true);
    setFormMsg("");
    try {
      await api.post("/api/plans", {
        name: name.trim(),
        description: description.trim() || null,
        duration_weeks: durationWeeks ? parseInt(durationWeeks) : null,
        is_public: false,
        sessions: sessions.map((s) => ({
          name: s.name,
          description: s.description || null,
          day_number: s.day_number,
          blocks: s.blocks.map((b) => ({
            name: b.name,
            block_type: b.block_type,
            modality: b.modality,
            rounds: b.rounds,
            time_cap_sec: b.time_cap_sec,
            work_sec: b.work_sec,
            rest_sec: b.rest_sec,
            order: b.order,
            exercises: b.exercises.map((e) => ({
              exercise_id: e.exercise_id,
              order: e.order,
              target_sets: e.target_sets,
              target_reps: e.target_reps,
              target_weight_kg: e.target_weight_kg,
              target_distance_m: e.target_distance_m,
              target_duration_sec: e.target_duration_sec,
              rest_sec: e.rest_sec,
              notes: e.notes || null,
            })),
          })),
        })),
      });
      setFormMsg("✅ Plan creado");
      resetForm();
      setShowForm(false);
      await loadPlans();
    } catch (err) {
      setFormMsg(
        `❌ ${err instanceof Error ? err.message : "Error al crear"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este plan?")) return;
    try {
      await api.delete(`/api/plans/${id}`);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      if (expandedPlan === id) {
        setExpandedPlan(null);
        setExpandedPlanData(null);
      }
    } catch {
      /* empty */
    }
  };

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BookOpen className="h-6 w-6 text-primary" />
            Mis Planes
          </h1>
          <p className="text-muted-foreground">
            Crea planificaciones y asígnalas a tus atletas
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuevo plan
        </button>
      </div>

      {/* Create plan form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Crear plan</h2>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md p-1 hover:bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Plan metadata */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nombre *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Programa CrossFit Enero"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Descripción
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción opcional"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Duración (semanas)
                </label>
                <input
                  type="number"
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(e.target.value)}
                  placeholder="Opcional"
                  min={1}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Sessions */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">
                  Sesiones de entrenamiento
                </label>
                <button
                  onClick={addSession}
                  className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Añadir sesión
                </button>
              </div>

              {sessions.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Añade sesiones de entrenamiento a tu plan
                </p>
              )}

              <div className="space-y-3">
                {sessions.map((session, sIdx) => (
                  <div
                    key={sIdx}
                    className="rounded-lg border border-border bg-white shadow-sm"
                  >
                    {/* Session header */}
                    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                      <button
                        onClick={() => toggleSessionCollapse(sIdx)}
                        className="rounded p-0.5 hover:bg-secondary"
                      >
                        {session.collapsed ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </button>
                      <Calendar className="h-4 w-4 text-primary" />
                      <input
                        value={session.name}
                        onChange={(e) =>
                          updateSession(sIdx, "name", e.target.value)
                        }
                        className="flex-1 border-none bg-transparent text-sm font-medium focus:outline-none"
                        placeholder="Nombre de la sesión"
                      />
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        Día {session.day_number}
                      </span>
                      <button
                        onClick={() => removeSession(sIdx)}
                        className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {!session.collapsed && (
                      <div className="space-y-3 p-4">
                        <input
                          value={session.description}
                          onChange={(e) =>
                            updateSession(sIdx, "description", e.target.value)
                          }
                          placeholder="Descripción de la sesión (opcional)"
                          className="w-full rounded-md border border-border px-3 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />

                        {/* Blocks */}
                        {session.blocks.map((block, bIdx) => (
                          <div
                            key={bIdx}
                            className={cn(
                              "rounded-lg border-2 p-3",
                              BLOCK_TYPE_COLORS[block.block_type] ??
                                BLOCK_TYPE_COLORS.other,
                            )}
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <button
                                onClick={() =>
                                  toggleBlockCollapse(sIdx, bIdx)
                                }
                                className="rounded p-0.5 hover:bg-white/50"
                              >
                                {block.collapsed ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <input
                                value={block.name}
                                onChange={(e) =>
                                  updateBlock(
                                    sIdx,
                                    bIdx,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                className="flex-1 border-none bg-transparent text-sm font-medium focus:outline-none"
                              />
                              <select
                                value={block.block_type}
                                onChange={(e) =>
                                  updateBlock(
                                    sIdx,
                                    bIdx,
                                    "block_type",
                                    e.target.value,
                                  )
                                }
                                className="rounded border border-white/30 bg-white/50 px-2 py-0.5 text-xs"
                              >
                                {BLOCK_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => removeBlock(sIdx, bIdx)}
                                className="rounded p-1 hover:bg-white/50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {!block.collapsed && (
                              <>
                                {/* Modality config — available for ALL block types */}
                                <div className="mb-2 flex flex-wrap gap-2">
                                  <select
                                    value={block.modality ?? ""}
                                    onChange={(e) =>
                                      updateBlock(
                                        sIdx,
                                        bIdx,
                                        "modality",
                                        e.target.value || null,
                                      )
                                    }
                                    className="rounded border border-white/30 bg-white/50 px-2 py-1 text-xs"
                                  >
                                    <option value="">Modalidad</option>
                                    {MODALITY_OPTIONS.map((opt) => (
                                      <option
                                        key={opt.value}
                                        value={opt.value}
                                      >
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>

                                  {/* AMRAP: time cap */}
                                  {block.modality === "amrap" && (
                                    <input
                                      type="number"
                                      value={
                                        block.time_cap_sec
                                          ? block.time_cap_sec / 60
                                          : ""
                                      }
                                      onChange={(e) =>
                                        updateBlock(
                                          sIdx,
                                          bIdx,
                                          "time_cap_sec",
                                          e.target.value
                                            ? parseInt(e.target.value) * 60
                                            : null,
                                        )
                                      }
                                      placeholder="Dur. (min)"
                                      className="w-24 rounded border border-white/30 bg-white/50 px-2 py-1 text-center text-xs"
                                      min={1}
                                    />
                                  )}

                                  {/* EMOM: interval + rounds */}
                                  {block.modality === "emom" && (
                                    <>
                                      <input
                                        type="number"
                                        value={
                                          block.time_cap_sec
                                            ? block.time_cap_sec / 60
                                            : ""
                                        }
                                        onChange={(e) =>
                                          updateBlock(
                                            sIdx,
                                            bIdx,
                                            "time_cap_sec",
                                            e.target.value
                                              ? parseInt(e.target.value) * 60
                                              : null,
                                          )
                                        }
                                        placeholder="Dur. (min)"
                                        className="w-24 rounded border border-white/30 bg-white/50 px-2 py-1 text-center text-xs"
                                        min={1}
                                      />
                                      <input
                                        type="number"
                                        value={block.rounds ?? ""}
                                        onChange={(e) =>
                                          updateBlock(
                                            sIdx,
                                            bIdx,
                                            "rounds",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="Rondas"
                                        className="w-20 rounded border border-white/30 bg-white/50 px-2 py-1 text-center text-xs"
                                        min={1}
                                      />
                                    </>
                                  )}

                                  {/* For Time: time cap (optional) + rounds */}
                                  {block.modality === "for_time" && (
                                    <>
                                      <input
                                        type="number"
                                        value={
                                          block.time_cap_sec
                                            ? block.time_cap_sec / 60
                                            : ""
                                        }
                                        onChange={(e) =>
                                          updateBlock(
                                            sIdx,
                                            bIdx,
                                            "time_cap_sec",
                                            e.target.value
                                              ? parseInt(e.target.value) * 60
                                              : null,
                                          )
                                        }
                                        placeholder="Cap (min)"
                                        className="w-24 rounded border border-white/30 bg-white/50 px-2 py-1 text-center text-xs"
                                        min={1}
                                      />
                                      <input
                                        type="number"
                                        value={block.rounds ?? ""}
                                        onChange={(e) =>
                                          updateBlock(
                                            sIdx,
                                            bIdx,
                                            "rounds",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="Rondas"
                                        className="w-20 rounded border border-white/30 bg-white/50 px-2 py-1 text-center text-xs"
                                        min={1}
                                      />
                                    </>
                                  )}

                                  {/* Tabata: work + rest + rounds */}
                                  {block.modality === "tabata" && (
                                    <>
                                      <input
                                        type="number"
                                        value={block.work_sec ?? ""}
                                        onChange={(e) =>
                                          updateBlock(
                                            sIdx,
                                            bIdx,
                                            "work_sec",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="Trabajo (s)"
                                        className="w-24 rounded border border-white/30 bg-white/50 px-2 py-1 text-center text-xs"
                                        min={5}
                                      />
                                      <input
                                        type="number"
                                        value={block.rest_sec ?? ""}
                                        onChange={(e) =>
                                          updateBlock(
                                            sIdx,
                                            bIdx,
                                            "rest_sec",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="Descanso (s)"
                                        className="w-24 rounded border border-white/30 bg-white/50 px-2 py-1 text-center text-xs"
                                        min={5}
                                      />
                                      <input
                                        type="number"
                                        value={block.rounds ?? ""}
                                        onChange={(e) =>
                                          updateBlock(
                                            sIdx,
                                            bIdx,
                                            "rounds",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="Rondas"
                                        className="w-20 rounded border border-white/30 bg-white/50 px-2 py-1 text-center text-xs"
                                        min={1}
                                      />
                                    </>
                                  )}
                                </div>

                                {/* Exercises */}
                                <div className="space-y-1.5">
                                  {block.exercises.map((ex, eIdx) => (
                                    <div
                                      key={eIdx}
                                      className="flex flex-wrap items-center gap-1.5 rounded bg-white/60 p-2"
                                    >
                                      <span className="text-xs font-bold opacity-50">
                                        {ex.order}.
                                      </span>
                                      <span className="min-w-0 flex-1 truncate text-xs font-medium">
                                        {ex.exercise_name}
                                      </span>
                                      <input
                                        type="number"
                                        value={ex.target_reps ?? ""}
                                        onChange={(e) =>
                                          updateExercise(
                                            sIdx,
                                            bIdx,
                                            eIdx,
                                            "target_reps",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="reps"
                                        className="w-14 rounded border px-1.5 py-0.5 text-center text-xs"
                                        min={1}
                                      />
                                      <input
                                        type="number"
                                        value={ex.target_weight_kg ?? ""}
                                        onChange={(e) =>
                                          updateExercise(
                                            sIdx,
                                            bIdx,
                                            eIdx,
                                            "target_weight_kg",
                                            e.target.value
                                              ? parseFloat(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="kg"
                                        className="w-14 rounded border px-1.5 py-0.5 text-center text-xs"
                                        step={0.5}
                                      />
                                      <input
                                        value={ex.notes}
                                        onChange={(e) =>
                                          updateExercise(
                                            sIdx,
                                            bIdx,
                                            eIdx,
                                            "notes",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Notas"
                                        className="w-20 flex-1 rounded border px-1.5 py-0.5 text-xs"
                                      />
                                      <button
                                        onClick={() =>
                                          removeExercise(sIdx, bIdx, eIdx)
                                        }
                                        className="rounded p-0.5 hover:bg-red-100"
                                      >
                                        <Trash2 className="h-3 w-3 text-red-400" />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                {/* Add exercise search */}
                                <div className="relative mt-2">
                                  <input
                                    value={
                                      activeBlockRef?.sessionIdx === sIdx &&
                                      activeBlockRef?.blockIdx === bIdx
                                        ? exerciseSearch
                                        : ""
                                    }
                                    onFocus={() =>
                                      setActiveBlockRef({
                                        sessionIdx: sIdx,
                                        blockIdx: bIdx,
                                      })
                                    }
                                    onChange={(e) =>
                                      searchExercises(e.target.value)
                                    }
                                    placeholder="+ Buscar ejercicio..."
                                    className="w-full rounded border border-dashed border-white/40 bg-white/30 px-2 py-1 text-xs placeholder:text-current/50 focus:border-white/60 focus:outline-none"
                                  />
                                  {searchingExercises &&
                                    activeBlockRef?.sessionIdx === sIdx &&
                                    activeBlockRef?.blockIdx === bIdx && (
                                      <Loader2 className="absolute right-2 top-1.5 h-3 w-3 animate-spin" />
                                    )}
                                  {exerciseResults.length > 0 &&
                                    activeBlockRef?.sessionIdx === sIdx &&
                                    activeBlockRef?.blockIdx === bIdx && (
                                      <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-white shadow-lg">
                                        {exerciseResults.map((ex) => (
                                          <button
                                            key={ex.id}
                                            onClick={() =>
                                              addExercise(sIdx, bIdx, ex)
                                            }
                                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-secondary"
                                          >
                                            <Plus className="h-3 w-3 text-primary" />
                                            <span>{ex.name}</span>
                                            <span className="ml-auto text-[10px] text-muted-foreground">
                                              {ex.type}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                </div>
                              </>
                            )}
                          </div>
                        ))}

                        <button
                          onClick={() => addBlock(sIdx)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Añadir bloque
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {formMsg && (
              <p className="text-sm text-muted-foreground">{formMsg}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans list */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : plans.length === 0 && !showForm ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No tienes planes aún. ¡Crea tu primero!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-lg border border-border bg-card shadow-sm"
            >
              <div
                className="flex cursor-pointer items-center justify-between p-5"
                onClick={() => loadPlanDetail(plan.id)}
              >
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  {plan.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                      {plan.description}
                    </p>
                  )}
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span>
                      <Calendar className="mr-1 inline h-3 w-3" />
                      {plan.session_count} sesiones
                    </span>
                    {plan.duration_weeks && (
                      <span>{plan.duration_weeks} semanas</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(plan.id);
                    }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {expandedPlan === plan.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {expandedPlan === plan.id && (
                <div className="border-t border-border px-5 pb-5">
                  {loadingPlan ? (
                    <div className="flex h-24 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : expandedPlanData ? (
                    <div className="mt-4 space-y-3">
                      {expandedPlanData.sessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Este plan no tiene sesiones aún.
                        </p>
                      ) : (
                        expandedPlanData.sessions.map((s) => (
                          <div
                            key={s.id}
                            className="rounded-lg border border-border bg-secondary/30 p-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                Día {s.day_number}
                              </span>
                              <p className="text-sm font-medium">{s.name}</p>
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
                                    <span className="text-xs font-semibold">
                                      {b.name}
                                    </span>
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
                                    {b.rounds && (
                                      <span className="text-[10px]">
                                        {b.rounds} rondas
                                      </span>
                                    )}
                                    {b.time_cap_sec && (
                                      <span className="text-[10px]">
                                        Cap: {Math.floor(b.time_cap_sec / 60)}
                                        min
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 space-y-0.5">
                                    {b.exercises.map((e) => (
                                      <p
                                        key={e.id}
                                        className="text-[11px] opacity-80"
                                      >
                                        {e.order}.{" "}
                                        {e.exercise?.name ??
                                          `Ejercicio #${e.exercise_id}`}
                                        {e.target_reps &&
                                          ` × ${e.target_reps}`}
                                        {e.target_weight_kg &&
                                          ` @ ${e.target_weight_kg}kg`}
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
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
