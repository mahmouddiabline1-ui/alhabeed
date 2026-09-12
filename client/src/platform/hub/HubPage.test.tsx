import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HubPage } from "./HubPage";
import { hubCoverUrl } from "./GameCard";
import { MemoryRouter } from "react-router-dom";

const renderHub = () => render(<MemoryRouter><HubPage /></MemoryRouter>);

afterEach(cleanup);

describe("HubPage", () => {
  it("puts AlHabeed first and exposes both play actions", () => {
    renderHub();
    expect(screen.getAllByTestId(/game-card-/)[0]).toHaveAttribute("data-game-id", "alhabeed");
    expect(screen.getByRole("link", { name: /العب أونلاين/u })).toHaveAttribute("href", "/games/alhabeed/create");
    expect(screen.getByRole("link", { name: /العب على نفس الجهاز/u })).toHaveAttribute("href", "/games/alhabeed/local");
  });

  it("does not expose playable links for upcoming games", () => {
    renderHub();
    const race = screen.getAllByTestId("game-card-district-race")[0];
    expect(race).toHaveTextContent("قريبًا");
    expect(within(race).queryByRole("link")).toBeNull();
  });

  it("keeps the router hash while scrolling to the games section", () => {
    const scrollIntoView = Element.prototype.scrollIntoView = vi.fn();
    window.history.replaceState({}, "", "/#/");
    renderHub();
    fireEvent.click(screen.getByRole("button", { name: /شوفوا الألعاب/u }));
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(window.location.hash).toBe("#/");
  });

  it("builds cover paths under a deployment base", () => {
    expect(hubCoverUrl("chess-cover", "/alhabeed/"))
      .toBe("/alhabeed/games/chess-cover.svg");
  });
});
