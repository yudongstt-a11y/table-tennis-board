import {
  getBreaks,
  getEventTimeline,
  getGroups,
  getMatches,
  getPlayers,
  getSeedings,
  getStages,
  getTableControls,
  getTournamentControl,
  getTournamentSettings,
  resetDemoData,
  saveBreaks,
  saveEventTimeline,
  saveGroups,
  saveMatches,
  savePlayers,
  saveSeedings,
  saveStages,
  saveTableControls,
  saveTournamentControl,
  saveTournamentSettings,
} from "../utils/storage.js";

export async function loadAllData() {
  return {
    matches: getMatches(),
    players: getPlayers(),
    stages: getStages(),
    tableControls: getTableControls(),
    breaks: getBreaks(),
    tournamentControl: getTournamentControl(),
    tournamentSettings: getTournamentSettings(),
    eventTimeline: getEventTimeline(),
    seedings: getSeedings(),
    groups: getGroups(),
    dataSourceError: "",
  };
}

export async function saveTournamentSettingsData(settings) {
  saveTournamentSettings(settings);
}

export async function saveTournamentControlData(control) {
  saveTournamentControl(control);
}

export async function savePlayersData(players) {
  savePlayers(players);
}

export async function saveStagesData(stages) {
  saveStages(stages);
}

export async function saveGroupsData(groups) {
  saveGroups(groups);
}

export async function saveSeedingsData(seedings) {
  saveSeedings(seedings);
}

export async function saveMatchesData(matches) {
  saveMatches(matches);
}

export async function saveTableControlsData(controls) {
  saveTableControls(controls);
}

export async function saveEventTimelineData(items) {
  saveEventTimeline(items);
}

export async function saveBreaksData(items) {
  saveBreaks(items);
}

export async function resetData() {
  return resetDemoData();
}

export function subscribeToTournamentData() {
  return () => {};
}

export async function importOfficialDoublesPairsData() {}
