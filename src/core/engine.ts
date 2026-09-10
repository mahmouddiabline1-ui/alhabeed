import { randomBytes, randomUUID } from "node:crypto";
import { DEFAULT_SETTINGS, LIMITS } from "./config.js";
import { assertGame } from "./errors.js";
import { QuestionBank } from "./questions.js";
import type {
  AnswerOption,
  ModeId,
  Player,
  PlayerId,
  PublicRoomState,
  RoomSettings,
  RoomState
} from "./types.js";

type Clock = () => number;

export class GameEngine {
  private readonly rooms = new Map<string, RoomState>();

  constructor(
    private readonly bank: QuestionBank,
    private readonly now: Clock = Date.now,
    private readonly random: () => number = Math.random
  ) {}

  createRoom(host: Pick<Player, "id" | "name">, requested: Partial<RoomSettings> = {}): RoomState {
    const code = this.createCode();
    const settings = this.validateSettings({ ...DEFAULT_SETTINGS, ...requested });
    const room: RoomState = {
      code,
      hostId: host.id,
      phase: "lobby",
      settings,
      players: { [host.id]: this.player(host) },
      round: null,
      usedQuestionIds: [],
      createdAt: this.now(),
      version: 1
    };
    this.rooms.set(code, room);
    return structuredClone(room);
  }

  joinRoom(code: string, joining: Pick<Player, "id" | "name">): RoomState {
    const room = this.room(code);
    assertGame(room.phase === "lobby", "GAME_STARTED", "The match has already started");
    assertGame(Object.keys(room.players).length < LIMITS.players.max, "ROOM_FULL", "Room is full");
    assertGame(!room.players[joining.id], "ALREADY_JOINED", "Player already joined");
    room.players[joining.id] = this.player(joining);
    return this.changed(room);
  }

  reconnect(code: string, playerId: PlayerId): RoomState {
    return this.setConnected(code, playerId, true);
  }

  getRoom(code: string): RoomState {
    return structuredClone(this.room(code));
  }

  listRooms(): RoomState[] {
    return [...this.rooms.values()].map((room) => structuredClone(room));
  }

  restore(rooms: RoomState[]): void {
    this.rooms.clear();
    for (const room of rooms) this.rooms.set(room.code, structuredClone(room));
  }

  updateSettings(code: string, hostId: PlayerId, patch: Partial<RoomSettings>): RoomState {
    const room = this.room(code);
    assertGame(room.hostId === hostId, "HOST_ONLY", "Only the host can change settings");
    assertGame(room.phase === "lobby", "GAME_STARTED", "Settings are locked after starting");
    room.settings = this.validateSettings({ ...room.settings, ...patch });
    return this.changed(room);
  }

  start(code: string, hostId: PlayerId): RoomState {
    const room = this.room(code);
    assertGame(room.hostId === hostId, "HOST_ONLY", "Only the host can start");
    assertGame(room.phase === "lobby", "INVALID_PHASE", "Match already started");
    assertGame(Object.keys(room.players).length >= LIMITS.players.min, "NOT_ENOUGH_PLAYERS", "At least 3 players are required");
    this.beginRound(room, 1);
    return this.changed(room);
  }

  submitAnswer(code: string, playerId: PlayerId, text: string): RoomState {
    const room = this.room(code);
    const round = this.activeRound(room, "answering");
    this.activePlayer(room, playerId);
    const clean = text.trim().replace(/\s+/g, " ");
    assertGame(clean.length >= LIMITS.answerLength.min && clean.length <= LIMITS.answerLength.max, "INVALID_ANSWER", "Answer length is invalid");
    assertGame(round.mode !== "true_or_bluff", "MODE_USES_VOTING", "This mode does not accept written answers");
    assertGame(!round.submissions[playerId], "ALREADY_ANSWERED", "Answer already submitted");
    round.submissions[playerId] = clean;
    if (Object.keys(round.submissions).length === this.connectedPlayers(room).length) this.openVoting(room);
    return this.changed(room);
  }

  vote(code: string, playerId: PlayerId, optionId: string): RoomState {
    const room = this.room(code);
    const round = this.activeRound(room, "voting");
    this.activePlayer(room, playerId);
    const option = round.options.find((item) => item.id === optionId);
    assertGame(option, "OPTION_NOT_FOUND", "Vote option not found");
    assertGame(!round.votes[playerId], "ALREADY_VOTED", "Vote already submitted");
    // Voting for your own answer is deliberately allowed. It simply cannot earn a self-deception point.
    round.votes[playerId] = option.id;
    option.votes.push(playerId);
    if (Object.keys(round.votes).length === this.connectedPlayers(room).length) this.reveal(room);
    return this.changed(room);
  }

