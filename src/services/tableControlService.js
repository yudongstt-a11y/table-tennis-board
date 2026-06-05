import { saveTableControlsData } from "./dataRepository.js";

export async function saveTableControls(tableControls) {
  return saveTableControlsData(tableControls);
}
