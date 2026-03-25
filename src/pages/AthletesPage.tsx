import { formatDate, formatDuration } from "@/lib/utils";
import { api } from "@/services/api";
import type { AthleteProfile, AthletePublic, FriendshipResponse } from "@/types/api";
import {
    Check,
    ChevronDown,
    ChevronUp,
    Clock,
    Dumbbell,
    Loader2,
    Search,
    Shield,
    Trophy,
    UserCheck,
    UserMinus,
    UserPlus,
    UserX,
    X,
    Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ── helpers ── */

const DIVISION_LABELS: Record<string, string> = {
    bronce: "Bronce", plata: "Plata", oro: "Oro",
    platino: "Platino", diamante: "Diamante", elite: "Élite",
};

const RECORD_LABELS: Record<string, string> = {
    max_weight: "Peso máx.", max_reps: "Reps máx.",
    best_time: "Mejor tiempo", max_distance: "Dist. máx.",
};

const RECORD_UNITS: Record<string, string> = {
    max_weight: "kg", max_reps: "reps", best_time: "s", max_distance: "m",
};

/* ── sub-components ── */

function AthleteAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
    const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    const cls = size === "sm" ? "h-8 w-8 text-xs" : "h-11 w-11 text-sm";
    return (
        <div className={`${cls} flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold shrink-0`}>
            {initials}
        </div>
    );
}

function DivisionBadge({ division }: { division: string | null }) {
    if (!division) return null;
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
            <Shield className="h-3 w-3" />
            {DIVISION_LABELS[division] ?? division}
        </span>
    );
}

interface FriendButtonProps {
    athlete: AthletePublic;
    onSend: (id: number) => Promise<void>;
    onCancel: (friendshipId: number) => Promise<void>;
    onAccept: (friendshipId: number) => Promise<void>;
    onUnfriend: (id: number) => Promise<void>;
    loading: boolean;
}

function FriendButton({ athlete, onSend, onCancel, onAccept, onUnfriend, loading }: FriendButtonProps) {
    const { friendship_status, friendship_id, id } = athlete;

    if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

    if (!friendship_status) {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); onSend(id); }}
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
                <UserPlus className="h-3.5 w-3.5" /> Añadir
            </button>
        );
    }
    if (friendship_status === "pending_sent") {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); onCancel(friendship_id!); }}
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
                <X className="h-3.5 w-3.5" /> Cancelar
            </button>
        );
    }
    if (friendship_status === "pending_received") {
        return (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={() => onAccept(friendship_id!)}
                    className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition-colors"
                >
                    <Check className="h-3.5 w-3.5" /> Aceptar
                </button>
                <button
                    onClick={() => onCancel(friendship_id!)}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        );
    }
    // accepted — unfriend button (shown in friends tab, not here)
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onUnfriend(id); }}
            className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-red-50 hover:text-red-600 transition-colors group"
        >
            <UserCheck className="h-3.5 w-3.5 group-hover:hidden" />
            <UserMinus className="h-3.5 w-3.5 hidden group-hover:block" />
            <span className="group-hover:hidden">Amigos</span>
            <span className="hidden group-hover:inline">Eliminar</span>
        </button>
    );
}

/* ── expandable friend profile (inline) ── */

