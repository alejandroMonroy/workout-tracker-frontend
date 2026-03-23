import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import type { User } from "@/types/api";
import { Loader2, Save, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [units, setUnits] = useState("metric");
  const [birthDate, setBirthDate] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [sex, setSex] = useState("");

  useEffect(() => {
    if (!user) return;
    api.get<User>("/api/auth/me").then((p) => {
      setProfile(p);
      setName(p.name);
      setUnits(p.units_preference);
      setBirthDate(p.birth_date ?? "");
      setHeightCm(p.height_cm != null ? String(p.height_cm) : "");
      setWeightKg(p.weight_kg != null ? String(p.weight_kg) : "");
      setSex(p.sex ?? "");
    });
  }, [user]);

  if (!user || !profile) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        units_preference: units,
        birth_date: birthDate || null,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        sex: sex || null,
      };
      await api.patch("/api/auth/profile", payload);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const age = birthDate
    ? Math.floor(
        (Date.now() - new Date(birthDate).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground">Configuración de tu cuenta</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserIcon className="h-8 w-8" />
          </div>
          <div>
            <p className="text-lg font-semibold">{profile.name}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <span className="mt-1 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {profile.role === "athlete"
                ? "🏋️ Atleta"
                : profile.role === "coach"
                  ? "📋 Coach"
                  : "⚙️ Admin"}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Correo</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="mt-1 block w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm text-muted-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Sexo</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Sin especificar</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">
                Fecha de nacimiento
                {age != null && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({age} años)
                  </span>
                )}
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Estatura (cm)</label>
              <input
                type="number"
                placeholder="175"
                min="50"
                max="250"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Peso (kg)</label>
              <input
                type="number"
                placeholder="70"
                min="20"
                max="300"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* IMC */}
          {heightCm && weightKg && (
            (() => {
              const h = Number(heightCm) / 100;
              const w = Number(weightKg);
              if (h > 0 && w > 0) {
                const bmi = w / (h * h);
                const label =
                  bmi < 18.5
                    ? "Bajo peso"
                    : bmi < 25
                      ? "Normal"
                      : bmi < 30
                        ? "Sobrepeso"
                        : "Obesidad";
                const color =
                  bmi < 18.5
                    ? "text-yellow-600"
                    : bmi < 25
                      ? "text-green-600"
                      : bmi < 30
                        ? "text-orange-500"
                        : "text-red-500";
                return (
                  <div className="rounded-md border border-border bg-secondary/50 px-4 py-3">
                    <p className="text-sm font-medium">
                      Índice de Masa Corporal (IMC)
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      {bmi.toFixed(1)}{" "}
                      <span className={`text-sm font-medium ${color}`}>
                        — {label}
                      </span>
                    </p>
                  </div>
                );
              }
              return null;
            })()
          )}

          <div>
            <label className="text-sm font-medium">Unidades</label>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="metric">Métrico (kg, m)</option>
              <option value="imperial">Imperial (lb, ft)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Miembro desde</label>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(profile.created_at).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saved ? (
            <>✅ Guardado</>
          ) : saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}
