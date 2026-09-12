import { AlHabeedOnline } from "./games/alhabeed/AlHabeedOnline";
import type { ReactNode } from "react";
import { AppShell } from "./platform/AppShell";
import { AppRoutes } from "./platform/routes";
import { PortalPage } from "./PortalPage";
import { HubPage } from "./platform/hub";

/** Platform composition entry point; game state remains owned by the feature. */
export function App() {
  return <AlHabeedOnline>{(controller) => {
    const shell = (children: ReactNode) => (
      <AppShell profilePanel={controller.profilePanel} onProfile={controller.onProfile}>
        {children}
      </AppShell>
    );
    return <AppRoutes elements={{
      hub: shell(<HubPage />),
      localAlHabeed: shell(controller.local),
      createAlHabeed: shell(controller.create),
      joinAlHabeed: shell(controller.join),
      roomAlHabeed: (code) => {
        const view = controller.room(code);
        return view.active ? view.node : shell(view.node);
      },
      news: shell(<PortalPage kind="news" />),
      notifications: shell(<PortalPage kind="notifications" />),
    }} />;
  }}</AlHabeedOnline>;
}
