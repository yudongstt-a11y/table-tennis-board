const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return uuidPattern.test(String(value || ""));
}

export function isoFromMs(value) {
  if (!value) return null;
  if (typeof value === "string" && Number.isNaN(Number(value))) return value;
  const date = new Date(Number(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function msFromIso(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function withUuidId(object) {
  return isUuid(object.id) ? { id: object.id } : {};
}

export function tournamentFromDb(row) {
  return {
    id: row.id,
    slug: row.slug,
    nameZh: row.name_zh,
    nameEn: row.name_en || "",
    date: row.date || "",
    venue: row.venue || "",
    organiser: row.organiser || "",
    tableCount: row.table_count || 6,
    tableNames: Array.isArray(row.table_names) ? row.table_names : [],
    notes: row.notes || "",
  };
}

export function tournamentControlFromDb(row) {
  return {
    status: row.status || "not_started",
    startedAt: msFromIso(row.started_at),
    pausedAt: msFromIso(row.paused_at),
    activeBreakId: row.active_break_id || null,
  };
}

export function tournamentToDb(settings, control = {}, slug = "yulan-cup-2026") {
  return {
    slug,
    name_zh: settings.nameZh,
    name_en: settings.nameEn || null,
    date: settings.date || null,
    venue: settings.venue || null,
    organiser: settings.organiser || null,
    table_count: Number(settings.tableCount) || 6,
    table_names: settings.tableNames || [],
    notes: settings.notes || null,
    status: control.status || "not_started",
    active_break_id: isUuid(control.activeBreakId) ? control.activeBreakId : null,
    started_at: isoFromMs(control.startedAt),
    paused_at: isoFromMs(control.pausedAt),
  };
}

export function playerFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender || "Other",
    rating: row.rating ?? null,
    ratingNote: row.rating_note || "",
    categories: Array.isArray(row.categories) ? row.categories : [],
    doublesPartner: row.doubles_partner || "",
    needsDoublesPartner: Boolean(row.needs_doubles_partner),
    notes: row.notes || "",
  };
}

export function playerToDb(player, tournamentId) {
  return {
    ...withUuidId(player),
    tournament_id: tournamentId,
    name: player.name,
    gender: player.gender || "Other",
    rating: player.rating === "" || player.rating === undefined ? null : player.rating,
    rating_note: player.ratingNote || null,
    categories: player.categories || [],
    doubles_partner: player.doublesPartner || null,
    needs_doubles_partner: Boolean(player.needsDoublesPartner),
    notes: player.notes || null,
  };
}

export function stageFromDb(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    nameZh: row.name_zh,
    nameEn: row.name_en || "",
    format: row.format,
    matchFormat: row.match_format,
    winnerGames: row.winner_games,
    defaultMatchMinutes: row.default_minutes,
    order: row.stage_order || 1,
    tableAllocation: row.table_allocation || 1,
    division: row.division || null,
    nextStageConfig: row.next_stage_config || {},
  };
}

export function stageToDb(stage, tournamentId) {
  return {
    ...withUuidId(stage),
    tournament_id: tournamentId,
    event_id: stage.eventId,
    name_zh: stage.nameZh,
    name_en: stage.nameEn || null,
    format: stage.format,
    match_format: stage.matchFormat,
    winner_games: stage.winnerGames,
    default_minutes: stage.defaultMatchMinutes,
    stage_order: Number(stage.order) || 1,
    table_allocation: Number(stage.tableAllocation) || 1,
    next_stage_config: stage.nextStageConfig || {},
  };
}

export function groupFromDb(row) {
  const entryIds = Array.isArray(row.entry_ids) ? row.entry_ids : row.player_ids || [];
  return {
    id: row.id,
    eventId: row.event_id,
    stageId: row.stage_id,
    name: row.name,
    order: row.group_order || 1,
    playerIds: Array.isArray(row.player_ids) ? row.player_ids : [],
    entryType: row.entry_type || "player",
    entryIds,
    published: Boolean(row.published),
  };
}

export function groupToDb(group, tournamentId) {
  const entryType = group.entryType || (group.eventId === "mixed_doubles" ? "pair" : "player");
  const entryIds = group.entryIds || group.playerIds || [];
  return {
    ...withUuidId(group),
    tournament_id: tournamentId,
    event_id: group.eventId,
    stage_id: isUuid(group.stageId) ? group.stageId : null,
    name: group.name,
    group_order: Number(group.order) || 1,
    player_ids: entryType === "player" ? entryIds : group.playerIds || [],
    entry_type: entryType,
    entry_ids: entryIds,
    published: group.published !== false,
  };
}

export function seedingFromDb(row) {
  return {
    id: `seed_${row.event_id}_${row.stage_id}`,
    dbId: row.id,
    eventId: row.event_id,
    stageId: row.stage_id,
    playerIds: Array.isArray(row.player_ids) ? row.player_ids : [],
    updatedAt: row.updated_at,
  };
}

export function seedingToDb(seeding, tournamentId) {
  return {
    ...(isUuid(seeding.dbId || seeding.id) ? { id: seeding.dbId || seeding.id } : {}),
    tournament_id: tournamentId,
    event_id: seeding.eventId,
    stage_id: isUuid(seeding.stageId) ? seeding.stageId : null,
    player_ids: seeding.playerIds || [],
  };
}

export function matchFromDb(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    categoryId: row.event_id,
    stageId: row.stage_id || "",
    stageFormat: row.stage_format || "round_robin",
    matchFormat: row.match_format || "best_of_5",
    winnerGames: row.winner_games || 3,
    defaultMinutes: row.default_minutes || 25,
    defaultMatchMinutes: row.default_minutes || 25,
    defaultSeconds: row.default_seconds || (row.default_minutes || 25) * 60,
    groupId: row.group_id || "",
    round: row.round_name || "",
    roundNumber: row.round_number,
    bracketRound: row.bracket_round,
    bracketPosition: row.bracket_position,
    table: row.table_name || "",
    tableOrder: row.table_order ?? 1000,
    scheduledTime: row.scheduled_time || "",
    time: row.scheduled_time || "",
    playerAId: row.player_a_id || "",
    playerAName: row.player_a_name || "",
    playerARating: row.player_a_rating,
    playerAMembers: Array.isArray(row.player_a_members) ? row.player_a_members : [],
    playerBId: row.player_b_id || "",
    playerBName: row.player_b_name || "",
    playerBRating: row.player_b_rating,
    playerBMembers: Array.isArray(row.player_b_members) ? row.player_b_members : [],
    isBye: Boolean(row.is_bye),
    status: row.status || "Upcoming",
    score: row.score || "",
    winnerSide: row.winner_side,
    winnerId: row.winner_id,
    loserId: row.loser_id,
    remainingSeconds: row.remaining_seconds,
    startedAt: msFromIso(row.started_at),
    countdownActive: Boolean(row.countdown_active),
    nextMatchId: row.next_match_id || "",
    nextSlot: row.next_slot || "",
    winnerNextMatchId: row.winner_next_match_id || "",
    winnerNextSlot: row.winner_next_slot || "",
    loserNextMatchId: row.loser_next_match_id || "",
    loserNextSlot: row.loser_next_slot || "",
  };
}

