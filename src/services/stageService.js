import { loadAllData, saveStagesData } from "./dataRepository.js";

export async function getStages() {
  return (await loadAllData()).stages;
}

export async function saveStages(stages) {
  return saveStagesData(stages);
}
