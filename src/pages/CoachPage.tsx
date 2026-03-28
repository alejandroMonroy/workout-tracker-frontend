import { formatDate, formatDuration } from "@/lib/utils";
import { api } from "@/services/api";
import type {
    CoachMessage,
    SessionListItem,
    TrainingSummary,
} from "@/types/api";
import {
    Activity,
    BarChart3,
    Dumbbell,
    MessageSquare,
    Sparkles,
    Users,
} from "lucide-react";
import { useEffect, useState } from "react";

// ── Types ──

interface SubscribedAthlete {
  athlete_id: number;
  athlete_name: string;
  xp_per_month: number;
  subscribed_at: string;
}

// ══════════════════════════════════════════════
// Main CoachPage
// ══════════════════════════════════════════════

export default function CoachPage({ tab = "athletes" }: { tab?: "athletes" | "inbox" | "stats" }) {
  return (
    <div className="space-y-6">
      {tab === "athletes" ? <AthletesTab /> : tab === "inbox" ? <InboxTab /> : <StatsTab />}
    </div>
  );
}

// ══════════════════════════════════════════════
// Athletes Tab
// ══════════════════════════════════════════════

function AthletesTab() {
  const [athletes, setAthletes] = useState<SubscribedAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthlete, setSelectedAthlete] = useState<number | null>(null);
  const [athleteSessions, setAthleteSessions] = useState<SessionListItem[]>([]);
  const [athleteStats, setAthleteSummary] = useState<TrainingSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api.get<SubscribedAthlete[]>("/api/coaches/my-athletes")
      .then(setAthletes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const viewAthlete = async (athleteId: number) => {
    setSelectedAthlete(athleteId);
    setDetailLoading(true);
    try {
      const [sessions, stats] = await Promise.all([
        api.get<SessionListItem[]>(`/api/coaches/my-athletes/${athleteId}/sessions?limit=10`),
        api.get<TrainingSummary>(`/api/coaches/my-athletes/${athleteId}/stats`),
      ]);
      setAthleteSessions(sessions);
      setAthleteSummary(stats);
    } catch {
      setAthleteSessions([]);
      setAthleteSummary(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6 text-primary" />
          Mis Atletas
        </h1>
        <p className="text-muted-foreground">
          Atletas suscritos a tu entrenamiento
        </p>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: athlete list */}
          <div className="space-y-3 lg:col-span-1">
            {athletes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Ningún atleta suscrito aún
              </p>
            ) : (
              athletes.map((a) => (
                <button
                  key={a.athlete_id}
                  onClick={() => viewAthlete(a.athlete_id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedAthlete === a.athlete_id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-secondary/50"
                  }`}
                >
                  <p className="font-medium">{a.athlete_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.xp_per_month} XP/mes · desde {formatDate(a.subscribed_at)}
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
                {athleteStats && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <Activity className="mb-1 h-4 w-4 text-primary" />
                      <p className="text-xl font-bold">{athleteStats.total_sessions}</p>
                      <p className="text-xs text-muted-foreground">Sesiones (30d)</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <Dumbbell className="mb-1 h-4 w-4 text-accent" />
                      <p className="text-xl font-bold">
                        {(athleteStats.total_volume_kg / 1000).toFixed(1)}t
                      </p>
                      <p className="text-xs text-muted-foreground">Volumen</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xl font-bold">{athleteStats.total_sets}</p>
                      <p className="text-xs text-muted-foreground">Series</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xl font-bold">
                        {athleteStats.avg_rpe?.toFixed(1) ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">RPE promedio</p>
                    </div>
                  </div>
                )}

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
                        <div key={s.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">Sesión #{s.id}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(s.started_at)} · {s.exercise_count} ejercicios · {s.set_count} series
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
    </>
  );
}

// ══════════════════════════════════════════════
// Stats Tab
// ══════════════════════════════════════════════

interface CoachStats {
  total_athletes: number;
  xp_monthly_income: number;
  total_sessions_30d: number;
  total_messages: number;
  unread_messages: number;
}

function StatsTab() {
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CoachStats>("/api/coaches/my-stats")
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BarChart3 className="h-6 w-6 text-primary" />
          Estadísticas
        </h1>
        <p className="text-muted-foreground">
          Resumen de tu actividad como entrenador
        </p>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !stats ? (
        <p className="text-center text-sm text-muted-foreground">No se pudieron cargar las estadísticas</p>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_athletes}</p>
                  <p className="text-sm text-muted-foreground">Atletas suscritos</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.xp_monthly_income.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">XP / mes (ingresos)</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_sessions_30d}</p>
                  <p className="text-sm text-muted-foreground">Sesiones de atletas (30d)</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_messages}</p>
                  <p className="text-sm text-muted-foreground">Mensajes recibidos</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                  <MessageSquare className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.unread_messages}</p>
                  <p className="text-sm text-muted-foreground">Mensajes sin leer</p>
                </div>
              </div>
            </div>
          </div>

          {/* Avg sessions per athlete */}
          {stats.total_athletes > 0 && (
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-1">Promedio de sesiones por atleta (30d)</p>
              <p className="text-3xl font-bold">
                {(stats.total_sessions_30d / stats.total_athletes).toFixed(1)}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// Inbox Tab
// ══════════════════════════════════════════════

function InboxTab() {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CoachMessage[]>("/api/messages/inbox")
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (messageId: number) => {
    try {
      const updated = await api.patch<CoachMessage>(`/api/messages/${messageId}/read`, {});
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
    } catch {}
  };

  const unreadCount = messages.filter((m) => !m.read_at).length;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Mensajes de atletas</h2>
        {unreadCount > 0 && (
          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {unreadCount} sin leer
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : messages.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No hay mensajes todavía
        </p>
      ) : (
        <div className="divide-y divide-border">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-4 px-5 py-4 ${!m.read_at ? "bg-primary/5" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{m.athlete_name}</p>
                  {m.session_id && (
                    <span className="text-xs text-muted-foreground">· Sesión #{m.session_id}</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(m.sent_at).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">{m.body}</p>
              </div>
              {!m.read_at && (
                <button
                  onClick={() => markRead(m.id)}
                  className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
                >
                  Marcar leído
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
