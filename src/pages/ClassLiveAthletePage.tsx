import { api } from "@/services/api";
import type {
  ClassLiveState,
  GymClassBlockType,
  GymClassWorkoutExercise,
  WorkoutSession,
} from "@/types/api";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  Dumbbell,
  Loader2,
  Save,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const TOKEN_KEY = "workout_access_token";

const BLOCK_TYPE_LABELS: Record<GymClassBlockType, string> = {
  cronometro: "Cronómetro",
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For Time",
  tabata: "Tabata",
};

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface SetInput {
  exercise_id: number;
  set_number: number;
  reps: string;
  weight_kg: string;
  distance_m: string;
  duration_sec: string;
}

type SaveStep = "form" | "saving" | "done";

export default function ClassLiveAthletePage() {
  const { schedId } = useParams<{ schedId: string }>();
  const navigate = useNavigate();

  const [liveState, setLiveState] = useState<ClassLiveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Client-side timer
  const [displayElapsed, setDisplayElapsed] = useState(0);
  const stateRef = useRef<ClassLiveState | null>(null);
  const lastSyncRef = useRef<number>(Date.now());

  // Per-exercise set tracking: exerciseId -> SetInput[]
  const [sets, setSets] = useState<Record<number, SetInput[]>>({});

  // Save session form
  const [saveStep, setSaveStep] = useState<SaveStep | null>(null);
  const [saveForm, setSaveForm] = useState({ notes: "", rpe: "" });
  const [savedSession, setSavedSession] = useState<WorkoutSession | null>(null);

  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connectWs = useCallback(() => {
    if (!mountedRef.current) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setError("Sin sesión"); return; }

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${proto}//${window.location.host}/api/gyms/schedules/${schedId}/live/ws?token=${encodeURIComponent(token)}`
    );

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setWsConnected(true);
      setError("");
    };

    ws.onmessage = (e) => {
      if (!mountedRef.current) return;
      try {
        const s = JSON.parse(e.data) as ClassLiveState;
        setLiveState(s);
        stateRef.current = s;
        lastSyncRef.current = Date.now();
        setDisplayElapsed(s.elapsed_sec);
        setLoading(false);
      } catch { /* ignore malformed */ }
    };

    ws.onerror = () => { /* handled by onclose */ };

    ws.onclose = (e) => {
      if (!mountedRef.current) return;
      setWsConnected(false);
      if (e.code === 4001) { setError("Token inválido"); return; }
      if (e.code === 4003) { setError("No tienes reserva en esta clase"); setLoading(false); return; }
      // Reconnect after 2s
      reconnectTimerRef.current = setTimeout(connectWs, 2000);
    };

    wsRef.current = ws;
  }, [schedId]);

  useEffect(() => {
    mountedRef.current = true;
    connectWs();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  // Client-side timer interpolation (1s tick)
  useEffect(() => {
    const tick = setInterval(() => {
      const s = stateRef.current;
      if (!s || s.live_status !== "active") return;
      const extra = Math.floor((Date.now() - lastSyncRef.current) / 1000);
      setDisplayElapsed(s.elapsed_sec + extra);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Initialize set inputs when block changes
  useEffect(() => {
    if (!liveState?.current_block) return;
    const block = liveState.current_block;
    setSets((prev) => {
      const next = { ...prev };
      for (const ex of block.exercises) {
        if (!next[ex.id]) {
          next[ex.id] = [makeSet(ex, 1)];
        }
      }
      return next;
    });
  }, [liveState?.current_block?.id]);

  function makeSet(ex: GymClassWorkoutExercise, setNum: number): SetInput {
    return {
      exercise_id: ex.exercise_id,
      set_number: setNum,
      reps: ex.target_reps ? String(ex.target_reps) : "",
      weight_kg: ex.target_weight_kg ? String(ex.target_weight_kg) : "",
      distance_m: ex.target_distance_m ? String(ex.target_distance_m) : "",
      duration_sec: ex.target_duration_sec ? String(ex.target_duration_sec) : "",
    };
  }

  const addSet = (ex: GymClassWorkoutExercise) => {
    setSets((prev) => {
      const cur = prev[ex.id] ?? [];
      return { ...prev, [ex.id]: [...cur, makeSet(ex, cur.length + 1)] };
    });
  };

  const updateSet = (exId: number, idx: number, field: keyof SetInput, value: string) => {
    setSets((prev) => {
      const cur = [...(prev[exId] ?? [])];
      cur[idx] = { ...cur[idx], [field]: value };
      return { ...prev, [exId]: cur };
    });
  };

  const handleSave = async () => {
    setSaveStep("saving");
    setError("");
    try {
      const allSets: object[] = [];
      for (const exSets of Object.values(sets)) {
        for (const s of exSets) {
          allSets.push({
            exercise_id: s.exercise_id,
            set_number: s.set_number,
            reps: s.reps ? parseInt(s.reps) : null,
            weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : null,
            distance_m: s.distance_m ? parseFloat(s.distance_m) : null,
            duration_sec: s.duration_sec ? parseInt(s.duration_sec) : null,
          });
        }
      }
      const session = await api.post<WorkoutSession>(
        `/api/gyms/schedules/${schedId}/save-session`,
        {
          sets: allSets,
          notes: saveForm.notes || null,
          rpe: saveForm.rpe ? parseInt(saveForm.rpe) : null,
        }
      );
      setSavedSession(session);
      setSaveStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar sesión");
      setSaveStep("form");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!liveState) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">No se pudo cargar la clase</p>
        <button onClick={() => navigate(-1)} className="text-sm text-primary underline">Volver</button>
      </div>
    );
  }

  const { live_status, current_block, live_block_index, total_blocks, workout_name } = liveState;
  const isActive = live_status === "active";
  const isPaused = live_status === "paused";
  const isFinished = live_status === "finished";
  const isPending = live_status === "pending";

  const remaining = current_block?.duration_sec != null
    ? Math.max(0, current_block.duration_sec - displayElapsed)
    : null;

  // Save session overlay
  if (saveStep === "done" && savedSession) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-6 py-16">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">¡Sesión guardada!</p>
          <p className="text-sm text-muted-foreground mt-1">Tu entrenamiento ha sido registrado</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/sessions/${savedSession.id}`)}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            Ver sesión
          </button>
          <button
            onClick={() => navigate("/gyms")}
            className="px-5 py-2.5 rounded-xl border border-border text-sm text-muted-foreground"
          >
            Volver a gimnasios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            {workout_name ?? "Clase en vivo"}
          </h1>
          {total_blocks > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Bloque {live_block_index + 1} de {total_blocks}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {wsConnected
            ? <Wifi className="h-3.5 w-3.5 text-green-500" />
            : <WifiOff className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isActive ? "bg-green-100 text-green-700" :
            isPaused ? "bg-yellow-100 text-yellow-700" :
            isFinished ? "bg-gray-100 text-gray-600" :
            "bg-blue-100 text-blue-700"
          }`}>
            {isActive && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
            {isActive ? "En vivo" : isPaused ? "Pausado" : isFinished ? "Finalizado" : "Esperando..."}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Waiting state */}
      {isPending && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="font-semibold text-blue-800">Esperando que el coach inicie la clase</p>
          <p className="text-sm text-blue-600 mt-1">Esta página se actualizará automáticamente</p>
        </div>
      )}

      {/* Timer */}
      {(isActive || isPaused) && (
        <div className={`rounded-2xl p-8 text-center ${isActive ? "bg-primary" : "bg-secondary"}`}>
          <p className={`text-6xl font-mono font-bold ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
            {remaining !== null ? fmt(remaining) : fmt(displayElapsed)}
          </p>
          {remaining !== null && (
            <p className={`text-sm mt-1 ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              restante · {fmt(displayElapsed)} transcurrido
            </p>
          )}
          {current_block && (
            <div className="mt-3 space-y-0.5">
              <p className={`text-sm font-semibold ${isActive ? "text-primary-foreground/90" : "text-foreground"}`}>
                {current_block.name}
              </p>
              <p className={`text-xs ${isActive ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {BLOCK_TYPE_LABELS[current_block.block_type]}
                {current_block.rounds && ` · ${current_block.rounds} rondas`}
              </p>
            </div>
          )}
          {isPaused && (
            <p className="mt-3 text-sm text-muted-foreground">El coach ha pausado el timer</p>
          )}
        </div>
      )}

      {/* Current block exercises + set inputs */}
      {current_block && current_block.exercises.length > 0 && (
        <div className="rounded-xl border border-border divide-y divide-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="font-semibold text-foreground text-sm">{current_block.name}</p>
            {current_block.duration_sec && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {fmt(current_block.duration_sec)}
              </span>
            )}
          </div>

          {current_block.exercises.map((ex) => {
            const exSets = sets[ex.id] ?? [];
            return (
              <div key={ex.id} className="px-4 py-3 space-y-3">
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm font-medium text-foreground">
                    {ex.exercise_name ?? ex.exercise?.name ?? `Ejercicio ${ex.exercise_id}`}
                  </p>
                  {ex.notes && <span className="text-xs text-muted-foreground">– {ex.notes}</span>}
                </div>

                {/* Set rows */}
                <div className="space-y-2 pl-6">
                  {exSets.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground w-12">Serie {idx + 1}</span>
                      {(ex.target_reps !== null || !ex.target_weight_kg) && (
                        <input
                          type="number"
                          placeholder="Reps"
                          value={s.reps}
                          onChange={(e) => updateSet(ex.id, idx, "reps", e.target.value)}
                          className="w-20 rounded-lg border border-border px-2 py-1.5 text-sm text-center"
                        />
                      )}
                      {ex.target_weight_kg !== null && (
                        <input
                          type="number"
                          placeholder="kg"
                          value={s.weight_kg}
                          onChange={(e) => updateSet(ex.id, idx, "weight_kg", e.target.value)}
                          className="w-20 rounded-lg border border-border px-2 py-1.5 text-sm text-center"
                        />
                      )}
                      {ex.target_distance_m !== null && (
                        <input
                          type="number"
                          placeholder="m"
                          value={s.distance_m}
                          onChange={(e) => updateSet(ex.id, idx, "distance_m", e.target.value)}
                          className="w-20 rounded-lg border border-border px-2 py-1.5 text-sm text-center"
                        />
                      )}
                      {ex.target_duration_sec !== null && (
                        <input
                          type="number"
                          placeholder="seg"
                          value={s.duration_sec}
                          onChange={(e) => updateSet(ex.id, idx, "duration_sec", e.target.value)}
                          className="w-20 rounded-lg border border-border px-2 py-1.5 text-sm text-center"
                        />
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addSet(ex)}
                    className="text-xs text-primary hover:underline"
                  >
                    + Añadir serie
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save session section (shown when finished or at any time) */}
      {(isFinished || isActive || isPaused) && saveStep === null && (
        <div className="rounded-xl border border-border p-4 space-y-4">
          <p className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Save className="h-4 w-4" />
            Guardar sesión
          </p>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">RPE (1-10)</label>
            <input
              type="number"
              min="1"
              max="10"
              placeholder="Esfuerzo percibido"
              value={saveForm.rpe}
              onChange={(e) => setSaveForm((f) => ({ ...f, rpe: e.target.value }))}
              className="w-32 rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Notas</label>
            <textarea
              rows={2}
              placeholder="¿Cómo te fue?"
              value={saveForm.notes}
              onChange={(e) => setSaveForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none"
            />
          </div>

          <button
            onClick={() => { setSaveStep("form"); handleSave(); }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Guardar sesión
          </button>
        </div>
      )}

      {saveStep === "saving" && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Guardando sesión…
        </div>
      )}
    </div>
  );
}
