import type { ReactNode } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import { LegacyInviteRedirect } from "./LegacyInviteRedirect";

export interface RouteElements {
  hub: ReactNode;
  localAlHabeed: ReactNode;
  createAlHabeed: ReactNode;
  joinAlHabeed: ReactNode;
  roomAlHabeed: (code: string) => ReactNode;
  news: ReactNode;
  notifications: ReactNode;
}

export function AppRoutes({ elements }: { elements: RouteElements }) {
  return (
    <Routes>
      <Route path="/" element={<LegacyInviteRedirect fallback={elements.hub} />} />
      <Route path="/games/alhabeed/local" element={elements.localAlHabeed} />
      <Route path="/games/alhabeed/create" element={elements.createAlHabeed} />
      <Route path="/games/alhabeed/join" element={elements.joinAlHabeed} />
      <Route path="/room/:code" element={<RoomElement render={elements.roomAlHabeed} />} />
      <Route path="/news" element={elements.news} />
      <Route path="/notifications" element={elements.notifications} />
      <Route path="*" element={elements.hub} />
    </Routes>
  );
}

function RoomElement({ render }: { render: (code: string) => ReactNode }) {
  const { code } = useParams();
  return <>{render(code ?? "")}</>;
}
