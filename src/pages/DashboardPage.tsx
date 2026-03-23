import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatDuration } from "@/lib/utils";
import { api } from "@/services/api";
import type { CoachInvite, PersonalRecord, SessionListItem, TrainingSummary } from "@/types/api";
import {
    Activity,
    Check,
    Dumbbell,
    Flame,
    Loader2,
    Mail,
    Timer,
    Trophy,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
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
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<TrainingSummary | null>(null);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionListItem[]>([]);
  const [invites, setInvites] = useState<CoachInvite[]>([]);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvites = () => {
    api
      .get<CoachInvite[]>("/api/coach/invites/pending")
      .then(setInvites)
      .catch(() => {});
  };

  useEffect(() => {
    Promise.all([
      api.get<TrainingSummary>("/api/stats/summary?days=30"),
      api.get<PersonalRecord[]>("/api/stats/records"),
      api.get<SessionListItem[]>("/api/sessions?limit=5"),
    ])
      .then(([s, r, ses]) => {
        setSummary(s);
        setRecords(r);
        setRecentSessions(ses);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetchInvites();
  }, []);

  const handleAcceptInvite = async (inviteId: number) => {
    setAcceptingId(inviteId);
    try {
      await api.post(`/api/coach/invite/${inviteId}/accept`);
      setInvites((prev) => prev.filter((i) => i.invite_id !== inviteId));
    } catch {
      // ignore
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDeclineInvite = (inviteId: number) => {
    // For now, just hide it locally (backend doesn't have a decline endpoint yet)
    setInvites((prev) => prev.filter((i) => i.invite_id !== inviteId));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Hola, {user?.name} 👋
        </h1>
        <p className="text-muted-foreground">
          Resumen de los últimos 30 días
        </p>
      </div>

      {/* Pending coach invites */}
      {invites.length > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-indigo-800">
            <Mail className="h-5 w-5" />
            Invitaciones de Coach ({invites.length})
          </h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.invite_id}
                className="flex items-center justify-between rounded-md bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {inv.coach.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inv.coach.email} · {formatDate(inv.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAcceptInvite(inv.invite_id)}
                    disabled={acceptingId === inv.invite_id}
                    className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
                  >
                    {acceptingId === inv.invite_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Aceptar
                  </button>
                  <button
                    onClick={() => handleDeclineInvite(inv.invite_id)}
                    className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
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

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Sesiones"
          value={String(summary?.total_sessions ?? 0)}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={Dumbbell}
          label="Volumen Total"
          value={`${((summary?.total_volume_kg ?? 0) / 1000).toFixed(1)}t`}
          sub={`${summary?.total_sets ?? 0} series`}
          color="bg-accent/10 text-accent"
        />
        <StatCard
          icon={Timer}
          label="Tiempo Total"
          value={formatDuration(summary?.total_time_sec ?? 0)}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          icon={Flame}
          label="RPE Promedio"
          value={summary?.avg_rpe ? summary.avg_rpe.toFixed(1) : "—"}
          sub={`${summary?.distinct_exercises ?? 0} ejercicios distintos`}
          color="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Two columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent sessions */}
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">Sesiones Recientes</h2>
          </div>
          <div className="divide-y divide-border">
            {recentSessions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Aún no tienes sesiones. ¡Empieza a entrenar!
              </p>
            ) : (
              recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Sesión #{s.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(s.started_at)} · {s.exercise_count} ejercicios
                      · {s.set_count} series
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

        {/* Personal records */}
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Records Personales
            </h2>
          </div>
          <div className="divide-y divide-border">
            {records.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Completa sesiones para establecer records
              </p>
            ) : (
              records.slice(0, 6).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {r.exercise?.name ?? `Ejercicio #${r.exercise_id}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.record_type.replace("_", " ")} · {formatDate(r.achieved_at)}
                    </p>
                  </div>
                  <span className="rounded-md bg-yellow-50 px-2.5 py-1 text-sm font-semibold text-yellow-700">
                    {r.value}
                    {r.record_type === "best_time" ? "s" : "kg"}
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
