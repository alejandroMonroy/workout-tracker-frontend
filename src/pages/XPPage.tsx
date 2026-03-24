import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type { LeaderboardEntry, XPSummary, XPTransaction } from "@/types/api";
import {
    Crown,
    Flame,
    Medal,
    Sparkles,
    Star,
    Swords,
    Target,
    Timer,
    TrendingUp,
    Trophy,
    User as UserIcon,
    Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

const REASON_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  session_complete: {
    label: "Sesión completada",
    icon: Target,
    color: "text-blue-500 bg-blue-50",
  },
  personal_record: {
    label: "Récord personal",
    icon: Trophy,
    color: "text-yellow-500 bg-yellow-50",
  },
  streak_bonus: {
    label: "Racha",
    icon: Flame,
    color: "text-orange-500 bg-orange-50",
  },
  first_session: {
    label: "Primera sesión",
    icon: Star,
    color: "text-purple-500 bg-purple-50",
  },
  exercise_variety: {
    label: "Variedad",
    icon: Sparkles,
    color: "text-teal-500 bg-teal-50",
  },
  long_session: {
    label: "Sesión larga",
    icon: Timer,
    color: "text-indigo-500 bg-indigo-50",
  },
  high_volume: {
    label: "Alto volumen",
    icon: TrendingUp,
    color: "text-rose-500 bg-rose-50",
  },
  consistency: {
    label: "Constancia",
    icon: Flame,
    color: "text-red-500 bg-red-50",
  },
  manual: {
    label: "Manual",
    icon: Zap,
    color: "text-gray-500 bg-gray-50",
  },
};

type Tab = "overview" | "history" | "leaderboard";

export default function XPPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<XPSummary | null>(null);
  const [history, setHistory] = useState<XPTransaction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<XPSummary>("/api/xp/summary"),
      api.get<XPTransaction[]>("/api/xp/history?limit=100"),
      api.get<LeaderboardEntry[]>("/api/xp/leaderboard"),
    ])
      .then(([s, h, l]) => {
        setSummary(s);
        setHistory(h);
        setLeaderboard(l);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Zap className="h-6 w-6 text-yellow-500" />
          Experiencia
        </h1>
        <p className="text-muted-foreground">
          Gana XP entrenando y sube de nivel
        </p>
      </div>

      {/* Level Card */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-yellow-50/50 p-6 shadow-sm">
        <div className="flex items-center gap-5">
          {/* Level Badge */}
          <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-white shadow-lg">
            <span className="text-2xl font-black">{summary.level}</span>
            <span className="absolute -bottom-1 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-yellow-900 shadow">
              NIVEL
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">
                {summary.total_xp.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                XP total
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Nivel {summary.level}</span>
                <span>
                  {summary.xp_progress} / {summary.xp_needed} XP
                </span>
                <span>Nivel {summary.level + 1}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-yellow-400 transition-all duration-700"
                  style={{ width: `${summary.progress_pct}%` }}
                />
              </div>
            </div>

            {/* Rank */}
            <p className="mt-2 text-sm text-muted-foreground">
              <Medal className="mr-1 inline h-3.5 w-3.5 text-primary" />
              Ranking:{" "}
              <span className="font-semibold text-foreground">
                #{summary.rank}
              </span>{" "}
              de {summary.total_users} atletas
            </p>
          </div>
        </div>
      </div>

      {/* XP Rules Info */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Sesión", xp: 50, icon: Target, color: "text-blue-500" },
          { label: "Récord", xp: 25, icon: Trophy, color: "text-yellow-500" },
          { label: "Racha", xp: "25×día", icon: Flame, color: "text-orange-500" },
          { label: "7 días", xp: 150, icon: Crown, color: "text-red-500" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
          >
            <item.icon className={cn("h-5 w-5", item.color)} />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-bold">+{item.xp} XP</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
        {(
          [
            { key: "overview", label: "Resumen" },
            { key: "history", label: "Historial" },
            { key: "leaderboard", label: "Ranking" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab history={history} />}
      {tab === "history" && <HistoryTab history={history} />}
      {tab === "leaderboard" && (
        <LeaderboardTab leaderboard={leaderboard} currentUserId={user?.id} />
      )}
    </div>
  );
}

/* ─── Overview ─── */
function OverviewTab({ history }: { history: XPTransaction[] }) {
  // Group by reason
  const byReason = history.reduce(
    (acc, tx) => {
      acc[tx.reason] = (acc[tx.reason] || 0) + tx.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const sorted = Object.entries(byReason).sort(([, a], [, b]) => b - a);
  const total = sorted.reduce((s, [, v]) => s + v, 0);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Zap className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aún no has ganado XP. ¡Completa tu primera sesión!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold">Desglose de XP</h2>
      </div>
      <div className="divide-y divide-border">
        {sorted.map(([reason, amount]) => {
          const meta = REASON_META[reason] || REASON_META.manual;
          const Icon = meta.icon;
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return (
            <div key={reason} className="flex items-center gap-4 px-5 py-3.5">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  meta.color,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{meta.label}</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-foreground">
                +{amount.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── History ─── */
function HistoryTab({ history }: { history: XPTransaction[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Sin transacciones aún</p>
      </div>
    );
  }

  // Group by date
  const grouped = history.reduce(
    (acc, tx) => {
      const dateKey = new Date(tx.created_at).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(tx);
      return acc;
    },
    {} as Record<string, XPTransaction[]>,
  );

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, txs]) => (
        <div
          key={date}
          className="rounded-lg border border-border bg-card shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">{date}</h3>
            <span className="text-xs font-medium text-primary">
              +{txs.reduce((s, t) => s + t.amount, 0)} XP
            </span>
          </div>
          <div className="divide-y divide-border">
            {txs.map((tx) => {
              const meta =
                REASON_META[tx.reason] || REASON_META.manual;
              const Icon = meta.icon;
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-5 py-2.5"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      meta.color,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm">
                      {tx.description || meta.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    +{tx.amount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Leaderboard ─── */
function LeaderboardTab({
  leaderboard,
  currentUserId,
}: {
  leaderboard: LeaderboardEntry[];
  currentUserId?: number;
}) {
  if (leaderboard.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Swords className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          El ranking se llenará cuando más atletas se unan
        </p>
      </div>
    );
  }

  const podiumColors = [
    "from-yellow-400 to-yellow-600 text-white",
    "from-gray-300 to-gray-500 text-white",
    "from-amber-600 to-amber-800 text-white",
  ];

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Crown className="h-4 w-4 text-yellow-500" />
          Ranking Global
        </h2>
      </div>
      <div className="divide-y divide-border">
        {leaderboard.map((entry) => {
          const isMe = entry.user_id === currentUserId;
          const isTop3 = entry.rank <= 3;
          return (
            <div
              key={entry.user_id}
              className={cn(
                "flex items-center gap-4 px-5 py-3.5 transition-colors",
                isMe && "bg-primary/5",
              )}
            >
              {/* Rank badge */}
              {isTop3 ? (
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold shadow",
                    podiumColors[entry.rank - 1],
                  )}
                >
                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-muted-foreground">
                  {entry.rank}
                </div>
              )}

              {/* Avatar */}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserIcon className="h-4 w-4" />
              </div>

              {/* Name + Level */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "truncate text-sm font-medium",
                    isMe && "text-primary",
                  )}
                >
                  {entry.name}
                  {isMe && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      (tú)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Nivel {entry.level}
                </p>
              </div>

              {/* XP */}
              <div className="text-right">
                <p className="text-sm font-bold">
                  {entry.total_xp.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
