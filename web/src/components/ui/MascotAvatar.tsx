import { genericAvatar } from "../../assets/mascots";

type MascotAvatarProps = {
  size?: "sm" | "md" | "lg";
  alt?: string;
  src?: string;
};

export function MascotAvatar({
  size = "md",
  alt = "Mosaic Kitchen mascot",
  src = genericAvatar,
}: MascotAvatarProps) {
  return (
    <span className={`mascot-avatar mascot-avatar--${size}`}>
      <img src={src} alt={alt} />
    </span>
  );
}
