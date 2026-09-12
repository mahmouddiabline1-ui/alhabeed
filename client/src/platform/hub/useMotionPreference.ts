import { useEffect, useState } from "react";

export type MotionPreference = "full" | "reduced" | "low-power";

function readPreference(): MotionPreference {
  if (typeof window === "undefined") return "full";
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return "reduced";
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if ((navigator.hardwareConcurrency || 8) <= 4 || connection?.saveData) return "low-power";
  return "full";
}

export function useMotionPreference(): MotionPreference {
  const [preference, setPreference] = useState<MotionPreference>(readPreference);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => setPreference(readPreference());
    media?.addEventListener?.("change", update);
    window.addEventListener("resize", update, { passive: true });
    return () => {
      media?.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return preference;
}