export function matchToDb(match, tournamentId) {
  const scheduledTime = match.scheduledTime || match.time || "";

  return {
    ...withUuidId(match),
    tournament_id: tournamentId,
    event_id: match.eventId || match.categoryId || "singles",
    stage_id: isUuid(match.stageId) ? match.stageId : null,
    stage_format: match.stageFormat || null,
    match_format: match.matchFormat || "best_of_5",
    winner_games: match.winnerGames || 3,
    default_minutes: match.defaultMinutes || match.defaultMatchMinutes || 25,
    default_seconds: match.defaultSeconds || (match.defaultMinutes || match.defaultMatchMinutes || 25) * 60,
    group_id: isUuid(match.groupId) ? match.groupId : null,
    round_name: match.round || null,
    round_number: match.roundNumber || null,
    bracket_round: match.bracketRound || null,
    bracket_position: match.bracketPosition || null,
    table_name: match.table || null,
    table_order: Number.isFinite(Number(match.tableOrder)) ? Number(match.tableOrder) : null,
    scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : null,
    player_a_id: isUuid(match.playerAId) ? match.playerAId : null,
    player_a_name: match.playerAName || null,
    player_a_rating: match.playerARating ?? null,
    player_a_members: match.playerAMembers || null,
    player_b_id: isUuid(match.playerBId) ? match.playerBId : null,
    player_b_name: match.playerBName || null,
    player_b_rating: match.playerBRating ?? null,
    player_b_members: match.playerBMembers || null,
    is_bye: Boolean(match.isBye),
    status: match.status || "Upcoming",
    score: match.score || null,
    winner_side: match.winnerSide || null,
    winner_id: isUuid(match.winnerId) ? match.winnerId : null,
    loser_id: isUuid(match.loserId) ? match.loserId : null,
    remaining_seconds: match.remainingSeconds ?? null,
    started_at: isoFromMs(match.startedAt),
    countdown_active: Boolean(match.countdownActive),
    next_match_id: isUuid(match.nextMatchId) ? match.nextMatchId : null,
    next_slot: match.nextSlot || null,
    winner_next_match_id: isUuid(match.winnerNextMatchId) ? match.winnerNextMatchId : null,
    winner_next_slot: match.winnerNextSlot || null,
    loser_next_match_id: isUuid(match.loserNextMatchId) ? match.loserNextMatchId : null,
    loser_next_slot: match.loserNextSlot || null,
  };
}

