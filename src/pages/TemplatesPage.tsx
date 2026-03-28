import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type { Exercise, TemplateBlock, WorkoutModality, WorkoutTemplate } from "@/types/api";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const MODALITY_OPTIONS: { value: WorkoutModality; label: string }[] = [
  { value: "amrap", label: "AMRAP" },
  { value: "emom", label: "EMOM" },
  { value: "for_time", label: "For Time" },
  { value: "tabata", label: "Tabata" },
  { value: "custom", label: "Custom" },
];

const MODALITY_COLORS: Record<string, string> = {
  amrap: "bg-red-100 text-red-700",
  emom: "bg-blue-100 text-blue-700",
  for_time: "bg-green-100 text-green-700",
  tabata: "bg-purple-100 text-purple-700",
  custom: "bg-gray-100 text-gray-700",
};

interface BlockInput {
  exercise_id: number;
  order: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  target_distance_m: number | null;
  target_duration_sec: number | null;
  rest_sec: number | null;
  notes: string | null;
}

const emptyForm = () => ({
  name: "",
  description: "",
  modality: "custom" as WorkoutModality,
  rounds: "",
  time_cap_sec: "",
  is_public: false,
});

const emptyExForm = () => ({
  exercise_id: 0,
  target_sets: "",
  target_reps: "",
  target_weight_kg: "",
  target_distance_m: "",
  target_duration_sec: "",
  rest_sec: "",
  notes: "",
});

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Exercise search state (per template)
  const [addingExTo, setAddingExTo] = useState<number | null>(null);
  const [exSearch, setExSearch] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exResults, setExResults] = useState<Exercise[]>([]);
  const [pickedEx, setPickedEx] = useState<Exercise | null>(null);
  const [exForm, setExForm] = useState(emptyExForm());
  const [savingEx, setSavingEx] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<WorkoutTemplate[]>("/api/templates")
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Lazy-load exercises once
  const ensureExercises = async () => {
    if (exercises.length > 0) return;
    const data = await api.get<Exercise[]>("/api/exercises").catch(() => []);
    setExercises(data);
  };

  const handleSearch = async (q: string) => {
    setExSearch(q);
    setPickedEx(null);
    if (!q.trim()) { setExResults([]); return; }
    await ensureExercises();
    setExResults(
      exercises.filter((e) =>
        e.name.toLowerCase().includes(q.toLowerCase()),
      ).slice(0, 8),
    );
  };

  const openAddEx = async (templateId: number) => {
    setAddingExTo(templateId);
    setExSearch("");
    setExResults([]);
    setPickedEx(null);
    setExForm(emptyExForm());
    await ensureExercises();
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        modality: form.modality,
        rounds: form.rounds ? Number(form.rounds) : null,
        time_cap_sec: form.time_cap_sec ? Number(form.time_cap_sec) * 60 : null,
        is_public: form.is_public,
        blocks: [],
      };
      const created = await api.post<WorkoutTemplate>("/api/templates", payload);
      setTemplates((prev) => [created, ...prev]);
      setForm(emptyForm());
      setShowCreate(false);
      setExpandedId(created.id);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (templateId: number) => {
    if (!confirm("¿Eliminar este workout?")) return;
    setDeletingId(templateId);
    try {
      await api.delete(`/api/templates/${templateId}`);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (expandedId === templateId) setExpandedId(null);
    } catch {}
    setDeletingId(null);
  };

  const handleAddExercise = async (template: WorkoutTemplate) => {
    if (!pickedEx) return;
    setSavingEx(true);
    try {
      const newBlock: BlockInput = {
        exercise_id: pickedEx.id,
        order: template.blocks.length + 1,
        target_sets: exForm.target_sets ? Number(exForm.target_sets) : null,
        target_reps: exForm.target_reps ? Number(exForm.target_reps) : null,
        target_weight_kg: exForm.target_weight_kg ? Number(exForm.target_weight_kg) : null,
        target_distance_m: exForm.target_distance_m ? Number(exForm.target_distance_m) : null,
        target_duration_sec: exForm.target_duration_sec ? Number(exForm.target_duration_sec) : null,
        rest_sec: exForm.rest_sec ? Number(exForm.rest_sec) : null,
        notes: exForm.notes.trim() || null,
      };
      const blocks: BlockInput[] = [
        ...template.blocks.map((b) => ({
          exercise_id: b.exercise_id,
          order: b.order,
          target_sets: b.target_sets,
          target_reps: b.target_reps,
          target_weight_kg: b.target_weight_kg,
          target_distance_m: b.target_distance_m,
          target_duration_sec: b.target_duration_sec,
          rest_sec: b.rest_sec,
          notes: b.notes,
        })),
        newBlock,
      ];
      const updated = await api.put<WorkoutTemplate>(`/api/templates/${template.id}`, {
        name: template.name,
        description: template.description,
        modality: template.modality,
        rounds: template.rounds,
        time_cap_sec: template.time_cap_sec,
        is_public: template.is_public,
        blocks,
      });
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? updated : t)));
      setAddingExTo(null);
      setPickedEx(null);
      setExForm(emptyExForm());
      setExSearch("");
      setExResults([]);
    } catch {}
    setSavingEx(false);
  };

  const handleRemoveExercise = async (template: WorkoutTemplate, blockId: number) => {
    const blocks: BlockInput[] = template.blocks
      .filter((b) => b.id !== blockId)
      .map((b, i) => ({
        exercise_id: b.exercise_id,
        order: i + 1,
        target_sets: b.target_sets,
        target_reps: b.target_reps,
        target_weight_kg: b.target_weight_kg,
        target_distance_m: b.target_distance_m,
        target_duration_sec: b.target_duration_sec,
        rest_sec: b.rest_sec,
        notes: b.notes,
      }));
    try {
      const updated = await api.put<WorkoutTemplate>(`/api/templates/${template.id}`, {
        name: template.name,
        description: template.description,
        modality: template.modality,
        rounds: template.rounds,
        time_cap_sec: template.time_cap_sec,
        is_public: template.is_public,
        blocks,
      });
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? updated : t)));
    } catch {}
  };

  const startSession = async (templateId: number) => {
    try {
      const session = await api.post<{ id: number }>("/api/sessions", { template_id: templateId });
      navigate(`/sessions/${session.id}`);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-muted-foreground">Crea y gestiona tus workouts</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuevo workout
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Nuevo workout</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del workout"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción opcional"
                rows={2}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Modalidad</label>
              <select
                value={form.modality}
                onChange={(e) => setForm((f) => ({ ...f, modality: e.target.value as WorkoutModality }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {MODALITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Rondas</label>
              <input
                type="number"
                value={form.rounds}
                onChange={(e) => setForm((f) => ({ ...f, rounds: e.target.value }))}
                placeholder="Opcional"
                min={1}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Time cap (minutos)</label>
              <input
                type="number"
                value={form.time_cap_sec}
                onChange={(e) => setForm((f) => ({ ...f, time_cap_sec: e.target.value }))}
                placeholder="Opcional"
                min={1}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_public"
                checked={form.is_public}
                onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="is_public" className="text-sm">Público</label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Crear
            </button>
            <button
              onClick={() => { setShowCreate(false); setForm(emptyForm()); }}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">No tienes workouts todavía. ¡Crea el primero!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => {
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} className="rounded-lg border border-border bg-card shadow-sm">
                {/* Header row */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div
                    className="flex flex-1 cursor-pointer items-center gap-3"
                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  >
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium",
                        MODALITY_COLORS[t.modality] ?? MODALITY_COLORS.custom,
                      )}
                    >
                      {MODALITY_OPTIONS.find((o) => o.value === t.modality)?.label ?? t.modality}
                    </span>
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.blocks.length} ejercicio{t.blocks.length !== 1 ? "s" : ""}
                        {t.rounds ? ` · ${t.rounds} rondas` : ""}
                        {t.time_cap_sec ? ` · Cap: ${Math.floor(t.time_cap_sec / 60)}min` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startSession(t.id)}
                      className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90"
                    >
                      <Play className="h-3 w-3" />
                      Iniciar
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive disabled:opacity-50"
                    >
                      {deletingId === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-3">
                    {t.description && (
                      <p className="mb-3 text-sm text-muted-foreground">{t.description}</p>
                    )}

                    {/* Exercises */}
                    <div className="space-y-2">
                      {t.blocks.map((b: TemplateBlock) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {b.order}. {b.exercise?.name ?? `Ejercicio #${b.exercise_id}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[
                                b.target_sets && `${b.target_sets} series`,
                                b.target_reps && `${b.target_reps} reps`,
                                b.target_weight_kg && `${b.target_weight_kg}kg`,
                                b.target_distance_m && `${b.target_distance_m}m`,
                                b.target_duration_sec && `${b.target_duration_sec}s`,
                                b.rest_sec && `Descanso: ${b.rest_sec}s`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveExercise(t, b.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add exercise */}
                    {addingExTo === t.id ? (
                      <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-3">
                        {!pickedEx ? (
                          <>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <input
                                type="text"
                                value={exSearch}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Buscar ejercicio..."
                                className="w-full rounded-md border border-border bg-white pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            {exResults.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {exResults.map((ex) => (
                                  <button
                                    key={ex.id}
                                    onClick={() => { setPickedEx(ex); setExSearch(""); setExResults([]); }}
                                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary"
                                  >
                                    {ex.name}
                                    <span className="ml-2 text-xs text-muted-foreground">{ex.type}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={() => { setAddingExTo(null); setExSearch(""); setExResults([]); }}
                              className="mt-2 text-xs text-muted-foreground hover:underline"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="mb-3 font-medium text-sm">{pickedEx.name}</p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {[
                                { key: "target_sets", label: "Series" },
                                { key: "target_reps", label: "Reps" },
                                { key: "target_weight_kg", label: "Peso (kg)" },
                                { key: "target_distance_m", label: "Distancia (m)" },
                                { key: "target_duration_sec", label: "Duración (s)" },
                                { key: "rest_sec", label: "Descanso (s)" },
                              ].map(({ key, label }) => (
                                <div key={key}>
                                  <label className="mb-0.5 block text-xs text-muted-foreground">{label}</label>
                                  <input
                                    type="number"
                                    value={exForm[key as keyof typeof exForm]}
                                    onChange={(e) => setExForm((f) => ({ ...f, [key]: e.target.value }))}
                                    min={0}
                                    className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="mt-2">
                              <label className="mb-0.5 block text-xs text-muted-foreground">Notas</label>
                              <input
                                type="text"
                                value={exForm.notes}
                                onChange={(e) => setExForm((f) => ({ ...f, notes: e.target.value }))}
                                className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                              />
                            </div>
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => handleAddExercise(t)}
                                disabled={savingEx}
                                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                              >
                                {savingEx && <Loader2 className="h-3 w-3 animate-spin" />}
                                Guardar
                              </button>
                              <button
                                onClick={() => { setPickedEx(null); setExForm(emptyExForm()); }}
                                className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary"
                              >
                                Atrás
                              </button>
                              <button
                                onClick={() => { setAddingExTo(null); setPickedEx(null); setExForm(emptyExForm()); }}
                                className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:underline"
                              >
                                Cancelar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => openAddEx(t.id)}
                        className="mt-3 flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        <Plus className="h-4 w-4" />
                        Añadir ejercicio
                      </button>
                    )}
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
