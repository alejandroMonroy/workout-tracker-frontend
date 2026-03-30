import { formatDate } from "@/lib/utils";
import { api } from "@/services/api";
import type { AthletePublic, Challenge, SessionListItem } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import {
  CheckCircle,
  Clock,
  Swords,
  Trophy,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptado",
  declined: "Rechazado",
  cancelled: "Cancelado",
  completed: "Completado",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  declined: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-700",
  completed: "bg-green-100 text-green-800",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ── Create Challenge Dialog ───────────────────────────────────────────────────

function CreateChallengeDialog({
  onCreated,
  onClose,
}: {
  onCreated: (c: Challenge) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [athletes, setAthletes] = useState<AthletePublic[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<AthletePublic | null>(null);
  const [wager, setWager] = useState(100);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SessionListItem[]>("/api/sessions?limit=50")
      .then((all) => setSessions(all.filter((s) => s.finished_at !== null)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (search.trim().length < 2) {
      setAthletes([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get<AthletePublic[]>(`/api/athletes?search=${encodeURIComponent(search)}&limit=10`)
        .then(setAthletes)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async () => {
    if (!selectedOpponent || !selectedSessionId) return;
    setSubmitting(true);
    setError(null);
    try {
      const c = await api.post<Challenge>("/api/challenges", {
        challenged_id: selectedOpponent.id,
        wager_xp: wager,
        session_id: selectedSessionId,
      });
      onCreated(c);
    } catch (e: unknown) {
      const msg = (e as { detail?: string })?.detail ?? "Error al crear el desafío";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          Nuevo Desafío
        </h2>

        {/* Opponent search */}
        {!selectedOpponent ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Buscar atleta</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre del oponente..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {athletes.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                {athletes.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedOpponent(a); setSearch(""); }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <span className="font-medium">{a.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">Nv.{a.level}</span>
                  </button>
                ))}
              </div>
            )}
            {search.trim().length >= 2 && athletes.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin resultados</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2">
              <span className="font-medium">{selectedOpponent.name}</span>
              <button
                onClick={() => setSelectedOpponent(null)}
                className="ml-auto text-xs text-muted-foreground hover:text-destructive"
              >
                Cambiar
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Apuesta (XP)</label>
              <input
                type="number"
                min={1}
                value={wager}
                onChange={(e) => setWager(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                El ganador se lleva {wager * 2} XP en total
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Sesión a presentar</label>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tienes sesiones completadas para presentar.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSessionId(s.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary ${
                        selectedSessionId === s.id ? "bg-primary/10 font-medium" : ""
                      }`}
                    >
                      <span>#{s.id} — {formatDate(s.started_at)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {s.set_count} series · {s.exercise_count} ejercicios
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border py-2 text-sm hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedOpponent || !selectedSessionId || submitting}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Desafiar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Submit Session Dialog ─────────────────────────────────────────────────────

function SubmitSessionDialog({
  challenge,
  onSubmitted,
  onClose,
}: {
  challenge: Challenge;
  onSubmitted: (c: Challenge) => void;
  onClose: () => void;
}) {
  const [sessionId, setSessionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const id = parseInt(sessionId);
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.post<Challenge>(`/api/challenges/${challenge.id}/submit`, {
        session_id: id,
      });
      onSubmitted(updated);
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
        <h2 className="mb-4 text-lg font-semibold">Enviar resultado</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Introduce el ID de la sesión completada que quieres presentar como resultado del desafío.
        </p>
        <input
          type="number"
          min={1}
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="ID de sesión"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
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
            disabled={!sessionId || submitting}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Challenge Card ────────────────────────────────────────────────────────────

function ChallengeCard({
  challenge,
  currentUserId,
  onAction,
}: {
  challenge: Challenge;
  currentUserId: number;
  onAction: (updated: Challenge) => void;
}) {
  const isChallenger = challenge.challenger.id === currentUserId;
  const opponent = isChallenger ? challenge.challenged : challenge.challenger;
  const [busy, setBusy] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);

  const mySessionId = isChallenger
    ? challenge.challenger_session_id
    : challenge.challenged_session_id;

  const doAction = async (endpoint: string) => {
    setBusy(true);
    try {
      const updated = await api.post<Challenge>(endpoint, {});
      onAction(updated);
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {showSubmit && (
        <SubmitSessionDialog
          challenge={challenge}
          onSubmitted={(c) => { onAction(c); setShowSubmit(false); }}
          onClose={() => setShowSubmit(false)}
        />
      )}

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {isChallenger ? "Tú" : challenge.challenger.name}
              </span>
              <Swords className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm">
                {isChallenger ? opponent.name : "Tú"}
              </span>
              <StatusBadge status={challenge.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Apuesta: <span className="font-semibold text-foreground">{challenge.wager_xp} XP</span>
              {" · "}
              {challenge.status === "completed"
                ? `Completado ${formatDate(challenge.completed_at!)}`
                : `Expira ${formatDate(challenge.expires_at)}`}
            </p>

            {/* Winner badge */}
            {challenge.status === "completed" && (
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                <span className="font-medium">
                  {challenge.winner_id === currentUserId ? "¡Ganaste!" : `Ganó ${opponent.name}`}
                </span>
                <span className="text-muted-foreground">
                  {challenge.winner_id === currentUserId
                    ? `+${challenge.wager_xp * 2} XP`
                    : `-${challenge.wager_xp} XP`}
                </span>
              </div>
            )}

            {/* Submission status when accepted */}
            {challenge.status === "accepted" && (
              <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {challenge.challenger_session_id
                    ? <CheckCircle className="h-3 w-3 text-green-500" />
                    : <Clock className="h-3 w-3 text-yellow-500" />}
                  {challenge.challenger.id === currentUserId ? "Tú" : challenge.challenger.name}
                </span>
                <span className="flex items-center gap-1">
                  {challenge.challenged_session_id
                    ? <CheckCircle className="h-3 w-3 text-green-500" />
                    : <Clock className="h-3 w-3 text-yellow-500" />}
                  {challenge.challenged.id === currentUserId ? "Tú" : challenge.challenged.name}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-col gap-2">
            {/* Challenger can cancel pending */}
            {challenge.status === "pending" && isChallenger && (
              <button
                onClick={() => doAction(`/api/challenges/${challenge.id}/cancel`)}
                disabled={busy}
                className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancelar
              </button>
            )}

            {/* Challenged can accept/decline */}
            {challenge.status === "pending" && !isChallenger && (
              <>
                <button
                  onClick={() => doAction(`/api/challenges/${challenge.id}/accept`)}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Aceptar
                </button>
                <button
                  onClick={() => doAction(`/api/challenges/${challenge.id}/decline`)}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Rechazar
                </button>
              </>
            )}

            {/* Submit session when accepted and not yet submitted */}
            {challenge.status === "accepted" && mySessionId === null && (
              <button
                onClick={() => setShowSubmit(true)}
                className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/90"
              >
                Enviar sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// Main ChallengesPage
// ══════════════════════════════════════════════

export default function ChallengesPage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "active" | "history">("pending");

  useEffect(() => {
    api.get<Challenge[]>("/api/challenges")
      .then(setChallenges)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAction = (updated: Challenge) => {
    setChallenges((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCreated = (c: Challenge) => {
    setChallenges((prev) => [c, ...prev]);
    setShowCreate(false);
  };

  const pending = challenges.filter(
    (c) => c.status === "pending" || c.status === "accepted"
  );
  const history = challenges.filter(
    (c) => c.status === "completed" || c.status === "declined" || c.status === "cancelled"
  );

  const tabs = [
    { key: "pending" as const, label: "Activos", count: pending.length },
    { key: "history" as const, label: "Historial", count: history.length },
  ];

  const shown = activeTab === "pending" ? pending : history;
  const pendingReceived = pending.filter(
    (c) => c.status === "pending" && c.challenged.id === user?.id
  ).length;

  return (
    <div className="space-y-6">
      {showCreate && (
        <CreateChallengeDialog onCreated={handleCreated} onClose={() => setShowCreate(false)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Swords className="h-6 w-6 text-primary" />
            Desafíos
          </h1>
          <p className="text-muted-foreground">Reta a otros atletas y apuesta puntos</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Nuevo desafío
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                {tab.count}
              </span>
            )}
            {tab.key === "pending" && pendingReceived > 0 && (
              <span className="ml-1 inline-block h-2 w-2 rounded-full bg-destructive" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : shown.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            {activeTab === "pending" ? "Sin desafíos activos" : "Sin desafíos en el historial"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              currentUserId={user!.id}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
