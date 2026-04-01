import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type { CoachPublic, CoachTier, Plan, PlanTag, PlanSubscriber, WorkoutTemplate } from "@/types/api";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Globe,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Save,
  Star,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const PRESET_COLORS = [
  "#6366f1", "#ec4899", "#f97316", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#14b8a6",
];

const emptyForm = () => ({
  name: "",
  description: "",
  is_public: false,
  tag_ids: [] as number[],
});

type EditWorkoutEntry = {
  id: number;
  template_id: number;
  day: string;
  notes: string;
  template?: WorkoutTemplate;
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [coachProfile, setCoachProfile] = useState<CoachPublic | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingPrivacyId, setTogglingPrivacyId] = useState<number | null>(null);

  // Tier state
  const [tiers, setTiers] = useState<CoachTier[]>([]);
  const [showCreateTier, setShowCreateTier] = useState(false);
  const [tierForm, setTierForm] = useState({ name: "", description: "", xp_per_month: "", tag_ids: [] as number[] });
  const [savingTier, setSavingTier] = useState(false);
  const [editingTierId, setEditingTierId] = useState<number | null>(null);
  const [editTierForm, setEditTierForm] = useState({ name: "", description: "", xp_per_month: "", tag_ids: [] as number[] });
  const [savingEditTier, setSavingEditTier] = useState(false);
  const [deletingTierId, setDeletingTierId] = useState<number | null>(null);

  // Tag state
  const [allTags, setAllTags] = useState<PlanTag[]>([]);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [savingTag, setSavingTag] = useState(false);

  // Edit plan state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", is_public: false, tag_ids: [] as number[] });
  const [editWorkouts, setEditWorkouts] = useState<EditWorkoutEntry[]>([]);
  const [showAddInEdit, setShowAddInEdit] = useState(false);
  const [editTemplateSearch, setEditTemplateSearch] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Add workout state (expanded view)
  const [addingWorkoutTo, setAddingWorkoutTo] = useState<number | null>(null);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [savingWorkout, setSavingWorkout] = useState(false);

  // Subscribers per plan
  const [subscribers, setSubscribers] = useState<Record<number, PlanSubscriber[]>>({});
  const [loadingSubscribers, setLoadingSubscribers] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<Plan[]>("/api/plans")
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get<PlanTag[]>("/api/tags").then(setAllTags).catch(() => {});
  }, []);

  useEffect(() => {
    api.get<CoachPublic>("/api/coaches/me")
      .then((p) => { setCoachProfile(p); setTiers(p.tiers ?? []); })
      .catch(() => {});
  }, []);

  const handleCreateTier = async () => {
    if (!tierForm.name.trim()) return;
    const price = parseInt(tierForm.xp_per_month, 10);
    if (isNaN(price) || price < 0) return;
    setSavingTier(true);
    try {
      const created = await api.post<CoachTier>("/api/coaches/me/tiers", {
        name: tierForm.name.trim(),
        description: tierForm.description.trim() || null,
        xp_per_month: price,
        tag_ids: tierForm.tag_ids,
      });
      setTiers((prev) => [...prev, created].sort((a, b) => a.xp_per_month - b.xp_per_month));
      setTierForm({ name: "", description: "", xp_per_month: "", tag_ids: [] });
      setShowCreateTier(false);
    } catch {}
    setSavingTier(false);
  };

  const openEditTier = (tier: CoachTier) => {
    setEditingTierId(tier.id);
    setEditTierForm({
      name: tier.name,
      description: tier.description ?? "",
      xp_per_month: String(tier.xp_per_month),
      tag_ids: tier.tags.map((t) => t.id),
    });
  };

  const handleSaveEditTier = async () => {
    if (!editingTierId || !editTierForm.name.trim()) return;
    const price = parseInt(editTierForm.xp_per_month, 10);
    if (isNaN(price) || price < 0) return;
    setSavingEditTier(true);
    try {
      const updated = await api.put<CoachTier>(`/api/coaches/me/tiers/${editingTierId}`, {
        name: editTierForm.name.trim(),
        description: editTierForm.description.trim() || null,
        xp_per_month: price,
        tag_ids: editTierForm.tag_ids,
      });
      setTiers((prev) => prev.map((t) => (t.id === editingTierId ? updated : t)).sort((a, b) => a.xp_per_month - b.xp_per_month));
      setEditingTierId(null);
    } catch {}
    setSavingEditTier(false);
  };

  const handleDeleteTier = async (tierId: number) => {
    if (!confirm("¿Eliminar este tier?")) return;
    setDeletingTierId(tierId);
    try {
      await api.delete(`/api/coaches/me/tiers/${tierId}`);
      setTiers((prev) => prev.filter((t) => t.id !== tierId));
    } catch {}
    setDeletingTierId(null);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setSavingTag(true);
    try {
      const tag = await api.post<PlanTag>("/api/tags", { name: newTagName.trim(), color: newTagColor });
      setAllTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTagName("");
      setShowNewTag(false);
    } catch {}
    setSavingTag(false);
  };

  const handleDeleteTag = async (tagId: number) => {
    try {
      await api.delete(`/api/tags/${tagId}`);
      setAllTags((prev) => prev.filter((t) => t.id !== tagId));
      setPlans((prev) => prev.map((p) => ({ ...p, tags: p.tags.filter((t) => t.id !== tagId) })));
      setForm((f) => ({ ...f, tag_ids: f.tag_ids.filter((id) => id !== tagId) }));
      setEditForm((f) => ({ ...f, tag_ids: f.tag_ids.filter((id) => id !== tagId) }));
    } catch {}
  };

  const toggleFormTag = (tagId: number) =>
    setForm((f) => ({
      ...f,
      tag_ids: f.tag_ids.includes(tagId)
        ? f.tag_ids.filter((id) => id !== tagId)
        : [...f.tag_ids, tagId],
    }));

  const toggleEditTag = (tagId: number) =>
    setEditForm((f) => ({
      ...f,
      tag_ids: f.tag_ids.includes(tagId)
        ? f.tag_ids.filter((id) => id !== tagId)
        : [...f.tag_ids, tagId],
    }));

  const ensureTemplates = async () => {
    if (templates.length > 0) return;
    const data = await api.get<WorkoutTemplate[]>("/api/templates?mine_only=true").catch(() => []);
    setTemplates(data);
  };

  const loadSubscribers = async (planId: number) => {
    if (subscribers[planId] !== undefined) return;
    setLoadingSubscribers(planId);
    try {
      const data = await api.get<PlanSubscriber[]>(`/api/plans/${planId}/subscribers`);
      setSubscribers((prev) => ({ ...prev, [planId]: data }));
    } catch {
      setSubscribers((prev) => ({ ...prev, [planId]: [] }));
    }
    setLoadingSubscribers(null);
  };

  const openAddWorkout = async (planId: number) => {
    setAddingWorkoutTo(planId);
    setTemplateSearch("");
    await ensureTemplates();
  };

  const filteredTemplates = templateSearch.trim()
    ? templates.filter((t) =>
        t.name.toLowerCase().includes(templateSearch.toLowerCase()),
      )
    : templates;

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const created = await api.post<Plan>("/api/plans", {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_public: form.is_public,
        workouts: [],
        tag_ids: form.tag_ids,
      });
      setPlans((prev) => [created, ...prev]);
      setForm(emptyForm());
      setShowCreate(false);
      setExpandedId(created.id);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (planId: number) => {
    if (!confirm("¿Eliminar este plan?")) return;
    setDeletingId(planId);
    try {
      await api.delete(`/api/plans/${planId}`);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      if (expandedId === planId) setExpandedId(null);
    } catch {}
    setDeletingId(null);
  };

  const handleTogglePrivacy = async (plan: Plan) => {
    setTogglingPrivacyId(plan.id);
    try {
      const updated = await api.put<Plan>(`/api/plans/${plan.id}`, {
        name: plan.name,
        description: plan.description,
        is_public: !plan.is_public,
        workouts: plan.workouts.map((w) => ({
          template_id: w.template_id,
          order: w.order,
          day: w.day,
          notes: w.notes,
        })),
      });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
    } catch {}
    setTogglingPrivacyId(null);
  };

  const openEdit = async (plan: Plan) => {
    await ensureTemplates();
    setEditingId(plan.id);
    setEditForm({ name: plan.name, description: plan.description ?? "", is_public: plan.is_public, tag_ids: plan.tags.map((t) => t.id) });
    setEditWorkouts(
      plan.workouts.map((w) => ({
        id: w.id,
        template_id: w.template_id,
        day: w.day != null ? String(w.day) : "",
        notes: w.notes ?? "",
        template: w.template,
      })),
    );
    setShowAddInEdit(false);
    setEditTemplateSearch("");
  };

  const handleSaveEdit = async (plan: Plan) => {
    if (!editForm.name.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await api.put<Plan>(`/api/plans/${plan.id}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        is_public: editForm.is_public,
        workouts: editWorkouts.map((w, i) => ({
          template_id: w.template_id,
          order: i + 1,
          day: w.day.trim() !== "" ? Number(w.day) : null,
          notes: w.notes.trim() || null,
        })),
        tag_ids: editForm.tag_ids,
      });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
      setEditingId(null);
    } catch {}
    setSavingEdit(false);
  };

  const handleAddWorkout = async (plan: Plan, templateId: number) => {
    setSavingWorkout(true);
    try {
      const newWorkouts = [
        ...plan.workouts.map((w) => ({
          template_id: w.template_id,
          order: w.order,
          day: w.day,
          notes: w.notes,
        })),
        {
          template_id: templateId,
          order: plan.workouts.length + 1,
          day: null,
          notes: null,
        },
      ];
      const updated = await api.put<Plan>(`/api/plans/${plan.id}`, {
        name: plan.name,
        description: plan.description,
        is_public: plan.is_public,
        workouts: newWorkouts,
      });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
      setAddingWorkoutTo(null);
      setTemplateSearch("");
    } catch {}
    setSavingWorkout(false);
  };

  const handleRemoveWorkout = async (plan: Plan, planWorkoutId: number) => {
    const workouts = plan.workouts
      .filter((w) => w.id !== planWorkoutId)
      .map((w, i) => ({
        template_id: w.template_id,
        order: i + 1,
        day: w.day,
        notes: w.notes,
      }));
    try {
      const updated = await api.put<Plan>(`/api/plans/${plan.id}`, {
        name: plan.name,
        description: plan.description,
        is_public: plan.is_public,
        workouts,
      });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Subscription tiers card */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Star className="h-4 w-4 text-primary" />
            Tiers de suscripción
          </p>
          <button
            onClick={() => { setShowCreateTier(true); setEditingTierId(null); }}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo tier
          </button>
        </div>

        {tiers.length === 0 && !showCreateTier && (
          <p className="text-xs text-muted-foreground">
            Sin tiers — crea al menos uno para que los atletas puedan suscribirse.
          </p>
        )}

        {/* Tier list */}
        <div className="space-y-2">
          {tiers.map((tier) =>
            editingTierId === tier.id ? (
              <div key={tier.id} className="rounded-md border border-primary/40 bg-secondary/30 p-3 space-y-2">
                <input
                  type="text"
                  value={editTierForm.name}
                  onChange={(e) => setEditTierForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre del tier"
                  className="w-full rounded-md border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <input
                  type="text"
                  value={editTierForm.description}
                  onChange={(e) => setEditTierForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descripción (opcional)"
                  className="w-full rounded-md border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={editTierForm.xp_per_month}
                    onChange={(e) => setEditTierForm((f) => ({ ...f, xp_per_month: e.target.value }))}
                    placeholder="XP / mes"
                    className="w-28 rounded-md border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">XP / mes</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tags incluidos (vacío = acceso total)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setEditTierForm((f) => ({
                          ...f,
                          tag_ids: f.tag_ids.includes(tag.id) ? f.tag_ids.filter((id) => id !== tag.id) : [...f.tag_ids, tag.id],
                        }))}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                          editTierForm.tag_ids.includes(tag.id) ? "text-white border-transparent" : "bg-transparent border-border text-muted-foreground"
                        )}
                        style={editTierForm.tag_ids.includes(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveEditTier} disabled={savingEditTier || !editTierForm.name.trim()} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
                    {savingEditTier ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Guardar
                  </button>
                  <button onClick={() => setEditingTierId(null)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div key={tier.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{tier.name}</p>
                    <p className="text-sm font-bold text-primary">{tier.xp_per_month.toLocaleString()} XP/mes</p>
                  </div>
                  {tier.description && <p className="text-xs text-muted-foreground">{tier.description}</p>}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tier.tags.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Acceso total</span>
                    ) : (
                      tier.tags.map((tag) => (
                        <span key={tag.id} className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: tag.color }}>
                          {tag.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button onClick={() => openEditTier(tier)} className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDeleteTier(tier.id)} disabled={deletingTierId === tier.id} className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive disabled:opacity-50">
                    {deletingTierId === tier.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Create tier form */}
        {showCreateTier && (
          <div className="rounded-md border border-primary/40 bg-secondary/30 p-3 space-y-2">
            <p className="text-xs font-semibold">Nuevo tier</p>
            <input
              type="text"
              value={tierForm.name}
              onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nombre (ej. Básico, Avanzado)"
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <input
              type="text"
              value={tierForm.description}
              onChange={(e) => setTierForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descripción (opcional)"
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={tierForm.xp_per_month}
                onChange={(e) => setTierForm((f) => ({ ...f, xp_per_month: e.target.value }))}
                placeholder="XP / mes"
                className="w-28 rounded-md border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">XP / mes</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tags incluidos (vacío = acceso total a planes privados)</p>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setTierForm((f) => ({
                      ...f,
                      tag_ids: f.tag_ids.includes(tag.id) ? f.tag_ids.filter((id) => id !== tag.id) : [...f.tag_ids, tag.id],
                    }))}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                      tierForm.tag_ids.includes(tag.id) ? "text-white border-transparent" : "bg-transparent border-border text-muted-foreground"
                    )}
                    style={tierForm.tag_ids.includes(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                  >
                    {tag.name}
                  </button>
                ))}
                {allTags.length === 0 && <p className="text-xs text-muted-foreground italic">No hay tags creados aún</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreateTier} disabled={savingTier || !tierForm.name.trim()} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
                {savingTier ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Crear
              </button>
              <button onClick={() => setShowCreateTier(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {coachProfile != null && coachProfile.subscriber_count > 0 && (
          <p className="text-xs text-muted-foreground">
            {coachProfile.subscriber_count} atleta{coachProfile.subscriber_count !== 1 ? "s" : ""} suscrito{coachProfile.subscriber_count !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardList className="h-6 w-6 text-primary" />
            Planes
          </h1>
          <p className="text-muted-foreground">
            Organiza workouts en planes de entrenamiento
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuevo plan
        </button>
      </div>

      {/* Tags overview */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            Tags:
          </span>
          {allTags.map((tag) => (
            <span key={tag.id} className="group flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: tag.color }}>
              {tag.name}
              <button
                onClick={() => handleDeleteTag(tag.id)}
                className="hidden group-hover:inline-flex items-center opacity-70 hover:opacity-100"
                title="Eliminar tag"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Nuevo plan</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">
                Nombre *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del plan"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">
                Descripción
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Descripción opcional"
                rows={2}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="plan_is_public"
                checked={form.is_public}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_public: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="plan_is_public" className="text-sm">
                Público
              </label>
            </div>
            {/* Tags */}
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs text-muted-foreground">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleFormTag(tag.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                      form.tag_ids.includes(tag.id)
                        ? "text-white border-transparent"
                        : "bg-transparent border-border text-muted-foreground hover:border-primary"
                    )}
                    style={form.tag_ids.includes(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                  >
                    {tag.name}
                  </button>
                ))}
                {!showNewTag && (
                  <button
                    type="button"
                    onClick={() => setShowNewTag(true)}
                    className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <Plus className="h-3 w-3" />
                    Nuevo tag
                  </button>
                )}
              </div>
              {showNewTag && (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nombre del tag"
                    className="rounded-md border border-border px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                  />
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewTagColor(c)}
                        className={cn("h-5 w-5 rounded-full border-2", newTagColor === c ? "border-foreground" : "border-transparent")}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    disabled={savingTag || !newTagName.trim()}
                    className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {savingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Crear
                  </button>
                  <button type="button" onClick={() => setShowNewTag(false)} className="text-xs text-muted-foreground hover:underline">
                    Cancelar
                  </button>
                </div>
              )}
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
              onClick={() => {
                setShowCreate(false);
                setForm(emptyForm());
              }}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Plan list */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            No tienes planes todavía. ¡Crea el primero!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const isExpanded = expandedId === plan.id;
            const isEditing = editingId === plan.id;
            return (
              <div
                key={plan.id}
                className="rounded-lg border border-border bg-card shadow-sm"
              >
                {/* Header */}
                {isEditing ? (
                  <div className="px-4 py-3 space-y-3">
                    {/* Plan meta */}
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Nombre del plan"
                        className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Descripción opcional"
                        rows={2}
                        className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.is_public}
                          onChange={(e) => setEditForm((f) => ({ ...f, is_public: e.target.checked }))}
                          className="h-4 w-4 rounded border-border"
                        />
                        Público
                      </label>
                      {/* Tags in edit */}
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Tags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {allTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleEditTag(tag.id)}
                              className={cn(
                                "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                                editForm.tag_ids.includes(tag.id)
                                  ? "text-white border-transparent"
                                  : "bg-transparent border-border text-muted-foreground hover:border-primary"
                              )}
                              style={editForm.tag_ids.includes(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                            >
                              {tag.name}
                            </button>
                          ))}
                          {!showNewTag && (
                            <button
                              type="button"
                              onClick={() => setShowNewTag(true)}
                              className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                            >
                              <Plus className="h-3 w-3" />
                              Nuevo tag
                            </button>
                          )}
                        </div>
                        {showNewTag && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              placeholder="Nombre del tag"
                              className="rounded-md border border-border px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                            />
                            <div className="flex gap-1">
                              {PRESET_COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setNewTagColor(c)}
                                  className={cn("h-5 w-5 rounded-full border-2", newTagColor === c ? "border-foreground" : "border-transparent")}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={handleCreateTag}
                              disabled={savingTag || !newTagName.trim()}
                              className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                            >
                              {savingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                              Crear
                            </button>
                            <button type="button" onClick={() => setShowNewTag(false)} className="text-xs text-muted-foreground hover:underline">
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Workouts */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Workouts
                      </p>
                      {editWorkouts.length === 0 && (
                        <p className="text-xs text-muted-foreground">Sin workouts todavía</p>
                      )}
                      {editWorkouts.map((ew, idx) => (
                        <div
                          key={`${ew.template_id}-${idx}`}
                          className="rounded-md border border-border bg-background p-2 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {idx + 1}. {ew.template?.name ?? `Workout #${ew.template_id}`}
                            </p>
                            <button
                              onClick={() =>
                                setEditWorkouts((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <div className="w-24 shrink-0">
                              <label className="mb-0.5 block text-xs text-muted-foreground">
                                Día
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={ew.day}
                                onChange={(e) =>
                                  setEditWorkouts((prev) =>
                                    prev.map((w, i) =>
                                      i === idx ? { ...w, day: e.target.value } : w,
                                    ),
                                  )
                                }
                                placeholder="—"
                                className="w-full rounded border border-border px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="mb-0.5 block text-xs text-muted-foreground">
                                Notas
                              </label>
                              <input
                                type="text"
                                value={ew.notes}
                                onChange={(e) =>
                                  setEditWorkouts((prev) =>
                                    prev.map((w, i) =>
                                      i === idx ? { ...w, notes: e.target.value } : w,
                                    ),
                                  )
                                }
                                placeholder="Opcional"
                                className="w-full rounded border border-border px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Add workout in edit mode */}
                      {showAddInEdit ? (
                        <div className="rounded-lg border border-border bg-secondary/30 p-2">
                          <input
                            type="text"
                            value={editTemplateSearch}
                            onChange={(e) => setEditTemplateSearch(e.target.value)}
                            placeholder="Buscar workout..."
                            className="mb-2 w-full rounded border border-border bg-white px-2 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                          />
                          <div className="max-h-36 space-y-0.5 overflow-y-auto">
                            {(editTemplateSearch.trim()
                              ? templates.filter((t) =>
                                  t.name
                                    .toLowerCase()
                                    .includes(editTemplateSearch.toLowerCase()),
                                )
                              : templates
                            ).length === 0 ? (
                              <p className="py-2 text-center text-xs text-muted-foreground">
                                No hay workouts disponibles
                              </p>
                            ) : (
                              (editTemplateSearch.trim()
                                ? templates.filter((t) =>
                                    t.name
                                      .toLowerCase()
                                      .includes(editTemplateSearch.toLowerCase()),
                                  )
                                : templates
                              ).map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => {
                                    setEditWorkouts((prev) => [
                                      ...prev,
                                      {
                                        id: 0,
                                        template_id: t.id,
                                        day: "",
                                        notes: "",
                                        template: t,
                                      },
                                    ]);
                                    setShowAddInEdit(false);
                                    setEditTemplateSearch("");
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-secondary",
                                    editWorkouts.some((w) => w.template_id === t.id) &&
                                      "opacity-50",
                                  )}
                                >
                                  <span className="font-medium">{t.name}</span>
                                  <span className="text-muted-foreground">
                                    {t.modality.replace("_", " ").toUpperCase()} ·{" "}
                                    {t.blocks.length} ej.
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setShowAddInEdit(false);
                              setEditTemplateSearch("");
                            }}
                            className="mt-1.5 text-xs text-muted-foreground hover:underline"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setShowAddInEdit(true);
                            setEditTemplateSearch("");
                          }}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Añadir workout
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveEdit(plan)}
                        disabled={savingEdit || !editForm.name.trim()}
                        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {savingEdit ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div
                      className="flex flex-1 cursor-pointer items-center gap-3"
                      onClick={() => {
                        const next = isExpanded ? null : plan.id;
                        setExpandedId(next);
                        if (next) loadSubscribers(next);
                      }}
                    >
                      <div>
                        <p className="font-semibold">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan.workouts.length} workout
                          {plan.workouts.length !== 1 ? "s" : ""}
                          {plan.is_public && " · Público"}
                        </p>
                        {plan.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {plan.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                style={{ backgroundColor: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(plan)}
                        title="Editar plan"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePrivacy(plan)}
                        disabled={togglingPrivacyId === plan.id}
                        title={plan.is_public ? "Hacer privado" : "Hacer público"}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
                      >
                        {togglingPrivacyId === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : plan.is_public ? (
                          <Globe className="h-4 w-4 text-green-600" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        disabled={deletingId === plan.id}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive disabled:opacity-50"
                      >
                        {deletingId === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const next = isExpanded ? null : plan.id;
                          setExpandedId(next);
                          if (next) loadSubscribers(next);
                        }}
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
                )}

                {/* Expanded (read-only view, hidden while editing) */}
                {isExpanded && !isEditing && (
                  <div className="border-t border-border px-4 py-3">
                    {plan.description && (
                      <p className="mb-3 text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    )}

                    {/* Workout list */}
                    <div className="space-y-2">
                      {plan.workouts.length === 0 ? (
                        <p className="py-2 text-sm text-muted-foreground">
                          Este plan no tiene workouts aún
                        </p>
                      ) : (
                        plan.workouts.map((pw) => (
                          <div
                            key={pw.id}
                            className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {pw.order}. {pw.template?.name ?? `Workout #${pw.template_id}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {[
                                  pw.template?.modality &&
                                    pw.template.modality.replace("_", " ").toUpperCase(),
                                  pw.template?.rounds &&
                                    `${pw.template.rounds} rondas`,
                                  pw.day != null && `Día ${pw.day}`,
                                  pw.notes && pw.notes,
                                  pw.template?.blocks.length &&
                                    `${pw.template.blocks.length} ejercicio${pw.template.blocks.length !== 1 ? "s" : ""}`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveWorkout(plan, pw.id)}
                              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add workout */}
                    {addingWorkoutTo === plan.id ? (
                      <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-3">
                        <input
                          type="text"
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          placeholder="Buscar workout..."
                          className="mb-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                        />
                        <div className="max-h-48 space-y-1 overflow-y-auto">
                          {filteredTemplates.length === 0 ? (
                            <p className="py-2 text-center text-xs text-muted-foreground">
                              No hay workouts disponibles
                            </p>
                          ) : (
                            filteredTemplates.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => handleAddWorkout(plan, t.id)}
                                disabled={savingWorkout}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-secondary disabled:opacity-50",
                                  plan.workouts.some((w) => w.template_id === t.id) &&
                                    "opacity-50",
                                )}
                              >
                                <span className="font-medium">{t.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {t.modality.replace("_", " ").toUpperCase()} ·{" "}
                                  {t.blocks.length} ej.
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setAddingWorkoutTo(null);
                            setTemplateSearch("");
                          }}
                          className="mt-2 text-xs text-muted-foreground hover:underline"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openAddWorkout(plan.id)}
                        className="mt-3 flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        <Plus className="h-4 w-4" />
                        Añadir workout
                      </button>
                    )}

                    {/* Subscribers */}
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        Atletas suscritos
                      </p>
                      {loadingSubscribers === plan.id ? (
                        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Cargando...
                        </div>
                      ) : !subscribers[plan.id] || subscribers[plan.id].length === 0 ? (
                        <p className="py-1 text-xs text-muted-foreground">
                          Ningún atleta suscrito todavía
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {subscribers[plan.id].map((s) => (
                            <div
                              key={s.subscription_id}
                              className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-1.5"
                            >
                              <div>
                                <p className="text-sm font-medium">{s.athlete_name}</p>
                                <p className="text-xs text-muted-foreground">{s.athlete_email}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(s.subscribed_at).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
