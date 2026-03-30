import { formatDate } from "@/lib/utils";
import { api } from "@/services/api";
import type {
  Competition,
  CompetitionLeaderboardEntry,
  CompetitionPlace,
  CompetitionWorkout,
  SessionListItem,
  WorkoutResultEntry,
} from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import {
  CalendarDays,
  CheckCircle,
  MapPin,
  Medal,
  Plus,
  Trash2,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// ── Manage Places Panel (creator only) ───────────────────────────────────────

function PlacesPanel({
  competition,
  onPlaceAdded,
  onPlaceRemoved,
}: {
  competition: Competition;
  onPlaceAdded: (p: CompetitionPlace) => void;
  onPlaceRemoved: (placeId: number) => void;
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const p = await api.post<CompetitionPlace>(`/api/competitions/${competition.id}/places`, { name });
      onPlaceAdded(p);
      setNewName("");
    } catch {
      /* silent */
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (placeId: number) => {
    try {
      await api.delete(`/api/competitions/${competition.id}/places/${placeId}`);
      onPlaceRemoved(placeId);
    } catch {
      /* silent */
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold flex items-center gap-1.5">
        <MapPin className="h-4 w-4 text-primary" />
        Sedes
      </h3>

      {competition.places.length === 0 ? (
        <p className="mb-3 text-xs text-muted-foreground">Sin sedes definidas. Los workouts requieren al menos una.</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {competition.places.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{p.name}</span>
              <button
                onClick={() => handleRemove(p.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nombre de la sede..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim() || adding}
          className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir
        </button>
      </div>
    </div>
  );
}

// ── Add Workout Dialog (creator only) ─────────────────────────────────────────

function AddWorkoutDialog({
  competition,
  onAdded,
  onClose,
}: {
  competition: Competition;
  onAdded: (w: CompetitionWorkout) => void;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({ template_id: 0, init_time: "", order: 0, notes: "" });
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ id: number; name: string }[]>("/api/templates")
      .then(setTemplates)
      .catch(() => {});
  }, []);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const togglePlace = (id: number) =>
    setSelectedPlaceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleAdd = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const w = await api.post<CompetitionWorkout>(
        `/api/competitions/${competition.id}/workouts`,
        {
          ...form,
          template_id: Number(form.template_id),
          order: Number(form.order),
          init_time: new Date(form.init_time).toISOString(),
          notes: form.notes || null,
          place_ids: selectedPlaceIds,
        },
      );
      onAdded(w);
    } catch (e: unknown) {
      const msg = (e as { detail?: string })?.detail ?? "Error al añadir workout";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const valid = form.template_id > 0 && form.init_time && selectedPlaceIds.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Añadir workout</h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Plantilla</label>
            <select
              value={form.template_id}
              onChange={(e) => set("template_id", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={0}>Seleccionar plantilla...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Fecha y hora de inicio</label>
            <input
              type="datetime-local"
              value={form.init_time}
              onChange={(e) => set("init_time", e.target.value)}
              min={competition.init_date.slice(0, 16)}
              max={competition.end_date.slice(0, 16)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Entre {formatDate(competition.init_date)} y {formatDate(competition.end_date)}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Sedes <span className="text-destructive">*</span>
            </label>
            {competition.places.length === 0 ? (
              <p className="text-xs text-destructive">Añade sedes a la competición antes de crear workouts.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {competition.places.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlace(p.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selectedPlaceIds.includes(p.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Orden</label>
            <input
              type="number"
              min={0}
              value={form.order}
              onChange={(e) => set("order", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border py-2 text-sm hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            disabled={!valid || submitting}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Añadiendo..." : "Añadir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Submit Session Dialog ─────────────────────────────────────────────────────

function SubmitSessionDialog({
  competitionId,
  workoutId,
  onSubmitted,
  onClose,
}: {
  competitionId: number;
  workoutId: number;
  onSubmitted: (r: WorkoutResultEntry) => void;
  onClose: () => void;
}) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SessionListItem[]>("/api/sessions?limit=50")
      .then((all) => setSessions(all.filter((s) => s.finished_at !== null)))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.post<WorkoutResultEntry>(
        `/api/competitions/${competitionId}/workouts/${workoutId}/submit`,
        { session_id: selectedId },
      );
      onSubmitted(result);
    } catch (e: unknown) {
      const msg = (e as { detail?: string })?.detail ?? "Error al enviar resultado";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold">Enviar resultado</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Selecciona la sesión completada que quieres presentar.
        </p>

        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tienes sesiones completadas.</p>
        ) : (
          <div className="max-h-48 overflow-y-auto rounded-md border border-border">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary ${
                  selectedId === s.id ? "bg-primary/10 font-medium" : ""
                }`}
              >
                <span>#{s.id} — {formatDate(s.started_at)}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {s.set_count} series
                </span>
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border py-2 text-sm hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedId || submitting}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Workout Row ───────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  validated: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  validated: "Validado",
  rejected: "Rechazado",
};

function WorkoutRow({
  workout,
  competitionId,
  isSubscribed,
  isCreator,
  onResultSubmitted,
  onRemove,
}: {
  workout: CompetitionWorkout;
  competitionId: number;
  isSubscribed: boolean;
  isCreator: boolean;
  onResultSubmitted: (workoutId: number, r: WorkoutResultEntry) => void;
  onRemove: (workoutId: number) => void;
}) {
  const [showSubmit, setShowSubmit] = useState(false);
  const [results, setResults] = useState<WorkoutResultEntry[] | null>(null);
  const [myResult, setMyResult] = useState<WorkoutResultEntry | null>(null);
  const { user } = useAuth();

  const loadResults = async () => {
    try {
      const data = await api.get<WorkoutResultEntry[]>(
        `/api/competitions/${competitionId}/workouts/${workout.id}/results`,
      );
      setResults(data);
      setMyResult(data.find((r) => r.athlete_id === user?.id) ?? null);
    } catch {
      /* silent */
    }
  };

  const handleResultSubmitted = (r: WorkoutResultEntry) => {
    setMyResult(r);
    setShowSubmit(false);
    onResultSubmitted(workout.id, r);
    setResults(null);
  };

  const handleRemove = async () => {
    try {
      await api.delete(`/api/competitions/${competitionId}/workouts/${workout.id}`);
      onRemove(workout.id);
    } catch {
      /* silent */
    }
  };

  const handleValidate = async (resultId: number) => {
    try {
      const updated = await api.post<WorkoutResultEntry>(
        `/api/competitions/${competitionId}/workouts/${workout.id}/results/${resultId}/validate`,
        {},
      );
      setResults((prev) => prev?.map((r) => (r.id === resultId ? updated : r)) ?? null);
    } catch {
      /* silent */
    }
  };

  const handleReject = async (resultId: number) => {
    try {
      const updated = await api.post<WorkoutResultEntry>(
        `/api/competitions/${competitionId}/workouts/${workout.id}/results/${resultId}/reject`,
        {},
      );
      setResults((prev) => prev?.map((r) => (r.id === resultId ? updated : r)) ?? null);
    } catch {
      /* silent */
    }
  };

  const workoutStarted = new Date() >= new Date(workout.init_time);

  return (
    <>
      {showSubmit && (
        <SubmitSessionDialog
          competitionId={competitionId}
          workoutId={workout.id}
          onSubmitted={handleResultSubmitted}
          onClose={() => setShowSubmit(false)}
        />
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{workout.template_name}</span>
              {myResult && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[myResult.status]}`}>
                  {STATUS_LABEL[myResult.status]}
                  {myResult.status === "validated" && myResult.position !== null && (
                    <> · #{myResult.position} · +{myResult.xp_awarded} XP</>
                  )}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDate(workout.init_time)}
              </span>
              {workout.places.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {workout.places.map((p) => p.name).join(", ")}
                </span>
              )}
            </div>

            {workout.notes && (
              <p className="mt-1 text-xs text-muted-foreground">{workout.notes}</p>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            {isSubscribed && !myResult && workoutStarted && (
              <button
                onClick={() => setShowSubmit(true)}
                className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/90"
              >
                Enviar resultado
              </button>
            )}
            <button
              onClick={loadResults}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary"
            >
              {isCreator ? "Gestionar resultados" : "Ver resultados"}
            </button>
            {isCreator && (
              <button
                onClick={handleRemove}
                className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>

        {results !== null && (
          <div className="mt-3 border-t border-border pt-3">
            {results.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin resultados aún</p>
            ) : (
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <span className="w-5 text-center font-bold text-muted-foreground">
                      {r.status === "validated" && r.position !== null
                        ? r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : `#${r.position}`
                        : "–"}
                    </span>
                    <span className="flex-1 font-medium">{r.athlete_name}</span>
                    <span className="text-muted-foreground">{formatDate(r.finished_at)}</span>
                    <span className={`rounded-full px-1.5 py-0.5 font-medium ${STATUS_BADGE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.status === "validated" && (
                      <span className="text-primary font-semibold">+{r.xp_awarded} XP</span>
                    )}
                    {isCreator && r.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleValidate(r.id)}
                          className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Validar
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Rechazar
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════
// Main CompetitionDetailPage
// ══════════════════════════════════════════════════

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [leaderboard, setLeaderboard] = useState<CompetitionLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"workouts" | "leaderboard">("workouts");
  const [showAddWorkout, setShowAddWorkout] = useState(false);

  const isCreator = user?.id === competition?.created_by;
  const isSubscribed = competition?.is_subscribed ?? false;

  useEffect(() => {
    if (!id) return;
    api.get<Competition>(`/api/competitions/${id}`)
      .then(setCompetition)
      .catch(() => navigate("/competitions"))
      .finally(() => setLoading(false));
  }, [id]);

  const loadLeaderboard = async () => {
    if (!id) return;
    try {
      const data = await api.get<CompetitionLeaderboardEntry[]>(`/api/competitions/${id}/leaderboard`);
      setLeaderboard(data);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    if (activeTab === "leaderboard") loadLeaderboard();
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!competition) return null;

  const handlePlaceAdded = (p: CompetitionPlace) => {
    setCompetition((prev) => prev ? { ...prev, places: [...prev.places, p] } : prev);
  };

  const handlePlaceRemoved = (placeId: number) => {
    setCompetition((prev) =>
      prev ? { ...prev, places: prev.places.filter((p) => p.id !== placeId) } : prev,
    );
  };

  const handleWorkoutAdded = (w: CompetitionWorkout) => {
    setCompetition((prev) => prev ? { ...prev, workouts: [...prev.workouts, w] } : prev);
    setShowAddWorkout(false);
  };

  const handleWorkoutRemoved = (workoutId: number) => {
    setCompetition((prev) =>
      prev ? { ...prev, workouts: prev.workouts.filter((w) => w.id !== workoutId) } : prev,
    );
  };

  return (
    <div className="space-y-6">
      {showAddWorkout && (
        <AddWorkoutDialog
          competition={competition}
          onAdded={handleWorkoutAdded}
          onClose={() => setShowAddWorkout(false)}
        />
      )}

      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/competitions")}
          className="mb-3 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Volver a competiciones
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Trophy className="h-6 w-6 text-primary" />
              {competition.name}
            </h1>
            {competition.description && (
              <p className="mt-1 text-sm text-muted-foreground">{competition.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {competition.location}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDate(competition.init_date)} – {formatDate(competition.end_date)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {competition.subscriber_count} participantes
              </span>
            </div>
          </div>
          {isCreator && (
            <button
              onClick={() => setShowAddWorkout(true)}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              + Añadir workout
            </button>
          )}
        </div>
      </div>

      {/* Places management (creator only) */}
      {isCreator && (
        <PlacesPanel
          competition={competition}
          onPlaceAdded={handlePlaceAdded}
          onPlaceRemoved={handlePlaceRemoved}
        />
      )}

      {/* Places display (non-creator) */}
      {!isCreator && competition.places.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {competition.places.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
            >
              <MapPin className="h-3 w-3" />
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/30 p-1">
        {(["workouts", "leaderboard"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "workouts" ? (
              <><CalendarDays className="h-4 w-4" /> Workouts ({competition.workouts.length})</>
            ) : (
              <><Medal className="h-4 w-4" /> Clasificación</>
            )}
          </button>
        ))}
      </div>

      {/* Workouts tab */}
      {activeTab === "workouts" && (
        <div className="space-y-3">
          {competition.workouts.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                {isCreator ? "Añade workouts a esta competición" : "No hay workouts aún"}
              </p>
            </div>
          ) : (
            competition.workouts.map((w) => (
              <WorkoutRow
                key={w.id}
                workout={w}
                competitionId={competition.id}
                isSubscribed={isSubscribed}
                isCreator={isCreator}
                onResultSubmitted={() => loadLeaderboard()}
                onRemove={handleWorkoutRemoved}
              />
            ))
          )}
        </div>
      )}

      {/* Leaderboard tab */}
      {activeTab === "leaderboard" && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">Sin participantes aún</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Atleta</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Workouts</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">XP total</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.athlete_id}
                    className={`border-b border-border last:border-0 ${
                      entry.athlete_id === user?.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-muted-foreground">
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {entry.athlete_name}
                      {entry.athlete_id === user?.id && (
                        <span className="ml-1.5 text-xs text-primary">(tú)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {entry.workouts_completed}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      +{entry.total_xp} XP
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
