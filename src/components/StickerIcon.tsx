import type { StickerKind } from "../utils/stickerUtils";

interface StickerIconProps {
  kind: StickerKind;
  label: string;
  className?: string;
}

function StickerIcon({ kind, label, className = "" }: StickerIconProps) {
  return (
    <span className={`sticker-icon sticker-icon-${kind} ${className}`} role="img" aria-label={label}>
      <i />
    </span>
  );
}

export default StickerIcon;
