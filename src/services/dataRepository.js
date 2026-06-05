import { DATA_SOURCE, isSupabaseMode } from "../config/dataSource.js";
import * as localRepo from "./localStorageRepo.js";
import * as supabaseRepo from "./supabaseRepo.js";

const repo = isSupabaseMode() ? supabaseRepo : localRepo;

export { DATA_SOURCE };

async function withFallback(action, fallbackAction = null) {
  try {
    return await action(repo);
  } catch (error) {
    console.error("[DataRepository]", error);
    if (isSupabaseMode() && fallbackAction) {
      const data = await fallbackAction(localRepo);
      return {
        ...data,
        dataSourceError: error.message || "Unable to connect to Supabase.",
      };
    }
    throw error;
  }
}

export function loadAllData() {
  return withFallback((activeRepo) => activeRepo.loadAllData(), (fallbackRepo) => fallbackRepo.loadAllData());
}

export function saveTournamentSettingsData(settings, control) {
  return isSupabaseMode()
    ? supabaseRepo.saveTournamentSettings(settings, control)
    : localRepo.saveTournamentSettingsData(settings);
}

export function saveTournamentControlData(control, settings) {
  return isSupabaseMode()
    ? supabaseRepo.saveTournamentControl(control, settings)
    : localRepo.saveTournamentControlData(control);
}

export function savePlayersData(players) {
  return isSupabaseMode() ? supabaseRepo.savePlayers(players) : localRepo.savePlayersData(players);
}

export function importOfficialDoublesPairsData(players) {
  return isSupabaseMode()
    ? supabaseRepo.importOfficialDoublesPairs(players)
    : localRepo.importOfficialDoublesPairsData(players);
}

export function saveStagesData(stages) {
  return isSupabaseMode() ? supabaseRepo.saveStages(stages) : localRepo.saveStagesData(stages);
}

export function saveGroupsData(groups) {
  return isSupabaseMode() ? supabaseRepo.saveGroups(groups) : localRepo.saveGroupsData(groups);
}

export function saveSeedingsData(seedings) {
  return isSupabaseMode() ? supabaseRepo.saveSeedings(seedings) : localRepo.saveSeedingsData(seedings);
}

export function saveMatchesData(matches) {
  return isSupabaseMode() ? supabaseRepo.saveMatches(matches) : localRepo.saveMatchesData(matches);
}

export function saveTableControlsData(controls) {
  return isSupabaseMode()
    ? supabaseRepo.saveTableControls(controls)
    : localRepo.saveTableControlsData(controls);
}

export function saveEventTimelineData(items) {
  return isSupabaseMode()
    ? supabaseRepo.saveEventTimeline(items)
    : localRepo.saveEventTimelineData(items);
}

export function saveBreaksData(items) {
  return isSupabaseMode() ? supabaseRepo.saveBreaks(items) : localRepo.saveBreaksData(items);
}

export function resetData() {
  return isSupabaseMode() ? loadAllData() : localRepo.resetData();
}

export function subscribeToTournamentData(onChange) {
  return isSupabaseMode() ? supabaseRepo.subscribeToTournament(onChange) : () => {};
}
