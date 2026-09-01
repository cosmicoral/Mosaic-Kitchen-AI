import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";

type TopNavProps = {
  title: string;
  backTo?: string;
  rightLabel?: string;
  onRightAction?: () => void;
  showBack?: boolean;
  fallbackBackTo?: string;
};

export function TopNav({
  title,
  backTo,
  rightLabel,
  onRightAction,
  showBack = true,
  fallbackBackTo,
}: TopNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocale();

  const goBack = () => {
    if (backTo) {
      navigate(backTo);
      return;
    }

    if (location.key !== "default") {
      navigate(-1);
      return;
    }

    navigate(fallbackBackTo ?? "/dashboard");
  };

  return (
    <header className="top-nav">
      <div>
        {showBack ? (
          <button className="top-nav__back" onClick={goBack} type="button">
            <ArrowLeft aria-hidden="true" size={17} />
            {t("Back")}
          </button>
        ) : null}
      </div>
      <h1 className="top-nav__title">{t(title)}</h1>
      <div className="top-nav__right">
        {rightLabel ? (
          <button className="top-nav__right" onClick={onRightAction} type="button">
            {t(rightLabel)}
          </button>
        ) : null}
      </div>
    </header>
  );
}
