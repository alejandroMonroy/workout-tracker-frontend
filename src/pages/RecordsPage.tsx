import { formatDate } from "@/lib/utils";
import { api } from "@/services/api";
import type { PersonalRecord } from "@/types/api";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";

const TYPE_LABELS: Record<string, string> = {
  max_reps: "Max Reps",
  best_time: "Mejor Tiempo",
  max_distance: "Max Distancia",
  max_weight: "Peso Máximo",
};

const TYPE_UNITS: Record<string, string> = {
  max_reps: "reps",
  best_time: "s",
  max_distance: "m",
  max_weight: "kg",
};

export default function RecordsPage() {
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PersonalRecord[]>("/api/stats/records")
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group by exercise
  const grouped = records.reduce(
    (acc, r) => {
      const name = r.exercise?.name ?? `Ejercicio #${r.exercise_id}`;
      if (!acc[name]) acc[name] = [];
      acc[name].push(r);
      return acc;
    },
    {} as Record<string, PersonalRecord[]>,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Records Personales
        </h1>
        <p className="text-muted-foreground">
          {records.length} records en {Object.keys(grouped).length} ejercicios
        </p>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Completa entrenamientos para establecer records
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([name, recs]) => (
            <div
              key={name}
              className="rounded-lg border border-border bg-card shadow-sm"
            >
              <div className="border-b border-border px-5 py-3">
                <h2 className="font-semibold">{name}</h2>
              </div>
              <div className="divide-y divide-border">
                {recs.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {TYPE_LABELS[r.record_type] ?? r.record_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.achieved_at)}
                      </p>
                    </div>
                    <span className="rounded-md bg-yellow-50 px-3 py-1 text-sm font-bold text-yellow-700">
                      {r.value}
                      {TYPE_UNITS[r.record_type] ?? ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