  advanceExpired(code: string): RoomState {
    const room = this.room(code);
    const round = room.round;
    if (!round || this.now() < round.phaseEndsAt) return structuredClone(room);
    if (round.phase === "answering") this.openVoting(room);
    else if (round.phase === "voting") this.reveal(room);
    else if (round.phase === "reveal") this.nextRoundOrFinish(room);
    return this.changed(room);
  }

  setConnected(code: string, playerId: PlayerId, connected: boolean): RoomState {
    const room = this.room(code);
    const player = room.players[playerId];
    assertGame(player, "PLAYER_NOT_FOUND", "Player not found");
    player.connected = connected;
    if (connected) delete player.disconnectedAt;
    else player.disconnectedAt = this.now();
    if (!connected && room.hostId === playerId) {
      const successor = Object.values(room.players)
        .filter((p) => p.connected && p.id !== playerId)
        .sort((a, b) => a.joinedAt - b.joinedAt)[0];
      if (successor) room.hostId = successor.id;
    }
    return this.changed(room);
  }

  publicState(code: string, viewerId: PlayerId): PublicRoomState {
    const room = this.room(code);
    const round = room.round;
    if (!round) return structuredClone(room) as PublicRoomState;
    const revealed = round.phase === "reveal";
    const {
      submissions: _submissions,
      votes: _votes,
      options: _options,
      correctAnswer,
      explanation,
      ...publicRound
    } = structuredClone(round);
    return {
      ...structuredClone(room),
      round: {
        ...publicRound,
        hasSubmitted: Boolean(round.submissions[viewerId]),
        hasVoted: Boolean(round.votes[viewerId]),
        ...(revealed ? { correctAnswer, explanation } : {}),
        options: round.options.map((option) => ({
          id: option.id,
          text: option.text,
          votes: revealed ? [...option.votes] : [],
          ...(revealed ? { authorId: option.authorId ?? undefined, isCorrect: option.isCorrect } : {})
        }))
      }
    };
  }


  removeDisconnected(code: string, graceMs: number): RoomState {
    const room = this.room(code);
    const cutoff = this.now() - graceMs;
    for (const player of Object.values(room.players)) {
      if (!player.connected && player.disconnectedAt !== undefined && player.disconnectedAt <= cutoff) {
        delete room.players[player.id];
      }
    }
    assertGame(Object.keys(room.players).length > 0, "EMPTY_ROOM", "Room has no players");
    if (!room.players[room.hostId]) {
      const successor = Object.values(room.players).sort((a, b) => a.joinedAt - b.joinedAt)[0]!;
      room.hostId = successor.id;
    }
    return this.changed(room);
  }

  private beginRound(room: RoomState, number: number): void {
    const mode = room.settings.modes[(number - 1) % room.settings.modes.length]!;
    const question = this.bank.pick(mode, room.settings.packageIds, new Set(room.usedQuestionIds), this.random);
    room.usedQuestionIds.push(question.id);
    room.phase = "answering";
    room.round = {
      number,
      mode,
      questionId: question.id,
      prompt: question.prompt,
      phase: "answering",
      phaseEndsAt: this.now() + room.settings.answerSeconds * 1000,
      submissions: {},
      options: mode === "true_or_bluff" ? this.trueFalseOptions(question.correctAnswer) : [],
      votes: {},
      scoreDelta: {}
    };
    if (mode === "true_or_bluff") {
      room.round.phase = "voting";
      room.phase = "voting";
      room.round.phaseEndsAt = this.now() + room.settings.voteSeconds * 1000;
    }
  }

  private openVoting(room: RoomState): void {
    const round = room.round!;
    const question = this.bank.get(round.questionId);
    if (round.mode !== "true_or_bluff") {
      const submitted = Object.entries(round.submissions).map(([authorId, text]) => ({
        id: randomUUID(), text, authorId, isCorrect: false, votes: []
      }));
      const correct: AnswerOption = { id: randomUUID(), text: question.correctAnswer, authorId: null, isCorrect: true, votes: [] };
      round.options = this.shuffle([...submitted, correct]);
    }
    round.phase = "voting";
    room.phase = "voting";
    round.phaseEndsAt = this.now() + room.settings.voteSeconds * 1000;
  }