function FriendProfileDetail({ profile, loading }: { profile: AthleteProfile | null; loading: boolean }) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }
    if (!profile) return null;

    return (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                    <p className="text-xl font-bold">{profile.total_sessions}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sesiones totales</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                    <p className="text-xl font-bold">{profile.sessions_30d}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Últimos 30 días</p>
                </div>
            </div>

            {/* Records */}
            {profile.records.length > 0 && (
                <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        <Trophy className="h-3.5 w-3.5 text-yellow-500" /> Records
                    </h4>
                    <div className="space-y-1.5">
                        {profile.records.map((r) => (
                            <div key={r.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                                <div>
                                    <p className="text-sm font-medium">{r.exercise_name}</p>
                                    <p className="text-xs text-muted-foreground">{RECORD_LABELS[r.record_type] ?? r.record_type}</p>
                                </div>
                                <span className="text-sm font-bold text-yellow-600">
                                    {r.value}{RECORD_UNITS[r.record_type] ?? ""}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent sessions */}
            {profile.recent_sessions.length > 0 && (
                <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        <Dumbbell className="h-3.5 w-3.5 text-primary" /> Últimas sesiones
                    </h4>
                    <div className="space-y-1.5">
                        {profile.recent_sessions.map((s) => (
                            <div key={s.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                                <div>
                                    <p className="text-sm font-medium">{formatDate(s.started_at)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {s.exercise_count} ejercicios · {s.set_count} series
                                    </p>
                                </div>
                                {s.total_duration_sec && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {formatDuration(s.total_duration_sec)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {profile.records.length === 0 && profile.recent_sessions.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                    Este atleta aún no tiene datos registrados.
                </p>
            )}
        </div>
    );
}

/* ── main page ── */

type Tab = "directory" | "friends" | "requests";

export default function AthletesPage() {
    const [tab, setTab] = useState<Tab>("directory");
    const [athletes, setAthletes] = useState<AthletePublic[]>([]);
    const [friends, setFriends] = useState<FriendshipResponse[]>([]);
    const [requests, setRequests] = useState<FriendshipResponse[]>([]);
    const [search, setSearch] = useState("");
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    // Expandable cards state
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [profileCache, setProfileCache] = useState<Record<number, AthleteProfile>>({});
    const [loadingProfileId, setLoadingProfileId] = useState<number | null>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadFriends = useCallback(async () => {
        const [f, r] = await Promise.all([
            api.get<FriendshipResponse[]>("/api/friends"),
            api.get<FriendshipResponse[]>("/api/friends/requests"),
        ]);
        setFriends(f);
        setRequests(r);
    }, []);

    const searchAthletes = useCallback(async (q: string) => {
        setLoadingSearch(true);
        try {
            const params = q.trim() ? `?search=${encodeURIComponent(q.trim())}` : "";
            const data = await api.get<AthletePublic[]>(`/api/athletes${params}`);
            setAthletes(data);
        } finally {
            setLoadingSearch(false);
        }
    }, []);

    useEffect(() => {
        loadFriends();
        searchAthletes("");
    }, [loadFriends, searchAthletes]);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => searchAthletes(value), 350);
    };

    const handleSendRequest = async (userId: number) => {
        setActionLoading(userId);
        try {
            await api.post(`/api/friends/request/${userId}`);
            await searchAthletes(search);
        } catch { /* empty */ }
        finally { setActionLoading(null); }
    };

    const handleCancel = async (friendshipId: number) => {
        setActionLoading(friendshipId);
        try {
            await api.delete(`/api/friends/requests/${friendshipId}`);
            await Promise.all([loadFriends(), searchAthletes(search)]);
        } catch { /* empty */ }
        finally { setActionLoading(null); }
    };

    const handleAccept = async (friendshipId: number) => {
        setActionLoading(friendshipId);
        try {
            await api.post(`/api/friends/requests/${friendshipId}/accept`);
            await Promise.all([loadFriends(), searchAthletes(search)]);
        } catch { /* empty */ }
        finally { setActionLoading(null); }
    };

    const handleUnfriend = async (userId: number) => {
        setActionLoading(userId);
        try {
            await api.delete(`/api/friends/${userId}`);
            if (expandedId === userId) setExpandedId(null);
            await Promise.all([loadFriends(), searchAthletes(search)]);
        } finally { setActionLoading(null); }
    };

    const handleToggleExpand = async (userId: number) => {
        if (expandedId === userId) {
            setExpandedId(null);
            return;
        }
        setExpandedId(userId);
        if (profileCache[userId]) return;
        setLoadingProfileId(userId);
        try {
            const profile = await api.get<AthleteProfile>(`/api/athletes/${userId}`);
            setProfileCache((prev) => ({ ...prev, [userId]: profile }));
        } finally {
            setLoadingProfileId(null);
        }
    };

    const tabs: { id: Tab; label: string; count?: number }[] = [
        { id: "directory", label: "Directorio" },
        { id: "friends", label: "Amigos", count: friends.length },
        { id: "requests", label: "Solicitudes", count: requests.length },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Directorio de Atletas</h1>
                <p className="text-muted-foreground text-sm">Conecta con otros atletas y compara vuestros entrenamientos</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-secondary p-1 w-fit">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            tab === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {t.label}
                        {t.count !== undefined && t.count > 0 && (
                            <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                                tab === t.id ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"
                            }`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Directory tab ── */}
            {tab === "directory" && (
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar atletas por nombre..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        {loadingSearch && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                    </div>

                    <div className="space-y-2">
                        {athletes.length === 0 && !loadingSearch && (
                            <p className="py-10 text-center text-sm text-muted-foreground">
                                {search ? "No se encontraron atletas" : "No hay otros atletas registrados aún"}
                            </p>
                        )}
                        {athletes.map((athlete) => (
                            <div key={athlete.id} className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3">
                                <AthleteAvatar name={athlete.name} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold truncate">{athlete.name}</p>
                                        <DivisionBadge division={athlete.current_division} />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Nv. {athlete.level} · {athlete.total_xp.toLocaleString()} XP
                                    </p>
                                </div>
                                <FriendButton
                                    athlete={athlete}
                                    onSend={handleSendRequest}
                                    onCancel={handleCancel}
                                    onAccept={handleAccept}
                                    onUnfriend={handleUnfriend}
                                    loading={actionLoading === athlete.id || (athlete.friendship_id !== null && actionLoading === athlete.friendship_id)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Friends tab ── */}
            {tab === "friends" && (
                <div className="space-y-2">
                    {friends.length === 0 && (
                        <div className="py-16 text-center">
                            <UserCheck className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">Aún no tienes amigos.<br />Busca atletas en el Directorio.</p>
                        </div>
                    )}
                    {friends.map((f) => {
                        const uid = f.other_user.id;
                        const isExpanded = expandedId === uid;
                        const isLoadingThis = loadingProfileId === uid;
                        return (
                            <div key={f.id} className="rounded-xl bg-card border border-border overflow-hidden">
                                {/* Card header — clickable to expand */}
                                <button
                                    onClick={() => handleToggleExpand(uid)}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
                                >
                                    <AthleteAvatar name={f.other_user.name} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold truncate">{f.other_user.name}</p>
                                            <DivisionBadge division={f.other_user.current_division} />
                                        </div>
                                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                            <Zap className="h-3 w-3 text-yellow-500" />
                                            Nv. {f.other_user.level} · {f.other_user.total_xp.toLocaleString()} XP
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUnfriend(uid); }}
                                            disabled={actionLoading === uid}
                                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                            title="Eliminar amigo"
                                        >
                                            {actionLoading === uid
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <UserX className="h-3.5 w-3.5" />
                                            }
                                        </button>
                                        {isExpanded
                                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        }
                                    </div>
                                </button>

                                {/* Expanded profile */}
                                {isExpanded && (
                                    <div className="px-4 pb-4">
                                        <FriendProfileDetail
                                            profile={profileCache[uid] ?? null}
                                            loading={isLoadingThis}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Requests tab ── */}
            {tab === "requests" && (
                <div className="space-y-2">
                    {requests.length === 0 && (
                        <div className="py-16 text-center">
                            <UserPlus className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">No tienes solicitudes pendientes.</p>
                        </div>
                    )}
                    {requests.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3">
                            <AthleteAvatar name={r.other_user.name} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold truncate">{r.other_user.name}</p>
                                    <DivisionBadge division={r.other_user.current_division} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Nv. {r.other_user.level} · quiere ser tu amigo
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleAccept(r.id)}
                                    disabled={actionLoading === r.id}
                                    className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
                                >
                                    {actionLoading === r.id
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Check className="h-3.5 w-3.5" />
                                    }
                                    Aceptar
                                </button>
                                <button
                                    onClick={() => handleCancel(r.id)}
                                    disabled={actionLoading === r.id}
                                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
