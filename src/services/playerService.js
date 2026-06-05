import { importOfficialDoublesPairsData, loadAllData, savePlayersData } from "./dataRepository.js";

export async function getPlayers() {
  return (await loadAllData()).players;
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
