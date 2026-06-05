import { saveBreaksData } from "./dataRepository.js";

export async function saveBreaks(breaks) {
  return saveBreaksData(breaks);
}
