import type { ReactNode } from "react";
import { BottomNav } from "../BottomNav";

export function AppShell({ children, profilePanel, onProfile }: {
  children: ReactNode;
  profilePanel?: ReactNode;
  onProfile?: () => void;
}) {
  return (
    <div className="app-with-nav">
      {children}
      <BottomNav onProfile={onProfile} />
      {profilePanel}
    </div>
  );
}
