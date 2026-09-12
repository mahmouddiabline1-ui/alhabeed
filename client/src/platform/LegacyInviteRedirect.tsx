import type { ReactNode } from "react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ROOM_CODE = /^[A-Z0-9]{6}$/u;

export function LegacyInviteRedirect({ fallback }: { fallback: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  // HashRouter only exposes the query after `#`; old invite links stored it
  // before the hash, so keep reading the browser URL during the migration.
  const code = new URLSearchParams(location.search).get("room")
    ?? new URLSearchParams(window.location.search).get("room");

  useEffect(() => {
    if (code && ROOM_CODE.test(code)) {
      if (window.location.search) {
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.hash || "#/"}`);
      }
      navigate(`/room/${code}`, { replace: true });
    }
  }, [code, navigate]);

  if (!code) return <>{fallback}</>;
  if (!ROOM_CODE.test(code)) {
    return (
      <>
        <div role="alert" className="toast static">كود القعدة غير صالح</div>
        {fallback}
      </>
    );
  }

  return null;
}
