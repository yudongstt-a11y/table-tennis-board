import { getMatchFormat } from "../constants/matchFormats.js";
import { demoMatches } from "../data/demoMatches.js";
import { demoBreaks } from "../data/demoBreaks.js";
import { demoPlayers } from "../data/demoPlayers.js";
import { demoStages } from "../data/demoStages.js";
import { defaultEventTimeline, defaultTournamentSettings } from "../data/demoTournament.js";
import { categoryIdFromLegacy } from "../constants/categories.js";

const MATCHES_KEY = "table_tennis_schedule_matches";
const PLAYERS_KEY = "table_tennis_schedule_players";
const STAGES_KEY = "table_tennis_schedule_stages";
const TABLE_CONTROLS_KEY = "table_tennis_table_controls";
const BREAKS_KEY = "table_tennis_breaks";
const TOURNAMENT_CONTROL_KEY = "table_tennis_tournament_control";
const TOURNAMENT_SETTINGS_KEY = "table_tennis_tournament_settings";
const EVENT_TIMELINE_KEY = "table_tennis_event_timeline";
const SEEDINGS_KEY = "table_tennis_seedings";
const GROUPS_KEY = "table_tennis_groups";

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

function readObject(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function defaultTableControls() {
  return Object.fromEntries(
    getTournamentSettings().tableNames.map((table) => [table, { timeBankSeconds: 0 }])
  );
}

function normalizeTableNames(settings) {
  const tableCount = Math.max(1, Number(settings.tableCount) || 6);
  const tableNames =
    Array.isArray(settings.tableNames) && settings.tableNames.length
      ? settings.tableNames.slice(0, tableCount)
      : [];

  while (tableNames.length < tableCount) {
    tableNames.push(`Table ${tableNames.length + 1}`);
  }

  return {
    ...settings,
    tableCount,
    tableNames,
  };
}

function defaultTournamentControl() {
  return {
    status: "not_started",
    startedAt: null,
    pausedAt: null,
    activeBreakId: null,
  };
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
    tableAllocation: Math.max(1, Number(stage.tableAllocation) || 1),
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

export function getTableControls() {
  const defaults = defaultTableControls();
  const stored = readObject(TABLE_CONTROLS_KEY, defaults);

  return Object.fromEntries(
    getTournamentSettings().tableNames.map((table) => [
      table,
      {
        timeBankSeconds: Number(stored[table]?.timeBankSeconds) || 0,
      },
    ])
  );
}

export function saveTableControls(tableControls) {
  localStorage.setItem(TABLE_CONTROLS_KEY, JSON.stringify(tableControls));
}

export function getBreaks() {
  return readArray(BREAKS_KEY, demoBreaks);
}

export function saveBreaks(breaks) {
  localStorage.setItem(BREAKS_KEY, JSON.stringify(breaks));
}

export function getTournamentControl() {
  return {
    ...defaultTournamentControl(),
    ...readObject(TOURNAMENT_CONTROL_KEY, defaultTournamentControl()),
  };
}

export function saveTournamentControl(tournamentControl) {
  localStorage.setItem(TOURNAMENT_CONTROL_KEY, JSON.stringify(tournamentControl));
}

export function getTournamentSettings() {
  return normalizeTableNames(
    readObject(TOURNAMENT_SETTINGS_KEY, defaultTournamentSettings)
  );
}

export function saveTournamentSettings(settings) {
  localStorage.setItem(TOURNAMENT_SETTINGS_KEY, JSON.stringify(normalizeTableNames(settings)));
}

export function getEventTimeline() {
  return readArray(EVENT_TIMELINE_KEY, defaultEventTimeline).sort(
    (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.timeStart).localeCompare(String(b.timeStart))
  );
}

export function saveEventTimeline(items) {
  localStorage.setItem(EVENT_TIMELINE_KEY, JSON.stringify(items));
}

export function getSeedings() {
  return readArray(SEEDINGS_KEY, []);
}

export function saveSeedings(seedings) {
  localStorage.setItem(SEEDINGS_KEY, JSON.stringify(seedings));
}

export function getGroups() {
  return readArray(GROUPS_KEY, []);
}

export function saveGroups(groups) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
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
  saveTournamentSettings(defaultTournamentSettings);
  saveTableControls(defaultTableControls());
  saveBreaks(demoBreaks);
  saveTournamentControl(defaultTournamentControl());
  saveEventTimeline(defaultEventTimeline);
  saveSeedings([]);
  saveGroups([]);
  return {
    matches: getMatches(),
    players: getPlayers(),
    stages: getStages(),
    tableControls: getTableControls(),
    breaks: getBreaks(),
    tournamentControl: getTournamentControl(),
    tournamentSettings: getTournamentSettings(),
    eventTimeline: getEventTimeline(),
    seedings: getSeedings(),
    groups: getGroups(),
  };
}

export const loadMatches = getMatches;
