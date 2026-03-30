import { formatDate } from "@/lib/utils";
import { api } from "@/services/api";
import type { Competition } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import { CalendarDays, MapPin, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Create Competition Dialog ─────────────────────────────────────────────────

function CreateCompetitionDialog({
  onCreated,
  onClose,
}: {
  onCreated: (c: Competition) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    init_date: "",
    end_date: "",
    inscription_xp_cost: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const c = await api.post<Competition>("/api/competitions", {
        ...form,
        inscription_xp_cost: Number(form.inscription_xp_cost),
        init_date: new Date(form.init_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
      });
      onCreated(c);
    } catch (e: unknown) {
      const msg = (e as { detail?: string })?.detail ?? "Error al crear la competición";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const valid =
    form.name.trim() &&
    form.location.trim() &&
    form.init_date &&
    form.end_date &&
    new Date(form.end_date) > new Date(form.init_date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Nueva Competición
        </h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Nombre de la competición"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Descripción (opcional)</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Descripción de la competición"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Ubicación</label>
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ciudad, instalación..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha inicio</label>
              <input
                type="datetime-local"
                value={form.init_date}
                onChange={(e) => set("init_date", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha fin</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Coste de inscripción (XP)</label>
            <input
              type="number"
              min={0}
              value={form.inscription_xp_cost}
              onChange={(e) => set("inscription_xp_cost", Math.max(0, Number(e.target.value)))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">Introduce 0 para inscripción gratuita</p>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border py-2 text-sm hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!valid || submitting}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Creando..." : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Competition Status ────────────────────────────────────────────────────────

function competitionStatus(c: Competition): { label: string; cls: string } {
  const now = new Date();
  if (now < new Date(c.init_date)) return { label: "Próximamente", cls: "bg-blue-100 text-blue-800" };
  if (now <= new Date(c.end_date)) return { label: "En curso", cls: "bg-green-100 text-green-800" };
  return { label: "Finalizada", cls: "bg-gray-100 text-gray-700" };
}

// ── Competition Card ──────────────────────────────────────────────────────────

function CompetitionCard({
  competition,
  onSubscribeChange,
}: {
  competition: Competition;
  onSubscribeChange: (updated: Competition) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const status = competitionStatus(competition);
  const isAthlete = user?.role === "athlete";

  const handleSubscribe = async () => {
    setBusy(true);
    try {
      await api.post(`/api/competitions/${competition.id}/subscribe`, {});
      onSubscribeChange({ ...competition, is_subscribed: true, subscriber_count: competition.subscriber_count + 1 });
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 shadow-sm cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => navigate(`/competitions/${competition.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{competition.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>
              {status.label}
            </span>
            {competition.is_subscribed && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Inscrito
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {competition.places.length > 0
                ? competition.places.map((p) => p.name).join(", ")
                : competition.location}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDate(competition.init_date)} – {formatDate(competition.end_date)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {competition.subscriber_count} participantes
            </span>
          </div>

          {competition.inscription_xp_cost > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Inscripción:{" "}
              <span className="font-semibold text-foreground">{competition.inscription_xp_cost} XP</span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          {isAthlete && !competition.is_subscribed && status.label !== "Finalizada" && (
            <button
              onClick={handleSubscribe}
              disabled={busy}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "..." : competition.inscription_xp_cost > 0 ? `Inscribirse (${competition.inscription_xp_cost} XP)` : "Inscribirse"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// Main CompetitionsPage
// ══════════════════════════════════════════════════

export default function CompetitionsPage() {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const isCreator = user?.role === "coach" || user?.role === "gym";

  useEffect(() => {
    api.get<Competition[]>("/api/competitions")
      .then(setCompetitions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (c: Competition) => {
    setCompetitions((prev) => [c, ...prev]);
    setShowCreate(false);
  };

  const handleSubscribeChange = (updated: Competition) => {
    setCompetitions((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  return (
    <div className="space-y-6">
      {showCreate && (
        <CreateCompetitionDialog onCreated={handleCreated} onClose={() => setShowCreate(false)} />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Trophy className="h-6 w-6 text-primary" />
            Competiciones
          </h1>
          <p className="text-muted-foreground">Participa y compite con otros atletas</p>
        </div>
        {isCreator && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Nueva competición
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : competitions.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No hay competiciones disponibles</p>
        </div>
      ) : (
        <div className="space-y-3">
          {competitions.map((c) => (
            <CompetitionCard
              key={c.id}
              competition={c}
              onSubscribeChange={handleSubscribeChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