  private reveal(room: RoomState): void {
    const round = room.round!;
    const question = this.bank.get(round.questionId);
    const delta: Record<PlayerId, number> = {};
    for (const player of Object.values(room.players)) delta[player.id] = 0;
    for (const [voterId, optionId] of Object.entries(round.votes)) {
      const option = round.options.find((item) => item.id === optionId)!;
      if (option.isCorrect) delta[voterId] += 2;
      else if (option.authorId && option.authorId !== voterId) delta[option.authorId] += 1;
    }
    for (const [playerId, points] of Object.entries(delta)) room.players[playerId]!.score += points;
    round.scoreDelta = delta;
    round.correctAnswer = question.correctAnswer;
    round.explanation = question.explanation;
    round.phase = "reveal";
    room.phase = "reveal";
    round.phaseEndsAt = this.now() + room.settings.revealSeconds * 1000;
  }

  private nextRoundOrFinish(room: RoomState): void {
    const current = room.round!.number;
    if (current >= room.settings.totalRounds) {
      room.phase = "finished";
      room.round = null;
      return;
    }
    this.beginRound(room, current + 1);
  }

  private trueFalseOptions(correctAnswer: string): AnswerOption[] {
    const normalized = correctAnswer.trim().toLowerCase();
    assertGame(["true", "false", "صح", "هبد"].includes(normalized), "INVALID_TRUE_FALSE", "Correct answer must be true/false or صح/هبد");
    const correctIsTrue = normalized === "true" || normalized === "صح";
    return [
      { id: randomUUID(), text: "صح", authorId: null, isCorrect: correctIsTrue, votes: [] },
      { id: randomUUID(), text: "هبد", authorId: null, isCorrect: !correctIsTrue, votes: [] }
    ];
  }

  private validateSettings(settings: RoomSettings): RoomSettings {
    const validModes: ModeId[] = ["habbedha", "true_or_bluff", "complete_bluff"];
    assertGame(settings.modes.every((mode) => validModes.includes(mode)), "INVALID_MODE", "Unknown game mode");
    assertGame(settings.modes.length > 0, "NO_MODES", "Select at least one mode");
    const packageIds = settings.packageIds.map((packageId) => packageId.trim());
    assertGame(
      packageIds.length >= LIMITS.packages.min &&
      packageIds.length <= LIMITS.packages.max &&
      packageIds.every((packageId) => packageId.length > 0) &&
      new Set(packageIds).size === packageIds.length,
      "INVALID_PACKAGES",
      `Select ${LIMITS.packages.min}-${LIMITS.packages.max} unique package IDs`
    );
    this.inRange(settings.totalRounds, LIMITS.rounds, "INVALID_ROUNDS");
    this.inRange(settings.answerSeconds, LIMITS.answerSeconds, "INVALID_ANSWER_TIME");
    this.inRange(settings.voteSeconds, LIMITS.voteSeconds, "INVALID_VOTE_TIME");
    this.inRange(settings.revealSeconds, LIMITS.revealSeconds, "INVALID_REVEAL_TIME");
    return structuredClone({ ...settings, packageIds });
  }

  private inRange(value: number, range: { min: number; max: number }, code: string): void {
    assertGame(Number.isInteger(value) && value >= range.min && value <= range.max, code, `${value} is outside allowed range`);
  }

  private activeRound(room: RoomState, phase: "answering" | "voting") {
    assertGame(room.round && room.round.phase === phase, "INVALID_PHASE", `Round is not in ${phase}`);
    return room.round;
  }

  private activePlayer(room: RoomState, id: PlayerId): Player {
    const player = room.players[id];
    assertGame(player && player.connected, "PLAYER_NOT_ACTIVE", "Player is not active");
    return player;
  }

  private connectedPlayers(room: RoomState): Player[] {
    return Object.values(room.players).filter((p) => p.connected);
  }

  private player(input: Pick<Player, "id" | "name">): Player {
    const name = input.name.trim();
    assertGame(name.length >= 2 && name.length <= 24, "INVALID_NAME", "Name must be 2-24 characters");
    return { ...input, name, connected: true, score: 0, joinedAt: this.now() };
  }

  private room(code: string): RoomState {
    const room = this.rooms.get(code.toUpperCase());
    assertGame(room, "ROOM_NOT_FOUND", "Room not found");
    return room;
  }

  private changed(room: RoomState): RoomState {
    room.version += 1;
    return structuredClone(room);
  }

  private createCode(): string {
    let code = "";
    do code = randomBytes(3).toString("hex").toUpperCase(); while (this.rooms.has(code));
    return code;
  }

  private shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [items[i], items[j]] = [items[j]!, items[i]!];
    }
    return items;
  }
}
