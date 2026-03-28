import { api } from "@/services/api";
import type { CoachPublic } from "@/types/api";
import {
    Loader2,
    Search,
    Users,
    Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<CoachPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);

  const loadCoaches = async () => {
    setLoading(true);
    try {
      const data = await api.get<CoachPublic[]>("/api/coaches");
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

  const handleSubscribe = async (coach: CoachPublic) => {
    setActingId(coach.id);
    try {
      await api.post(`/api/coaches/${coach.id}/subscribe`);
      setCoaches((prev) =>
        prev.map((c) =>
          c.id === coach.id
            ? { ...c, is_subscribed: true, subscriber_count: c.subscriber_count + 1 }
            : c,
        ),
      );
    } catch {}
    setActingId(null);
  };

  const handleUnsubscribe = async (coach: CoachPublic) => {
    setActingId(coach.id);
    try {
      await api.delete(`/api/coaches/${coach.id}/subscribe`);
      setCoaches((prev) =>
        prev.map((c) =>
          c.id === coach.id
            ? { ...c, is_subscribed: false, subscriber_count: Math.max(0, c.subscriber_count - 1) }
            : c,
        ),
      );
    } catch {}
    setActingId(null);
  };

  const filtered = search.trim()
    ? coaches.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : coaches;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6 text-primary" />
          Coaches
        </h1>
        <p className="text-muted-foreground">
          Suscríbete a un coach para acceder a sus planes privados
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar coach..."
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No se encontraron coaches</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((coach) => {
            const isActing = actingId === coach.id;
            return (
              <div
                key={coach.id}
                className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {coach.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{coach.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {coach.plan_count} plan{coach.plan_count !== 1 ? "es" : ""} ·{" "}
                      {coach.subscriber_count} suscriptor{coach.subscriber_count !== 1 ? "es" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {coach.subscription_xp_price != null && (
                    <div className="text-right">
                      <p className="flex items-center gap-1 text-sm font-semibold text-yellow-600">
                        <Zap className="h-4 w-4" />
                        {coach.subscription_xp_price.toLocaleString()} XP
                      </p>
                      <p className="text-xs text-muted-foreground">/ mes</p>
                    </div>
                  )}
                  {coach.is_subscribed ? (
                    <button
                      onClick={() => handleUnsubscribe(coach)}
                      disabled={isActing}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-50"
                    >
                      {isActing && <Loader2 className="h-3 w-3 animate-spin" />}
                      Cancelar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(coach)}
                      disabled={isActing}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isActing && <Loader2 className="h-3 w-3 animate-spin" />}
                      Suscribirse
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
