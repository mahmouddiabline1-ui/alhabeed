export class GameError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "GameError";
  }
}

export function assertGame(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new GameError(code, message);
}
