import { importOfficialDoublesPairsData } from "./dataRepository.js";

export async function importDoublesPairs(players) {
  return importOfficialDoublesPairsData(players);
}
