import { supabase, supabaseConfigError } from "../lib/supabaseClient.js";
import { DEFAULT_TOURNAMENT_SLUG } from "../config/dataSource.js";
import { defaultEventTimeline, defaultTournamentSettings } from "../data/demoTournament.js";
import { demoStages } from "../data/demoStages.js";
import {
  breakFromDb,
  breakToDb,
  doublesPairToDb,
  doublesPairFromDb,
  groupFromDb,
  groupToDb,
  matchFromDb,
  matchToDb,
  playerFromDb,
  playerToDb,
  seedingFromDb,
  seedingToDb,
  stageFromDb,
  stageToDb,
  tableControlsFromDb,
  tableControlToDb,
  timelineFromDb,
  timelineToDb,
  tournamentControlFromDb,
  tournamentFromDb,
  tournamentToDb,
} from "./supabaseMappers.js";
import { officialDoublesPairs } from "../data/officialPlayers.js";

let currentTournament = null;

function ensureClient() {
  if (!supabase) throw new Error(supabaseConfigError);
  return supabase;
}

async function run(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function ensureTournament(slug = DEFAULT_TOURNAMENT_SLUG) {
  const client = ensureClient();
  const existing = await run(client.from("tournaments").select("*").eq("slug", slug).maybeSingle());
  if (existing) {
    currentTournament = existing;
    return existing;
  }

  const inserted = await run(
    client
      .from("tournaments")
      .insert(tournamentToDb(defaultTournamentSettings, {}, slug))
      .select()
      .single()
  );
  currentTournament = inserted;
  return inserted;
}

async function tournamentId() {
  return (currentTournament || (await ensureTournament())).id;
}

async function replaceRows(table, rows, mapper, orderColumn = null) {
  const id = await tournamentId();
  await run(supabase.from(table).delete().eq("tournament_id", id));
  if (!rows.length) return [];
  const query = supabase.from(table).insert(rows.map((row) => mapper(row, id))).select();
  const data = await run(query);
  return orderColumn ? data.sort((a, b) => (a[orderColumn] || 0) - (b[orderColumn] || 0)) : data;
}

export async function loadAllData() {
  const tournament = await ensureTournament();
  const id = tournament.id;

  const [players, doublesPairs, stages, groups, matches, tableControls, timeline, breaks, seedings] = await Promise.all([
    run(supabase.from("players").select("*").eq("tournament_id", id).order("name")),
    run(supabase.from("doubles_pairs").select("*").eq("tournament_id", id).order("player_a_name")),
    run(supabase.from("stages").select("*").eq("tournament_id", id).order("stage_order")),
    run(supabase.from("groups").select("*").eq("tournament_id", id).order("group_order")),
    run(supabase.from("matches").select("*").eq("tournament_id", id).order("scheduled_time")),
    run(supabase.from("table_controls").select("*").eq("tournament_id", id)),
    run(supabase.from("event_timeline_items").select("*").eq("tournament_id", id).order("item_order")),
    run(supabase.from("breaks").select("*").eq("tournament_id", id)),
    run(supabase.from("seedings").select("*").eq("tournament_id", id)),
  ]);

  const mappedStages = stages.length ? stages.map(stageFromDb) : demoStages;
  const mappedTimeline = timeline.length ? timeline.map(timelineFromDb) : defaultEventTimeline;
  const controls = tableControlsFromDb(tableControls);
  const settings = tournamentFromDb(tournament);
  settings.tableNames.forEach((table) => {
    if (!controls[table]) controls[table] = { timeBankSeconds: 0 };
  });

  return {
    matches: matches.map(matchFromDb),
    players: players.map(playerFromDb),
    doublesPairs: doublesPairs.map(doublesPairFromDb),
    stages: mappedStages,
    tableControls: controls,
    breaks: breaks.map(breakFromDb),
    tournamentControl: tournamentControlFromDb(tournament),
    tournamentSettings: settings,
    eventTimeline: mappedTimeline,
    seedings: seedings.map(seedingFromDb),
    groups: groups.map(groupFromDb),
    dataSourceError: "",
  };
}

export async function saveTournamentSettings(settings, control = {}) {
  const tournament = await ensureTournament();
  const data = await run(
    supabase
      .from("tournaments")
      .update(tournamentToDb(settings, control, tournament.slug))
      .eq("id", tournament.id)
      .select()
      .single()
  );
  currentTournament = data;
}

export async function saveTournamentControl(control, settings) {
  await saveTournamentSettings(settings || tournamentFromDb(currentTournament), control);
}

export async function savePlayers(players) {
  const id = await tournamentId();
  const existing = await run(supabase.from("players").select("id,name").eq("tournament_id", id));
  const nextNames = new Set(players.map((player) => player.name));
  const deleteIds = existing.filter((player) => !nextNames.has(player.name)).map((player) => player.id);
  if (deleteIds.length) await run(supabase.from("players").delete().in("id", deleteIds));
  await run(
    supabase
      .from("players")
      .upsert(players.map((player) => playerToDb(player, id)), { onConflict: "tournament_id,name" })
      .select()
  );
}

export async function importOfficialDoublesPairs(players) {
  const id = await tournamentId();
  const playerByName = new Map(players.map((player) => [player.name.toLowerCase(), player]));
  await run(
    supabase
      .from("doubles_pairs")
      .upsert(officialDoublesPairs.map((pair) => doublesPairToDb(pair, id, playerByName)), {
        onConflict: "tournament_id,player_a_name,player_b_name",
      })
  );
}

export async function saveDoublesPairs(pairs, players = []) {
  const id = await tournamentId();
  const playerByName = new Map(players.map((player) => [player.name.toLowerCase(), player]));
  await replaceRows("doubles_pairs", pairs, (pair, tournamentId) =>
    doublesPairToDb(pair, tournamentId, playerByName)
  );
}

export async function saveStages(stages) {
  await replaceRows("stages", stages, stageToDb, "stage_order");
}

export async function saveGroups(groups) {
  await replaceRows("groups", groups, groupToDb, "group_order");
}

export async function saveSeedings(seedings) {
  await replaceRows("seedings", seedings, seedingToDb);
}

export async function saveMatches(matches) {
  await replaceRows("matches", matches, matchToDb, "table_order");
}

export async function saveTableControls(tableControls) {
  const id = await tournamentId();
  const rows = Object.entries(tableControls).map(([table, control]) =>
    tableControlToDb(table, control, id)
  );
  if (rows.length) {
    await run(
      supabase.from("table_controls").upsert(rows, { onConflict: "tournament_id,table_name" })
    );
  }
}

export async function saveEventTimeline(items) {
  await replaceRows("event_timeline_items", items, timelineToDb, "item_order");
}

export async function saveBreaks(items) {
  await replaceRows("breaks", items, breakToDb);
}

export function subscribeToTournament(onChange) {
  if (!supabase || !currentTournament?.id) return () => {};
  const channel = supabase
    .channel(`tournament-${currentTournament.id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${currentTournament.id}` },
      onChange
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
