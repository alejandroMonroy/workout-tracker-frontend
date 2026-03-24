import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type {
    CurrentDivision,
    Division,
    LeagueStanding,
    WeekHistory,
} from "@/types/api";
import {
    ArrowDown,
    ArrowUp,
    Calendar,
    ChevronDown,
    ChevronUp,
    Clock,
    Crown,
    Diamond,
    Gem,
    Medal,
    Minus,
    Shield,
    ShieldCheck,
    Sparkles,
    Trophy,
    User as UserIcon,
    Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

/* ─── Division visual config ─── */

const DIVISION_META: Record<
  Division,
  {
    label: string;
    icon: React.ElementType;
    gradient: string;
    badge: string;
    bg: string;
    ring: string;
    text: string;
  }
> = {
  bronce: {
    label: "Bronce",
    icon: Shield,
    gradient: "from-amber-700 to-amber-900",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    bg: "bg-amber-50",
    ring: "ring-amber-400",
    text: "text-amber-700",
  },
  plata: {
    label: "Plata",
    icon: ShieldCheck,
    gradient: "from-gray-400 to-gray-600",
    badge: "bg-gray-100 text-gray-700 border-gray-300",
    bg: "bg-gray-50",
    ring: "ring-gray-400",
    text: "text-gray-600",
  },
  oro: {
    label: "Oro",
    icon: Trophy,
    gradient: "from-yellow-400 to-yellow-600",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
    bg: "bg-yellow-50",
    ring: "ring-yellow-400",
    text: "text-yellow-600",
  },
  platino: {
    label: "Platino",
    icon: Gem,
    gradient: "from-teal-400 to-teal-600",
    badge: "bg-teal-100 text-teal-800 border-teal-300",
    bg: "bg-teal-50",
    ring: "ring-teal-400",
    text: "text-teal-600",
  },
  diamante: {
    label: "Diamante",
    icon: Diamond,
    gradient: "from-blue-500 to-purple-600",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
    bg: "bg-blue-50",
    ring: "ring-blue-400",
    text: "text-blue-600",
  },
  elite: {
    label: "Élite",
    icon: Crown,
    gradient: "from-red-600 to-red-800",
    badge: "bg-red-100 text-red-800 border-red-300",
    bg: "bg-red-50",
    ring: "ring-red-400",
    text: "text-red-600",
  },
};

type Tab = "standings" | "history";

export default function DivisionsPage() {
  const [tab, setTab] = useState<Tab>("standings");
  const [current, setCurrent] = useState<CurrentDivision | null>(null);
  const [history, setHistory] = useState<WeekHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<CurrentDivision>("/api/divisions/current"),
      api.get<WeekHistory[]>("/api/divisions/history"),
    ])
      .then(([c, h]) => {
        setCurrent(c);
        setHistory(h);
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

  if (!current) return null;

  const meta = DIVISION_META[current.division];
  const DivIcon = meta.icon;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Liga Semanal
        </h1>
        <p className="text-muted-foreground">
          Compite, asciende de división y demuestra tu constancia
        </p>
      </div>

      {/* Division Card */}
      <div
        className={cn(
          "rounded-xl border border-border bg-gradient-to-br p-6 shadow-sm",
          meta.bg,
          "via-card to-white/80"
        )}
      >
        <div className="flex items-center gap-5">
          {/* Division Badge */}
          <div
            className={cn(
              "relative flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-lg",
              meta.gradient
            )}
          >
            <DivIcon className="h-9 w-9" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-foreground">
                División {meta.label}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                  meta.badge
                )}
              >
                {current.division_order + 1}/{current.total_divisions}
              </span>
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                Grupo {current.group_number} de {current.total_groups}
              </span>
            </div>

            {/* Division progress bar */}
            <div className="mt-3">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: current.total_divisions }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-all",
                      i <= current.division_order
                        ? `bg-gradient-to-r ${meta.gradient}`
                        : "bg-secondary"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Weekly stats */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                <span className="font-semibold text-foreground">
                  {current.weekly_xp.toLocaleString()}
                </span>{" "}
                XP esta semana
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {current.days_remaining === 0
                  ? "Último día"
                  : `${current.days_remaining} día${current.days_remaining !== 1 ? "s" : ""} restante${current.days_remaining !== 1 ? "s" : ""}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Promotion/demotion rules */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <ChevronUp className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-xs text-green-700 font-medium">Zona de ascenso</p>
            <p className="text-sm font-bold text-green-800">
              Top {current.promote_count}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <ChevronDown className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-xs text-red-700 font-medium">Zona de descenso</p>
            <p className="text-sm font-bold text-red-800">
              Últimos {current.demote_count}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
        {(
          [
            { key: "standings", label: "Clasificación" },
            { key: "history", label: "Historial" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "standings" && (
        <StandingsTab
          standings={current.standings}
          division={current.division}
          promoteCount={current.promote_count}
          demoteCount={current.demote_count}
          groupNumber={current.group_number}
          totalGroups={current.total_groups}
        />
      )}
      {tab === "history" && <HistoryTab history={history} />}
    </div>
  );
}

/* ─── Standings ─── */
function StandingsTab({
  standings,
  division,
  promoteCount,
  demoteCount,
  groupNumber,
  totalGroups,
}: {
  standings: LeagueStanding[];
  division: Division;
  promoteCount: number;
  demoteCount: number;
  groupNumber: number;
  totalGroups: number;
}) {
  if (standings.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aún no hay participantes esta semana. ¡Entrena para ser el primero!
        </p>
      </div>
    );
  }

  const meta = DIVISION_META[division];
  const groupSize = standings.length;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Medal className="h-4 w-4 text-yellow-500" />
          Clasificación del Grupo
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {standings.length} participantes · División {meta.label} · Grupo {groupNumber} de {totalGroups}
        </p>
      </div>
      <div className="divide-y divide-border">
        {standings.map((entry) => {
          const isPromoteZone = entry.promoted;
          const isDemoteZone = entry.demoted;

          let zoneBg = "";
          let zoneIndicator = null;

          if (isPromoteZone) {
            zoneBg = "bg-green-50/60";
            zoneIndicator = (
              <ArrowUp className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
            );
          } else if (isDemoteZone) {
            zoneBg = "bg-red-50/60";
            zoneIndicator = (
              <ArrowDown className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
            );
          }

          // Promotion / demotion line separators
          let separator = null;
          if (entry.rank === promoteCount + 1 && promoteCount < groupSize) {
            separator = (
              <div className="flex items-center gap-2 px-5 py-1 bg-green-50 border-t border-dashed border-green-300">
                <div className="flex-1 border-t border-dashed border-green-300" />
                <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">
                  Zona de ascenso ▲
                </span>
                <div className="flex-1 border-t border-dashed border-green-300" />
              </div>
            );
          }
          if (
            entry.rank === groupSize - demoteCount + 1 &&
            groupSize > demoteCount &&
            division !== "bronce"
          ) {
            separator = (
              <div className="flex items-center gap-2 px-5 py-1 bg-red-50 border-t border-dashed border-red-300">
                <div className="flex-1 border-t border-dashed border-red-300" />
                <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
                  Zona de descenso ▼
                </span>
                <div className="flex-1 border-t border-dashed border-red-300" />
              </div>
            );
          }

          return (
            <div key={entry.user_id}>
              {separator}
              <div
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 transition-colors",
                  zoneBg,
                  entry.is_current_user && "ring-2 ring-inset ring-primary/30"
                )}
              >
                {/* Rank */}
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                    entry.rank === 1
                      ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow"
                      : entry.rank === 2
                        ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow"
                        : entry.rank === 3
                          ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow"
                          : "bg-secondary text-muted-foreground"
                  )}
                >
                  {entry.rank <= 3
                    ? ["🥇", "🥈", "🥉"][entry.rank - 1]
                    : entry.rank}
                </div>

                {/* Avatar */}
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserIcon className="h-4 w-4" />
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      entry.is_current_user && "text-primary"
                    )}
                  >
                    {entry.name}
                    {entry.is_current_user && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        (tú)
                      </span>
                    )}
                  </p>
                </div>

                {/* Zone indicator */}
                {zoneIndicator}

                {/* Weekly XP */}
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {entry.weekly_xp.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">XP</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── History ─── */
function HistoryTab({ history }: { history: WeekHistory[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aún no tienes historial de ligas. ¡Tu primer resultado aparecerá
          cuando termine esta semana!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((week) => {
        const meta = DIVISION_META[week.division];
        const DivIcon = meta.icon;

        let statusIcon = (
          <Minus className="h-4 w-4 text-muted-foreground" />
        );
        let statusText = "Mantenido";
        let statusColor = "text-muted-foreground";

        if (week.promoted) {
          statusIcon = <ArrowUp className="h-4 w-4 text-green-600" />;
          statusText = "Ascendido";
          statusColor = "text-green-600";
        } else if (week.demoted) {
          statusIcon = <ArrowDown className="h-4 w-4 text-red-600" />;
          statusText = "Descendido";
          statusColor = "text-red-600";
        }

        const weekStartFmt = new Date(week.week_start).toLocaleDateString(
          "es-ES",
          { day: "numeric", month: "short" }
        );
        const weekEndFmt = new Date(week.week_end).toLocaleDateString(
          "es-ES",
          { day: "numeric", month: "short" }
        );

        return (
          <div
            key={week.week_start}
            className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 shadow-sm"
          >
            {/* Division icon */}
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-white shadow",
                meta.gradient
              )}
            >
              <DivIcon className="h-5 w-5" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {week.division_display}
              </p>
              <p className="text-xs text-muted-foreground">
                {weekStartFmt} – {weekEndFmt}
              </p>
            </div>

            {/* Rank */}
            <div className="text-center">
              <p className="text-lg font-black text-foreground">
                #{week.final_rank ?? "–"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                de {week.group_size}
              </p>
            </div>

            {/* XP */}
            <div className="text-center min-w-[60px]">
              <p className="text-sm font-bold">
                {week.weekly_xp.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">XP</p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-1">
              {statusIcon}
              <span className={cn("text-xs font-medium", statusColor)}>
                {statusText}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
