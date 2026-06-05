import {
  loadAllData,
  saveTournamentControlData,
  saveTournamentSettingsData,
} from "./dataRepository.js";

export async function getTournament() {
  return loadAllData();
}

export async function saveTournamentSettings(settings, control) {
  return saveTournamentSettingsData(settings, control);
}

export async function saveTournamentControl(control, settings) {
  return saveTournamentControlData(control, settings);
}
