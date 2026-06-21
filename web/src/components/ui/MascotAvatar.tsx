import mascotAvatar from "../../assets/mascot-avatar.png";

type MascotAvatarProps = {
  size?: "sm" | "md" | "lg";
  alt?: string;
};

export function MascotAvatar({ size = "md", alt = "Mosaic Kitchen mascot" }: MascotAvatarProps) {
  return (
    <span className={`mascot-avatar mascot-avatar--${size}`}>
      <img src={mascotAvatar} alt={alt} />
    </span>
  );
}
