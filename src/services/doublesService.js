import { importOfficialDoublesPairsData, loadAllData, saveDoublesPairsData } from "./dataRepository.js";

export async function getDoublesPairs() {
  return (await loadAllData()).doublesPairs;
}

export async function saveDoublesPair(pair) {
  const data = await loadAllData();
  const nextPairs = data.doublesPairs.some((item) => item.id === pair.id)
    ? data.doublesPairs.map((item) => (item.id === pair.id ? pair : item))
    : [...data.doublesPairs, pair];
  return saveDoublesPairsData(nextPairs, data.players);
}

export async function importDoublesPairs(players) {
  return importOfficialDoublesPairsData(players);
}
