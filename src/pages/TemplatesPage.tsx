import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { WorkoutTemplate } from "@/types/api";
import { ClipboardList, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const MODALITY_LABELS: Record<string, string> = {
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For Time",
  tabata: "Tabata",
  custom: "Custom",
};

const MODALITY_COLORS: Record<string, string> = {
  amrap: "bg-red-100 text-red-700",
  emom: "bg-blue-100 text-blue-700",
  for_time: "bg-green-100 text-green-700",
  tabata: "bg-purple-100 text-purple-700",
  custom: "bg-gray-100 text-gray-700",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<WorkoutTemplate[]>("/api/templates")
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startFromTemplate = async (templateId: number) => {
    try {
      const session = await api.post<{ id: number }>("/api/sessions", {
        template_id: templateId,
      });
      navigate(`/sessions/${session.id}`);
    } catch {
      // handle error
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plantillas de WOD</h1>
        <p className="text-muted-foreground">
          Entrenamientos prediseñados listos para usar
        </p>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No hay plantillas disponibles todavía
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{t.name}</h3>
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium",
                    MODALITY_COLORS[t.modality] ?? MODALITY_COLORS.custom,
                  )}
                >
                  {MODALITY_LABELS[t.modality] ?? t.modality}
                </span>
              </div>
              {t.description && (
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                  {t.description}
                </p>
              )}
              <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                {t.rounds && <span>{t.rounds} rondas</span>}
                {t.time_cap_sec && (
                  <span>Cap: {Math.floor(t.time_cap_sec / 60)}min</span>
                )}
                <span>{t.blocks.length} ejercicios</span>
              </div>

              {/* Block list */}
              {t.blocks.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-border pt-3">
                  {t.blocks.map((b) => (
                    <p key={b.id} className="text-xs text-muted-foreground">
                      {b.order}. {b.exercise?.name ?? `Ejercicio #${b.exercise_id}`}
                      {b.target_reps && ` × ${b.target_reps}`}
                      {b.target_weight_kg && ` @ ${b.target_weight_kg}kg`}
                    </p>
                  ))}
                </div>
              )}

              {/* Start session */}
              <button
                onClick={() => startFromTemplate(t.id)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
                Iniciar WOD
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
