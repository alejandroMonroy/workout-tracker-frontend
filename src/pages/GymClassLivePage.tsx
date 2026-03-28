import { api } from "@/services/api";
import type { ClassLiveState, GymClassBlockType } from "@/types/api";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  Dumbbell,
  Loader2,
  Pause,
  Play,
  SkipForward,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const BLOCK_TYPE_LABELS: Record<GymClassBlockType, string> = {
  cronometro: "Cronómetro",
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For Time",
  tabata: "Tabata",
};

const BLOCK_TYPE_COLORS: Record<GymClassBlockType, string> = {
  cronometro: "bg-blue-100 text-blue-700",
  amrap: "bg-orange-100 text-orange-700",
  emom: "bg-purple-100 text-purple-700",
  for_time: "bg-green-100 text-green-700",
  tabata: "bg-red-100 text-red-700",
};

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function GymClassLivePage() {
  const { schedId } = useParams<{ schedId: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<ClassLiveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Client-side timer interpolation
  const [displayElapsed, setDisplayElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<ClassLiveState | null>(null);
  const lastSyncRef = useRef<number>(Date.now());

  const fetchState = useCallback(async () => {
    try {
      const s = await api.get<ClassLiveState>(`/api/gyms/mine/schedules/${schedId}/live`);
      setState(s);
      stateRef.current = s;
      lastSyncRef.current = Date.now();
      setDisplayElapsed(s.elapsed_sec);
    } catch {
      setError("Error al cargar el estado de la clase");
    } finally {
      setLoading(false);
    }
  }, [schedId]);

  // Poll every 5s
  useEffect(() => {
    fetchState();
    const poll = setInterval(fetchState, 5000);
    return () => clearInterval(poll);
  }, [fetchState]);

  // Client-side tick every second
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const s = stateRef.current;
      if (!s || s.live_status !== "active") return;
      const extraSec = Math.floor((Date.now() - lastSyncRef.current) / 1000);
      setDisplayElapsed(s.elapsed_sec + extraSec);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const doAction = async (action: string) => {
    setActionLoading(action);
    setError("");
    try {
      const s = await api.post<ClassLiveState>(`/api/gyms/mine/schedules/${schedId}/live/${action}`, {});
      setState(s);
      stateRef.current = s;
      lastSyncRef.current = Date.now();
      setDisplayElapsed(s.elapsed_sec);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">No se encontró la clase</p>
        <button onClick={() => navigate(-1)} className="text-sm text-primary underline">Volver</button>
      </div>
    );
  }

  const isActive = state.live_status === "active";
  const isPaused = state.live_status === "paused";
  const isPending = state.live_status === "pending";
  const isFinished = state.live_status === "finished";

  const block = state.current_block;
  const hasNext = state.live_block_index < state.total_blocks - 1;
  const remaining = block?.duration_sec != null ? Math.max(0, block.duration_sec - displayElapsed) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Control de clase en vivo
          </h1>
          {state.workout_name && (
            <p className="text-sm text-muted-foreground mt-0.5">{state.workout_name}</p>
          )}
        </div>
        <button
          onClick={() => navigate("/gym/schedule")}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ✕ Cerrar
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          isActive ? "bg-green-100 text-green-700" :
          isPaused ? "bg-yellow-100 text-yellow-700" :
          isFinished ? "bg-gray-100 text-gray-600" :
          "bg-blue-100 text-blue-700"
        }`}>
          {isActive && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
          {isActive ? "En vivo" : isPaused ? "Pausado" : isFinished ? "Finalizado" : "Pendiente"}
        </span>
        {state.total_blocks > 0 && (
          <span className="text-sm text-muted-foreground">
            Bloque {state.live_block_index + 1} de {state.total_blocks}
          </span>
        )}
      </div>

      {/* Timer display */}
      {(isActive || isPaused) && (
        <div className={`rounded-2xl p-8 text-center ${isActive ? "bg-primary" : "bg-secondary"}`}>
          <p className={`text-6xl font-mono font-bold ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
            {remaining !== null ? fmt(remaining) : fmt(displayElapsed)}
          </p>
          {remaining !== null && (
            <p className={`text-sm mt-1 ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              restante · transcurrido: {fmt(displayElapsed)}
            </p>
          )}
          {block && (
            <p className={`text-sm font-medium mt-3 ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
              {block.name}
            </p>
          )}
        </div>
      )}

      {/* Current block detail */}
      {block && (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">{block.name}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BLOCK_TYPE_COLORS[block.block_type]}`}>
              {BLOCK_TYPE_LABELS[block.block_type]}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {block.duration_sec && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmt(block.duration_sec)}</span>}
            {block.rounds && <span>{block.rounds} rondas</span>}
            {block.work_sec && block.rest_sec && <span>{block.work_sec}s trabajo / {block.rest_sec}s descanso</span>}
          </div>

          {block.exercises.length > 0 && (
            <div className="space-y-2">
              {block.exercises.map((ex) => (
                <div key={ex.id} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-foreground">{ex.exercise_name ?? ex.exercise?.name ?? `Ejercicio ${ex.exercise_id}`}</span>
                    {(ex.target_sets || ex.target_reps || ex.target_weight_kg) && (
                      <span className="text-muted-foreground ml-1.5">
                        {ex.target_sets && `${ex.target_sets}×`}
                        {ex.target_reps && `${ex.target_reps} reps`}
                        {ex.target_weight_kg && ` · ${ex.target_weight_kg}kg`}
                      </span>
                    )}
                    {ex.notes && <p className="text-muted-foreground text-xs">{ex.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {isPending && (
          <button
            onClick={() => doAction("start")}
            disabled={!!actionLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {actionLoading === "start" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Iniciar clase
          </button>
        )}

        {isActive && (
          <>
            <button
              onClick={() => doAction("pause")}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-foreground font-medium text-sm hover:bg-secondary disabled:opacity-50"
            >
              {actionLoading === "pause" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
              Pausar
            </button>
            {hasNext && (
              <button
                onClick={() => doAction("next")}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {actionLoading === "next" ? <Loader2 className="h-4 w-4 animate-spin" /> : <SkipForward className="h-4 w-4" />}
                Siguiente bloque
              </button>
            )}
            <button
              onClick={() => doAction("finish")}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium text-sm hover:bg-destructive/90 disabled:opacity-50"
            >
              {actionLoading === "finish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              Finalizar clase
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={() => doAction("resume")}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {actionLoading === "resume" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Reanudar
            </button>
            <button
              onClick={() => doAction("finish")}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium text-sm hover:bg-destructive/90 disabled:opacity-50"
            >
              {actionLoading === "finish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              Finalizar clase
            </button>
          </>
        )}

        {isFinished && (
          <div className="w-full rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium">
            ✓ Clase finalizada. Los atletas ya pueden guardar su sesión.
          </div>
        )}
      </div>

      {/* Block list overview */}
      {state.total_blocks > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bloques del workout</p>
          <div className="space-y-1">
            {/* We rely on fetched state; blocks visible only when current_block exists */}
            {block && Array.from({ length: state.total_blocks }, (_, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  i === state.live_block_index
                    ? "bg-primary/10 border border-primary/20 font-medium text-primary"
                    : i < state.live_block_index
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">
                  {i < state.live_block_index ? "✓" : i + 1}
                </span>
                {i === state.live_block_index ? block.name : `Bloque ${i + 1}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
