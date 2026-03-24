import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import type {
    CenterMembership,
    CenterPlan,
    MyCenterMembership,
    TrainingCenter,
    TrainingCenterListItem,
} from "@/types/api";
import {
    Building2,
    CheckCircle2,
    Clock,
    Globe,
    LogIn,
    LogOut,
    Mail,
    MapPin,
    Phone,
    Plus,
    Users,
    X,
    XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* ─── Helpers ─── */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status === "active" && <CheckCircle2 className="mr-1 h-3 w-3" />}
      {status === "pending" && <Clock className="mr-1 h-3 w-3" />}
      {status === "rejected" && <XCircle className="mr-1 h-3 w-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

type Tab = "explore" | "mine";

export default function CentersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<Tab>("explore");
  const [centers, setCenters] = useState<TrainingCenterListItem[]>([]);
  const [myMemberships, setMyMemberships] = useState<MyCenterMembership[]>([]);
  const [selected, setSelected] = useState<TrainingCenter | null>(null);
  const [members, setMembers] = useState<CenterMembership[]>([]);
  const [plans, setPlans] = useState<CenterPlan[]>([]);
  const [loading, setLoading] = useState(true);

  /* create center form */
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    website: "",
  });

  /* ─── Fetchers ─── */

  const fetchCenters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<TrainingCenterListItem[]>("/api/centers");
      setCenters(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyMemberships = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<MyCenterMembership[]>("/api/centers/my/memberships");
      setMyMemberships(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "explore") fetchCenters();
    else fetchMyMemberships();
  }, [tab, fetchCenters, fetchMyMemberships]);

  /* ─── Actions ─── */

  const openDetail = async (id: number) => {
    try {
      const [center, memberList, planList] = await Promise.all([
        api.get<TrainingCenter>(`/api/centers/${id}`),
        api.get<CenterMembership[]>(`/api/centers/${id}/members`),
        api.get<CenterPlan[]>(`/api/centers/${id}/plans`),
      ]);
      setSelected(center);
      setMembers(memberList);
      setPlans(planList);
    } catch {
      /* empty */
    }
  };

  const joinCenter = async (centerId: number) => {
    try {
      await api.post(`/api/centers/${centerId}/join`, { role: "member" });
      if (selected) openDetail(centerId);
      fetchMyMemberships();
    } catch {
      /* empty */
    }
  };

  const createCenter = async () => {
    try {
      await api.post("/api/centers", form);
      setShowCreate(false);
      setForm({ name: "", description: "", address: "", city: "", phone: "", email: "", website: "" });
      fetchCenters();
    } catch {
      /* empty */
    }
  };

  /* ─── Render ─── */

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Centros de Entrenamiento
          </h1>
          <p className="text-sm text-muted-foreground">
            Encuentra un centro, únete y accede a sus planes y eventos.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Crear centro
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-secondary p-1">
        {(["explore", "mine"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "explore" ? "Explorar" : "Mis centros"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          Cargando...
        </p>
      ) : tab === "explore" ? (
        /* ── Explore grid ── */
        centers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              No hay centros disponibles todavía.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {centers.map((c) => (
              <button
                key={c.id}
                onClick={() => openDetail(c.id)}
                className="rounded-xl bg-card p-5 text-left shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  {c.logo_url ? (
                    <img
                      src={c.logo_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name}</p>
                    {c.city && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {c.city}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {c.member_count} miembros
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        /* ── My memberships ── */
        myMemberships.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <LogIn className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              Aún no perteneces a ningún centro.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myMemberships.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm"
              >
                <div>
                  <button
                    onClick={() => openDetail(m.center_id)}
                    className="font-semibold hover:underline"
                  >
                    {m.center_name}
                  </button>
                  <p className="text-xs text-muted-foreground capitalize">
                    {m.role}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Detail modal ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            {/* header */}
            <div className="flex items-start justify-between border-b p-6">
              <div>
                <h2 className="text-xl font-bold">{selected.name}</h2>
                {selected.city && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {selected.address
                      ? `${selected.address}, ${selected.city}`
                      : selected.city}
                  </p>
                )}
              </div>
              <button onClick={() => setSelected(null)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {selected.description && (
                <p className="text-sm text-muted-foreground">
                  {selected.description}
                </p>
              )}

              {/* contact */}
              <div className="flex flex-wrap gap-4 text-sm">
                {selected.phone && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {selected.phone}
                  </span>
                )}
                {selected.email && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {selected.email}
                  </span>
                )}
                {selected.website && (
                  <a
                    href={selected.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Web
                  </a>
                )}
              </div>

              {/* members */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  Miembros ({members.length})
                </h3>
                {members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Sin miembros aún.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {members.slice(0, 10).map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-1.5 text-sm"
                      >
                        <span>{m.user_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs capitalize text-muted-foreground">
                            {m.role}
                          </span>
                          <StatusBadge status={m.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* plans */}
              {plans.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Planes publicados
                  </h3>
                  <div className="space-y-1">
                    {plans.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-1.5 text-sm"
                      >
                        <span>{p.plan_name}</span>
                        <span className="text-xs text-muted-foreground">
                          por {p.coach_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* join */}
              <div className="flex gap-3">
                <button
                  onClick={() => joinCenter(selected.id)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4" />
                  Solicitar unirse
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Nuevo centro</h2>
              <button onClick={() => setShowCreate(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              {(
                [
                  ["name", "Nombre *"],
                  ["city", "Ciudad"],
                  ["address", "Dirección"],
                  ["phone", "Teléfono"],
                  ["email", "Email"],
                  ["website", "Web"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {label}
                  </label>
                  <input
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={createCenter}
                disabled={!form.name.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
