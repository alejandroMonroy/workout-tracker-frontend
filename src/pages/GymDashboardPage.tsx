import { api } from "@/services/api";
import type {
  Exercise,
  GymAnalytics,
  GymClassBlockType,
  GymClassTemplate,
  GymClassWorkout,
  GymClassWorkoutBlock,
  GymLocation,
  GymMember,
  GymPlan,
  GymProduct,
  GymPublic,
  GymSchedule,
  GymTicketPurchase,
  PlanType,
  WeeklySlot,
} from "@/types/api";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Copy,
  Dumbbell,
  Edit2,
  Loader2,
  MapPin,
  Package,
  Percent,
  Play,
  Plus,
  Save,
  Search,
  ShoppingBag,
  Ticket,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

const BLOCK_TYPE_OPTIONS: { value: GymClassBlockType; label: string }[] = [
  { value: "cronometro", label: "Cronómetro" },
  { value: "amrap", label: "AMRAP" },
  { value: "emom", label: "EMOM" },
  { value: "for_time", label: "For Time" },
  { value: "tabata", label: "Tabata" },
];

const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  monthly: "Mensual",
  annual: "Anual",
  tickets: "Tickets",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trial: "bg-blue-100 text-blue-700",
  frozen: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-600",
};

function pathToTab(path: string): "overview" | "schedule" | "workouts" | "members" | "analytics" | "marketplace" | "settings" {
  if (path.includes("/schedule")) return "schedule";
  if (path.includes("/workouts")) return "workouts";
  if (path.includes("/members")) return "members";
  if (path.includes("/analytics")) return "analytics";
  if (path.includes("/marketplace")) return "marketplace";
  return "overview";
}

