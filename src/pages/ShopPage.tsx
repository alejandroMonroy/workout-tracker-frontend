import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import type { GymProduct, ProductRedemptionResult } from "@/types/api";
import {
    ExternalLink,
    Loader2,
    Package,
    Percent,
    ShoppingBag,
    Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Tab = "product" | "discount";

export default function ShopPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("product");
  const [items, setItems] = useState<GymProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<GymProduct[]>("/api/marketplace");
      setItems(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleRedeem = async (productId: number) => {
    setRedeeming(productId);
    setActionMsg("");
    try {
      const res = await api.post<ProductRedemptionResult>(`/api/marketplace/${productId}/redeem`);
      setActionMsg(`✅ ${res.message}`);
      if (res.external_url) window.open(res.external_url, "_blank");
    } catch (err) {
      setActionMsg(`❌ ${err instanceof Error ? err.message : "Error al canjear"}`);
    } finally {
      setRedeeming(null);
    }
  };

  const userXp = user?.total_xp ?? 0;
  const filtered = items.filter((p) => p.item_type === tab);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tienda</h1>
          <p className="text-sm text-muted-foreground">
            Canjea tus XP por productos y descuentos ofrecidos por los gimnasios.
          </p>
        </div>
        {/* XP balance */}
        <div className="inline-flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2 shrink-0">
          <Zap className="h-4 w-4 text-yellow-500" />
          <div>
            <p className="text-sm font-bold text-yellow-700">{userXp.toLocaleString()} XP</p>
            <p className="text-[10px] text-yellow-600">disponibles</p>
          </div>
        </div>
      </div>

      {actionMsg && (
        <p className="rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
          {actionMsg}
        </p>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {(["product", "discount"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-primary text-white"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {t === "product" ? (
              <><Package className="h-4 w-4" /> Productos</>
            ) : (
              <><Percent className="h-4 w-4" /> Descuentos</>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-card shadow-sm p-12 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            No hay {tab === "product" ? "productos" : "descuentos"} disponibles todavía.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const canAfford = p.xp_cost != null && userXp >= p.xp_cost;
            return (
              <div
                key={p.id}
                className={`rounded-xl bg-card border border-border shadow-sm overflow-hidden transition-shadow ${
                  canAfford ? "hover:shadow-md" : "opacity-60"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        p.item_type === "discount"
                          ? "bg-accent/10"
                          : "bg-primary/10"
                      }`}
                    >
                      {p.item_type === "discount" ? (
                        <Percent className="h-4 w-4 text-accent" />
                      ) : (
                        <Package className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {p.gym_name}
                    </p>
                  </div>
                  {p.item_type === "discount" && p.discount_pct != null && (
                    <span className="rounded-full bg-accent/10 text-accent text-xs font-bold px-2.5 py-1">
                      -{p.discount_pct}%
                    </span>
                  )}
                </div>

                <div className="px-4 pb-4 space-y-3">
                  <div>
                    <h3 className="font-semibold leading-tight">{p.name}</h3>
                    {p.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {p.description}
                      </p>
                    )}
                  </div>

                  {/* XP cost */}
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-bold ${
                      canAfford ? "text-yellow-600" : "text-muted-foreground"
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {p.xp_cost != null ? `${p.xp_cost.toLocaleString()} XP` : "Gratis"}
                  </span>

                  {!canAfford && p.xp_cost != null && (
                    <p className="text-[11px] text-muted-foreground">
                      Te faltan {(p.xp_cost - userXp).toLocaleString()} XP
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {p.xp_cost != null && (
                      <button
                        onClick={() => handleRedeem(p.id)}
                        disabled={!canAfford || redeeming === p.id}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                      >
                        {redeeming === p.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Zap className="h-3 w-3" />
                        )}
                        Canjear
                      </button>
                    )}
                    {p.external_url && (
                      <a
                        href={p.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
