import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { AlHabeedLocal } from "./AlHabeedLocal";

describe("AlHabeed local route", () => {
  beforeEach(() => localStorage.clear());

  it("resumes a valid saved game on the official local route", () => {
    localStorage.setItem("alhabeed:local-game:v2", JSON.stringify({
      phase: "answer",
      round: 0,
      questions: [{
        mode: "habbedha",
        category: "egypt",
        prompt: "سؤال محفوظ",
        correct: "الإجابة",
        decoys: ["خيار", "خيار آخر"],
        explanation: "شرح",
      }],
      modes: ["habbedha"],
      cats: ["egypt"],
      roundCount: 1,
      answer: "",
      options: [],
      scores: { you: 0, felfel: 0, soso: 0 },
    }));

    render(
      <MemoryRouter initialEntries={["/games/alhabeed/local"]}>
        <AlHabeedLocal onExit={() => undefined} />
      </MemoryRouter>,
    );

    expect(screen.getByText("سؤال محفوظ")).toBeInTheDocument();
    expect(document.querySelector("[data-phase]")).toHaveAttribute("data-phase", "answer");
  });
});
