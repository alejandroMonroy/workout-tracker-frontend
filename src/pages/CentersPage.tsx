import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import type {
    CenterClass,
    CenterSubscription,
    MyCenterMembership,
    TrainingCenter,
    TrainingCenterListItem,
} from "@/types/api";
import {
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    Globe,
    Mail,
    MapPin,
    Phone,
    Plus,
    Users,
    X,
    XCircle,
    Zap,
} from "lucide-react";

function XpBadge({ xp }: { xp: number }) {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-yellow-600">
      <Zap className="h-3.5 w-3.5 text-yellow-500" />
      {xp > 0 ? `${xp.toLocaleString()} XP/mes` : "Gratis"}
    </span>
  );
}
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

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Tab = "explore" | "mine";

export default function CentersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<Tab>("explore");
  const [centers, setCenters] = useState<TrainingCenterListItem[]>([]);
  const [myMemberships, setMyMemberships] = useState<MyCenterMembership[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<CenterSubscription[]>([]);
  const [selected, setSelected] = useState<TrainingCenter | null>(null);
  const [classes, setClasses] = useState<CenterClass[]>([]);
  const [pendingSubs, setPendingSubs] = useState<CenterSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

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

  const fetchMine = useCallback(async () => {
    setLoading(true);
    try {
      const [memberships, subs] = await Promise.all([
        api.get<MyCenterMembership[]>("/api/centers/my/memberships"),
        api.get<CenterSubscription[]>("/api/centers/my/subscriptions"),
      ]);
      setMyMemberships(memberships);
      setMySubscriptions(subs);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "explore") fetchCenters();
    else fetchMine();
  }, [tab, fetchCenters, fetchMine]);

  /* ─── Actions ─── */

  const openDetail = async (id: number) => {
    setActionMsg("");
    setPendingSubs([]);
    try {
      const [center, classList] = await Promise.all([
        api.get<TrainingCenter>(`/api/centers/${id}`),
        api.get<CenterClass[]>(`/api/centers/${id}/classes`),
      ]);
      setSelected(center);
      setClasses(classList);
      // Load pending subscriptions if the current user is the owner
      if (user && (center.owner_id === user.id || user.role === "admin")) {
        const subs = await api.get<CenterSubscription[]>(
          `/api/centers/${id}/subscriptions?status=pending`,
        );
        setPendingSubs(subs);
      }
    } catch {
      /* empty */
    }
  };

  const handleSubDecision = async (centerId: number, subId: number, accept: boolean) => {
    try {
      await api.patch(`/api/centers/${centerId}/subscriptions/${subId}?accept=${accept}`);
      setPendingSubs((prev) => prev.filter((s) => s.id !== subId));
      setActionMsg(accept ? "✅ Suscripción aceptada" : "✅ Suscripción rechazada");
    } catch (err) {
      setActionMsg(`❌ ${err instanceof Error ? err.message : "Error"}`);
    }
  };

  const subscribeToCenter = async (centerId: number) => {
    setActionMsg("");
    try {
      await api.post(`/api/centers/${centerId}/subscribe`, {});
      setActionMsg("✅ Solicitud de suscripción enviada. Espera a que el centro la acepte.");
      fetchMine();
    } catch (err) {
      setActionMsg(`❌ ${err instanceof Error ? err.message : "Error"}`);
    }
  };

  const bookClass = async (centerId: number, classId: number) => {
    setActionMsg("");
    try {
      await api.post(`/api/centers/${centerId}/classes/${classId}/book`, {});
      setActionMsg("✅ Clase reservada correctamente");
      // refresh classes
      const classList = await api.get<CenterClass[]>(`/api/centers/${centerId}/classes`);
      setClasses(classList);
    } catch (err) {
      setActionMsg(`❌ ${err instanceof Error ? err.message : "Error al reservar"}`);
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

  /* subscription status for selected center */
  const selectedSub = selected
    ? mySubscriptions.find((s) => s.center_id === selected.id)
    : null;

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
            Encuentra un centro, suscríbete y accede a sus clases y planes.
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
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {c.member_count} miembros
                  </span>
                  <XpBadge xp={c.monthly_xp} />
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        /* ── My centers ── */
        myMemberships.length === 0 && mySubscriptions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              Aún no perteneces a ningún centro.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mySubscriptions.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Suscripciones
                </h2>
                <div className="space-y-2">
                  {mySubscriptions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm"
                    >
                      <div>
                        <button
                          onClick={() => openDetail(s.center_id)}
                          className="font-semibold hover:underline"
                        >
                          {s.center_name}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {s.xp_per_month} XP/mes
                          {s.expires_at && ` · Expira: ${new Date(s.expires_at).toLocaleDateString("es-ES")}`}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {myMemberships.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Membresías (staff)
                </h2>
                <div className="space-y-2">
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
              </div>
            )}
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
              {actionMsg && (
                <p className="rounded-md border border-border bg-secondary/30 px-4 py-2 text-sm">
                  {actionMsg}
                </p>
              )}

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

              {/* subscription status */}
              <div className="rounded-lg border p-4">
                <h3 className="mb-3 text-sm font-semibold">Tu suscripción</h3>
                {selectedSub ? (
                  <div className="flex items-center gap-3">
                    <StatusBadge status={selectedSub.status} />
                    <span className="text-sm text-muted-foreground">
                      {selectedSub.xp_per_month > 0
                        ? `${selectedSub.xp_per_month.toLocaleString()} XP/mes`
                        : "Gratis"}
                      {selectedSub.status === "pending" && " · Pendiente de aceptación"}
                      {selectedSub.status === "active" && selectedSub.expires_at &&
                        ` · Expira: ${new Date(selectedSub.expires_at).toLocaleDateString("es-ES")}`}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        No tienes suscripción activa. Suscríbete para acceder a clases.
                      </p>
                      {selected.monthly_xp > 0 && (
                        <p className="mt-1 flex items-center gap-1 text-sm font-medium text-yellow-600">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          Coste: {selected.monthly_xp.toLocaleString()} XP/mes
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => subscribeToCenter(selected.id)}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                      <Zap className="h-4 w-4" />
                      {selected.monthly_xp > 0
                        ? `Solicitar · ${selected.monthly_xp.toLocaleString()} XP/mes`
                        : "Solicitar suscripción"}
                    </button>
                  </div>
                )}
              </div>

              {/* upcoming classes */}
              {classes.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Calendar className="h-4 w-4 text-primary" />
                    Clases programadas
                  </h3>
                  <div className="space-y-2">
                    {classes.map((cls) => {
                      const isFull = cls.max_capacity != null && cls.booking_count >= cls.max_capacity;
                      const canBook = selectedSub?.status === "active" && !isFull;
                      return (
                        <div
                          key={cls.id}
                          className="flex items-center justify-between rounded-lg border bg-secondary/30 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{cls.name}</p>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {fmtDateTime(cls.scheduled_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {cls.booking_count}{cls.max_capacity ? `/${cls.max_capacity}` : ""}
                              </span>
                              <span>por {cls.coach_name}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => bookClass(selected.id, cls.id)}
                            disabled={!canBook}
                            className="ml-3 shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
                          >
                            {isFull ? "Llena" : !selectedSub || selectedSub.status !== "active" ? "Sin suscripción" : "Reservar"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* pending subscriptions — only visible to center owner/admin */}
              {user && (selected.owner_id === user.id || user.role === "admin") && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-amber-800">
                    Solicitudes de suscripción pendientes
                    {pendingSubs.length > 0 && (
                      <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs">
                        {pendingSubs.length}
                      </span>
                    )}
                  </h3>
                  {pendingSubs.length === 0 ? (
                    <p className="text-sm text-amber-700">No hay solicitudes pendientes.</p>
                  ) : (
                    <div className="space-y-2">
                      {pendingSubs.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-md bg-white px-3 py-2 shadow-sm"
                        >
                          <div>
                            <p className="text-sm font-medium">{s.athlete_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.xp_per_month > 0 ? `${s.xp_per_month} XP/mes` : "Gratis"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSubDecision(selected.id, s.id, true)}
                              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Aceptar
                            </button>
                            <button
                              onClick={() => handleSubDecision(selected.id, s.id, false)}
                              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* close */}
              <div className="flex justify-end">
                <button
                  onClick={() => setSelected(null)}
                  className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary"
                >
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
