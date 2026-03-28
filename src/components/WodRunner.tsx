import { useTimer, type TimerMode } from "@/hooks/useTimer";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type { TemplateBlock, WorkoutModality, WorkoutTemplate } from "@/types/api";
import {
    Flag,
    Pause,
    Play,
    Trophy,
    Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ────────── Props ────────── */

interface WodRunnerProps {
  template: WorkoutTemplate;
  sessionId: number;
  onFinish: () => void;
}

/* ── Normalised shape used internally ── */
interface NormalisedConfig {
  name: string;
  description: string | null;
  modality: WorkoutModality;
  rounds: number | null;
  time_cap_sec: number | null;
  work_sec: number | null;
  rest_sec: number | null;
  exercises: TemplateBlock[];
}

function normalise(template: WorkoutTemplate): NormalisedConfig {
  return {
    name: template.name,
    description: template.description,
    modality: template.modality,
    rounds: template.rounds,
    time_cap_sec: template.time_cap_sec,
    work_sec: null,
    rest_sec: null,
    exercises: template.blocks,
  };
}

/* ────────── Helpers ────────── */

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function beep(freq = 880) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    /* audio unavailable */
  }
}

function tripleBeep() {
  beep(880);
  setTimeout(() => beep(880), 150);
  setTimeout(() => beep(1100), 300);
}

/* ────────── Constants ────────── */

const MOD_LABEL: Record<string, string> = {
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "FOR TIME",
  tabata: "TABATA",
  custom: "CUSTOM",
};

const MOD_GRADIENT: Record<string, string> = {
  amrap: "from-red-500 to-orange-500",
  emom: "from-blue-500 to-cyan-500",
  for_time: "from-green-500 to-emerald-500",
  tabata: "from-purple-500 to-pink-500",
  custom: "from-gray-600 to-gray-700",
};

type Phase = "ready" | "countdown" | "running" | "completed";

/* ================================================================== */
/*  WodRunner                                                          */
/* ================================================================== */

