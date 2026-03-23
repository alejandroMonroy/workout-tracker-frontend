import { useCallback, useEffect, useRef, useState } from "react";

export type TimerMode = "amrap" | "emom" | "for_time" | "tabata" | "stopwatch";

interface TimerState {
  /** Elapsed seconds */
  elapsed: number;
  /** Is timer running */
  running: boolean;
  /** Current round (for EMOM/Tabata) */
  round: number;
  /** Phase: "work" or "rest" (for Tabata) */
  phase: "work" | "rest";
  /** Has the timer finished (cap reached) */
  finished: boolean;
}

interface UseTimerOptions {
  mode: TimerMode;
  /** Total seconds for AMRAP / FOR_TIME cap */
  durationSec?: number;
  /** Interval seconds for EMOM */
  intervalSec?: number;
  /** Total rounds */
  rounds?: number;
  /** Work seconds for Tabata (default 20) */
  workSec?: number;
  /** Rest seconds for Tabata (default 10) */
  restSec?: number;
  /** Callback on finish */
  onFinish?: () => void;
  /** Callback on round change */
  onRound?: (round: number) => void;
}

export function useTimer(options: UseTimerOptions) {
  const {
    mode,
    durationSec = 0,
    intervalSec = 60,
    rounds = 8,
    workSec = 20,
    restSec = 10,
    onFinish,
    onRound,
  } = options;

  const [state, setState] = useState<TimerState>({
    elapsed: 0,
    running: false,
    round: 1,
    phase: "work",
    finished: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);
  // Ref so the running setInterval always calls the latest tick
  const tickRef = useRef<() => void>(() => {});

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  const tick = useCallback(() => {
    const now = Date.now();
    const totalElapsed = Math.floor(
      (now - startTimeRef.current) / 1000 + pausedElapsedRef.current,
    );

    setState((prev) => {
      if (prev.finished) return prev;

      const next = { ...prev, elapsed: totalElapsed };

      switch (mode) {
        case "amrap": {
          if (durationSec > 0 && totalElapsed >= durationSec) {
            next.finished = true;
            next.elapsed = durationSec;
            next.running = false;
            onFinish?.();
          }
          break;
        }

        case "for_time": {
          // Count up; cap is optional
          if (durationSec > 0 && totalElapsed >= durationSec) {
            next.finished = true;
            next.elapsed = durationSec;
            next.running = false;
            onFinish?.();
          }
          break;
        }

        case "emom": {
          const currentRound = Math.floor(totalElapsed / intervalSec) + 1;
          if (currentRound > rounds) {
            next.finished = true;
            next.running = false;
            next.round = rounds;
            onFinish?.();
          } else {
            if (currentRound !== prev.round) {
              next.round = currentRound;
              onRound?.(currentRound);
            }
          }
          break;
        }

        case "tabata": {
          const cycleSec = workSec + restSec;
          const totalCycles = rounds;
          const totalDuration = totalCycles * cycleSec;

          if (totalElapsed >= totalDuration) {
            next.finished = true;
            next.running = false;
            next.round = totalCycles;
            onFinish?.();
          } else {
            const currentCycle = Math.floor(totalElapsed / cycleSec);
            const posInCycle = totalElapsed % cycleSec;
            const newRound = currentCycle + 1;
            const newPhase: "work" | "rest" =
              posInCycle < workSec ? "work" : "rest";

            if (newRound !== prev.round) {
              next.round = newRound;
              onRound?.(newRound);
            }
            next.phase = newPhase;
          }
          break;
        }

        case "stopwatch":
        default:
          // Just count up
          break;
      }

      return next;
    });
  }, [mode, durationSec, intervalSec, rounds, workSec, restSec, onFinish, onRound]);

  // Always keep tickRef pointing to the latest tick
  useEffect(() => { tickRef.current = tick; }, [tick]);

  const start = useCallback(() => {
    if (state.finished) return;
    startTimeRef.current = Date.now();
    clearTimer();
    // Use tickRef so the interval always calls the latest tick closure
    intervalRef.current = setInterval(() => tickRef.current(), 250);
    setState((s) => ({ ...s, running: true }));
  }, [state.finished, clearTimer]);

  const pause = useCallback(() => {
    clearTimer();
    pausedElapsedRef.current = state.elapsed;
    setState((s) => ({ ...s, running: false }));
  }, [clearTimer, state.elapsed]);

  const reset = useCallback(() => {
    clearTimer();
    pausedElapsedRef.current = 0;
    setState({
      elapsed: 0,
      running: false,
      round: 1,
      phase: "work",
      finished: false,
    });
  }, [clearTimer]);

  const toggle = useCallback(() => {
    if (state.running) pause();
    else start();
  }, [state.running, start, pause]);

  /** Remaining time for countdown modes */
  const remaining = (() => {
    switch (mode) {
      case "amrap":
        return Math.max(0, durationSec - state.elapsed);
      case "emom":
        return Math.max(0, intervalSec - (state.elapsed % intervalSec));
      case "tabata": {
        const cycleSec = workSec + restSec;
        const posInCycle = state.elapsed % cycleSec;
        return state.phase === "work"
          ? Math.max(0, workSec - posInCycle)
          : Math.max(0, cycleSec - posInCycle);
      }
      case "for_time":
        return durationSec > 0
          ? Math.max(0, durationSec - state.elapsed)
          : state.elapsed;
      default:
        return state.elapsed;
    }
  })();

  return {
    ...state,
    remaining,
    start,
    pause,
    reset,
    toggle,
  };
}
