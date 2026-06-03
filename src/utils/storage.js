import { demoMatches } from "../data/demoMatches.js";
import { demoPlayers } from "../data/demoPlayers.js";
import { categoryIdFromLegacy } from "../constants/categories.js";

const MATCHES_KEY = "table_tennis_schedule_matches";
const PLAYERS_KEY = "table_tennis_schedule_players";

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

function upgradeMatch(match) {
  const playerAName = match.playerAName || match.playerA || "";
  const playerBName = match.playerBName || match.playerB || "";
  const playerA = demoPlayers.find((player) => player.name === playerAName);
  const playerB = demoPlayers.find((player) => player.name === playerBName);

  return {
    ...match,
    categoryId: match.categoryId || categoryIdFromLegacy(match.category),
    playerAId: match.playerAId || playerA?.id || "",
    playerAName,
    playerBId: match.playerBId || playerB?.id || "",
    playerBName,
    playerARating: match.playerARating ?? playerA?.rating ?? null,
    playerBRating: match.playerBRating ?? playerB?.rating ?? null,
  };
}

export function getPlayers() {
  return readArray(PLAYERS_KEY, demoPlayers).map(upgradePlayer);
}

export function savePlayers(players) {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

export function getMatches() {
  return readArray(MATCHES_KEY, demoMatches).map(upgradeMatch);
}

export function saveMatches(matches) {
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}

export function resetDemoData() {
  saveMatches(demoMatches);
  savePlayers(demoPlayers);
  return { matches: demoMatches, players: demoPlayers };
}

export const loadMatches = getMatches;
