import { api } from "@/services/api";
import type { Exercise, ProgressPoint } from "@/types/api";
import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

export default function ProgressPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExId, setSelectedExId] = useState<number | null>(null);
  const [data, setData] = useState<ProgressPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Load strength exercises for selector
  useEffect(() => {
    api
      .get<Exercise[]>("/api/exercises?type=strength")
      .then((exs) => {
        setExercises(exs);
        if (exs.length > 0) setSelectedExId(exs[0].id);
      })
      .catch(() => {});
  }, []);

  // Load progress when exercise changes
  useEffect(() => {
    if (!selectedExId) return;
    let cancelled = false;
    api
      .get<ProgressPoint[]>(
        `/api/stats/progress/${selectedExId}?days=90`,
      )
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData([]);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [selectedExId]);

  const chartData = data.map((p) => ({
    ...p,
    date: new Date(p.date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    }),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <TrendingUp className="h-6 w-6 text-primary" />
          Progreso
        </h1>
        <p className="text-muted-foreground">
          Evolución de tus levantamientos (90 días)
        </p>
      </div>

      {/* Exercise selector */}
      <div className="max-w-xs">
        <select
          value={selectedExId ?? ""}
          onChange={(e) => setSelectedExId(Number(e.target.value))}
          className="block w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-muted-foreground">
            No hay datos para este ejercicio. ¡Empieza a registrar!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Max Weight chart */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 font-semibold">Peso Máximo</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "kg",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12 },
                  }}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="max_weight"
                  name="Peso máximo"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Volume chart */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 font-semibold">Volumen por Sesión</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "kg",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12 },
                  }}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="volume"
                  name="Volumen (kg)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
