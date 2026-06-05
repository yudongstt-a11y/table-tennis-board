import { loadAllData, saveGroupsData, saveSeedingsData } from "./dataRepository.js";

export async function getGroups() {
  return (await loadAllData()).groups;
}

export async function saveGroups(groups) {
  return saveGroupsData(groups);
}

export async function saveSeedings(seedings) {
  return saveSeedingsData(seedings);
}
