import { loadAllData, saveStagesData } from "./dataRepository.js";

export function normalizeStage(row) {
  return {
    id: row.id,
    tournamentId: row.tournament_id || row.tournamentId,
    eventId: row.event_id || row.eventId,
    nameZh: row.name_zh || row.nameZh,
    nameEn: row.name_en || row.nameEn || "",
    format: row.format,
    matchFormat: row.match_format || row.matchFormat,
    winnerGames: row.winner_games || row.winnerGames,
    defaultMinutes: row.default_minutes || row.defaultMinutes || row.defaultMatchMinutes,
    defaultMatchMinutes: row.default_minutes || row.defaultMatchMinutes || row.defaultMinutes,
    stageOrder: row.stage_order || row.stageOrder || row.order,
    order: row.stage_order || row.order || row.stageOrder,
    tableAllocation: row.table_allocation || row.tableAllocation || 1,
    nextStageConfig: row.next_stage_config || row.nextStageConfig || {},
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

export function toStageRow(stage, tournamentId) {
  const payload = {
    tournament_id: tournamentId,
    event_id: stage.eventId,
    name_zh: stage.nameZh,
    name_en: stage.nameEn || null,
    format: stage.format,
    match_format: stage.matchFormat,
    winner_games: stage.winnerGames,
    default_minutes: stage.defaultMinutes || stage.defaultMatchMinutes,
    stage_order: stage.stageOrder || stage.order,
    table_allocation: stage.tableAllocation,
    next_stage_config: stage.nextStageConfig || {},
  };

  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

export async function getStages() {
  return (await loadAllData()).stages;
}

export async function saveStages(stages) {
  return saveStagesData(stages);
}

export async function saveStage(stage) {
  const data = await loadAllData();
  const nextStages = data.stages.some((item) => item.id === stage.id)
    ? data.stages.map((item) => (item.id === stage.id ? stage : item))
    : [...data.stages, stage];
  return saveStagesData(nextStages);
}

export async function createStage(_tournamentId, stage) {
  return saveStage(stage);
}

export async function updateStage(stageId, updates) {
  const data = await loadAllData();
  const existing = data.stages.find((stage) => stage.id === stageId);
  if (!existing) throw new Error("Stage not found");
  return saveStage({ ...existing, ...updates, id: stageId });
}

export async function deleteStage(stageId) {
  const data = await loadAllData();
  return saveStagesData(data.stages.filter((stage) => stage.id !== stageId));
}
