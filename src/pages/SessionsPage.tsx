import { cn, formatDate, formatDuration } from "@/lib/utils";
import { api } from "@/services/api";
import type {
  PersonalRecord,
  SessionListItem,
  TimelinePoint,
} from "@/types/api";
import {
  ChevronDown,
  ChevronUp,
  ListChecks,
  Search,
  Trash2,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TYPE_LABELS: Record<string, string> = {
  "1rm": "1RM Estimado",
  max_reps: "Max Reps",
  best_time: "Mejor Tiempo",
  max_distance: "Max Distancia",
  max_weight: "Peso Máximo",
};

const TYPE_UNITS: Record<string, string> = {
  "1rm": "kg",
  max_reps: "reps",
  best_time: "s",
  max_distance: "m",
  max_weight: "kg",
};

/* ── Metric chips config ── */
interface MetricConfig {
  key: keyof TimelinePoint;
  label: string;
  unit: string;
  color: string;
}

const METRICS: MetricConfig[] = [
  { key: "volume", label: "Volumen", unit: "kg", color: "#6366f1" },
  { key: "duration_min", label: "Duración", unit: "min", color: "#10b981" },
  { key: "sets", label: "Series", unit: "", color: "#f59e0b" },
  { key: "exercises", label: "Ejercicios", unit: "", color: "#ec4899" },
  { key: "rpe", label: "RPE", unit: "", color: "#ef4444" },
];

type Tab = "sessions" | "records";

export default function SessionsPage() {
  const [tab, setTab] = useState<Tab>("sessions");
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const navigate = useNavigate();

  // Timeline chart state
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(
    new Set(["volume"]),
  );
  const [chartOpen, setChartOpen] = useState(true);

  // Records state
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Load sessions + timeline on mount
  useEffect(() => {
    api
      .get<SessionListItem[]>("/api/sessions?limit=50")
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));

    api
      .get<TimelinePoint[]>("/api/stats/timeline?period=quarter")
      .then(setTimeline)
      .catch(() => {})
      .finally(() => setTimelineLoading(false));
  }, []);

  // Load records when tab switches to records
  useEffect(() => {
    if (tab !== "records" || records.length > 0) return;
    setRecordsLoading(true);
    api
      .get<PersonalRecord[]>("/api/stats/records")
      .then(setRecords)
      .catch(() => {})
      .finally(() => setRecordsLoading(false));
  }, [tab, records.length]);

  const toggleMetric = (key: string) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key); // keep at least one
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/api/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const chartData = timeline.map((p) => ({
    ...p,
    date: new Date(p.date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    }),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ListChecks className="h-6 w-6 text-primary" />
          Historial
        </h1>
        <p className="text-muted-foreground">
          Sesiones y evolución de tus entrenamientos
        </p>
      </div>

      {/* ── Progress chart (collapsible) ── */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <button
          onClick={() => setChartOpen(!chartOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary/50"
        >
          <span>Progreso</span>
          {chartOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {chartOpen && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            {/* Metric chips */}
            <div className="mb-3 flex flex-wrap gap-2">
              {METRICS.map((m) => {
                const active = activeMetrics.has(m.key);
                return (
                  <button
                    key={m.key}
                    onClick={() => toggleMetric(m.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-transparent text-white"
                        : "border-border bg-white text-muted-foreground hover:bg-secondary",
                    )}
                    style={active ? { backgroundColor: m.color } : undefined}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: m.color }}
                    />
                    {m.label}
                    {m.unit && ` (${m.unit})`}
                  </button>
                );
              })}
            </div>

            {/* Chart */}
            {timelineLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : chartData.length < 2 ? (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground">
                  Completa al menos 2 sesiones para ver tu progreso
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={45} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  {METRICS.filter((m) => activeMetrics.has(m.key)).map((m) => (
                    <Line
                      key={m.key}
                      type="monotone"
                      dataKey={m.key}
                      name={`${m.label}${m.unit ? ` (${m.unit})` : ""}`}
                      stroke={m.color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
        <button
          onClick={() => setTab("sessions")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "sessions"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ListChecks className="h-4 w-4" />
          Sesiones
        </button>
        <button
          onClick={() => setTab("records")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "records"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Trophy className="h-4 w-4" />
          Records
        </button>
      </div>

      {tab === "sessions" ? (
        /* ── Sessions list ── */
        loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ListChecks className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No tienes sesiones aún. ¡Empieza una desde el menú lateral!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="relative rounded-lg border border-border bg-card shadow-sm transition-colors hover:bg-secondary/50"
              >
                {/* Confirm delete overlay */}
                {confirmDeleteId === s.id && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 rounded-lg bg-white/95 backdrop-blur-sm">
                    <p className="text-sm font-medium text-destructive">
                      ¿Eliminar sesión #{s.id}?
                    </p>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
                    >
                      {deletingId === s.id ? "Eliminando…" : "Sí, eliminar"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                <div
                  onClick={() => navigate(`/sessions/${s.id}`)}
                  className="flex cursor-pointer items-center justify-between p-4"
                >
                  <div>
                    <div>
                      <p className="font-medium">
                        Sesión #{s.id}
                        {s.template_id && (
                          <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                            Template
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {formatDate(s.started_at)} · {s.exercise_count} ejercicios ·{" "}
                        {s.set_count} series
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {s.total_duration_sec && (
                        <p className="text-sm font-medium">
                          {formatDuration(s.total_duration_sec)}
                        </p>
                      )}
                      {s.rpe && (
                        <p className="text-xs text-muted-foreground">
                          RPE {s.rpe}
                        </p>
                      )}
                      {!s.finished_at && (
                        <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                          En curso
                        </span>
                      )}
                      {s.has_records && (
                        <span className="inline-flex items-center gap-1 rounded bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-600">
                          <Trophy className="h-3 w-3" />
                          Record
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(s.id);
                      }}
                      title="Eliminar sesión"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── Records ── */
        <RecordsPanel
          records={records}
          loading={recordsLoading}
        />
      )}
    </div>
  );
}

/* ── Records sub-component ── */

function RecordsPanel({
  records,
  loading,
}: {
  records: PersonalRecord[];
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [openExercise, setOpenExercise] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Trophy className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          Completa entrenamientos para establecer records
        </p>
      </div>
    );
  }

  // Group by exercise
  const grouped = records.reduce(
    (acc, r) => {
      const name = r.exercise?.name ?? `Ejercicio #${r.exercise_id}`;
      if (!acc[name]) acc[name] = [];
      acc[name].push(r);
      return acc;
    },
    {} as Record<string, PersonalRecord[]>,
  );

  const filtered = Object.entries(grouped).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar ejercicio…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {records.length} records · {Object.keys(grouped).length} ejercicios
      </p>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin resultados para &quot;{search}&quot;
        </p>
      ) : (
        <div className="space-y-1">
          {filtered.map(([name, recs]) => {
            const isOpen = openExercise === name;
            return (
              <div
                key={name}
                className="rounded-lg border border-border bg-card shadow-sm"
              >
                <button
                  onClick={() => setOpenExercise(isOpen ? null : name)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-semibold">{name}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {recs.length}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-border">
                    {recs.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {TYPE_LABELS[r.record_type] ?? r.record_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(r.achieved_at)}
                          </p>
                        </div>
                        <span className="rounded-md bg-yellow-50 px-3 py-1 text-sm font-bold text-yellow-700">
                          {r.value}
                          {TYPE_UNITS[r.record_type] ?? ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
