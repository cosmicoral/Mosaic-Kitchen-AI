import { Check } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";

type AuthMascotPanelProps = {
  src: string;
  title: string;
  subtitle: string;
  bullets?: string[];
};

export function AuthMascotPanel({
  src,
  title,
  subtitle,
  bullets = ["Save money", "Eat healthier", "Reduce food waste"],
}: AuthMascotPanelProps) {
  // The default bullets are English strings baked into this file, so they never
  // passed through a caller's t() and rendered raw next to translated copy.
  // Translating here covers the defaults and any English key a caller passes,
  // and t() returns its input unchanged when there is no entry.
  const { t } = useLocale();

  return (
    <aside className="auth-mascot-panel">
      <img className="auth-mascot-image" src={src} alt="" />
      <div className="auth-mascot-copy">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <ul className="auth-benefit-list">
          {bullets.map((bullet) => (
            <li key={bullet}>
              <Check size={17} />
              <span>{t(bullet)}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
