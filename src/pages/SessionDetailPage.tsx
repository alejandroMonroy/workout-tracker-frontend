import WodRunner from "@/components/WodRunner";
import { useTimer, type TimerMode } from "@/hooks/useTimer";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type { CoachMessage, Exercise, WorkoutSession, WorkoutTemplate } from "@/types/api";
import {
  CheckCircle,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Send,
  Timer,
  Trash2,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

interface SetForm {
  exercise_id: number;
  sets: string;
  reps: string;
  weight_kg: string;
  rpe: string;
  notes: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const TIMER_MODES: { value: TimerMode; label: string }[] = [
  { value: "stopwatch", label: "Cronómetro" },
  { value: "amrap", label: "AMRAP" },
  { value: "emom", label: "EMOM" },
  { value: "for_time", label: "For Time" },
  { value: "tabata", label: "Tabata" },
];

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const initRef = useRef(false);

  // Coach message
  const [hasCoach, setHasCoach] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sentMessage, setSentMessage] = useState<CoachMessage | null>(null);

  // Timer panel
  const [showTimer, setShowTimer] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>("stopwatch");
  const [durationMin, setDurationMin] = useState(12);
  const [intervalSec, setIntervalSec] = useState(60);
  const [rounds, setRounds] = useState(8);
  const [workSec, setWorkSec] = useState(20);
  const [restSec, setRestSec] = useState(10);

  const beep = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* Audio not available */ }
  };

  const timer = useTimer({
    mode: timerMode,
    durationSec: timerMode === "amrap" || timerMode === "for_time" ? durationMin * 60 : 0,
    intervalSec,
    rounds,
    workSec,
    restSec,
    onFinish: beep,
    onRound: beep,
  });

  const displayTime =
    timerMode === "stopwatch" || timerMode === "for_time"
      ? formatTime(timer.elapsed)
      : formatTime(timer.remaining);

  // Exercise search
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseResults, setExerciseResults] = useState<Exercise[]>([]);
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const exerciseSearchRef = useRef<HTMLDivElement>(null);
  const exerciseSearchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [form, setForm] = useState<SetForm>({
    exercise_id: 0,
    sets: "",
    reps: "",
    weight_kg: "",
    rpe: "",
    notes: "",
  });

  const loadSession = useCallback(async () => {
    try {
      const s = await api.get<WorkoutSession>(`/api/sessions/${id}`);
      setSession(s);
      if (s.template_id) {
        try {
          const t = await api.get<WorkoutTemplate>(`/api/templates/${s.template_id}`);
          setTemplate(t);
        } catch { /* ignore */ }
      }
    } catch {
      navigate("/profile");
    }
  }, [id, navigate]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        const s = await api.get<WorkoutSession>(`/api/sessions/${id}`);
        setSession(s);
        if (location.state?.template) {
          setTemplate(location.state.template);
        } else if (s.template_id) {
          try {
            const t = await api.get<WorkoutTemplate>(`/api/templates/${s.template_id}`);
            setTemplate(t);
          } catch { /* ignore */ }
        }
        // Check if athlete has a coach
        try {
          const subs = await api.get<{ coach_id: number }[]>("/api/coaches/subscriptions");
          setHasCoach(subs.length > 0);
        } catch { /* ignore */ }
      } catch {
        navigate("/profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exerciseSearchRef.current && !exerciseSearchRef.current.contains(e.target as Node)) {
        setShowExerciseDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchExercises = async (query: string) => {
    try {
      const params = new URLSearchParams({ limit: "10" });
      if (query.trim()) params.set("search", query.trim());
      const results = await api.get<Exercise[]>(`/api/exercises?${params}`);
      setExerciseResults(results);
      setShowExerciseDropdown(true);
    } catch { /* ignore */ }
  };

  const handleExerciseSearch = (value: string) => {
    setExerciseSearch(value);
    setForm((f) => ({ ...f, exercise_id: 0 }));
    clearTimeout(exerciseSearchTimer.current);
    exerciseSearchTimer.current = setTimeout(() => fetchExercises(value), 250);
  };

  const selectExercise = (ex: Exercise) => {
    setForm((f) => ({ ...f, exercise_id: ex.id }));
    setExerciseSearch(ex.name);
    setShowExerciseDropdown(false);
  };

  const addSet = async () => {
    if (!session || !form.exercise_id) return;
    const setNumber = (session.sets?.length ?? 0) + 1;
    const setsCount = Math.max(1, Number(form.sets) || 1);
    await api.post(`/api/sessions/${id}/sets`, {
      exercise_id: form.exercise_id,
      set_number: setNumber,
      sets_count: setsCount,
      reps: form.reps ? Number(form.reps) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      rpe: form.rpe ? Number(form.rpe) : null,
      notes: form.notes || null,
    });
    setForm((f) => ({ ...f, sets: "", reps: "", weight_kg: "", rpe: "", notes: "" }));
    loadSession();
  };

  const deleteSet = async (setId: number) => {
    await api.delete(`/api/sessions/${id}/sets/${setId}`);
    loadSession();
  };

  const finishSession = async () => {
    setFinishing(true);
    try {
      await api.patch(`/api/sessions/${id}/finish`, {});
      navigate("/profile");
    } catch {
      setFinishing(false);
    }
  };

  const sendMessageToCoach = async () => {
    if (!messageBody.trim()) return;
    setSendingMessage(true);
    try {
      const msg = await api.post<CoachMessage>(`/api/sessions/${id}/message`, { body: messageBody });
      setSentMessage(msg);
      setMessageBody("");
    } catch { /* ignore */ }
    setSendingMessage(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  const isActive = !session.finished_at;

  if (isActive && template && session.template_id) {
    return <WodRunner template={template} sessionId={session.id} onFinish={loadSession} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold">Sesión #{session.id}</h1>
          <p className="text-sm text-muted-foreground">
            {isActive ? "En curso" : "Finalizada"}
            {template && ` · ${template.name}`}
          </p>
        </div>
        {isActive && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTimer(!showTimer)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                showTimer
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              <Timer className="h-4 w-4" />
              Timer
            </button>
            <button
              onClick={finishSession}
              disabled={finishing}
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
            >
              {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Finalizar
            </button>
          </div>
        )}
      </div>

      {/* Timer Panel */}
      {showTimer && isActive && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
          {/* Mode selector */}
          <div className="flex flex-wrap gap-2">
            {TIMER_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => { setTimerMode(m.value); timer.reset(); }}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  timerMode === m.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Settings */}
          {!timer.running && !timer.finished && (
            <div className="grid grid-cols-2 gap-3">
              {(timerMode === "amrap" || timerMode === "for_time") && (
                <div>
                  <label className="text-xs text-muted-foreground">Duración (min)</label>
                  <input
                    type="number" min={1} max={60} value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
              )}
              {timerMode === "emom" && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Intervalo (seg)</label>
                    <input
                      type="number" min={10} max={300} value={intervalSec}
                      onChange={(e) => setIntervalSec(Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Rondas</label>
                    <input
                      type="number" min={1} max={50} value={rounds}
                      onChange={(e) => setRounds(Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
              {timerMode === "tabata" && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Trabajo (seg)</label>
                    <input
                      type="number" min={5} max={120} value={workSec}
                      onChange={(e) => setWorkSec(Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Descanso (seg)</label>
                    <input
                      type="number" min={5} max={120} value={restSec}
                      onChange={(e) => setRestSec(Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Rondas</label>
                    <input
                      type="number" min={1} max={50} value={rounds}
                      onChange={(e) => setRounds(Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Display */}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-secondary/30 py-5">
            {timerMode === "tabata" && timer.running && (
              <span className={cn("text-sm font-bold uppercase", timer.phase === "work" ? "text-accent" : "text-destructive")}>
                {timer.phase === "work" ? "💪 Trabajo" : "😮‍💨 Descanso"}
              </span>
            )}
            <span className="font-mono text-5xl font-bold tabular-nums">{displayTime}</span>
            {(timerMode === "emom" || timerMode === "tabata") && (
              <span className="text-sm text-muted-foreground">Ronda {timer.round} / {rounds}</span>
            )}
            {timer.finished && (
              <span className="rounded-full bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent">
                🏁 ¡Terminado! — {formatTime(timer.elapsed)}
              </span>
            )}
            <div className="flex gap-2">
              <button
                onClick={timer.toggle}
                disabled={timer.finished}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full text-white shadow transition-transform hover:scale-105 disabled:opacity-40",
                  timer.running ? "bg-yellow-500" : "bg-accent",
                )}
              >
                {timer.running ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </button>
              <button
                onClick={timer.reset}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow transition-transform hover:scale-105 hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={beep}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow transition-transform hover:scale-105 hover:text-foreground"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add set form */}
      {isActive && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Agregar Serie</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div ref={exerciseSearchRef} className="col-span-2 sm:col-span-5 relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar ejercicio..."
                  value={exerciseSearch}
                  onChange={(e) => handleExerciseSearch(e.target.value)}
                  onFocus={() => {
                    if (exerciseResults.length > 0) setShowExerciseDropdown(true);
                    else fetchExercises(exerciseSearch);
                  }}
                  className="block w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm"
                />
              </div>
              {showExerciseDropdown && exerciseResults.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-white shadow-lg">
                  {exerciseResults.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => selectExercise(ex)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent/50"
                    >
                      {ex.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="number" placeholder="Series" min="1" value={form.sets}
              onChange={(e) => setForm({ ...form, sets: e.target.value })}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              type="number" placeholder="Reps" value={form.reps}
              onChange={(e) => setForm({ ...form, reps: e.target.value })}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              type="number" placeholder="Peso (kg)" value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              type="number" placeholder="RPE" min="1" max="10" value={form.rpe}
              onChange={(e) => setForm({ ...form, rpe: e.target.value })}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <button
              onClick={addSet}
              className="flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        </div>
      )}

      {/* Sets list */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-semibold">Series ({session.sets.length})</h2>
        </div>
        {session.sets.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No hay series aún. Agrega la primera.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {session.sets.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{s.exercise?.name ?? `Ejercicio #${s.exercise_id}`}</p>
                  <p className="text-xs text-muted-foreground">
                    Set #{s.set_number}
                    {s.reps != null && ` · ${s.sets_count ?? 1}x${s.reps} reps`}
                    {s.weight_kg != null && ` · ${s.weight_kg} kg`}
                    {s.rpe != null && ` · RPE ${s.rpe}`}
                  </p>
                </div>
                {isActive && (
                  <button
                    onClick={() => deleteSet(s.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message to coach — shown on finished sessions if athlete has a coach */}
      {!isActive && hasCoach && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <MessageSquare className="h-4 w-4 text-primary" />
            Mensaje a tu entrenador
          </h2>
          {sentMessage ? (
            <div className="rounded-md bg-accent/10 px-4 py-3 text-sm text-accent">
              Mensaje enviado correctamente.
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                rows={3}
                placeholder="Cuéntale a tu entrenador cómo fue el entrenamiento..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
              <button
                onClick={sendMessageToCoach}
                disabled={sendingMessage || !messageBody.trim()}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {sendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
