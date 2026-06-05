import { importOfficialDoublesPairsData, loadAllData, savePlayersData } from "./dataRepository.js";

export function normalizePlayer(row) {
  return {
    id: row.id,
    tournamentId: row.tournamentId || row.tournament_id,
    name: row.name,
    gender: row.gender || "Other",
    rating: row.rating ?? null,
    ratingNote: row.ratingNote || row.rating_note || "",
    categories: Array.isArray(row.categories) ? row.categories : [],
    doublesPartner: row.doublesPartner || row.doubles_partner || "",
    needsDoublesPartner: Boolean(row.needsDoublesPartner ?? row.needs_doubles_partner),
    notes: row.notes || "",
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  };
}

export function toPlayerRow(player, tournamentId) {
  return {
    tournament_id: tournamentId || player.tournamentId,
    name: player.name,
    gender: player.gender || "Other",
    rating: player.rating === "" || player.rating === undefined ? null : player.rating,
    rating_note: player.ratingNote || null,
    categories: player.categories || [],
    doubles_partner: player.doublesPartner || null,
    needs_doubles_partner: Boolean(player.needsDoublesPartner),
    notes: player.notes || null,
  };
}

export async function getPlayers() {
  return (await loadAllData()).players.map(normalizePlayer);
}

export async function createPlayer(_tournamentId, player, players = []) {
  const savedPlayers = await savePlayersData([...players, player]);
  return Array.isArray(savedPlayers)
    ? savedPlayers.find((item) => item.name === player.name) || normalizePlayer(player)
    : normalizePlayer(player);
}

export async function updatePlayer(playerId, updates, players = []) {
  const nextPlayers = players.map((player) =>
    player.id === playerId ? { ...player, ...updates, id: playerId } : player
  );
  return savePlayersData(nextPlayers);
}

export async function savePlayer(player, players = []) {
  const nextPlayers = players.some((item) => item.id === player.id)
    ? players.map((item) => (item.id === player.id ? player : item))
    : [...players, player];
  return savePlayersData(nextPlayers);
}

export async function deletePlayer(playerId, players = []) {
  return savePlayersData(players.filter((player) => player.id !== playerId));
}

export async function importOfficialPlayers(players) {
  await savePlayersData(players);
  return importOfficialDoublesPairsData(players);
}
