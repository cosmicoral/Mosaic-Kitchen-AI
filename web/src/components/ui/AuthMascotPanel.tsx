import { Check } from "lucide-react";

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
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