export function tableControlsFromDb(rows) {
  return Object.fromEntries(
    rows.map((row) => [row.table_name, { timeBankSeconds: row.time_bank_seconds || 0 }])
  );
}

export function tableControlToDb(tableName, control, tournamentId) {
  return {
    tournament_id: tournamentId,
    table_name: tableName,
    time_bank_seconds: Number(control?.timeBankSeconds) || 0,
  };
}

export function timelineFromDb(row) {
  return {
    id: row.id,
    timeStart: row.time_start,
    timeEnd: row.time_end || "",
    titleZh: row.title_zh,
    titleEn: row.title_en || "",
    descriptionZh: row.description_zh || "",
    descriptionEn: row.description_en || "",
    order: row.item_order || 1,
  };
}

export function timelineToDb(item, tournamentId) {
  return {
    ...withUuidId(item),
    tournament_id: tournamentId,
    time_start: item.timeStart,
    time_end: item.timeEnd || null,
    title_zh: item.titleZh,
    title_en: item.titleEn || null,
    description_zh: item.descriptionZh || null,
    description_en: item.descriptionEn || null,
    item_order: Number(item.order) || 1,
  };
}

export function breakFromDb(row) {
  return {
    id: row.id,
    nameZh: row.name_zh,
    nameEn: row.name_en || "",
    afterStageId: row.after_stage_id || "",
    afterRound: row.after_round || 1,
    durationMinutes: row.duration_minutes || 30,
    status: row.status || "scheduled",
    startedAt: msFromIso(row.started_at),
    endedAt: msFromIso(row.ended_at),
  };
}

export function breakToDb(item, tournamentId) {
  return {
    ...withUuidId(item),
    tournament_id: tournamentId,
    name_zh: item.nameZh,
    name_en: item.nameEn || null,
    after_stage_id: isUuid(item.afterStageId) ? item.afterStageId : null,
    after_round: Number(item.afterRound) || null,
    duration_minutes: Number(item.durationMinutes) || 30,
    status: item.status || "scheduled",
    started_at: isoFromMs(item.startedAt),
    ended_at: isoFromMs(item.endedAt),
  };
}

export function doublesPairToDb(pair, tournamentId, playerByName = new Map()) {
  return {
    tournament_id: tournamentId,
    player_a_name: pair.playerA || pair.playerAName || pair.player_a_name,
    player_b_name: pair.playerB || pair.playerBName || pair.player_b_name,
    player_a_id: isUuid(playerByName.get((pair.playerA || pair.playerAName || "").toLowerCase())?.id)
      ? playerByName.get((pair.playerA || pair.playerAName || "").toLowerCase()).id
      : null,
    player_b_id: isUuid(playerByName.get((pair.playerB || pair.playerBName || "").toLowerCase())?.id)
      ? playerByName.get((pair.playerB || pair.playerBName || "").toLowerCase()).id
      : null,
    status: pair.status || "confirmed",
    notes: pair.notes || null,
  };
}

export function doublesPairFromDb(row) {
  return {
    id: row.id,
    playerAName: row.player_a_name,
    playerBName: row.player_b_name,
    playerAId: row.player_a_id || "",
    playerBId: row.player_b_id || "",
    status: row.status || "confirmed",
    notes: row.notes || "",
  };
}
