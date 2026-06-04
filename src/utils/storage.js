import { getMatchFormat } from "../constants/matchFormats.js";
import { demoMatches } from "../data/demoMatches.js";
import { demoPlayers } from "../data/demoPlayers.js";
import { demoStages } from "../data/demoStages.js";
import { categoryIdFromLegacy } from "../constants/categories.js";

const MATCHES_KEY = "table_tennis_schedule_matches";
const PLAYERS_KEY = "table_tennis_schedule_players";
const STAGES_KEY = "table_tennis_schedule_stages";

function readArray(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function upgradePlayer(player) {
  return {
    ...player,
    categories: (player.categories || ["singles"]).map(categoryIdFromLegacy),
  };
}

function stageForMatch(match, stages = demoStages) {
  if (match.stageId) {
    return stages.find((stage) => stage.id === match.stageId);
  }

  const categoryId = match.categoryId || categoryIdFromLegacy(match.category);
  return stages.find((stage) => stage.eventId === categoryId) || stages[0];
}

export function upgradeStage(stage) {
  const format = getMatchFormat(stage.matchFormat);

  return {
    ...stage,
    eventId: stage.eventId || "singles",
    format: stage.format || "round_robin",
    matchFormat: stage.matchFormat || format.id,
    winnerGames: stage.winnerGames || format.winnerGames,
    defaultMatchMinutes: stage.defaultMatchMinutes || format.defaultMinutes,
    order: Number(stage.order) || 1,
  };
}

function upgradeMatch(match, stages = demoStages) {
  const playerAName = match.playerAName || match.playerA || "";
  const playerBName = match.playerBName || match.playerB || "";
  const playerA = demoPlayers.find((player) => player.name === playerAName);
  const playerB = demoPlayers.find((player) => player.name === playerBName);
  const categoryId = match.categoryId || match.eventId || categoryIdFromLegacy(match.category);
  const stage = stageForMatch({ ...match, categoryId }, stages);
  const matchFormat = getMatchFormat(match.matchFormat || stage?.matchFormat || "best_of_5");
  const defaultMinutes =
    match.defaultMinutes || match.defaultMatchMinutes || stage?.defaultMatchMinutes || matchFormat.defaultMinutes;
  const initialRemaining =
    match.remainingSeconds ??
    (match.status === "Playing" ? defaultMinutes * 60 : null);

  return {
    ...match,
    eventId: match.eventId || categoryId,
    categoryId,
    stageId: match.stageId || stage?.id || "",
    stageFormat: match.stageFormat || stage?.format || "round_robin",
    matchFormat: match.matchFormat || matchFormat.id,
    winnerGames: match.winnerGames || matchFormat.winnerGames,
    defaultMinutes,
    defaultMatchMinutes: defaultMinutes,
    remainingSeconds: initialRemaining,
    startedAt: match.startedAt || (match.status === "Playing" ? Date.now() : null),
    countdownActive: match.countdownActive ?? match.status === "Playing",
    overtime: Boolean(match.overtime),
    groupId: match.groupId || "",
    bracketRound: match.bracketRound || null,
    bracketPosition: match.bracketPosition || null,
    nextMatchId: match.nextMatchId || "",
    nextSlot: match.nextSlot || "",
    winnerNextMatchId: match.winnerNextMatchId || "",
    winnerNextSlot: match.winnerNextSlot || "",
    loserNextMatchId: match.loserNextMatchId || "",
    loserNextSlot: match.loserNextSlot || "",
    tableOrder: Number.isFinite(Number(match.tableOrder)) ? Number(match.tableOrder) : 1000,
    playerAId: match.playerAId || playerA?.id || "",
    playerAName,
    playerBId: match.playerBId || playerB?.id || "",
    playerBName,
    playerARating: match.playerARating ?? playerA?.rating ?? null,
    playerBRating: match.playerBRating ?? playerB?.rating ?? null,
    isBye: Boolean(match.isBye),
    winnerSide: match.winnerSide || null,
    winnerId: match.winnerId || null,
    loserId: match.loserId || null,
  };
}

export function getPlayers() {
  return readArray(PLAYERS_KEY, demoPlayers).map(upgradePlayer);
}

export function savePlayers(players) {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

export function getStages() {
  return readArray(STAGES_KEY, demoStages)
    .map(upgradeStage)
    .sort((a, b) => a.order - b.order);
}

export function saveStages(stages) {
  localStorage.setItem(STAGES_KEY, JSON.stringify(stages));
}

export function getMatches() {
  const stages = getStages();
  return readArray(MATCHES_KEY, demoMatches).map((match) => upgradeMatch(match, stages));
}

export function saveMatches(matches) {
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}

export function resetDemoData() {
  saveMatches(demoMatches);
  savePlayers(demoPlayers);
  saveStages(demoStages);
  return { matches: getMatches(), players: getPlayers(), stages: getStages() };
}

export const loadMatches = getMatches;
