import type { MotionPreference } from "./useMotionPreference";

export function MotionBackdrop({ preference }: { preference: MotionPreference }) {
  return (
    <div className={`hub-backdrop hub-backdrop--${preference}`} aria-hidden="true">
      <span className="hub-backdrop__orb hub-backdrop__orb--one" />
      <span className="hub-backdrop__orb hub-backdrop__orb--two" />
      <span className="hub-backdrop__grain" />
    </div>
  );
}
