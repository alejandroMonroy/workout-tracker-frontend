import { useTimer, type TimerMode } from "@/hooks/useTimer";
import { cn } from "@/lib/utils";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { useState } from "react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const MODES: { value: TimerMode; label: string; desc: string }[] = [
  { value: "stopwatch", label: "Cronómetro", desc: "Cuenta libre" },
  { value: "amrap", label: "AMRAP", desc: "Max rondas en tiempo" },
  { value: "emom", label: "EMOM", desc: "Cada minuto en el minuto" },
  { value: "for_time", label: "For Time", desc: "Completar lo más rápido" },
  { value: "tabata", label: "Tabata", desc: "Trabajo / Descanso" },
];

const PHASE_COLORS = {
  work: "text-accent",
  rest: "text-destructive",
};

export default function TimerPage() {
  const [mode, setMode] = useState<TimerMode>("stopwatch");
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
    } catch {
      // Audio not available
    }
  };

  const timer = useTimer({
    mode,
    durationSec: mode === "amrap" || mode === "for_time" ? durationMin * 60 : 0,
    intervalSec,
    rounds,
    workSec,
    restSec,
    onFinish: beep,
    onRound: beep,
  });

  // What to show as main display
  const displayTime =
    mode === "stopwatch" || mode === "for_time"
      ? formatTime(timer.elapsed)
      : formatTime(timer.remaining);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Timer</h1>
        <p className="text-muted-foreground">
          Cronómetro para tus WODs
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => {
              setMode(m.value);
              timer.reset();
            }}
            className={cn(
              "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              mode === m.value
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
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">
            Configuración
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(mode === "amrap" || mode === "for_time") && (
              <div>
                <label className="text-xs text-muted-foreground">
                  Duración (min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </div>
            )}
            {mode === "emom" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Intervalo (seg)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={intervalSec}
                    onChange={(e) => setIntervalSec(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Rondas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={rounds}
                    onChange={(e) => setRounds(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            {mode === "tabata" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Trabajo (seg)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={workSec}
                    onChange={(e) => setWorkSec(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Descanso (seg)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={restSec}
                    onChange={(e) => setRestSec(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Rondas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={rounds}
                    onChange={(e) => setRounds(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main display */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
        {/* Phase indicator for Tabata */}
        {mode === "tabata" && timer.running && (
          <span
            className={cn(
              "text-lg font-bold uppercase",
              PHASE_COLORS[timer.phase],
            )}
          >
            {timer.phase === "work" ? "💪 Trabajo" : "😮‍💨 Descanso"}
          </span>
        )}

        {/* Time */}
        <span className="font-mono text-7xl font-bold tabular-nums text-foreground">
          {displayTime}
        </span>

        {/* Round info */}
        {(mode === "emom" || mode === "tabata") && (
          <span className="text-lg text-muted-foreground">
            Ronda {timer.round} / {rounds}
          </span>
        )}

        {/* Finished badge */}
        {timer.finished && (
          <span className="rounded-full bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent">
            🏁 ¡Terminado! — {formatTime(timer.elapsed)}
          </span>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={timer.toggle}
            disabled={timer.finished}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-40",
              timer.running ? "bg-yellow-500" : "bg-accent",
            )}
          >
            {timer.running ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="ml-0.5 h-6 w-6" />
            )}
          </button>
          <button
            onClick={timer.reset}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition-transform hover:scale-105 hover:text-foreground"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={beep}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition-transform hover:scale-105 hover:text-foreground"
            title="Test beep"
          >
            <Volume2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mode description */}
      <p className="text-center text-sm text-muted-foreground">
        {MODES.find((m) => m.value === mode)?.desc}
      </p>
    </div>
  );
}
