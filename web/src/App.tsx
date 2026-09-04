import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AIVisionPage } from "./pages/AIVisionPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExpiryAlertPage } from "./pages/ExpiryAlertPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { MealPlanPage } from "./pages/MealPlanPage";
import { OnboardingEatingHabitsPage } from "./pages/OnboardingEatingHabitsPage";
import { OnboardingGoalsPage } from "./pages/OnboardingGoalsPage";
import { OnboardingUserInfoPage } from "./pages/OnboardingUserInfoPage";
import { PantryPage } from "./pages/PantryPage";
import { PricingPage } from "./pages/PricingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ShoppingListPage } from "./pages/ShoppingListPage";
import { SignupPage } from "./pages/SignupPage";
import { SubscriptionPage } from "./pages/SubscriptionPage";
import { ToastProvider } from "./components/ui/Toast";
import { AuthProvider } from "./context/AuthContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { RequireAuth } from "./components/RequireAuth";
import { LocaleProvider } from "./context/LocaleContext";
import { LanguageSwitcher } from "./components/LanguageSwitcher";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <LocaleProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
          <LanguageSwitcher />
          <ScrollToTop />
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/pricing" element={<PricingPage />} />

            {/* Onboarding: a pathless layout route, so all three screens share
                one OnboardingProvider and the draft survives navigation. */}
            <Route
              element={
                <RequireAuth>
                  <OnboardingProvider>
                    <Outlet />
                  </OnboardingProvider>
                </RequireAuth>
              }
            >
              <Route path="/onboarding/user-info" element={<OnboardingUserInfoPage />} />
              <Route path="/onboarding/eating-habits" element={<OnboardingEatingHabitsPage />} />
              <Route path="/onboarding/goals" element={<OnboardingGoalsPage />} />
            </Route>

            {/* Protected */}
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/meal-plan" element={<RequireAuth><MealPlanPage /></RequireAuth>} />
            <Route path="/shopping-list" element={<RequireAuth><ShoppingListPage /></RequireAuth>} />
            <Route path="/pantry" element={<RequireAuth><PantryPage /></RequireAuth>} />
            <Route path="/expiry-alert" element={<RequireAuth><ExpiryAlertPage /></RequireAuth>} />
            <Route path="/ai-vision" element={<RequireAuth><AIVisionPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            {/* Where Stripe returns the browser after checkout, and where the
                customer portal returns it afterwards. */}
            <Route path="/subscription" element={<RequireAuth><SubscriptionPage /></RequireAuth>} />

            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </LocaleProvider>
  );
}