export default function GymDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [gym, setGym] = useState<GymPublic | null>(null);
  const [analytics, setAnalytics] = useState<GymAnalytics | null>(null);
  const [locations, setLocations] = useState<GymLocation[]>([]);
  const [plans, setPlans] = useState<GymPlan[]>([]);
  const [templates, setTemplates] = useState<GymClassTemplate[]>([]);
  const [schedules, setSchedules] = useState<GymSchedule[]>([]);
  const [members, setMembers] = useState<GymMember[]>([]);
  const [expandedUserIds, setExpandedUserIds] = useState<Set<number>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [ticketHistories, setTicketHistories] = useState<Record<number, GymTicketPurchase[]>>({});
  const [loadingTickets, setLoadingTickets] = useState<Set<number>>(new Set());
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const activeTab = pathToTab(location.pathname);

  const toggleExpandedUser = async (userId: number) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
    if (!(userId in ticketHistories)) {
      setLoadingTickets((prev) => new Set(prev).add(userId));
      try {
        const purchases = await api.get<GymTicketPurchase[]>(`/api/gyms/mine/members/${userId}/ticket-purchases`).catch(() => []);
        setTicketHistories((prev) => ({ ...prev, [userId]: purchases }));
      } finally {
        setLoadingTickets((prev) => { const next = new Set(prev); next.delete(userId); return next; });
      }
    }
  };

  const handleOwnerCancelMembership = async (membershipId: number) => {
    setCancellingId(membershipId);
    try {
      await api.post(`/api/gyms/mine/members/${membershipId}/cancel`, {});
      const ms = await api.get<GymMember[]>("/api/gyms/mine/members").catch(() => [] as GymMember[]);
      setMembers(ms);
    } finally {
      setCancellingId(null);
      setCancelConfirmId(null);
    }
  };

  // Forms
  const [showGymForm, setShowGymForm] = useState(false);
  const [gymForm, setGymForm] = useState({
    name: "",
    description: "",
    phone: "",
    website: "",
    cancellation_hours: 2,
    free_trial_enabled: true,
  });

  const [showLocForm, setShowLocForm] = useState(false);
  const [locForm, setLocForm] = useState({ name: "", address: "", city: "", capacity: 20 });

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: "",
    plan_type: "monthly" as PlanType,
    xp_price: 500,
    sessions_included: "" as string | number,
    ticket_count: "" as string | number,
  });

  const [showTmplForm, setShowTmplForm] = useState(false);
  const [tmplForm, setTmplForm] = useState({
    name: "",
    description: "",
    duration_minutes: 60,
    max_capacity: 20,
    tickets_cost: 1,
  });

  const [showSchedForm, setShowSchedForm] = useState(false);
  const [schedForm, setSchedForm] = useState({
    template_id: 0,
    location_id: 0,
    starts_at: "",
    ends_at: "",
  });

  const [editingLocId, setEditingLocId] = useState<number | null>(null);
  const [editLocForm, setEditLocForm] = useState({ name: "", address: "", city: "", capacity: 20 });

  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({
    name: "",
    xp_price: 500,
    sessions_included: "" as string | number,
    ticket_count: "" as string | number,
    is_active: true,
  });

  const [editingTmplId, setEditingTmplId] = useState<number | null>(null);
  const [editTmplForm, setEditTmplForm] = useState({
    name: "",
    description: "",
    duration_minutes: 60,
    max_capacity: 20,
    tickets_cost: 1,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [weeklySlots, setWeeklySlots] = useState<WeeklySlot[]>([]);
  const [showSlotForm, setShowSlotForm] = useState<number | null>(null);
  const [slotMode, setSlotMode] = useState<"manual" | "template">("manual");
  const [slotTemplateId, setSlotTemplateId] = useState(0);
  const [slotForm, setSlotForm] = useState({ start_time: "", end_time: "", name: "", capacity: "", cost: "" });
  const [copySourceDay, setCopySourceDay] = useState<number | null>(null);

  const [products, setProducts] = useState<GymProduct[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    item_type: "product" as "product" | "discount",
    xp_cost: "" as string | number,
    discount_pct: "" as string | number,
    external_url: "",
    is_active: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [g, locs, ps, tms, ms, slots] = await Promise.all([
        api.get<GymPublic>("/api/gyms/mine").catch(() => null),
        api.get<GymLocation[]>("/api/gyms/mine/locations").catch(() => []),
        api.get<GymPlan[]>("/api/gyms/mine/plans").catch(() => []),
        api.get<GymClassTemplate[]>("/api/gyms/mine/templates").catch(() => []),
        api.get<GymMember[]>("/api/gyms/mine/members").catch(() => []),
        api.get<WeeklySlot[]>("/api/gyms/mine/weekly-slots").catch(() => []),
      ]);
      setGym(g);
      setLocations(locs);
      setPlans(ps);
      setTemplates(tms);
      setMembers(ms);
      setWeeklySlots(slots);

      if (g) {
        const [scheds, anl] = await Promise.all([
          api.get<GymSchedule[]>("/api/gyms/mine/schedules").catch(() => []),
          api.get<GymAnalytics>("/api/gyms/mine/analytics").catch(() => null),
        ]);
        setSchedules(scheds);
        setAnalytics(anl);
        setGymForm({
          name: g.name,
          description: g.description ?? "",
          phone: g.phone ?? "",
          website: g.website ?? "",
          cancellation_hours: g.cancellation_hours,
          free_trial_enabled: g.free_trial_enabled,
        });
      } else {
        setShowGymForm(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (activeTab === "workouts" && !workoutsLoaded) {
      loadWorkouts();
    }
    if (activeTab === "marketplace" && !productsLoaded && gym) {
      loadProducts();
    }
  }, [activeTab, gym]);

  const loadProducts = async () => {
    if (!gym) return;
    try {
      const data = await api.get<GymProduct[]>(`/api/marketplace/gym/${gym.id}/products`);
      setProducts(data);
      setProductsLoaded(true);
    } catch { /* ignore */ }
  };

  const handleSaveProduct = async () => {
    if (!gym) return;
    setSaving(true);
    try {
      const payload = {
        name: productForm.name,
        description: productForm.description || null,
        item_type: productForm.item_type,
        xp_cost: productForm.xp_cost !== "" ? Number(productForm.xp_cost) : null,
        discount_pct: productForm.discount_pct !== "" ? Number(productForm.discount_pct) : null,
        external_url: productForm.external_url || null,
        is_active: productForm.is_active,
      };
      if (editingProductId) {
        const updated = await api.put<GymProduct>(`/api/marketplace/products/${editingProductId}`, payload);
        setProducts((prev) => prev.map((p) => (p.id === editingProductId ? updated : p)));
      } else {
        const created = await api.post<GymProduct>(`/api/marketplace/gym/${gym.id}/products`, payload);
        setProducts((prev) => [created, ...prev]);
      }
      setShowProductForm(false);
      setEditingProductId(null);
      setProductForm({ name: "", description: "", item_type: "product", xp_cost: "", discount_pct: "", external_url: "", is_active: true });
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await api.delete(`/api/marketplace/products/${productId}`);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch { /* ignore */ }
  };

  const startEditProduct = (p: GymProduct) => {
    setEditingProductId(p.id);
    setProductForm({
      name: p.name,
      description: p.description ?? "",
      item_type: p.item_type,
      xp_cost: p.xp_cost ?? "",
      discount_pct: p.discount_pct ?? "",
      external_url: p.external_url ?? "",
      is_active: p.is_active,
    });
    setShowProductForm(true);
  };

  const handleSaveGym = async () => {
    setSaving(true);
    setError("");
    try {
      if (gym) {
        const updated = await api.patch<GymPublic>("/api/gyms/mine", gymForm);
        setGym(updated);
        setShowGymForm(false);
      } else {
        const created = await api.post<GymPublic>("/api/gyms/mine", gymForm);
        setGym(created);
        setShowGymForm(false);
        load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async () => {
    setSaving(true);
    setError("");
    try {
      const loc = await api.post<GymLocation>("/api/gyms/mine/locations", locForm);
      setLocations((prev) => [...prev, loc]);
      setLocForm({ name: "", address: "", city: "", capacity: 20 });
      setShowLocForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPlan = async () => {
    setSaving(true);
    setError("");
    try {
      const body = {
        ...planForm,
        sessions_included: planForm.sessions_included === "" ? null : Number(planForm.sessions_included),
        ticket_count: planForm.ticket_count === "" ? null : Number(planForm.ticket_count),
      };
      const plan = await api.post<GymPlan>("/api/gyms/mine/plans", body);
      setPlans((prev) => [...prev, plan]);
      setPlanForm({ name: "", plan_type: "monthly", xp_price: 500, sessions_included: "", ticket_count: "" });
      setShowPlanForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTemplate = async () => {
    setSaving(true);
    setError("");
    try {
      const tmpl = await api.post<GymClassTemplate>("/api/gyms/mine/templates", tmplForm);
      setTemplates((prev) => [...prev, tmpl]);
      setTmplForm({ name: "", description: "", duration_minutes: 60, max_capacity: 20, tickets_cost: 1 });
      setShowTmplForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLocation = async (locId: number) => {
    setSaving(true);
    setError("");
    try {
      const updated = await api.patch<GymLocation>(`/api/gyms/mine/locations/${locId}`, editLocForm);
      setLocations((prev) => prev.map((l) => (l.id === locId ? updated : l)));
      setEditingLocId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlan = async (planId: number) => {
    setSaving(true);
    setError("");
    try {
      const body = {
        ...editPlanForm,
        sessions_included: editPlanForm.sessions_included === "" ? null : Number(editPlanForm.sessions_included),
        ticket_count: editPlanForm.ticket_count === "" ? null : Number(editPlanForm.ticket_count),
      };
      const updated = await api.patch<GymPlan>(`/api/gyms/mine/plans/${planId}`, body);
      setPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
      setEditingPlanId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTemplate = async (tmplId: number) => {
    setSaving(true);
    setError("");
    try {
      const updated = await api.patch<GymClassTemplate>(`/api/gyms/mine/templates/${tmplId}`, editTmplForm);
      setTemplates((prev) => prev.map((t) => (t.id === tmplId ? updated : t)));
      setEditingTmplId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSchedule = async () => {
    setSaving(true);
    setError("");
    try {
      const sched = await api.post<GymSchedule>("/api/gyms/mine/schedules", schedForm);
      setSchedules((prev) => [...prev, sched]);
      setSchedForm({ template_id: 0, location_id: 0, starts_at: "", ends_at: "" });
      setShowSchedForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  // Kept for future use (schedule one-off classes)
  void showSchedForm;
  void handleAddSchedule;

  const calcEndTime = (start: string, durationMin: number): string => {
    if (!start) return "";
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + durationMin;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  const openSlotForm = (day: number) => {
    setShowSlotForm(day);
    setSlotMode("manual");
    setSlotTemplateId(0);
    setSlotForm({ start_time: "", end_time: "", name: "", capacity: "", cost: "1" });
  };

  // Group slots that overlap in time into rows for parallel display
  const groupOverlapping = (slots: WeeklySlot[]): WeeklySlot[][] => {
    if (slots.length === 0) return [];
    const overlaps = (a: WeeklySlot, b: WeeklySlot) =>
      a.start_time < b.end_time && b.start_time < a.end_time;
    const visited = new Array(slots.length).fill(false);
    const groups: WeeklySlot[][] = [];
    for (let i = 0; i < slots.length; i++) {
      if (visited[i]) continue;
      const group: WeeklySlot[] = [slots[i]];
      visited[i] = true;
      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < slots.length; j++) {
          if (visited[j]) continue;
          if (group.some((s) => overlaps(s, slots[j]))) {
            group.push(slots[j]);
            visited[j] = true;
            changed = true;
          }
        }
      }
      groups.push(group);
    }
    return groups;
  };

  const handleAddSlot = async (day: number) => {
    setSaving(true);
    try {
      const tmpl = slotMode === "template" ? templates.find((t) => t.id === slotTemplateId) : null;
      const endTime = tmpl
        ? calcEndTime(slotForm.start_time, tmpl.duration_minutes)
        : slotForm.end_time;
      await api.post("/api/gyms/mine/weekly-slots", {
        day_of_week: day,
        start_time: slotForm.start_time,
        end_time: endTime,
        name: tmpl ? tmpl.name : slotForm.name,
        capacity: Number(tmpl ? tmpl.max_capacity : slotForm.capacity),
        cost: Number(tmpl ? tmpl.tickets_cost : slotForm.cost),
      });
      setShowSlotForm(null);
      setSlotForm({ start_time: "", end_time: "", name: "", capacity: "", cost: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    await api.delete(`/api/gyms/mine/weekly-slots/${slotId}`);
    load();
  };

  const handlePasteDay = async (targetDay: number) => {
    if (copySourceDay === null) return;
    setSaving(true);
    try {
      await api.post("/api/gyms/mine/weekly-slots/copy-day", {
        source_day: copySourceDay,
        target_day: targetDay,
      });
      setCopySourceDay(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al copiar");
    } finally {
      setSaving(false);
    }
  };

  // ── Workouts state ──────────────────────────────────────────────────────────
  const [workouts, setWorkouts] = useState<GymClassWorkout[]>([]);
  const [workoutsLoaded, setWorkoutsLoaded] = useState(false);
  const [showWodForm, setShowWodForm] = useState(false);
  const [wodForm, setWodForm] = useState({ name: "", description: "" });

  const [editingWod, setEditingWod] = useState<GymClassWorkout | null>(null);
  const [addingBlock, setAddingBlock] = useState(false);
  const [blockForm, setBlockForm] = useState({
    name: "",
    block_type: "amrap" as GymClassBlockType,
    duration_sec: "",
    rounds: "",
    work_sec: "",
    rest_sec: "",
  });

  const [addingExToBlock, setAddingExToBlock] = useState<number | null>(null);
  const [exResults, setExResults] = useState<Exercise[]>([]);
  const [exSearch, setExSearch] = useState("");
  const [exForm, setExForm] = useState({
    exercise_id: 0,
    target_sets: "",
    target_reps: "",
    target_weight_kg: "",
    target_distance_m: "",
    target_duration_sec: "",
    notes: "",
  });

  const loadWorkouts = async () => {
    const ws = await api.get<GymClassWorkout[]>("/api/gyms/mine/workouts").catch(() => []);
    setWorkouts(ws);
    setWorkoutsLoaded(true);
  };

  // After any mutation, reload the list and re-sync editingWod from fresh server data.
  const reloadWod = async (wodId: number) => {
    const ws = await api.get<GymClassWorkout[]>("/api/gyms/mine/workouts").catch(() => null);
    if (!ws) return;
    setWorkouts(ws);
    setWorkoutsLoaded(true);
    const fresh = ws.find((w) => w.id === wodId);
    if (fresh) setEditingWod(fresh);
  };

  const searchExercises = async (q: string) => {
    if (!q.trim()) { setExResults([]); return; }
    const params = new URLSearchParams({ search: q.trim(), limit: "7" });
    const exs = await api.get<Exercise[]>(`/api/exercises?${params}`).catch(() => []);
    setExResults(exs);
  };

  const handleCreateWorkout = async () => {
    setSaving(true);
    setError("");
    try {
      const wod = await api.post<GymClassWorkout>("/api/gyms/mine/workouts", wodForm);
      setWorkouts((prev) => [...prev, wod]);
      setWodForm({ name: "", description: "" });
      setShowWodForm(false);
      setEditingWod(wod);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkout = async (wodId: number) => {
    await api.delete(`/api/gyms/mine/workouts/${wodId}`).catch(() => null);
    setWorkouts((prev) => prev.filter((w) => w.id !== wodId));
  };

  const buildBlockPayload = (b: GymClassWorkoutBlock) => ({
    name: b.name,
    block_type: b.block_type,
    duration_sec: b.duration_sec,
    rounds: b.rounds,
    work_sec: b.work_sec,
    rest_sec: b.rest_sec,
    exercises: b.exercises.map((e) => ({
      exercise_id: e.exercise_id,
      order: e.order,
      target_sets: e.target_sets,
      target_reps: e.target_reps,
      target_weight_kg: e.target_weight_kg,
      target_distance_m: e.target_distance_m,
      target_duration_sec: e.target_duration_sec,
      notes: e.notes,
    })),
  });

  const handleAddBlock = async () => {
    if (!editingWod) return;
    const wodId = editingWod.id;
    setSaving(true);
    setError("");
    try {
      await api.put(`/api/gyms/mine/workouts/${wodId}`, {
        name: editingWod.name,
        description: editingWod.description,
        blocks: [
          ...editingWod.blocks.map(buildBlockPayload),
          {
            name: blockForm.name,
            block_type: blockForm.block_type,
            duration_sec: blockForm.duration_sec ? Number(blockForm.duration_sec) : null,
            rounds: blockForm.rounds ? Number(blockForm.rounds) : null,
            work_sec: blockForm.work_sec ? Number(blockForm.work_sec) : null,
            rest_sec: blockForm.rest_sec ? Number(blockForm.rest_sec) : null,
            exercises: [],
          },
        ],
      });
      setBlockForm({ name: "", block_type: "amrap", duration_sec: "", rounds: "", work_sec: "", rest_sec: "" });
      setAddingBlock(false);
      await reloadWod(wodId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al añadir bloque");
    } finally {
      setSaving(false);
    }
  };

  const handleAddExercise = async (blockId: number) => {
    if (!editingWod) return;
    const wodId = editingWod.id;
    setSaving(true);
    setError("");
    try {
      await api.put(`/api/gyms/mine/workouts/${wodId}`, {
        name: editingWod.name,
        description: editingWod.description,
        blocks: editingWod.blocks.map((b) => {
          const base = buildBlockPayload(b);
          if (b.id !== blockId) return base;
          return {
            ...base,
            exercises: [
              ...base.exercises,
              {
                exercise_id: Number(exForm.exercise_id),
                order: b.exercises.length,
                target_sets: exForm.target_sets ? Number(exForm.target_sets) : null,
                target_reps: exForm.target_reps ? Number(exForm.target_reps) : null,
                target_weight_kg: exForm.target_weight_kg ? Number(exForm.target_weight_kg) : null,
                target_distance_m: exForm.target_distance_m ? Number(exForm.target_distance_m) : null,
                target_duration_sec: exForm.target_duration_sec ? Number(exForm.target_duration_sec) : null,
                notes: exForm.notes || null,
              },
            ],
          };
        }),
      });
      setExForm({ exercise_id: 0, target_sets: "", target_reps: "", target_weight_kg: "", target_distance_m: "", target_duration_sec: "", notes: "" });
      setExSearch("");
      setAddingExToBlock(null);
      await reloadWod(wodId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al añadir ejercicio");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignWorkout = async (schedId: number, wodId: number | null) => {
    try {
      await api.patch(`/api/gyms/mine/schedules/${schedId}`, { workout_id: wodId });
      setSchedules((prev) =>
        prev.map((s) => (s.id === schedId ? { ...s, workout_id: wodId } : s))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al asignar workout");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {gym ? gym.name : "Mi Gimnasio"}
          </h1>
          {gym && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Panel de gestión
            </p>
          )}
        </div>
        {gym && (
          <button
            onClick={() => setShowGymForm(!showGymForm)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
          >
            <Edit2 className="h-3.5 w-3.5" /> Editar
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <X className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Gym setup form */}
      {showGymForm && (
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h2 className="font-semibold text-foreground">
            {gym ? "Editar gimnasio" : "Crear mi gimnasio"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Nombre", key: "name", type: "text" },
              { label: "Teléfono", key: "phone", type: "text" },
              { label: "Web", key: "website", type: "text" },
              { label: "Horas cancelación", key: "cancellation_hours", type: "number" },
            ].map(({ label, key, type }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <input
                  type={type}
                  value={(gymForm as Record<string, unknown>)[key] as string}
                  onChange={(e) => setGymForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                  className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Descripción</label>
              <textarea
                value={gymForm.description}
                onChange={(e) => setGymForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={gymForm.free_trial_enabled}
                onChange={(e) => setGymForm((f) => ({ ...f, free_trial_enabled: e.target.checked }))}
                id="trial"
                className="rounded border-border"
              />
              <label htmlFor="trial" className="text-sm">Clase de prueba gratuita</label>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            {gym && (
              <button onClick={() => setShowGymForm(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary">
                Cancelar
              </button>
            )}
            <button
              onClick={handleSaveGym}
              disabled={saving || !gymForm.name}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {!gym && !showGymForm && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Building2 className="mx-auto h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm">Aún no has configurado tu gimnasio.</p>
          <button onClick={() => setShowGymForm(true)} className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Crear gimnasio
          </button>
        </div>
      )}

      {gym && (
        <>
          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Analytics cards */}
              {analytics && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "Miembros totales", value: analytics.total_members, icon: Users },
                    { label: "Activos", value: analytics.active_members, icon: Users },
                    { label: "Clases este mes", value: analytics.total_classes_this_month, icon: CalendarPlus },
                    { label: "XP recaudado", value: analytics.revenue_xp_this_month.toLocaleString(), icon: BarChart3 },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl border border-border bg-white p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Icon className="h-4 w-4" />
                        <span className="text-xs">{label}</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Locations */}
              <div className="rounded-xl border border-border bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Sedes
                  </h3>
                  <button
                    onClick={() => setShowLocForm(!showLocForm)}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Añadir
                  </button>
                </div>
                {showLocForm && (
                  <div className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
                    {[
                      { label: "Nombre *", key: "name" },
                      { label: "Dirección", key: "address" },
                      { label: "Ciudad", key: "city" },
                    ].map(({ label, key }) => (
                      <div key={key} className="space-y-0.5">
                        <label className="text-xs text-muted-foreground">{label}</label>
                        <input
                          type="text"
                          value={(locForm as Record<string, unknown>)[key] as string}
                          onChange={(e) => setLocForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                    ))}
                    <div className="space-y-0.5">
                      <label className="text-xs text-muted-foreground">Capacidad</label>
                      <input
                        type="number"
                        value={locForm.capacity}
                        onChange={(e) => setLocForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                        className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button onClick={() => setShowLocForm(false)} className="rounded border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary">Cancelar</button>
                      <button onClick={handleAddLocation} disabled={saving || !locForm.name} className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
                    </div>
                  </div>
                )}
                {locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin sedes añadidas.</p>
                ) : (
                  <div className="space-y-2">
                    {locations.map((loc) => editingLocId === loc.id ? (
                      <div key={loc.id} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
                        {[
                          { label: "Nombre *", key: "name" },
                          { label: "Dirección", key: "address" },
                          { label: "Ciudad", key: "city" },
                        ].map(({ label, key }) => (
                          <div key={key} className="space-y-0.5">
                            <label className="text-xs text-muted-foreground">{label}</label>
                            <input
                              type="text"
                              value={(editLocForm as Record<string, unknown>)[key] as string}
                              onChange={(e) => setEditLocForm((f) => ({ ...f, [key]: e.target.value }))}
                              className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                            />
                          </div>
                        ))}
                        <div className="space-y-0.5">
                          <label className="text-xs text-muted-foreground">Capacidad</label>
                          <input type="number" value={editLocForm.capacity} onChange={(e) => setEditLocForm((f) => ({ ...f, capacity: Number(e.target.value) }))} className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <button onClick={() => setEditingLocId(null)} className="rounded border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary">Cancelar</button>
                          <button onClick={() => handleUpdateLocation(loc.id)} disabled={saving || !editLocForm.name} className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <div key={loc.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{loc.name}</p>
                          {loc.city && <p className="text-xs text-muted-foreground">{loc.city}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{loc.capacity} plazas</span>
                          <button
                            onClick={() => { setEditingLocId(loc.id); setEditLocForm({ name: loc.name, address: loc.address ?? "", city: loc.city ?? "", capacity: loc.capacity }); }}
                            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Plans */}
              <div className="rounded-xl border border-border bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Planes de suscripción</h3>
                  <button
                    onClick={() => setShowPlanForm(!showPlanForm)}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Añadir
                  </button>
                </div>
                {showPlanForm && (
                  <div className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
                    <div className="space-y-0.5">
                      <label className="text-xs text-muted-foreground">Nombre *</label>
                      <input type="text" value={planForm.name} onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))} className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-xs text-muted-foreground">Tipo</label>
                      <select value={planForm.plan_type} onChange={(e) => setPlanForm((f) => ({ ...f, plan_type: e.target.value as PlanType }))} className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none">
                        <option value="monthly">Mensual</option>
                        <option value="annual">Anual</option>
                        <option value="tickets">Tickets</option>
                      </select>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-xs text-muted-foreground">Precio XP</label>
                      <input type="number" value={planForm.xp_price} onChange={(e) => setPlanForm((f) => ({ ...f, xp_price: Number(e.target.value) }))} className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                    </div>
                    {planForm.plan_type !== "tickets" && (
                      <div className="space-y-0.5">
                        <label className="text-xs text-muted-foreground">Sesiones incluidas</label>
                        <input type="number" value={planForm.sessions_included} onChange={(e) => setPlanForm((f) => ({ ...f, sessions_included: e.target.value }))} placeholder="Ilimitadas" className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                      </div>
                    )}
                    {planForm.plan_type === "tickets" && (
                      <div className="space-y-0.5">
                        <label className="text-xs text-muted-foreground">Nº tickets</label>
                        <input type="number" value={planForm.ticket_count} onChange={(e) => setPlanForm((f) => ({ ...f, ticket_count: e.target.value }))} className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                      </div>
                    )}
                    <div className="col-span-2 flex justify-end gap-2">
                      <button onClick={() => setShowPlanForm(false)} className="rounded border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary">Cancelar</button>
                      <button onClick={handleAddPlan} disabled={saving || !planForm.name} className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
                    </div>
                  </div>
                )}
                {plans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin planes creados.</p>
                ) : (
                  <div className="space-y-2">
                    {plans.map((p) => editingPlanId === p.id ? (
                      <div key={p.id} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
                        <div className="space-y-0.5">
                          <label className="text-xs text-muted-foreground">Nombre *</label>
                          <input type="text" value={editPlanForm.name} onChange={(e) => setEditPlanForm((f) => ({ ...f, name: e.target.value }))} className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xs text-muted-foreground">Precio XP</label>
                          <input type="number" value={editPlanForm.xp_price} onChange={(e) => setEditPlanForm((f) => ({ ...f, xp_price: Number(e.target.value) }))} className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        {p.plan_type !== "tickets" && (
                          <div className="space-y-0.5">
                            <label className="text-xs text-muted-foreground">Sesiones incluidas</label>
                            <input type="number" value={editPlanForm.sessions_included} onChange={(e) => setEditPlanForm((f) => ({ ...f, sessions_included: e.target.value }))} placeholder="Ilimitadas" className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                          </div>
                        )}
                        {p.plan_type === "tickets" && (
                          <div className="space-y-0.5">
                            <label className="text-xs text-muted-foreground">Nº tickets</label>
                            <input type="number" value={editPlanForm.ticket_count} onChange={(e) => setEditPlanForm((f) => ({ ...f, ticket_count: e.target.value }))} className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                          </div>
                        )}
                        <div className="space-y-0.5 flex items-center gap-2 pt-4">
                          <input type="checkbox" id={`plan-active-${p.id}`} checked={editPlanForm.is_active} onChange={(e) => setEditPlanForm((f) => ({ ...f, is_active: e.target.checked }))} className="h-3.5 w-3.5" />
                          <label htmlFor={`plan-active-${p.id}`} className="text-xs text-muted-foreground">Activo</label>
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <button onClick={() => setEditingPlanId(null)} className="rounded border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary">Cancelar</button>
                          <button onClick={() => handleUpdatePlan(p.id)} disabled={saving || !editPlanForm.name} className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <div key={p.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                        <div>
                          <p className={`text-sm font-medium ${!p.is_active ? "line-through text-muted-foreground" : ""}`}>{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {PLAN_TYPE_LABELS[p.plan_type]}
                            {p.sessions_included ? ` · ${p.sessions_included} sesiones/período` : ""}
                            {p.ticket_count ? ` · ${p.ticket_count} tickets` : ""}
                            {!p.is_active ? " · inactivo" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">{p.xp_price.toLocaleString()} XP</span>
                          <button
                            onClick={() => { setEditingPlanId(p.id); setEditPlanForm({ name: p.name, xp_price: p.xp_price, sessions_included: p.sessions_included ?? "", ticket_count: p.ticket_count ?? "", is_active: p.is_active }); }}
                            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Class templates */}
              <div className="rounded-xl border border-border bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Plantillas de clase</h3>
                  <button onClick={() => setShowTmplForm(!showTmplForm)} className="flex items-center gap-1 text-sm text-primary hover:underline">
                    <Plus className="h-3.5 w-3.5" /> Añadir
                  </button>
                </div>
                {showTmplForm && (
                  <div className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
                    {[
                      { label: "Nombre *", key: "name", type: "text" },
                      { label: "Duración (min)", key: "duration_minutes", type: "number" },
                      { label: "Capacidad máx", key: "max_capacity", type: "number" },
                      { label: "Coste tickets", key: "tickets_cost", type: "number" },
                    ].map(({ label, key, type }) => (
                      <div key={key} className="space-y-0.5">
                        <label className="text-xs text-muted-foreground">{label}</label>
                        <input
                          type={type}
                          value={(tmplForm as Record<string, unknown>)[key] as string | number}
                          onChange={(e) => setTmplForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                          className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                    ))}
                    <div className="col-span-2 space-y-0.5">
                      <label className="text-xs text-muted-foreground">Descripción</label>
                      <textarea value={tmplForm.description} onChange={(e) => setTmplForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button onClick={() => setShowTmplForm(false)} className="rounded border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary">Cancelar</button>
                      <button onClick={handleAddTemplate} disabled={saving || !tmplForm.name} className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
                    </div>
                  </div>
                )}
                {templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin plantillas.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {templates.map((t) => editingTmplId === t.id ? (
                      <div key={t.id} className="col-span-full grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
                        {[
                          { label: "Nombre *", key: "name", type: "text" },
                          { label: "Duración (min)", key: "duration_minutes", type: "number" },
                          { label: "Capacidad máx", key: "max_capacity", type: "number" },
                          { label: "Coste tickets", key: "tickets_cost", type: "number" },
                        ].map(({ label, key, type }) => (
                          <div key={key} className="space-y-0.5">
                            <label className="text-xs text-muted-foreground">{label}</label>
                            <input
                              type={type}
                              value={(editTmplForm as Record<string, unknown>)[key] as string | number}
                              onChange={(e) => setEditTmplForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                              className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                            />
                          </div>
                        ))}
                        <div className="col-span-2 space-y-0.5">
                          <label className="text-xs text-muted-foreground">Descripción</label>
                          <textarea value={editTmplForm.description} onChange={(e) => setEditTmplForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <button onClick={() => setEditingTmplId(null)} className="rounded border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary">Cancelar</button>
                          <button onClick={() => handleUpdateTemplate(t.id)} disabled={saving || !editTmplForm.name} className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <div key={t.id} className="flex items-start justify-between rounded-lg bg-secondary/40 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.duration_minutes} min · {t.max_capacity} plazas · {t.tickets_cost} ticket(s)
                          </p>
                          {t.description && <p className="text-xs text-muted-foreground mt-0.5 italic">{t.description}</p>}
                        </div>
                        <button
                          onClick={() => { setEditingTmplId(t.id); setEditTmplForm({ name: t.name, description: t.description ?? "", duration_minutes: t.duration_minutes, max_capacity: t.max_capacity, tickets_cost: t.tickets_cost }); }}
                          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground shrink-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Schedule tab */}
          {activeTab === "schedule" && (() => {
            const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
            const activeTmpl = slotMode === "template" ? templates.find((t) => t.id === slotTemplateId) : null;
            const previewEnd = activeTmpl ? calcEndTime(slotForm.start_time, activeTmpl.duration_minutes) : "";
            const canSubmit = slotMode === "template"
              ? !!activeTmpl && !!slotForm.start_time
              : !!slotForm.name && !!slotForm.start_time && !!slotForm.end_time && !!slotForm.capacity && !!slotForm.cost;
            return (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configura los días y horarios de clases semanales recurrentes.
                </p>

                {/* Copy mode banner */}
                {copySourceDay !== null && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/30 px-3 py-2 text-sm">
                    <Clipboard className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-primary font-medium">
                      Copiando {DAY_LABELS[copySourceDay]} — selecciona el día destino
                    </span>
                    <button
                      onClick={() => setCopySourceDay(null)}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Weekly grid */}
                <div className="grid grid-cols-7 gap-2">
                  {DAY_LABELS.map((dayLabel, dayIndex) => {
                    const daySlots = weeklySlots.filter((s) => s.day_of_week === dayIndex);
                    const rows = groupOverlapping(daySlots);
                    const isSource = copySourceDay === dayIndex;
                    const isPasteTarget = copySourceDay !== null && !isSource;
                    return (
                      <div
                        key={dayIndex}
                        className={`rounded-xl border min-w-0 ${isSource ? "border-primary bg-primary/5" : isPasteTarget ? "border-primary/40 bg-white cursor-pointer hover:border-primary hover:bg-primary/5" : "border-border bg-white"}`}
                        onClick={isPasteTarget ? () => handlePasteDay(dayIndex) : undefined}
                        title={isPasteTarget ? `Pegar en ${dayLabel}` : undefined}
                      >
                        <div className="border-b border-border px-2 py-1.5 flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-foreground truncate">{dayLabel}</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {isPasteTarget ? (
                              <Clipboard className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <>
                                {daySlots.length > 0 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setCopySourceDay(isSource ? null : dayIndex); }}
                                    className={`rounded p-0.5 ${isSource ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
                                    title={isSource ? "Cancelar copia" : "Copiar día"}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openSlotForm(dayIndex)}
                                  className="rounded p-0.5 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="p-1.5 space-y-1 min-h-[56px]">
                          {daySlots.length === 0 && (
                            <p className="text-[10px] text-muted-foreground text-center py-2">—</p>
                          )}
                          {rows.map((row, rowIdx) => (
                            <div key={rowIdx} className={`flex gap-1 ${row.length > 1 ? "" : ""}`}>
                              {row.map((slot) => (
                                <div
                                  key={slot.id}
                                  className="group flex-1 min-w-0 rounded bg-primary/8 border border-primary/20 px-1.5 py-1"
                                >
                                  <div className="flex items-start justify-between gap-0.5">
                                    <p className="text-[10px] font-semibold text-foreground leading-tight truncate">{slot.name}</p>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id); }}
                                      className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">{slot.start_time}–{slot.end_time}</p>
                                  <p className="text-[10px] text-muted-foreground">{slot.capacity}p · {slot.cost}xp</p>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Full-width form panel */}
                {showSlotForm !== null && (
                  <div className="rounded-xl border border-border bg-white p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">
                        Añadir clase — {DAY_LABELS[showSlotForm]}
                      </h4>
                      <button onClick={() => setShowSlotForm(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Mode toggle */}
                    <div className="flex rounded-md border border-border overflow-hidden w-fit text-sm">
                      <button
                        onClick={() => setSlotMode("manual")}
                        className={`px-4 py-1.5 font-medium transition-colors ${slotMode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                      >
                        Manual
                      </button>
                      <button
                        onClick={() => setSlotMode("template")}
                        className={`px-4 py-1.5 font-medium transition-colors ${slotMode === "template" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                      >
                        Desde plantilla
                      </button>
                    </div>

                    {slotMode === "template" ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Plantilla</label>
                          <select
                            value={slotTemplateId}
                            onChange={(e) => setSlotTemplateId(Number(e.target.value))}
                            className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value={0}>Selecciona plantilla…</option>
                            {templates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} · {t.duration_minutes} min · {t.max_capacity} pl. · {t.tickets_cost} xp
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Hora de inicio</label>
                          <input
                            type="time"
                            value={slotForm.start_time}
                            onChange={(e) => setSlotForm((f) => ({ ...f, start_time: e.target.value }))}
                            className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                        {activeTmpl && slotForm.start_time && (
                          <p className="text-sm text-muted-foreground col-span-full">
                            Hora de fin: <strong>{previewEnd}</strong> ({activeTmpl.duration_minutes} min · {activeTmpl.max_capacity} plazas · {activeTmpl.tickets_cost} xp)
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="space-y-1 col-span-2 sm:col-span-4">
                          <label className="text-xs text-muted-foreground font-medium">Nombre</label>
                          <input
                            type="text"
                            placeholder="Ej: CrossFit, Yoga, HIIT…"
                            value={slotForm.name}
                            onChange={(e) => setSlotForm((f) => ({ ...f, name: e.target.value }))}
                            className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Inicio</label>
                          <input
                            type="time"
                            value={slotForm.start_time}
                            onChange={(e) => setSlotForm((f) => ({ ...f, start_time: e.target.value }))}
                            className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Fin</label>
                          <input
                            type="time"
                            value={slotForm.end_time}
                            onChange={(e) => setSlotForm((f) => ({ ...f, end_time: e.target.value }))}
                            className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Plazas</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="20"
                            value={slotForm.capacity}
                            onChange={(e) => setSlotForm((f) => ({ ...f, capacity: e.target.value }))}
                            className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Coste (xp)</label>
                          <input
                            type="number"
                            min="0"
                            value={slotForm.cost}
                            onChange={(e) => setSlotForm((f) => ({ ...f, cost: e.target.value }))}
                            className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowSlotForm(null)}
                        className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleAddSlot(showSlotForm)}
                        disabled={saving || !canSubmit}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Añadir clase
                      </button>
                    </div>
                  </div>
                )}

              {/* Upcoming schedules with live control */}
              {schedules.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Clases programadas próximas</p>
                  {schedules
                    .filter((s) => !s.is_cancelled)
                    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
                    .slice(0, 10)
                    .map((s) => (
                      <ScheduleCard
                        key={s.id}
                        schedule={s}
                        workouts={workouts}
                        onAssignWorkout={handleAssignWorkout}
                        onNavigateLive={(schedId) => navigate(`/gym/live/${schedId}`)}
                      />
                    ))}
                </div>
              )}
            </div>
            );
          })()}

          {/* Workouts tab */}
          {activeTab === "workouts" && (
            <div className="space-y-4">
              {editingWod ? (
                /* ── Workout editor ── */
                <div className="space-y-4">
                  {/* Breadcrumb / back */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingWod(null); setAddingBlock(false); setAddingExToBlock(null); setExSearch(""); }}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      ← Workouts
                    </button>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">{editingWod.name}</p>
                    {editingWod.description && (
                      <p className="text-xs text-muted-foreground hidden sm:block">— {editingWod.description}</p>
                    )}
                  </div>

                  {/* Empty state */}
                  {editingWod.blocks.length === 0 && !addingBlock && (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                      <Dumbbell className="mx-auto h-6 w-6 mb-2 opacity-40" />
                      <p className="text-sm">Sin bloques. Añade el primero.</p>
                    </div>
                  )}

                  {/* Block cards */}
                  {editingWod.blocks.map((block, blockIdx) => (
                    <div key={block.id} className="rounded-xl border border-border bg-white overflow-hidden">
                      {/* Block header */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/40 border-b border-border">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{block.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {BLOCK_TYPE_OPTIONS.find((o) => o.value === block.block_type)?.label}
                            {block.duration_sec && ` · ${Math.floor(block.duration_sec / 60)}min`}
                            {block.rounds && ` · ${block.rounds} rondas`}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground w-6 h-6 rounded-full border border-border flex items-center justify-center shrink-0">
                          {blockIdx + 1}
                        </span>
                      </div>

                      {/* Exercises */}
                      <div className="px-4 py-3 space-y-1.5">
                        {block.exercises.length === 0 && addingExToBlock !== block.id && (
                          <p className="text-xs text-muted-foreground italic">Sin ejercicios.</p>
                        )}
                        {block.exercises.map((ex) => (
                          <div key={ex.id} className="flex items-center gap-2 text-sm">
                            <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-medium text-foreground">
                              {ex.exercise_name ?? ex.exercise?.name ?? `Ej. ${ex.exercise_id}`}
                            </span>
                            {ex.target_sets && <span className="text-xs text-muted-foreground">{ex.target_sets}×</span>}
                            {ex.target_reps && <span className="text-xs text-muted-foreground">{ex.target_reps} reps</span>}
                            {ex.target_weight_kg && <span className="text-xs text-muted-foreground">{ex.target_weight_kg} kg</span>}
                          </div>
                        ))}

                        {/* Add exercise form */}
                        {addingExToBlock === block.id ? (
                          <div className="pt-2 border-t border-border space-y-2">
                            {exForm.exercise_id === 0 ? (
                              /* Phase 1: search & pick */
                              <>
                                <div className="flex items-center gap-2">
                                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <input
                                    type="text"
                                    placeholder="Buscar ejercicio…"
                                    value={exSearch}
                                    autoFocus
                                    onChange={(e) => { setExSearch(e.target.value); searchExercises(e.target.value); }}
                                    className="flex-1 rounded-md border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                                  />
                                  <button
                                    onClick={() => { setAddingExToBlock(null); setExSearch(""); }}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                {exSearch.trim().length > 0 && (
                                  <div className="rounded-md border border-border overflow-hidden">
                                    {(() => {
                                      return exResults.length > 0 ? exResults.map((ex) => (
                                        <button
                                          key={ex.id}
                                          type="button"
                                          onClick={() => {
                                            setExForm((f) => ({ ...f, exercise_id: ex.id }));
                                            setExSearch(ex.name);
                                          }}
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-secondary border-b border-border last:border-0"
                                        >
                                          {ex.name}
                                        </button>
                                      )) : (
                                        <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
                                      );
                                    })()}
                                  </div>
                                )}
                              </>
                            ) : (
                              /* Phase 2: fill in targets */
                              <>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-foreground">{exSearch}</p>
                                  <button
                                    onClick={() => { setExForm((f) => ({ ...f, exercise_id: 0 })); setExSearch(""); }}
                                    className="text-xs text-muted-foreground hover:underline"
                                  >
                                    Cambiar
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { key: "target_sets", label: "Series" },
                                    { key: "target_reps", label: "Reps" },
                                    { key: "target_weight_kg", label: "kg" },
                                  ].map(({ key, label }) => (
                                    <input
                                      key={key}
                                      type="number"
                                      placeholder={label}
                                      value={(exForm as Record<string, unknown>)[key] as string}
                                      onChange={(e) => setExForm((f) => ({ ...f, [key]: e.target.value }))}
                                      className="w-20 rounded-md border border-border px-2 py-1.5 text-sm text-center focus:border-primary focus:outline-none"
                                    />
                                  ))}
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => { setAddingExToBlock(null); setExSearch(""); setExForm({ exercise_id: 0, target_sets: "", target_reps: "", target_weight_kg: "", target_distance_m: "", target_duration_sec: "", notes: "" }); }}
                                    className="text-xs text-muted-foreground hover:underline"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleAddExercise(block.id)}
                                    disabled={saving}
                                    className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                  >
                                    {saving ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Añadir"}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingExToBlock(block.id); setAddingBlock(false); }}
                            className="flex items-center gap-1 text-xs text-primary hover:underline pt-1"
                          >
                            <Plus className="h-3 w-3" /> Añadir ejercicio
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add block */}
                  {addingBlock ? (
                    <div className="rounded-xl border border-primary/30 bg-white p-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground">Nuevo bloque</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs text-muted-foreground">Nombre *</label>
                          <input
                            type="text"
                            placeholder="Ej: Warm-up, AMRAP principal…"
                            value={blockForm.name}
                            autoFocus
                            onChange={(e) => setBlockForm((f) => ({ ...f, name: e.target.value }))}
                            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs text-muted-foreground">Tipo</label>
                          <select
                            value={blockForm.block_type}
                            onChange={(e) => setBlockForm((f) => ({ ...f, block_type: e.target.value as GymClassBlockType }))}
                            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          >
                            {BLOCK_TYPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        {[
                          { key: "duration_sec", label: "Duración (s)" },
                          { key: "rounds", label: "Rondas" },
                          { key: "work_sec", label: "Trabajo (s)" },
                          { key: "rest_sec", label: "Descanso (s)" },
                        ].map(({ key, label }) => (
                          <div key={key} className="space-y-1">
                            <label className="text-xs text-muted-foreground">{label}</label>
                            <input
                              type="number"
                              placeholder="—"
                              value={(blockForm as Record<string, string>)[key]}
                              onChange={(e) => setBlockForm((f) => ({ ...f, [key]: e.target.value }))}
                              className="w-full rounded-md border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setAddingBlock(false); setBlockForm({ name: "", block_type: "amrap", duration_sec: "", rounds: "", work_sec: "", rest_sec: "" }); }}
                          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleAddBlock}
                          disabled={saving || !blockForm.name}
                          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          Añadir bloque
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingBlock(true); setAddingExToBlock(null); }}
                      className="flex items-center gap-2 w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Añadir bloque
                    </button>
                  )}
                </div>
              ) : (
                /* ── Workout list ── */
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Crea y edita workouts reutilizables para tus clases.
                    </p>
                    <button
                      onClick={() => setShowWodForm((v) => !v)}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-3.5 w-3.5" /> Nuevo workout
                    </button>
                  </div>

                  {showWodForm && (
                    <div className="rounded-xl border border-border bg-white p-4 space-y-3">
                      <h4 className="font-semibold text-sm">Nuevo workout</h4>
                      <input
                        type="text"
                        placeholder="Nombre del workout *"
                        value={wodForm.name}
                        autoFocus
                        onChange={(e) => setWodForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        placeholder="Descripción (opcional)"
                        value={wodForm.description}
                        onChange={(e) => setWodForm((f) => ({ ...f, description: e.target.value }))}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowWodForm(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary">
                          Cancelar
                        </button>
                        <button
                          onClick={handleCreateWorkout}
                          disabled={saving || !wodForm.name}
                          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Crear
                        </button>
                      </div>
                    </div>
                  )}

                  {!workoutsLoaded && (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {workoutsLoaded && workouts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                      <Dumbbell className="mx-auto h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">No tienes workouts aún.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {workouts.map((wod) => (
                      <div
                        key={wod.id}
                        className="rounded-xl border border-border bg-white flex items-center gap-3 px-4 py-3 hover:border-primary/40 transition-colors group"
                      >
                        <button
                          onClick={() => { setEditingWod(wod); setAddingBlock(false); setAddingExToBlock(null); }}
                          className="flex-1 text-left"
                        >
                          <p className="font-semibold text-sm text-foreground group-hover:text-primary">{wod.name}</p>
                          {wod.description && <p className="text-xs text-muted-foreground">{wod.description}</p>}
                          <p className="text-xs text-muted-foreground">{wod.blocks.length} bloques</p>
                        </button>
                        <button
                          onClick={() => handleDeleteWorkout(wod.id)}
                          className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Members tab */}
          {activeTab === "members" && (() => {
            const STATUS_PRIORITY: Record<string, number> = { active: 0, trial: 1, frozen: 2, cancelled: 3, expired: 4 };
            const byUser = new Map<number, GymMember[]>();
            for (const m of members) {
              const list = byUser.get(m.user_id) ?? [];
              list.push(m);
              byUser.set(m.user_id, list);
            }
            const allAthletes = Array.from(byUser.values()).map((list) => {
              const sorted = [...list].sort((a, b) => {
                const pd = (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9);
                if (pd !== 0) return pd;
                return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
              });
              return { current: sorted[0], all: sorted };
            });
            const q = memberSearch.toLowerCase().trim();
            const athletes = q
              ? allAthletes.filter(({ current }) =>
                  current.user_name.toLowerCase().includes(q) || current.user_email.toLowerCase().includes(q)
                )
              : allAthletes;

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-semibold text-foreground">
                    Miembros <span className="text-muted-foreground font-normal text-sm">({allAthletes.length})</span>
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o email…"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-white focus:outline-none focus:border-primary w-56"
                    />
                  </div>
                </div>
                {athletes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    {q ? "Sin resultados." : "Sin miembros aún."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {athletes.map(({ current, all }) => {
                      const isExpanded = expandedUserIds.has(current.user_id);
                      const canCancel = ["active", "trial", "frozen"].includes(current.status);
                      const isCancelling = cancellingId === current.membership_id;
                      const isConfirming = cancelConfirmId === current.membership_id;
                      const purchases = ticketHistories[current.user_id];
                      const isLoadingTickets = loadingTickets.has(current.user_id);

                      return (
                        <div key={current.user_id} className="rounded-xl border border-border bg-white overflow-hidden">
                          {/* Main row */}
                          <div
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                            onClick={() => toggleExpandedUser(current.user_id)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{current.user_name}</p>
                              <p className="text-xs text-muted-foreground">{current.user_email}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {current.plan_name && (
                                <span className="text-xs text-muted-foreground hidden sm:inline">{current.plan_name}</span>
                              )}
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[current.status] ?? "bg-gray-100 text-gray-600"}`}>
                                {current.status}
                              </span>
                              {current.expires_at && (
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {new Date(current.expires_at).toLocaleDateString("es-ES")}
                                </span>
                              )}
                              {canCancel && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCancelConfirmId(isConfirming ? null : current.membership_id); }}
                                  className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded border border-red-200 hover:border-red-400 transition-colors"
                                >
                                  Cancelar
                                </button>
                              )}
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              }
                            </div>
                          </div>

                          {/* Cancel confirm banner */}
                          {isConfirming && (
                            <div className="border-t border-red-100 bg-red-50 px-4 py-2.5 flex items-center gap-3">
                              <p className="flex-1 text-xs text-red-700">¿Cancelar la suscripción de {current.user_name}? Esta acción no se puede deshacer.</p>
                              <button
                                onClick={() => handleOwnerCancelMembership(current.membership_id)}
                                disabled={isCancelling}
                                className="text-xs font-medium bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {isCancelling && <Loader2 className="h-3 w-3 animate-spin" />}
                                Confirmar
                              </button>
                              <button onClick={() => setCancelConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          {/* Expanded panel */}
                          {isExpanded && (
                            <div className="border-t border-border bg-secondary/10">
                              {/* Membership history */}
                              <div className="px-4 pt-3 pb-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Historial de membresías</p>
                                <div className="divide-y divide-gray-100">
                                  {all.map((m) => (
                                    <div key={m.membership_id} className="flex items-center gap-2 py-2 text-sm">
                                      <span className="flex-1 text-muted-foreground">{m.plan_name ?? "Sin plan"}</span>
                                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[m.status] ?? "bg-gray-100 text-gray-600"}`}>
                                        {m.status}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(m.started_at).toLocaleDateString("es-ES")}
                                        {m.expires_at ? ` → ${new Date(m.expires_at).toLocaleDateString("es-ES")}` : ""}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Ticket purchase history */}
                              <div className="px-4 pt-2 pb-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                                  <Ticket className="h-3 w-3" /> Compras de tickets
                                </p>
                                {isLoadingTickets ? (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
                                  </div>
                                ) : !purchases || purchases.length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-1">Sin compras de tickets.</p>
                                ) : (
                                  <div className="divide-y divide-gray-100">
                                    {purchases.map((p, i) => (
                                      <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                                        <span className="flex-1 text-muted-foreground">{p.plan_name}</span>
                                        {p.tickets_bought != null && (
                                          <span className="font-medium">{p.tickets_bought} tickets</span>
                                        )}
                                        <span className="text-muted-foreground">{p.xp_spent} XP</span>
                                        <span className="text-muted-foreground">
                                          {new Date(p.purchased_at).toLocaleDateString("es-ES")}
                                        </span>
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
          })()}

          {/* Analytics tab */}
          {activeTab === "analytics" && (() => {
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

            // Member stats
            const newThisMonth = members.filter((m) => new Date(m.started_at) >= thisMonthStart).length;
            const expiringThisMonth = members.filter((m) => {
              if (!m.expires_at) return false;
              const exp = new Date(m.expires_at);
              return exp >= now && exp < nextMonthStart;
            }).length;
            const statusCounts: Record<string, number> = {};
            for (const m of members) { statusCounts[m.status] = (statusCounts[m.status] ?? 0) + 1; }
            const planCounts: Record<string, number> = {};
            for (const m of members) {
              const key = m.plan_name ?? "Sin plan";
              planCounts[key] = (planCounts[key] ?? 0) + 1;
            }

            // Schedule stats (this month)
            const schedThisMonth = schedules.filter((s) => {
              const d = new Date(s.starts_at);
              return d >= thisMonthStart && d < nextMonthStart && !s.is_cancelled;
            });
            const totalBookings = schedThisMonth.reduce((sum, s) => sum + s.booked_count, 0);
            const totalCapacity = schedThisMonth.reduce((sum, s) => sum + s.effective_capacity, 0);
            const avgOccupancy = totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;
            const topClasses = [...schedThisMonth]
              .sort((a, b) => b.booked_count - a.booked_count)
              .slice(0, 5);

            const STATUS_LABELS: Record<string, string> = {
              active: "Activo", trial: "Prueba", frozen: "Congelado",
              cancelled: "Cancelado", expired: "Expirado",
            };

            return (
              <div className="space-y-6">
                {/* KPI summary */}
                {analytics && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Miembros totales", value: analytics.total_members, color: "text-blue-600" },
                      { label: "Activos", value: analytics.active_members, color: "text-green-600" },
                      { label: "Clases este mes", value: analytics.total_classes_this_month, color: "text-purple-600" },
                      { label: "Asistencia media", value: `${Math.round(analytics.avg_attendance_rate * 100)}%`, color: "text-orange-600" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl border border-border bg-white p-4">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* User stats */}
                  <div className="rounded-xl border border-border bg-white p-5 space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> Usuarios
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="text-xs text-green-700">Nuevos este mes</p>
                        <p className="text-xl font-bold text-green-800">{newThisMonth}</p>
                      </div>
                      <div className="rounded-lg bg-yellow-50 p-3">
                        <p className="text-xs text-yellow-700">Vencen este mes</p>
                        <p className="text-xl font-bold text-yellow-800">{expiringThisMonth}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Por estado</p>
                      {Object.entries(statusCounts).map(([status, count]) => (
                        <div key={status} className="flex items-center gap-2">
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-sm text-foreground">{STATUS_LABELS[status] ?? status}</span>
                            <span className="text-sm font-semibold text-foreground">{count}</span>
                          </div>
                          <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                status === "active" ? "bg-green-500" :
                                status === "trial" ? "bg-blue-400" :
                                status === "frozen" ? "bg-yellow-400" :
                                status === "cancelled" ? "bg-red-400" : "bg-gray-400"
                              }`}
                              style={{ width: `${members.length > 0 ? (count / members.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Membership stats */}
                  <div className="rounded-xl border border-border bg-white p-5 space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-primary" /> Membresías
                    </h3>
                    {Object.keys(planCounts).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin membresías registradas</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Por plan</p>
                        {Object.entries(planCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([planName, count]) => (
                            <div key={planName} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                              <span className="text-sm text-foreground truncate max-w-[160px]">{planName}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{count}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({members.length > 0 ? Math.round((count / members.length) * 100) : 0}%)
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    {analytics && (
                      <div className="rounded-lg bg-purple-50 p-3 mt-2">
                        <p className="text-xs text-purple-700">XP recaudado este mes</p>
                        <p className="text-xl font-bold text-purple-800">{analytics.revenue_xp_this_month.toLocaleString()} XP</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Class stats */}
                <div className="rounded-xl border border-border bg-white p-5 space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4 text-primary" /> Clases este mes
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-blue-50 p-3 text-center">
                      <p className="text-xs text-blue-700">Clases</p>
                      <p className="text-2xl font-bold text-blue-800">{schedThisMonth.length}</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3 text-center">
                      <p className="text-xs text-green-700">Reservas</p>
                      <p className="text-2xl font-bold text-green-800">{totalBookings}</p>
                    </div>
                    <div className="rounded-lg bg-orange-50 p-3 text-center">
                      <p className="text-xs text-orange-700">Ocupación media</p>
                      <p className="text-2xl font-bold text-orange-800">{avgOccupancy}%</p>
                    </div>
                  </div>

                  {topClasses.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clases más reservadas</p>
                      {topClasses.map((s) => {
                        const pct = s.effective_capacity > 0
                          ? Math.round((s.booked_count / s.effective_capacity) * 100)
                          : 0;
                        return (
                          <div key={s.id} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-sm text-foreground truncate">
                                  {s.template_name ?? "Clase"}{" "}
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(s.starts_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                                  </span>
                                </span>
                                <span className="text-xs text-muted-foreground shrink-0 ml-2">{s.booked_count}/{s.effective_capacity}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-orange-400" : "bg-green-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                            <span className={`text-xs font-semibold shrink-0 ${pct >= 90 ? "text-red-600" : pct >= 60 ? "text-orange-600" : "text-green-600"}`}>
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Marketplace tab */}
          {activeTab === "marketplace" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" /> Productos en el Marketplace
                </h3>
                <button
                  onClick={() => {
                    setEditingProductId(null);
                    setProductForm({ name: "", description: "", item_type: "product", xp_cost: "", discount_pct: "", external_url: "", is_active: true });
                    setShowProductForm(!showProductForm);
                  }}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Añadir
                </button>
              </div>

              {showProductForm && (
                <div className="rounded-xl border border-border bg-white p-4 space-y-3">
                  <h4 className="text-sm font-medium">{editingProductId ? "Editar producto" : "Nuevo producto"}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs text-muted-foreground">Nombre *</label>
                      <input
                        type="text"
                        value={productForm.name}
                        onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                        className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs text-muted-foreground">Descripción</label>
                      <textarea
                        value={productForm.description}
                        onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                        rows={2}
                        className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Tipo</label>
                      <select
                        value={productForm.item_type}
                        onChange={(e) => setProductForm((f) => ({ ...f, item_type: e.target.value as "product" | "discount" }))}
                        className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                      >
                        <option value="product">Producto</option>
                        <option value="discount">Descuento</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Costo en XP</label>
                      <input
                        type="number"
                        min={1}
                        value={productForm.xp_cost}
                        onChange={(e) => setProductForm((f) => ({ ...f, xp_cost: e.target.value }))}
                        className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                        placeholder="ej. 500"
                      />
                    </div>
                    {productForm.item_type === "discount" && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">% Descuento</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={productForm.discount_pct}
                          onChange={(e) => setProductForm((f) => ({ ...f, discount_pct: e.target.value }))}
                          className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                          placeholder="ej. 20"
                        />
                      </div>
                    )}
                    <div className={`space-y-1 ${productForm.item_type === "discount" ? "" : "col-span-2"}`}>
                      <label className="text-xs text-muted-foreground">URL externa</label>
                      <input
                        type="url"
                        value={productForm.external_url}
                        onChange={(e) => setProductForm((f) => ({ ...f, external_url: e.target.value }))}
                        className="block w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="prod-active"
                        checked={productForm.is_active}
                        onChange={(e) => setProductForm((f) => ({ ...f, is_active: e.target.checked }))}
                        className="rounded border-border"
                      />
                      <label htmlFor="prod-active" className="text-sm">Activo (visible en marketplace)</label>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setShowProductForm(false); setEditingProductId(null); }}
                      className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveProduct}
                      disabled={saving || !productForm.name}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Guardar
                    </button>
                  </div>
                </div>
              )}

              {products.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                  <ShoppingBag className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Aún no tienes productos. Añade uno para que los atletas puedan canjearlo con XP.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {products.map((p) => (
                    <div key={p.id} className={`rounded-xl border border-border bg-white p-4 space-y-2 ${!p.is_active ? "opacity-60" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${p.item_type === "discount" ? "bg-accent/10" : "bg-primary/10"}`}>
                            {p.item_type === "discount" ? <Percent className="h-4 w-4 text-accent" /> : <Package className="h-4 w-4 text-primary" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm leading-tight">{p.name}</p>
                            {!p.is_active && <span className="text-[10px] text-muted-foreground">Inactivo</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => startEditProduct(p)} className="rounded p-1 hover:bg-secondary">
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="rounded p-1 hover:bg-secondary">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                      {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1 font-bold text-yellow-600">
                          <Zap className="h-3 w-3" />
                          {p.xp_cost != null ? `${p.xp_cost.toLocaleString()} XP` : "Gratis"}
                        </span>
                        {p.item_type === "discount" && p.discount_pct != null && (
                          <span className="rounded-full bg-accent/10 text-accent font-bold px-2 py-0.5">-{p.discount_pct}%</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ScheduleCard({
  schedule,
  workouts,
  onAssignWorkout,
  onNavigateLive,
}: {
  schedule: GymSchedule;
  workouts: GymClassWorkout[];
  onAssignWorkout: (schedId: number, wodId: number | null) => void;
  onNavigateLive: (schedId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = schedule.effective_capacity > 0
    ? Math.round((schedule.booked_count / schedule.effective_capacity) * 100)
    : 0;

  const isLive = schedule.live_status === "active" || schedule.live_status === "paused";

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{schedule.template_name}</p>
            {schedule.live_status === "active" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />EN VIVO
              </span>
            )}
            {schedule.live_status === "paused" && (
              <span className="px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-semibold">PAUSADO</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(schedule.starts_at).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
            {" · "}{new Date(schedule.starts_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            {" – "}{new Date(schedule.ends_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            {" · "}{schedule.location_name}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground mr-2">
          <span className={`font-medium ${pct >= 100 ? "text-red-500" : pct >= 75 ? "text-yellow-600" : "text-green-600"}`}>
            {schedule.booked_count}/{schedule.effective_capacity}
          </span>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-secondary/20 space-y-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span>{pct}% ocupado</span>
          </div>

          {/* Workout assignment */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0">Workout:</label>
            <select
              value={schedule.workout_id ?? 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                onAssignWorkout(schedule.id, v === 0 ? null : v);
              }}
              className="flex-1 rounded-md border border-border px-2 py-1 text-xs"
            >
              <option value={0}>Sin workout</option>
              {workouts.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Live control */}
          <button
            onClick={() => onNavigateLive(schedule.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold w-full justify-center ${
              isLive
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            {isLive ? "Gestionar clase en vivo" : "Iniciar clase en vivo"}
          </button>
        </div>
      )}
    </div>
  );
}
