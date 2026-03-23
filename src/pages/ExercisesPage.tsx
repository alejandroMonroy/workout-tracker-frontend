import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type { Exercise, ExerciseType } from "@/types/api";
import { Dumbbell, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

const TYPES: { value: ExerciseType | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "strength", label: "Fuerza" },
  { value: "cardio", label: "Cardio" },
  { value: "gymnastics", label: "Gimnásticos" },
  { value: "olympic", label: "Olímpicos" },
  { value: "other", label: "Otros" },
];

const TYPE_OPTIONS: { value: ExerciseType; label: string }[] = [
  { value: "strength", label: "Fuerza" },
  { value: "cardio", label: "Cardio" },
  { value: "gymnastics", label: "Gimnásticos" },
  { value: "olympic", label: "Olímpicos" },
  { value: "other", label: "Otros" },
];

export default function ExercisesPage() {
  const { user } = useAuth();
  const canCreate = user?.role === "coach" || user?.role === "admin";
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ExerciseType | "">("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Create form
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((page - 1) * PAGE_SIZE));
    const url = `/api/exercises?${params.toString()}`;

    let cancelled = false;
    setLoading(true);
    api
      .getRaw(url)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const total = parseInt(res.headers.get("X-Total-Count") || "0", 10);
        const data: Exercise[] = await res.json();
        if (!cancelled) {
          setExercises(data);
          setTotalCount(total);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, typeFilter, page, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const resetForm = () => {
    setFormName("");
    setFormType("strength");
    setFormEquipment("");
    setFormMuscleGroups("");
    setFormDescription("");
    setFormMsg("");
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      setFormMsg("❌ El nombre es obligatorio");
      return;
    }
    setSaving(true);
    setFormMsg("");
    try {
      const muscleGroups = formMuscleGroups
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
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
      setFormMsg(
        `❌ ${err instanceof Error ? err.message : "Error al crear"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ejercicios</h1>
          <p className="text-muted-foreground">
            Catálogo de {totalCount} ejercicios disponibles
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nuevo ejercicio
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Crear ejercicio</h2>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md p-1 hover:bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nombre *
                </label>
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
                  onChange={(e) =>
                    setFormType(e.target.value as ExerciseType)
                  }
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Equipamiento
                </label>
                <input
                  value={formEquipment}
                  onChange={(e) => setFormEquipment(e.target.value)}
                  placeholder="Ej: Barra, Mancuernas"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Grupos musculares
                </label>
                <input
                  value={formMuscleGroups}
                  onChange={(e) => setFormMuscleGroups(e.target.value)}
                  placeholder="Separados por coma: Pecho, Tríceps"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Descripción
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descripción opcional del ejercicio..."
                rows={2}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {formMsg && (
              <p className="text-sm text-muted-foreground">{formMsg}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
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

      {/* Filters */}
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
          {TYPES.map((t) => (
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

      {/* List */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : exercises.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No se encontraron ejercicios
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Dumbbell className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{ex.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                      {ex.type}
                    </span>
                    {ex.equipment && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                        {ex.equipment}
                      </span>
                    )}
                    {ex.muscle_groups?.slice(0, 2).map((m) => (
                      <span
                        key={m}
                        className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  «
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ‹ Anterior
                </button>
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
                          page === p
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-secondary"
                        )}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente ›
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
