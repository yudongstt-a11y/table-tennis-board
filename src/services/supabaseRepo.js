import { getSupabaseConfigStatus, supabase, supabaseConfigError } from "../lib/supabaseClient.js";
import { DEFAULT_TOURNAMENT_SLUG } from "../config/dataSource.js";
import { defaultTournamentSettings } from "../data/demoTournament.js";
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

function stripGeneratedFields(payload) {
  const copy = { ...payload };
  if (!copy.id) delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  return copy;
}

function makeDiagnostics() {
  return {
    config: getSupabaseConfigStatus(),
    tables: {},
  };
}

async function loadTable(diagnostics, name, query) {
  try {
    const data = await run(query);
    diagnostics.tables[name] = {
      loaded: true,
      count: Array.isArray(data) ? data.length : data ? 1 : 0,
      error: "",
    };
    return data || [];
  } catch (error) {
    diagnostics.tables[name] = {
      loaded: false,
      count: 0,
      error: error.message || String(error),
    };
    console.error(`[Supabase:${name}]`, error);
    return [];
  }
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
  const query = supabase.from(table).insert(rows.map((row) => stripGeneratedFields(mapper(row, id)))).select();
  const data = await run(query);
  return orderColumn ? data.sort((a, b) => (a[orderColumn] || 0) - (b[orderColumn] || 0)) : data;
}

async function safeReplaceRows(table, rows, mapper, orderColumn = null, fallbackColumns = []) {
  const id = await tournamentId();
  const existing = await run(supabase.from(table).select("id").eq("tournament_id", id));
  const mappedRows = rows.map((row) => stripGeneratedFields(mapper(row, id)));
  const retainedIds = new Set(mappedRows.map((row) => row.id).filter(Boolean));
  let data = [];
  let fallbackError = null;

  if (mappedRows.length) {
    try {
      data = await run(supabase.from(table).upsert(mappedRows).select());
    } catch (error) {
      const message = error.message || "";
      const canFallback = fallbackColumns.some((column) => message.includes(column));
      if (!canFallback) throw error;
      fallbackError = error;
      const fallbackRows = mappedRows.map((row) => {
        const next = { ...row };
        fallbackColumns.forEach((column) => delete next[column]);
        return next;
      });
      data = await run(supabase.from(table).upsert(fallbackRows).select());
    }
  }

  const deleteIds = existing.map((row) => row.id).filter((idValue) => !retainedIds.has(idValue));
  if (deleteIds.length) await run(supabase.from(table).delete().in("id", deleteIds));

  if (fallbackError) {
    throw new Error(`${table}: ${fallbackError.message}. Please run the latest Supabase schema migration.`);
  }

  return orderColumn ? data.sort((a, b) => (a[orderColumn] || 0) - (b[orderColumn] || 0)) : data;
}

function pairKey(pair) {
  return [pair.player_a_name || pair.playerAName || pair.playerA, pair.player_b_name || pair.playerBName || pair.playerB]
    .map((name) => String(name || "").trim().toLowerCase())
    .sort()
    .join("__");
}

export async function loadAllData() {
  const diagnostics = makeDiagnostics();
  let tournament = null;

  try {
    tournament = await ensureTournament();
    diagnostics.tables.tournaments = { loaded: true, count: tournament ? 1 : 0, error: "" };
  } catch (error) {
    diagnostics.tables.tournaments = {
      loaded: false,
      count: 0,
      error: error.message || String(error),
    };
    throw Object.assign(error, { diagnostics });
  }

  const id = tournament.id;

  const [players, doublesPairs, stages, groups, matches, tableControls, timeline, breaks, seedings] = await Promise.all([
    loadTable(diagnostics, "players", supabase.from("players").select("*").eq("tournament_id", id).order("name")),
    loadTable(diagnostics, "doubles_pairs", supabase.from("doubles_pairs").select("*").eq("tournament_id", id).order("player_a_name")),
    loadTable(diagnostics, "stages", supabase.from("stages").select("*").eq("tournament_id", id).order("stage_order")),
    loadTable(diagnostics, "groups", supabase.from("groups").select("*").eq("tournament_id", id).order("event_id").order("group_order")),
    loadTable(diagnostics, "matches", supabase.from("matches").select("*").eq("tournament_id", id).order("scheduled_time")),
    loadTable(diagnostics, "table_controls", supabase.from("table_controls").select("*").eq("tournament_id", id)),
    loadTable(diagnostics, "event_timeline_items", supabase.from("event_timeline_items").select("*").eq("tournament_id", id).order("item_order")),
    loadTable(diagnostics, "breaks", supabase.from("breaks").select("*").eq("tournament_id", id)),
    loadTable(diagnostics, "seedings", supabase.from("seedings").select("*").eq("tournament_id", id)),
  ]);

  const mappedStages = stages.map(stageFromDb);
  const mappedTimeline = timeline.map(timelineFromDb);
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
    dataSourceError: Object.entries(diagnostics.tables)
      .filter(([, info]) => info.error)
      .map(([table, info]) => `${table}: ${info.error}`)
      .join("; "),
    supabaseDiagnostics: diagnostics,
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
      .upsert(players.map((player) => stripGeneratedFields(playerToDb(player, id))), { onConflict: "tournament_id,name" })
      .select()
  );
}

export async function importOfficialDoublesPairs(players) {
  const id = await tournamentId();
  const dbPlayers = await run(supabase.from("players").select("*").eq("tournament_id", id));
  const playerByName = new Map(dbPlayers.map((player) => [player.name.toLowerCase(), player]));
  const existingPairs = await run(supabase.from("doubles_pairs").select("*").eq("tournament_id", id));
  const existingByKey = new Map(existingPairs.map((pair) => [pairKey(pair), pair]));

  await Promise.all(
    officialDoublesPairs.map((pair) => {
      const row = stripGeneratedFields(doublesPairToDb(pair, id, playerByName));
      const existing = existingByKey.get(pairKey(row));
      return existing
        ? run(supabase.from("doubles_pairs").update(row).eq("id", existing.id))
        : run(supabase.from("doubles_pairs").insert(row));
    })
  );
}

export async function importOfficialEntries(players) {
  await savePlayers(players);
  await importOfficialDoublesPairs();
  return loadAllData();
}

export async function saveDoublesPairs(pairs, players = []) {
  const id = await tournamentId();
  const playerByName = new Map(players.map((player) => [player.name.toLowerCase(), player]));
  await replaceRows("doubles_pairs", pairs, (pair, tournamentId) =>
    doublesPairToDb(pair, tournamentId, playerByName)
  );
}

export async function saveStages(stages) {
  await safeReplaceRows("stages", stages, stageToDb, "stage_order", ["next_stage_config"]);
}

export async function saveGroups(groups) {
  await safeReplaceRows("groups", groups, groupToDb, "group_order", ["entry_type", "entry_ids"]);
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
    stripGeneratedFields(tableControlToDb(table, control, id))
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
