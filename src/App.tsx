import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/useAuth";
import AthletePlansPage from "@/pages/AthletePlansPage";
import AthletesPage from "@/pages/AthletesPage";
import ChallengesPage from "@/pages/ChallengesPage";
import ClassLiveAthletePage from "@/pages/ClassLiveAthletePage";
import CoachPage from "@/pages/CoachPage";
import CompetitionDetailPage from "@/pages/CompetitionDetailPage";
import CompetitionsPage from "@/pages/CompetitionsPage";
import DashboardPage from "@/pages/DashboardPage";
import DivisionsPage from "@/pages/DivisionsPage";
import GymClassLivePage from "@/pages/GymClassLivePage";
import GymDashboardPage from "@/pages/GymDashboardPage";
import GymDirectoryPage from "@/pages/GymDirectoryPage";
import LoginPage from "@/pages/LoginPage";
import PlansPage from "@/pages/PlansPage";
import ProfilePage from "@/pages/ProfilePage";
import RegisterPage from "@/pages/RegisterPage";
import SessionDetailPage from "@/pages/SessionDetailPage";
import ShopPage from "@/pages/ShopPage";
import TemplatesPage from "@/pages/TemplatesPage";
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
              {/* Athlete routes */}
              <Route path="/" element={<DashboardPage />} />
              <Route path="/workouts" element={<TemplatesPage />} />
              <Route path="/coach/workouts" element={<TemplatesPage />} />
              <Route path="/coach/plans" element={<PlansPage />} />
              <Route path="/coach/athletes" element={<CoachPage tab="athletes" />} />
              <Route path="/coach/inbox" element={<CoachPage tab="inbox" />} />
              <Route path="/coach/stats" element={<CoachPage tab="stats" />} />
              <Route path="/challenges" element={<ChallengesPage />} />
              <Route path="/competitions" element={<CompetitionsPage />} />
              <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
              <Route path="/divisions" element={<DivisionsPage />} />
              <Route path="/athletes" element={<AthletesPage />} />
              <Route path="/plans" element={<AthletePlansPage />} />
              <Route path="/gyms" element={<GymDirectoryPage />} />
              <Route path="/sessions/:id" element={<SessionDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/shop" element={<ShopPage />} />
              {/* Live class – athlete view */}
              <Route path="/class/:schedId" element={<ClassLiveAthletePage />} />
              {/* Gym owner routes */}
              <Route path="/gym/dashboard" element={<GymDashboardPage />} />
              <Route path="/gym/schedule" element={<GymDashboardPage />} />
              <Route path="/gym/members" element={<GymDashboardPage />} />
              <Route path="/gym/analytics" element={<GymDashboardPage />} />
              <Route path="/gym/workouts" element={<TemplatesPage />} />
              <Route path="/gym/marketplace" element={<GymDashboardPage />} />
              {/* Live class – owner control */}
              <Route path="/gym/live/:schedId" element={<GymClassLivePage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
