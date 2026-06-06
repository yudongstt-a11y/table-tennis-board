import { loadAllData, saveStagesData } from "./dataRepository.js";
import { isSupabaseMode } from "../config/dataSource.js";
import { supabase, supabaseClientError, supabaseConfigError } from "../lib/supabaseClient.js";
import { isUuid } from "./supabaseMappers.js";

async function run(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigError || supabaseClientError || "Supabase client is not available.");
  }
  return supabase;
}

async function resolveTournamentId(tournamentId) {
  if (tournamentId) return tournamentId;
  const data = await loadAllData();
  return data.tournamentSettings?.id;
}

function stripGeneratedFields(payload) {
  const copy = { ...payload };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  delete copy.createdAt;
  delete copy.updatedAt;

  Object.keys(copy).forEach((key) => {
    if (copy[key] === undefined) delete copy[key];
  });

  return copy;
}

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
  return stripGeneratedFields({
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
  });
}

export async function getStages() {
  return (await loadAllData()).stages;
}

export async function saveStages(stages) {
  return saveStagesData(stages);
}

export async function saveStage(stage) {
  if (isSupabaseMode()) {
    return stage.id && isUuid(stage.id)
      ? updateStage(stage.id, stage)
      : createStage(stage.tournamentId, stage);
  }

  const data = await loadAllData();
  const nextStages = data.stages.some((item) => item.id === stage.id)
    ? data.stages.map((item) => (item.id === stage.id ? stage : item))
    : [...data.stages, stage];
  return saveStagesData(nextStages);
}

export async function createStage(tournamentId, stage) {
  if (!isSupabaseMode()) return saveStage(stage);
  const client = requireSupabase();

  const resolvedTournamentId = await resolveTournamentId(tournamentId);
  const payload = stripGeneratedFields(toStageRow(stage, resolvedTournamentId));
  delete payload.id;

  console.log("STAGE INSERT PAYLOAD", payload);

  const data = await run(client.from("stages").insert(payload).select().single());
  return normalizeStage(data);
}

export async function updateStage(stageId, updates) {
  if (isSupabaseMode()) {
    const client = requireSupabase();
    const resolvedTournamentId = await resolveTournamentId(updates.tournamentId);
    const payload = stripGeneratedFields(toStageRow(updates, resolvedTournamentId));
    delete payload.id;
    const data = await run(client.from("stages").update(payload).eq("id", stageId).select().single());
    return normalizeStage(data);
  }

  const data = await loadAllData();
  const existing = data.stages.find((stage) => stage.id === stageId);
  if (!existing) throw new Error("Stage not found");
  return saveStage({ ...existing, ...updates, id: stageId });
}

export async function deleteStage(stageId) {
  if (isSupabaseMode()) {
    const client = requireSupabase();
    await run(client.from("stages").delete().eq("id", stageId));
    return getStages();
  }

  const data = await loadAllData();
  return saveStagesData(data.stages.filter((stage) => stage.id !== stageId));
}
