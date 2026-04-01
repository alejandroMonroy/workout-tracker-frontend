import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
    BarChart3,
    BookOpen,
    Building2,
    CalendarDays,
    ClipboardList,
    Dumbbell,
    LayoutDashboard,
    LogOut,
    Medal,
    Menu,
    MessageSquare,
    Shield,
    ShoppingBag,
    Swords,
    User,
    Users,
    X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const athleteLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/challenges", label: "Desafíos", icon: Swords },
  { to: "/competitions", label: "Competiciones", icon: Medal },
  { to: "/divisions", label: "Liga", icon: Shield },
  { to: "/athletes", label: "Atletas", icon: Users },
  { to: "/gyms", label: "Gimnasios", icon: Building2 },
  { to: "/plans", label: "Planes", icon: BookOpen },
  { to: "/shop", label: "Tienda", icon: ShoppingBag },
];

const coachLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/coach/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/coach/plans", label: "Planes", icon: ClipboardList },
  { to: "/competitions", label: "Competiciones", icon: Medal },
  { to: "/coach/athletes", label: "Atletas", icon: Users },
  { to: "/coach/inbox", label: "Inbox", icon: MessageSquare },
  { to: "/coach/stats", label: "Estadísticas", icon: BarChart3 },
];

const gymLinks = [
  { to: "/gym/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/gym/schedule", label: "Horarios", icon: CalendarDays },
  { to: "/gym/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/competitions", label: "Competiciones", icon: Medal },
  { to: "/gym/members", label: "Miembros", icon: Users },
  { to: "/gym/analytics", label: "Analítica", icon: BarChart3 },
  { to: "/gym/marketplace", label: "Tienda", icon: ShoppingBag },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isGym = user?.role === "gym";
  const isCoach = user?.role === "coach";
  const links = isGym ? gymLinks : isCoach ? coachLinks : athleteLinks;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white border-r border-border transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <Dumbbell className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold text-foreground">
            WOD Tracker
          </span>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          ))}

        </nav>

        {/* User */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSidebarOpen(false); navigate("/profile"); }}
              className="flex flex-1 items-center gap-3 rounded-md p-1 -m-1 min-w-0 transition-colors hover:bg-secondary/70"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Nv.{user?.level ?? 1} · {(user?.total_xp ?? 0).toLocaleString()} XP
                </p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-white px-4 lg:px-6">
          <button
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
