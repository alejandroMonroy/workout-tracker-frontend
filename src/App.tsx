import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/useAuth";
import CoachPage from "@/pages/CoachPage";
import DashboardPage from "@/pages/DashboardPage";
import ExercisesPage from "@/pages/ExercisesPage";
import LoginPage from "@/pages/LoginPage";
import PlansPage from "@/pages/PlansPage";
import ProfilePage from "@/pages/ProfilePage";
import RegisterPage from "@/pages/RegisterPage";
import SessionDetailPage from "@/pages/SessionDetailPage";
import SessionsPage from "@/pages/SessionsPage";
import TimerPage from "@/pages/TimerPage";
import XPPage from "@/pages/XPPage";
import { BrowserRouter, Route, Routes } from "react-router-dom";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/exercises" element={<ExercisesPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/sessions/:id" element={<SessionDetailPage />} />
              <Route path="/xp" element={<XPPage />} />
              <Route path="/timer" element={<TimerPage />} />
              <Route path="/coach" element={<CoachPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
