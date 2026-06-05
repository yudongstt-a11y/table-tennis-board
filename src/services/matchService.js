import { loadAllData, saveMatchesData } from "./dataRepository.js";

export async function getMatches() {
  return (await loadAllData()).matches;
}

export async function saveMatches(matches) {
  return saveMatchesData(matches);
}
