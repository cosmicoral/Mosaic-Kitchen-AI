import { Box, Home, ShoppingCart, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";

const navItems = [
  { label: "Home", to: "/dashboard", icon: Home },
  { label: "Pantry", to: "/pantry", icon: Box },
  { label: "Shopping", to: "/shopping-list", icon: ShoppingCart },
  { label: "Profile", to: "/profile", icon: User },
];

export function BottomNav() {
  const { t } = useLocale();
  return (
    <nav className="bottom-nav" aria-label={t("Primary navigation")}>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            className={({ isActive }) => `bottom-nav__item${isActive ? " active" : ""}`}
            key={item.to}
            to={item.to}
          >
            <span className="bottom-nav__icon">
              <Icon aria-hidden="true" size={18} strokeWidth={2.3} />
            </span>
            <span>{t(item.label)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
