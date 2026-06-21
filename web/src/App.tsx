import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AIVisionPage } from "./pages/AIVisionPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DetectionResultsPage } from "./pages/DetectionResultsPage";
import { ExpiryAlertPage } from "./pages/ExpiryAlertPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { MealPlanPage } from "./pages/MealPlanPage";
import { OnboardingEatingHabitsPage } from "./pages/OnboardingEatingHabitsPage";
import { OnboardingGoalsPage } from "./pages/OnboardingGoalsPage";
import { OnboardingUserInfoPage } from "./pages/OnboardingUserInfoPage";
import { PantryPage } from "./pages/PantryPage";
import { PaymentPlaceholderPage } from "./pages/PaymentPlaceholderPage";
import { PricingPage } from "./pages/PricingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ShoppingListPage } from "./pages/ShoppingListPage";
import { SignupPage } from "./pages/SignupPage";
import { ToastProvider } from "./components/ui/Toast";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/payment-placeholder" element={<PaymentPlaceholderPage />} />
          <Route path="/onboarding/user-info" element={<OnboardingUserInfoPage />} />
          <Route path="/onboarding/eating-habits" element={<OnboardingEatingHabitsPage />} />
          <Route path="/onboarding/goals" element={<OnboardingGoalsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/meal-plan" element={<MealPlanPage />} />
          <Route path="/shopping-list" element={<ShoppingListPage />} />
          <Route path="/pantry" element={<PantryPage />} />
          <Route path="/expiry-alert" element={<ExpiryAlertPage />} />
          <Route path="/ai-vision" element={<AIVisionPage />} />
          <Route path="/detection-results" element={<DetectionResultsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
