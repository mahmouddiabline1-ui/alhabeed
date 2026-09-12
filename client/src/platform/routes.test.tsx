import { render, screen } from "@testing-library/react";
import { HashRouter, MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup } from "@testing-library/react";
import { AppRoutes, type RouteElements } from "./routes";
import { AppShell } from "./AppShell";
import { roomInviteUrl } from "./inviteUrl";

const elements: RouteElements = {
  hub: <div data-testid="route">hub</div>,
  localAlHabeed: <div data-testid="route">local</div>,
  createAlHabeed: <div data-testid="route">create</div>,
  joinAlHabeed: <div data-testid="route">join</div>,
  roomAlHabeed: (code) => <div data-testid="route">room:{code}</div>,
  news: <div data-testid="route">news</div>,
  notifications: <div data-testid="route">notifications</div>,
};

function renderRoutes(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppRoutes elements={elements} />
    </MemoryRouter>,
  );
}

describe("platform routes", () => {
  afterEach(cleanup);
  it.each([
    ["/", "hub"],
    ["/games/alhabeed/local", "local"],
    ["/games/alhabeed/create", "create"],
    ["/games/alhabeed/join", "join"],
    ["/room/A1B2C3", "room:A1B2C3"],
    ["/news", "news"],
    ["/notifications", "notifications"],
  ])("renders %s as %s", (path, expected) => {
    renderRoutes(path);
    expect(screen.getByTestId("route")).toHaveTextContent(expected);
  });

  it("normalizes a valid legacy room query into the room route", () => {
    renderRoutes("/?room=A1B2C3");
    expect(screen.getByTestId("route")).toHaveTextContent("room:A1B2C3");
  });

  it("shows an Arabic error for an invalid legacy room query", () => {
    renderRoutes("/?room=bad");
    expect(screen.getByRole("alert")).toHaveTextContent("كود القعدة غير صالح");
    expect(screen.getByTestId("route")).toHaveTextContent("hub");
  });

  it("normalizes a real pre-hash legacy invite in HashRouter", async () => {
    window.history.replaceState({}, "", "/?room=A1B2C3");
    render(<HashRouter><AppRoutes elements={elements} /></HashRouter>);
    expect(await screen.findByTestId("route")).toHaveTextContent("room:A1B2C3");
    expect(window.location.search).toBe("");
    window.history.replaceState({}, "", "/");
  });

  it("creates a direct hash invite under the configured base path", () => {
    expect(roomInviteUrl("A1B2C3", "https://example.com", "/games/"))
      .toBe("https://example.com/games/#/room/A1B2C3");
  });
});

describe("platform navigation", () => {
  afterEach(cleanup);
  it("uses router links and marks the current page", () => {
    render(
      <MemoryRouter initialEntries={["/news"]}>
        <AppShell>
          <div />
        </AppShell>
      </MemoryRouter>,
    );
    const news = screen.getByRole("link", { name: /الجديد/ });
    expect(news).toHaveAttribute("href", "/news");
    expect(news).toHaveAttribute("aria-current", "page");
  });
});
