import { useAuth } from "@/hooks/useAuth";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import { api } from "@/services/api";
import type {
  Exercise,
  ExerciseType,
  LeaderboardEntry,
  PersonalRecord,
  SessionListItem,
  TimelinePoint,
  User,
  XPSummary,
  XPTransaction,
} from "@/types/api";
import {
  ChevronDown,
  ChevronUp,
  Crown,
  Dumbbell,
  Flame,
  ListChecks,
  Loader2,
  Medal,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  Swords,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  Trophy,
  User as UserIcon,
  X,
  Zap,
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

type Tab = "profile" | "history" | "xp" | "exercises";

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Perfil" },
  { key: "history", label: "Historial" },
  { key: "xp", label: "Experiencia" },
  { key: "exercises", label: "Ejercicios" },
];

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
        {TABS.map((t) => (
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

      {tab === "profile" && <ProfileTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "xp" && <XPTab />}
      {tab === "exercises" && <ExercisesTab />}
    </div>
  );
}

/* ─── Profile Tab ─── */

function ProfileTab() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState("");
  const [units, setUnits] = useState("metric");
  const [birthDate, setBirthDate] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [sex, setSex] = useState("");

  useEffect(() => {
    if (!user) return;
    api.get<User>("/api/auth/me").then((p) => {
      setProfile(p);
      setName(p.name);
      setUnits(p.units_preference);
      setBirthDate(p.birth_date ?? "");
      setHeightCm(p.height_cm != null ? String(p.height_cm) : "");
      setWeightKg(p.weight_kg != null ? String(p.weight_kg) : "");
      setSex(p.sex ?? "");
    });
  }, [user]);

  if (!user || !profile) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/api/auth/profile", {
        name,
        units_preference: units,
        birth_date: birthDate || null,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        sex: sex || null,
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const age = birthDate
    ? Math.floor(
        (Date.now() - new Date(birthDate).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserIcon className="h-8 w-8" />
          </div>
          <div>
            <p className="text-lg font-semibold">{profile.name}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <span className="mt-1 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {profile.role === "athlete"
                ? "🏋️ Atleta"
                : profile.role === "coach"
                  ? "📋 Coach"
                  : "⚙️ Admin"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Correo</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="mt-1 block w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm text-muted-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Sexo</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Sin especificar</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">
                Fecha de nacimiento
                {age != null && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({age} años)
                  </span>
                )}
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Estatura (cm)</label>
              <input
                type="number"
                placeholder="175"
                min="50"
                max="250"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Peso (kg)</label>
              <input
                type="number"
                placeholder="70"
                min="20"
                max="300"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {heightCm && weightKg && (
            (() => {
              const h = Number(heightCm) / 100;
              const w = Number(weightKg);
              if (h > 0 && w > 0) {
                const bmi = w / (h * h);
                const label =
                  bmi < 18.5 ? "Bajo peso" : bmi < 25 ? "Normal" : bmi < 30 ? "Sobrepeso" : "Obesidad";
                const color =
                  bmi < 18.5 ? "text-yellow-600" : bmi < 25 ? "text-green-600" : bmi < 30 ? "text-orange-500" : "text-red-500";
                return (
                  <div className="rounded-md border border-border bg-secondary/50 px-4 py-3">
                    <p className="text-sm font-medium">Índice de Masa Corporal (IMC)</p>
                    <p className="mt-1 text-lg font-bold">
                      {bmi.toFixed(1)}{" "}
                      <span className={`text-sm font-medium ${color}`}>— {label}</span>
                    </p>
                  </div>
                );
              }
              return null;
            })()
          )}

          <div>
            <label className="text-sm font-medium">Unidades</label>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="metric">Métrico (kg, m)</option>
              <option value="imperial">Imperial (lb, ft)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Miembro desde</label>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(profile.created_at).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saved ? (
            <>✅ Guardado</>
          ) : saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── History Tab ─── */

const TIMELINE_METRICS: { key: keyof TimelinePoint; label: string; unit: string; color: string }[] = [
  { key: "volume", label: "Volumen", unit: "kg", color: "#6366f1" },
  { key: "duration_min", label: "Duración", unit: "min", color: "#10b981" },
  { key: "sets", label: "Series", unit: "", color: "#f59e0b" },
  { key: "exercises", label: "Ejercicios", unit: "", color: "#ec4899" },
  { key: "rpe", label: "RPE", unit: "", color: "#ef4444" },
];

const RECORD_TYPE_LABELS: Record<string, string> = {
  "1rm": "1RM Estimado",
  max_reps: "Max Reps",
  best_time: "Mejor Tiempo",
  max_distance: "Max Distancia",
  max_weight: "Peso Máximo",
};

const RECORD_TYPE_UNITS: Record<string, string> = {
  "1rm": "kg",
  max_reps: "reps",
  best_time: "s",
  max_distance: "m",
  max_weight: "kg",
};

type HistorySubTab = "sessions" | "records";

function HistoryTab() {
  const [subTab, setSubTab] = useState<HistorySubTab>("sessions");
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const navigate = useNavigate();

  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(new Set(["volume"]));
  const [chartOpen, setChartOpen] = useState(true);

  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    api.get<SessionListItem[]>("/api/sessions?limit=50")
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));

    api.get<TimelinePoint[]>("/api/stats/timeline?period=quarter")
      .then(setTimeline)
      .catch(() => {})
      .finally(() => setTimelineLoading(false));
  }, []);

  useEffect(() => {
    if (subTab !== "records" || records.length > 0) return;
    setRecordsLoading(true);
    api.get<PersonalRecord[]>("/api/stats/records")
      .then(setRecords)
      .catch(() => {})
      .finally(() => setRecordsLoading(false));
  }, [subTab, records.length]);

  const toggleMetric = (key: string) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
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
    date: new Date(p.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ListChecks className="h-5 w-5 text-primary" />
          Historial
        </h2>
        <p className="text-muted-foreground">Sesiones y evolución de tus entrenamientos</p>
      </div>

      {/* Progress chart */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <button
          onClick={() => setChartOpen(!chartOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary/50"
        >
          <span>Progreso</span>
          {chartOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {chartOpen && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {TIMELINE_METRICS.map((m) => {
                const active = activeMetrics.has(m.key);
                return (
                  <button
                    key={m.key}
                    onClick={() => toggleMetric(m.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active ? "border-transparent text-white" : "border-border bg-white text-muted-foreground hover:bg-secondary",
                    )}
                    style={active ? { backgroundColor: m.color } : undefined}
                  >
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.label}
                    {m.unit && ` (${m.unit})`}
                  </button>
                );
              })}
            </div>
            {timelineLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : chartData.length < 2 ? (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground">Completa al menos 2 sesiones para ver tu progreso</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={45} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  {TIMELINE_METRICS.filter((m) => activeMetrics.has(m.key)).map((m) => (
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

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
        <button
          onClick={() => setSubTab("sessions")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            subTab === "sessions" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ListChecks className="h-4 w-4" />
          Sesiones
        </button>
        <button
          onClick={() => setSubTab("records")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            subTab === "records" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Trophy className="h-4 w-4" />
          Records
        </button>
      </div>

      {subTab === "sessions" ? (
        loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ListChecks className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No tienes sesiones aún. ¡Empieza una desde el menú lateral!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="relative rounded-lg border border-border bg-card shadow-sm transition-colors hover:bg-secondary/50">
                {confirmDeleteId === s.id && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 rounded-lg bg-white/95 backdrop-blur-sm">
                    <p className="text-sm font-medium text-destructive">¿Eliminar sesión #{s.id}?</p>
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
                <div onClick={() => navigate(`/sessions/${s.id}`)} className="flex cursor-pointer items-center justify-between p-4">
                  <div>
                    <p className="font-medium">
                      Sesión #{s.id}
                      {s.template_id && (
                        <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">Template</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatDate(s.started_at)} · {s.exercise_count} ejercicios · {s.set_count} series
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {s.total_duration_sec && <p className="text-sm font-medium">{formatDuration(s.total_duration_sec)}</p>}
                      {s.rpe && <p className="text-xs text-muted-foreground">RPE {s.rpe}</p>}
                      {!s.finished_at && (
                        <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">En curso</span>
                      )}
                      {s.has_records && (
                        <span className="inline-flex items-center gap-1 rounded bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-600">
                          <Trophy className="h-3 w-3" />
                          Record
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(s.id); }}
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
        <RecordsPanel records={records} loading={recordsLoading} />
      )}
    </div>
  );
}

function RecordsPanel({ records, loading }: { records: PersonalRecord[]; loading: boolean }) {
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
        <p className="text-muted-foreground">Completa entrenamientos para establecer records</p>
      </div>
    );
  }

  const grouped = records.reduce((acc, r) => {
    const name = r.exercise?.name ?? `Ejercicio #${r.exercise_id}`;
    if (!acc[name]) acc[name] = [];
    acc[name].push(r);
    return acc;
  }, {} as Record<string, PersonalRecord[]>);

  const filtered = Object.entries(grouped).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-3">
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
        <p className="py-8 text-center text-sm text-muted-foreground">Sin resultados</p>
      ) : (
        <div className="space-y-1">
          {filtered.map(([name, recs]) => {
            const isOpen = openExercise === name;
            return (
              <div key={name} className="rounded-lg border border-border bg-card shadow-sm">
                <button
                  onClick={() => setOpenExercise(isOpen ? null : name)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-semibold">{name}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{recs.length}</span>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="border-t border-border">
                    {recs.map((r) => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{RECORD_TYPE_LABELS[r.record_type] ?? r.record_type}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(r.achieved_at)}</p>
                        </div>
                        <span className="rounded-md bg-yellow-50 px-3 py-1 text-sm font-bold text-yellow-700">
                          {r.value}{RECORD_TYPE_UNITS[r.record_type] ?? ""}
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

/* ─── XP Tab ─── */

const REASON_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  session_complete: { label: "Sesión completada", icon: Target, color: "text-blue-500 bg-blue-50" },
  personal_record: { label: "Récord personal", icon: Trophy, color: "text-yellow-500 bg-yellow-50" },
  streak_bonus: { label: "Racha", icon: Flame, color: "text-orange-500 bg-orange-50" },
  first_session: { label: "Primera sesión", icon: Star, color: "text-purple-500 bg-purple-50" },
  exercise_variety: { label: "Variedad", icon: Sparkles, color: "text-teal-500 bg-teal-50" },
  long_session: { label: "Sesión larga", icon: Timer, color: "text-indigo-500 bg-indigo-50" },
  high_volume: { label: "Alto volumen", icon: TrendingUp, color: "text-rose-500 bg-rose-50" },
  consistency: { label: "Constancia", icon: Flame, color: "text-red-500 bg-red-50" },
  manual: { label: "Manual", icon: Zap, color: "text-gray-500 bg-gray-50" },
};

type XPSubTab = "overview" | "history" | "leaderboard";

function XPTab() {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<XPSubTab>("overview");
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
      .then(([s, h, l]) => { setSummary(s); setHistory(h); setLeaderboard(l); })
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
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Zap className="h-5 w-5 text-yellow-500" />
          Experiencia
        </h2>
        <p className="text-muted-foreground">Gana XP entrenando y sube de nivel</p>
      </div>

      {/* Level Card */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-yellow-50/50 p-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-white shadow-lg">
            <span className="text-2xl font-black">{summary.level}</span>
            <span className="absolute -bottom-1 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-yellow-900 shadow">
              NIVEL
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">{summary.total_xp.toLocaleString()}</span>
              <span className="text-sm font-medium text-muted-foreground">XP total</span>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Nivel {summary.level}</span>
                <span>{summary.xp_progress} / {summary.xp_needed} XP</span>
                <span>Nivel {summary.level + 1}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-yellow-400 transition-all duration-700"
                  style={{ width: `${summary.progress_pct}%` }}
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              <Medal className="mr-1 inline h-3.5 w-3.5 text-primary" />
              Ranking: <span className="font-semibold text-foreground">#{summary.rank}</span> de {summary.total_users} atletas
            </p>
          </div>
        </div>
      </div>

      {/* XP Rules */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Sesión", xp: 50, icon: Target, color: "text-blue-500" },
          { label: "Récord", xp: 25, icon: Trophy, color: "text-yellow-500" },
          { label: "Racha", xp: "25×día", icon: Flame, color: "text-orange-500" },
          { label: "7 días", xp: 150, icon: Crown, color: "text-red-500" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
            <item.icon className={cn("h-5 w-5", item.color)} />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-bold">+{item.xp} XP</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
        {(["overview", "history", "leaderboard"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              subTab === key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {key === "overview" ? "Resumen" : key === "history" ? "Historial" : "Ranking"}
          </button>
        ))}
      </div>

      {subTab === "overview" && <XPOverview history={history} />}
      {subTab === "history" && <XPHistory history={history} />}
      {subTab === "leaderboard" && <XPLeaderboard leaderboard={leaderboard} currentUserId={user?.id} />}
    </div>
  );
}

function XPOverview({ history }: { history: XPTransaction[] }) {
  const byReason = history.reduce((acc, tx) => {
    acc[tx.reason] = (acc[tx.reason] || 0) + tx.amount;
    return acc;
  }, {} as Record<string, number>);

  const sorted = Object.entries(byReason).sort(([, a], [, b]) => b - a);
  const total = sorted.reduce((s, [, v]) => s + v, 0);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Zap className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">Aún no has ganado XP. ¡Completa tu primera sesión!</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-semibold">Desglose de XP</h3>
      </div>
      <div className="divide-y divide-border">
        {sorted.map(([reason, amount]) => {
          const meta = REASON_META[reason] || REASON_META.manual;
          const Icon = meta.icon;
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return (
            <div key={reason} className="flex items-center gap-4 px-5 py-3.5">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", meta.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{meta.label}</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className="text-sm font-bold text-foreground">+{amount.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function XPHistory({ history }: { history: XPTransaction[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Sin transacciones aún</p>
      </div>
    );
  }

  const grouped = history.reduce((acc, tx) => {
    const dateKey = new Date(tx.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(tx);
    return acc;
  }, {} as Record<string, XPTransaction[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date} className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold">{date}</h3>
            <span className="text-xs font-medium text-primary">+{txs.reduce((s, t) => s + t.amount, 0)} XP</span>
          </div>
          <div className="divide-y divide-border">
            {txs.map((tx) => {
              const meta = REASON_META[tx.reason] || REASON_META.manual;
              const Icon = meta.icon;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", meta.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm">{tx.description || meta.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-green-600">+{tx.amount}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function XPLeaderboard({ leaderboard, currentUserId }: { leaderboard: LeaderboardEntry[]; currentUserId?: number }) {
  if (leaderboard.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Swords className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">El ranking se llenará cuando más atletas se unan</p>
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
        <h3 className="flex items-center gap-2 font-semibold">
          <Crown className="h-4 w-4 text-yellow-500" />
          Ranking Global
        </h3>
      </div>
      <div className="divide-y divide-border">
        {leaderboard.map((entry) => {
          const isMe = entry.user_id === currentUserId;
          const isTop3 = entry.rank <= 3;
          return (
            <div key={entry.user_id} className={cn("flex items-center gap-4 px-5 py-3.5 transition-colors", isMe && "bg-primary/5")}>
              {isTop3 ? (
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold shadow", podiumColors[entry.rank - 1])}>
                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-muted-foreground">
                  {entry.rank}
                </div>
              )}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("truncate text-sm font-medium", isMe && "text-primary")}>
                  {entry.name}
                  {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(tú)</span>}
                </p>
                <p className="text-xs text-muted-foreground">Nivel {entry.level}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{entry.total_xp.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Exercises Tab ─── */

const EXERCISE_TYPES: { value: ExerciseType | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "strength", label: "Fuerza" },
  { value: "cardio", label: "Cardio" },
  { value: "gymnastics", label: "Gimnásticos" },
  { value: "olympic", label: "Olímpicos" },
  { value: "other", label: "Otros" },
];

const EXERCISE_TYPE_OPTIONS: { value: ExerciseType; label: string }[] = [
  { value: "strength", label: "Fuerza" },
  { value: "cardio", label: "Cardio" },
  { value: "gymnastics", label: "Gimnásticos" },
  { value: "olympic", label: "Olímpicos" },
  { value: "other", label: "Otros" },
];

function ExercisesTab() {
  const { user } = useAuth();
  const canCreate = user?.role === "coach" || user?.role === "admin";
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ExerciseType | "">("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<ExerciseType>("strength");
  const [formEquipment, setFormEquipment] = useState("");
  const [formMuscleGroups, setFormMuscleGroups] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState("");

  const PAGE_SIZE = 30;
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => { setPage(1); }, [search, typeFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((page - 1) * PAGE_SIZE));

    let cancelled = false;
    setLoading(true);
    api.getRaw(`/api/exercises?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const total = parseInt(res.headers.get("X-Total-Count") || "0", 10);
        const data: Exercise[] = await res.json();
        if (!cancelled) { setExercises(data); setTotalCount(total); setLoading(false); }
      })
      .catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [search, typeFilter, page, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const resetForm = () => {
    setFormName(""); setFormType("strength"); setFormEquipment("");
    setFormMuscleGroups(""); setFormDescription(""); setFormMsg("");
  };

  const handleCreate = async () => {
    if (!formName.trim()) { setFormMsg("❌ El nombre es obligatorio"); return; }
    setSaving(true);
    setFormMsg("");
    try {
      const muscleGroups = formMuscleGroups.split(",").map((s) => s.trim()).filter(Boolean);
      await api.post("/api/exercises", {
        name: formName.trim(),
        type: formType,
        equipment: formEquipment.trim() || null,
        muscle_groups: muscleGroups.length > 0 ? muscleGroups : null,
        description: formDescription.trim() || null,
      });
      setFormMsg("✅ Ejercicio creado");
      resetForm();
      setShowForm(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFormMsg(`❌ ${err instanceof Error ? err.message : "Error al crear"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">Ejercicios</h2>
          <p className="text-muted-foreground">Catálogo de {totalCount} ejercicios disponibles</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nuevo ejercicio
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Crear ejercicio</h3>
            <button onClick={() => setShowForm(false)} className="rounded-md p-1 hover:bg-secondary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Nombre *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Back Squat"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Tipo *</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as ExerciseType)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {EXERCISE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Equipamiento</label>
                <input
                  value={formEquipment}
                  onChange={(e) => setFormEquipment(e.target.value)}
                  placeholder="Ej: Barra, Mancuernas"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Grupos musculares</label>
                <input
                  value={formMuscleGroups}
                  onChange={(e) => setFormMuscleGroups(e.target.value)}
                  placeholder="Separados por coma: Pecho, Tríceps"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Descripción</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descripción opcional del ejercicio..."
                rows={2}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {formMsg && <p className="text-sm text-muted-foreground">{formMsg}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear ejercicio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-md border border-border bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {EXERCISE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={cn(
                "whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                typeFilter === t.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : exercises.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No se encontraron ejercicios</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex) => (
              <div key={ex.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Dumbbell className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{ex.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">{ex.type}</span>
                    {ex.equipment && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">{ex.equipment}</span>
                    )}
                    {ex.muscle_groups?.slice(0, 2).map((m) => (
                      <span key={m} className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">«</button>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">‹ Anterior</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`dots-${i}`} className="px-1.5 text-xs text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                          page === p ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary",
                        )}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">Siguiente ›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">»</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