export default function WodRunner({
  template,
  sessionId,
  onFinish,
}: WodRunnerProps) {
  const cfg = normalise(template);
  const exercises = cfg.exercises;
  const totalExercises = exercises.length;
  const totalRounds = cfg.rounds ?? 1;

  /* ── state ── */
  const [phase, setPhase] = useState<Phase>("ready");
  const [blockIdx, setBlockIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [cdVal, setCdVal] = useState(3); // countdown 3-2-1
  const finishedRef = useRef(false);
  const cdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── timer config ── */
  const timerMode: TimerMode = (() => {
    switch (cfg.modality) {
      case "amrap":
        return "amrap";
      case "emom":
        return "emom";
      case "for_time":
        return "for_time";
      case "tabata":
        return "tabata";
      default:
        return "stopwatch";
    }
  })();

  // EMOM: each interval = 1 minute (or derived from time_cap / total intervals)
  const emomTotalIntervals = totalExercises * totalRounds;
  const emomInterval =
    cfg.modality === "emom" && cfg.time_cap_sec
      ? Math.max(10, Math.floor(cfg.time_cap_sec / emomTotalIntervals))
      : 60;

  // Tabata: work / rest from block-level config or defaults
  const tabataWork = cfg.work_sec ?? 20;
  const tabataRest = cfg.rest_sec ?? 10;

  // Total rounds fed to the timer (varies per modality)
  const timerRounds = (() => {
    if (cfg.modality === "emom") return emomTotalIntervals;
    if (cfg.modality === "tabata") return totalExercises * totalRounds;
    return totalRounds;
  })();

  /* ── timer callbacks ── */
  const onTimerFinish = useCallback(() => {
    tripleBeep();
    setPhase("completed");
  }, []);

  const onTimerRound = useCallback(
    (newRound: number) => {
      beep(660);
      // Auto-advance current exercise for EMOM / Tabata
      if (
        cfg.modality === "emom" ||
        cfg.modality === "tabata"
      ) {
        const idx = (newRound - 1) % totalExercises;
        const r = Math.floor((newRound - 1) / totalExercises) + 1;
        setBlockIdx(idx);
        setRound(r);
      }
    },
    [cfg.modality, totalExercises],
  );

  const timer = useTimer({
    mode: timerMode,
    durationSec: cfg.time_cap_sec ?? 0,
    intervalSec: emomInterval,
    rounds: timerRounds,
    workSec: cfg.modality === "tabata" ? tabataWork : 20,
    restSec: cfg.modality === "tabata" ? tabataRest : 10,
    onFinish: onTimerFinish,
    onRound: onTimerRound,
  });

  /* ── 3-2-1 countdown ── */
  const startCountdown = () => {
    setPhase("countdown");
    setCdVal(3);
    let v = 3;
    beep(660);
    cdRef.current = setInterval(() => {
      v -= 1;
      if (v <= 0) {
        if (cdRef.current) clearInterval(cdRef.current);
        setPhase("running");
        tripleBeep();
        timer.start();
      } else {
        setCdVal(v);
        beep(660);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cdRef.current) clearInterval(cdRef.current);
    };
  }, []);

  /* ── manual finish ── */
  const finishWod = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    timer.pause();
    api.patch(`/api/sessions/${sessionId}/finish`, {}).catch(() => {});
    setPhase("completed");
  }, [timer, sessionId]);

  /* ── auto-finish API when completed ── */
  useEffect(() => {
    if (phase === "completed" && !finishedRef.current) {
      finishedRef.current = true;
      api.patch(`/api/sessions/${sessionId}/finish`, {}).catch(() => {});
    }
  }, [phase, sessionId]);

  /* ── derived ── */
  const isUrgent =
    timer.remaining <= 10 &&
    timer.remaining > 0 &&
    timer.running &&
    (cfg.modality === "amrap" ||
      cfg.modality === "for_time" ||
      cfg.modality === "emom");
  const gradient = MOD_GRADIENT[cfg.modality] ?? MOD_GRADIENT.custom;

  /* ================================================================ */
  /*  READY                                                            */
  /* ================================================================ */
  if (phase === "ready") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        {/* header card */}
        <div
          className={cn(
            "rounded-2xl bg-linear-to-br p-6 text-white shadow-lg",
            gradient,
          )}
        >
          <p className="text-sm font-medium uppercase tracking-wider opacity-80">
            {MOD_LABEL[cfg.modality]}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{cfg.name}</h1>
          {cfg.description && (
            <p className="mt-2 text-sm opacity-90">{cfg.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {cfg.rounds && <span>🔄 {cfg.rounds} rondas</span>}
            {cfg.time_cap_sec && (
              <span>
                ⏱️ {Math.floor(cfg.time_cap_sec / 60)} min
              </span>
            )}
            <span>💪 {exercises.length} ejercicios</span>
          </div>
        </div>

        {/* exercise list */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ejercicios
          </h2>
          <div className="space-y-3">
            {exercises.map((b, i) => (
              <div key={b.id} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {b.exercise?.name ?? `Ejercicio #${b.exercise_id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      b.target_reps && `${b.target_reps} reps`,
                      b.target_weight_kg && `${b.target_weight_kg} kg`,
                      b.target_distance_m && `${b.target_distance_m} m`,
                      b.target_duration_sec && `${b.target_duration_sec}s`,
                      b.target_sets && `${b.target_sets} series`,
                      b.rest_sec && `Desc: ${b.rest_sec}s`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sin objetivo específico"}
                  </p>
                  {b.notes && (
                    <p className="mt-0.5 text-xs italic text-muted-foreground/70">
                      📝 {b.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* start button */}
        <button
          onClick={startCountdown}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 text-lg font-bold text-accent-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Zap className="h-6 w-6" />
          ¡EMPEZAR WOD!
        </button>
      </div>
    );
  }

  /* ================================================================ */
  /*  COUNTDOWN                                                        */
  /* ================================================================ */
  if (phase === "countdown") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <p className="mb-4 text-lg text-muted-foreground">¡Prepárate!</p>
        <span className="animate-pulse text-9xl font-black text-accent">
          {cdVal}
        </span>
        <p className="mt-6 text-sm text-muted-foreground">{cfg.name}</p>
      </div>
    );
  }

  /* ================================================================ */
  /*  COMPLETED                                                        */
  /* ================================================================ */
  if (phase === "completed") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="animate-bounce">
            <Trophy className="h-16 w-16 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold">¡WOD Completado! 🎉</h1>
          <p className="text-muted-foreground">{cfg.name}</p>

          <div className="mt-4">
            <div className="rounded-lg bg-secondary p-4">
              <p className="text-3xl font-bold">{fmt(timer.elapsed)}</p>
              <p className="text-xs text-muted-foreground">Tiempo total</p>
            </div>
          </div>
        </div>

        <button
          onClick={onFinish}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium shadow-sm hover:bg-secondary"
        >
          Ver sesión
        </button>
      </div>
    );
  }

  /* ================================================================ */
  /*  RUNNING                                                          */
  /* ================================================================ */
  const timerDisplay =
    cfg.modality === "for_time" || cfg.modality === "custom"
      ? fmt(timer.elapsed)
      : fmt(timer.remaining);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* ── top bar ── */}
      <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {MOD_LABEL[cfg.modality]}
        </span>
        <button
          onClick={finishWod}
          className="flex items-center gap-1 text-xs font-medium text-destructive hover:text-destructive/80"
        >
          <Flag className="h-3.5 w-3.5" />
          Terminar
        </button>
      </div>

      {/* ── timer ── */}
      <div
        className={cn(
          "flex flex-col items-center rounded-2xl p-6 shadow-lg transition-all duration-300",
          cfg.modality === "tabata" && timer.phase === "rest"
            ? "bg-orange-500 text-white"
            : isUrgent
              ? "bg-red-600 text-white"
              : cn("bg-linear-to-br text-white", gradient),
        )}
      >
        {cfg.modality === "tabata" && (
          <span className="mb-1 text-sm font-bold uppercase tracking-wider opacity-90">
            {timer.phase === "work" ? "💪 TRABAJO" : "😮‍💨 DESCANSO"}
          </span>
        )}

        <span
          className={cn(
            "font-mono font-black tabular-nums leading-none",
            isUrgent ? "animate-pulse text-8xl" : "text-7xl",
          )}
        >
          {timerDisplay}
        </span>

        {cfg.modality === "emom" && (
          <p className="mt-2 text-sm opacity-80">
            Intervalo {timer.round} / {timerRounds}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={timer.toggle}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
          >
            {timer.running ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* ── exercise list with current highlighted ── */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ejercicios — Ronda {Math.min(round, totalRounds)} / {totalRounds}
        </h2>
        <div className="space-y-2">
          {exercises.map((b, i) => {
            const isCurrent = i === blockIdx;
            return (
              <div
                key={b.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-3 py-2 transition-all",
                  isCurrent
                    ? "border-2 border-accent bg-accent/10 shadow-sm"
                    : "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    isCurrent
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", isCurrent ? "font-bold" : "font-medium")}>
                    {b.exercise?.name ?? `Ejercicio #${b.exercise_id}`}
                    {isCurrent && " ◀"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      b.target_reps && `${b.target_reps} reps`,
                      b.target_weight_kg && `${b.target_weight_kg} kg`,
                      b.target_distance_m && `${b.target_distance_m} m`,
                      b.target_duration_sec && `${b.target_duration_sec}s`,
                      b.target_sets && `${b.target_sets} series`,
                      b.rest_sec && `Desc: ${b.rest_sec}s`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sin objetivo específico"}
                  </p>
                  {b.notes && (
                    <p className="mt-0.5 text-xs italic text-muted-foreground/70">
                      📝 {b.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
