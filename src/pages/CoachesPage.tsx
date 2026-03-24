import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type { CoachProfile, PlanListItem } from "@/types/api";
import {
    BookOpen,
    Check,
    Clock,
    Loader2,
    Search,
    Send,
    UserCheck,
    Users,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCoach, setSelectedCoach] = useState<CoachProfile | null>(null);
  const [coachPlans, setCoachPlans] = useState<PlanListItem[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const loadCoaches = async (q?: string) => {
    setLoading(true);
    try {
      const url = q
        ? `/api/coach/directory?search=${encodeURIComponent(q)}`
        : "/api/coach/directory";
      const data = await api.get<CoachProfile[]>(url);
      setCoaches(data);
    } catch {
      setCoaches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoaches();
  }, []);

  const handleSearch = () => {
    loadCoaches(search);
  };

  const viewCoach = async (coach: CoachProfile) => {
    setSelectedCoach(coach);
    setActionMsg("");
    setLoadingPlans(true);
    try {
      const plans = await api.get<PlanListItem[]>(
        `/api/plans?search=&mine_only=false`,
      );
      // Filter to only this coach's plans
      setCoachPlans(plans.filter((p) => p.created_by === coach.id));
    } catch {
      setCoachPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleRequest = async (coachId: number) => {
    setRequesting(true);
    setActionMsg("");
    try {
      await api.post(`/api/coach/request/${coachId}`);
      setActionMsg("✅ Solicitud enviada");
      // Update local state
      setCoaches((prev) =>
        prev.map((c) =>
          c.id === coachId
            ? {
                ...c,
                relationship_status: "pending",
                relationship_initiated_by: "athlete",
              }
            : c,
        ),
      );
      if (selectedCoach?.id === coachId) {
        setSelectedCoach((prev) =>
          prev
            ? {
                ...prev,
                relationship_status: "pending",
                relationship_initiated_by: "athlete",
              }
            : prev,
        );
      }
    } catch (err) {
      setActionMsg(
        `❌ ${err instanceof Error ? err.message : "Error al enviar solicitud"}`,
      );
    } finally {
      setRequesting(false);
    }
  };

  const getStatusBadge = (coach: CoachProfile) => {
    if (coach.relationship_status === "active") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
          <UserCheck className="h-3 w-3" />
          Tu coach
        </span>
      );
    }
    if (coach.relationship_status === "pending") {
      if (coach.relationship_initiated_by === "athlete") {
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
            <Clock className="h-3 w-3" />
            Pendiente
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
          <Send className="h-3 w-3" />
          Te ha invitado
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6 text-primary" />
          Coaches
        </h1>
        <p className="text-muted-foreground">
          Encuentra un coach y solicita entrenamiento personalizado
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar coach por nombre..."
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Buscar
        </button>
      </div>

      {actionMsg && (
        <p className="rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
          {actionMsg}
        </p>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : coaches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No se encontraron coaches
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((coach) => (
            <div
              key={coach.id}
              className={cn(
                "cursor-pointer rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md",
                selectedCoach?.id === coach.id
                  ? "border-primary ring-1 ring-primary"
                  : "border-border",
              )}
              onClick={() => viewCoach(coach)}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                    {coach.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{coach.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {coach.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 flex gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {coach.athlete_count}{" "}
                    {coach.athlete_count === 1 ? "atleta" : "atletas"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>
                    {coach.plan_count}{" "}
                    {coach.plan_count === 1 ? "plan" : "planes"}
                  </span>
                </div>
              </div>

              {/* Status / action */}
              <div className="mt-4">
                {getStatusBadge(coach) ??
                  (coach.relationship_status == null && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequest(coach.id);
                      }}
                      disabled={requesting}
                      className="flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
                    >
                      {requesting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Solicitar coaching
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Coach detail modal */}
      {selectedCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl">
                  {selectedCoach.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedCoach.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedCoach.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCoach(null)}
                className="rounded-md p-1 hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stats */}
            <div className="mt-4 flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {selectedCoach.athlete_count}
                </p>
                <p className="text-xs text-muted-foreground">Atletas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {selectedCoach.plan_count}
                </p>
                <p className="text-xs text-muted-foreground">Planes</p>
              </div>
            </div>

            {/* Status / request */}
            <div className="mt-5">
              {selectedCoach.relationship_status === "active" ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">
                    Ya tienes una relación activa con este coach
                  </span>
                </div>
              ) : selectedCoach.relationship_status === "pending" ? (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">
                    {selectedCoach.relationship_initiated_by === "athlete"
                      ? "Tu solicitud está pendiente de aceptación"
                      : "Este coach te ha enviado una invitación — revisa tu Dashboard"}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => handleRequest(selectedCoach.id)}
                  disabled={requesting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  {requesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Solicitar coaching
                </button>
              )}
            </div>

            {/* Coach plans */}
            <div className="mt-6">
              <h3 className="flex items-center gap-2 font-semibold">
                <BookOpen className="h-4 w-4 text-primary" />
                Planes públicos
              </h3>
              {loadingPlans ? (
                <div className="mt-3 flex h-16 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : coachPlans.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Este coach aún no tiene planes públicos
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {coachPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="rounded-lg border border-border bg-secondary/30 p-3"
                    >
                      <p className="text-sm font-medium">{plan.name}</p>
                      {plan.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                      <div className="mt-1.5 flex gap-3 text-xs text-muted-foreground">
                        <span>{plan.session_count} sesiones</span>
                        {plan.duration_weeks && (
                          <span>{plan.duration_weeks} semanas</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
