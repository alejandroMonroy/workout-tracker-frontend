import WodRunner from "@/components/WodRunner";
import { api } from "@/services/api";
import type { Exercise, PlanSession, WorkoutSession, WorkoutTemplate } from "@/types/api";
import { CheckCircle, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface SetForm {
  exercise_id: number;
  sets: string;
  reps: string;
  weight_kg: string;
  rpe: string;
  notes: string;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [planSession, setPlanSession] = useState<PlanSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const initRef = useRef(false);

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
          const t = await api.get<WorkoutTemplate>(
            `/api/templates/${s.template_id}`,
          );
          setTemplate(t);
        } catch {
          /* template access error */
        }
      }
      if (s.plan_session_id) {
        try {
          const ps = await api.get<PlanSession>(
            `/api/plans/sessions/${s.plan_session_id}`,
          );
          setPlanSession(ps);
        } catch {
          /* plan session access error */
        }
      }
    } catch {
      navigate("/sessions");
    }
  }, [id, navigate]);

  /* initial load */
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        const s = await api.get<WorkoutSession>(`/api/sessions/${id}`);
        setSession(s);
        if (s.template_id) {
          try {
            const t = await api.get<WorkoutTemplate>(
              `/api/templates/${s.template_id}`,
            );
            setTemplate(t);
          } catch {
            /* ignore */
          }
        }
        if (s.plan_session_id) {
          try {
            const ps = await api.get<PlanSession>(
              `/api/plans/sessions/${s.plan_session_id}`,
            );
            setPlanSession(ps);
          } catch {
            /* ignore */
          }
        }
      } catch {
        navigate("/sessions");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  /* ── Exercise search helpers ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        exerciseSearchRef.current &&
        !exerciseSearchRef.current.contains(e.target as Node)
      ) {
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
      const results = await api.get<Exercise[]>(
        `/api/exercises?${params}`,
      );
      setExerciseResults(results);
      setShowExerciseDropdown(true);
    } catch {
      /* ignore */
    }
  };

  const handleExerciseSearch = (value: string) => {
    setExerciseSearch(value);
    setForm((f) => ({ ...f, exercise_id: 0 }));
    clearTimeout(exerciseSearchTimer.current);
    exerciseSearchTimer.current = setTimeout(
      () => fetchExercises(value),
      250,
    );
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
      navigate("/sessions");
    } catch {
      setFinishing(false);
    }
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

  /* ── Template-based active session → Gamified WOD Runner ── */
  if (isActive && template && session.template_id) {
    return (
      <WodRunner
        template={template}
        sessionId={session.id}
        onFinish={loadSession}
      />
    );
  }

  /* ── Plan-session-based active session → run WOD blocks via WodRunner ── */
  if (isActive && planSession && session.plan_session_id) {
    // Find the first block with a modality set (any block type can be a timed WOD)
    const wodBlock = planSession.blocks.find((b) => b.modality != null);
    if (wodBlock) {
      return (
        <WodRunner
          block={wodBlock}
          sessionId={session.id}
          onFinish={loadSession}
        />
      );
    }
  }

  /* ── Free session / completed session → Manual form + summary ── */
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
          <button
            onClick={finishSession}
            disabled={finishing}
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            {finishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Finalizar
          </button>
        )}
      </div>

      {/* Add set form (free sessions) */}
      {isActive && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Agregar Serie</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div
              ref={exerciseSearchRef}
              className="col-span-2 sm:col-span-5 relative"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar ejercicio..."
                  value={exerciseSearch}
                  onChange={(e) => handleExerciseSearch(e.target.value)}
                  onFocus={() => {
                    if (exerciseResults.length > 0)
                      setShowExerciseDropdown(true);
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
              type="number"
              placeholder="Series"
              min="1"
              value={form.sets}
              onChange={(e) => setForm({ ...form, sets: e.target.value })}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Reps"
              value={form.reps}
              onChange={(e) => setForm({ ...form, reps: e.target.value })}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Peso (kg)"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="RPE"
              min="1"
              max="10"
              value={form.rpe}
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
              <div
                key={s.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {s.exercise?.name ?? `Ejercicio #${s.exercise_id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Set #{s.set_number}
                    {s.reps != null &&
                      ` · ${s.sets_count ?? 1}x${s.reps} reps`}
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
    </div>
  );
}
