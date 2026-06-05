import { importOfficialDoublesPairsData, loadAllData, saveDoublesPairsData } from "./dataRepository.js";

export async function getDoublesPairs() {
  return (await loadAllData()).doublesPairs;
}

export async function createDoublesPair(pair) {
  const data = await loadAllData();
  const nextPair = {
    ...pair,
    id: pair.id || `pair_${Date.now()}`,
    status: pair.status || "confirmed",
  };
  return saveDoublesPairsData([...data.doublesPairs, nextPair], data.players);
}

export async function updateDoublesPair(pairId, updates) {
  const data = await loadAllData();
  const nextPairs = data.doublesPairs.map((pair) =>
    pair.id === pairId ? { ...pair, ...updates, id: pairId } : pair
  );
  return saveDoublesPairsData(nextPairs, data.players);
}

export async function deleteDoublesPair(pairId) {
  const data = await loadAllData();
  return saveDoublesPairsData(
    data.doublesPairs.filter((pair) => pair.id !== pairId),
    data.players
  );
}

export async function saveDoublesPair(pair) {
  const data = await loadAllData();
  const nextPairs = data.doublesPairs.some((item) => item.id === pair.id)
    ? data.doublesPairs.map((item) => (item.id === pair.id ? pair : item))
    : [...data.doublesPairs, pair];
  return saveDoublesPairsData(nextPairs, data.players);
}

export async function importOfficialDoublesPairs(tournamentId, pairs) {
  return importOfficialDoublesPairsData(pairs || tournamentId);
}

export async function importDoublesPairs(players) {
  return importOfficialDoublesPairsData(players);
}
