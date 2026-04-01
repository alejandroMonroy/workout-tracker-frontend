import WodRunner from "@/components/WodRunner";
import { useTimer, type TimerMode } from "@/hooks/useTimer";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type { CoachMessage, WorkoutSession, WorkoutTemplate } from "@/types/api";
import {
  CheckCircle,
  Dumbbell,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Send,
  Star,
  Timer,
  Trophy,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

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

const MOD_GRADIENT: Record<string, string> = {
  amrap: "from-red-500 to-orange-500",
  emom: "from-blue-500 to-cyan-500",
  for_time: "from-green-500 to-emerald-500",
  tabata: "from-purple-500 to-pink-500",
  custom: "from-gray-600 to-gray-700",
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const initRef = useRef(false);

  // Coach message (send form for finished sessions without a coach message yet)
  const [hasCoach, setHasCoach] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sentMessage, setSentMessage] = useState<CoachMessage | null>(null);

  // Timer panel (active sessions only)
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
    return <WodRunner template={template} sessionId={session.id} onFinish={() => navigate("/profile")} />;
  }

  /* ── Finished session — summary view ── */
  if (!isActive) {
    const gradient = template ? (MOD_GRADIENT[template.modality] ?? MOD_GRADIENT.custom) : MOD_GRADIENT.custom;
    const workoutName = template?.name ?? `Workout #${session.id}`;
    const finishedDate = new Date(session.finished_at!).toLocaleDateString("es-ES", {
      weekday: "long", day: "numeric", month: "long",
    });

    // Group sets by exercise
    const exerciseMap = new Map<string, typeof session.sets>();
    for (const s of session.sets) {
      const key = s.exercise?.name ?? `Ejercicio #${s.exercise_id}`;
      if (!exerciseMap.has(key)) exerciseMap.set(key, []);
      exerciseMap.get(key)!.push(s);
    }

    return (
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className={cn("rounded-2xl bg-linear-to-br p-6 text-white shadow-lg text-center", gradient)}>
          <div className="flex justify-center mb-3">
            <Trophy className="h-14 w-14 text-yellow-300 drop-shadow" />
          </div>
          <h1 className="text-2xl font-bold">{workoutName}</h1>
          <p className="mt-1 text-sm opacity-80 capitalize">{finishedDate}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {session.total_duration_sec != null && (
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-3xl font-black tabular-nums">{formatTime(session.total_duration_sec)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Tiempo total</p>
            </div>
          )}
          <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-3xl font-black text-yellow-500">+{session.xp_earned}</p>
            <p className="mt-1 text-xs text-muted-foreground">XP ganados</p>
          </div>
          {session.total_volume_kg > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-3xl font-black text-blue-500">
                {session.total_volume_kg % 1 === 0
                  ? session.total_volume_kg
                  : session.total_volume_kg.toFixed(1)}
                <span className="text-base font-semibold"> kg</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Volumen total</p>
            </div>
          )}
          {session.pr_count > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-3xl font-black text-green-500">{session.pr_count}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {session.pr_count === 1 ? "Récord personal" : "Récords personales"}
              </p>
            </div>
          )}
        </div>

        {/* Exercises done — from recorded sets, or fall back to template blocks */}
        {(exerciseMap.size > 0 || (template && template.blocks.length > 0)) && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Dumbbell className="h-4 w-4" />
              Ejercicios realizados
            </h2>
            <div className="space-y-3">
              {exerciseMap.size > 0
                ? [...exerciseMap.entries()].map(([name, sets], i) => (
                    <div key={name} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {sets.map((s) =>
                            [
                              s.sets_count && s.reps ? `${s.sets_count}×${s.reps} reps` : s.reps ? `${s.reps} reps` : null,
                              s.weight_kg ? `${s.weight_kg} kg` : null,
                              s.distance_m ? `${s.distance_m} m` : null,
                            ].filter(Boolean).join(" · ")
                          ).filter(Boolean).join(" | ")}
                        </p>
                      </div>
                      <Star className="h-4 w-4 shrink-0 text-yellow-400" />
                    </div>
                  ))
                : template!.blocks.map((b, i) => (
                    <div key={b.id} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {b.exercise?.name ?? `Ejercicio #${b.exercise_id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            b.target_sets && b.target_reps ? `${b.target_sets}×${b.target_reps} reps` : b.target_reps ? `${b.target_reps} reps` : null,
                            b.target_weight_kg ? `${b.target_weight_kg} kg` : null,
                            b.target_distance_m ? `${b.target_distance_m} m` : null,
                            b.target_duration_sec ? `${b.target_duration_sec}s` : null,
                          ].filter(Boolean).join(" · ") || "Sin objetivo específico"}
                        </p>
                      </div>
                      <Star className="h-4 w-4 shrink-0 text-yellow-400" />
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* Coach message (received) */}
        {session.coach_message && (session.plan_workout_id || session.class_schedule_id) && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Mensaje de {session.coach_name ?? "tu entrenador"}
            </p>
            <p className="text-sm text-foreground">{session.coach_message}</p>
          </div>
        )}

        {/* Send message to coach */}
        {hasCoach && !session.coach_message && (session.plan_workout_id || session.class_schedule_id) && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
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
                  {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => navigate("/profile")}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium shadow-sm hover:bg-secondary"
        >
          Volver al historial
        </button>
      </div>
    );
  }

  /* ── Active session (non-template) ── */
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold">Sesión #{session.id}</h1>
          <p className="text-sm text-muted-foreground">En curso</p>
        </div>
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
      </div>

      {/* Timer Panel */}
      {showTimer && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
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

      {/* Sets list */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-semibold">Series ({session.sets.length})</h2>
        </div>
        {session.sets.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No hay series aún.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {session.sets.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{s.exercise?.name ?? `Ejercicio #${s.exercise_id}`}</p>
                  <p className="text-xs text-muted-foreground">
                    Set #{s.set_number}
                    {s.reps != null && ` · ${s.sets_count ?? 1}×${s.reps} reps`}
                    {s.weight_kg != null && ` · ${s.weight_kg} kg`}
                    {s.rpe != null && ` · RPE ${s.rpe}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
