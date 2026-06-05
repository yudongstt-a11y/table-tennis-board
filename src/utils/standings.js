import { groupEntryIds } from "./grouping.js";

function parseScore(score) {
  const match = String(score || "").match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
  return { a, b, winnerSide: a > b ? "A" : "B" };
}

function participantIds(match, side) {
  const prefix = side === "A" ? "playerA" : "playerB";
  const ids = [match[`${prefix}Id`]].filter(Boolean);
  const members = match[`${prefix}Members`];
  if (Array.isArray(members)) ids.push(...members);
  return ids;
}

function matchIncludesEntry(match, entryId) {
  return (
    match.playerAId === entryId ||
    match.playerBId === entryId ||
    participantIds(match, "A").includes(entryId) ||
    participantIds(match, "B").includes(entryId)
  );
}

function sideForEntry(match, entryId) {
  if (match.playerAId === entryId || participantIds(match, "A").includes(entryId)) return "A";
  if (match.playerBId === entryId || participantIds(match, "B").includes(entryId)) return "B";
  return "";
}

function entryName(entry, fallbackId) {
  return entry?.displayName || entry?.name || fallbackId;
}

function makeSeedIndex(seedOrder = []) {
  return new Map(seedOrder.map((id, index) => [id, index + 1]));
}

function tiedHeadToHeadWinner(a, b, relevantMatches) {
  const direct = relevantMatches.find(
    (match) => matchIncludesEntry(match, a.entryId) && matchIncludesEntry(match, b.entryId)
  );
  if (!direct) return 0;
  const score = parseScore(direct.score);
  if (!score) return 0;
  const winnerSide = direct.winnerSide || score.winnerSide;
  const aSide = sideForEntry(direct, a.entryId);
  const bSide = sideForEntry(direct, b.entryId);
  if (winnerSide === aSide) return -1;
  if (winnerSide === bSide) return 1;
  return 0;
}

export function calculateGroupStandings({ group, matches, players, seedOrder = [] }) {
  const ids = groupEntryIds(group);
  const entriesById = new Map(players.map((entry) => [entry.id, entry]));
  const seedIndex = makeSeedIndex(seedOrder.length ? seedOrder : ids);
  const rows = new Map(
    ids.map((id, index) => [
      id,
      {
        entryId: id,
        playerId: id,
        name: entryName(entriesById.get(id), id),
        played: 0,
        wins: 0,
        losses: 0,
        gamesFor: 0,
        gamesAgainst: 0,
        gameDifference: 0,
        rank: index + 1,
        needsManualConfirmation: false,
      },
    ])
  );

  const relevantMatches = matches.filter(
    (match) =>
      match.groupId === group.id ||
      (match.stageId === group.stageId && ids.some((id) => matchIncludesEntry(match, id)))
  );

  relevantMatches.forEach((match) => {
    if (match.status !== "Finished" || match.isBye) return;
    const score = parseScore(match.score);
    if (!score) return;

    const aId = ids.find((id) => sideForEntry(match, id) === "A");
    const bId = ids.find((id) => sideForEntry(match, id) === "B");
    if (!aId || !bId) return;

    const aRow = rows.get(aId);
    const bRow = rows.get(bId);
    aRow.played += 1;
    bRow.played += 1;
    aRow.gamesFor += score.a;
    aRow.gamesAgainst += score.b;
    bRow.gamesFor += score.b;
    bRow.gamesAgainst += score.a;

    if ((match.winnerSide || score.winnerSide) === "A") {
      aRow.wins += 1;
      bRow.losses += 1;
    } else {
      bRow.wins += 1;
      aRow.losses += 1;
    }
  });

  const standings = Array.from(rows.values()).map((row) => ({
    ...row,
    gameDifference: row.gamesFor - row.gamesAgainst,
  }));

  const winsMap = new Map();
  standings.forEach((row) => winsMap.set(row.wins, [...(winsMap.get(row.wins) || []), row]));

  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const tied = winsMap.get(a.wins) || [];
    if (tied.length === 2) {
      const direct = tiedHeadToHeadWinner(a, b, relevantMatches);
      if (direct !== 0) return direct;
    }
    if (b.gameDifference !== a.gameDifference) return b.gameDifference - a.gameDifference;
    if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;
    return (seedIndex.get(a.entryId) || 9999) - (seedIndex.get(b.entryId) || 9999);
  });

  return standings.map((row, index) => {
    const tied = standings.filter(
      (item) =>
        item.wins === row.wins &&
        item.gameDifference === row.gameDifference &&
        item.gamesFor === row.gamesFor
    );
    return {
      ...row,
      rank: index + 1,
      needsManualConfirmation: tied.length > 1 && row.played > 0,
    };
  });
}

export function generateDivisionEntriesFromGroupStandings({ groups, matches, players, targetEventId, seedOrder = [] }) {
  const seedIndex = makeSeedIndex(seedOrder);
  const divisions = {
    division1: [],
    division2: [],
    division3: [],
    division4: [],
  };

  groups
    .filter((group) => group.eventId === targetEventId)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .forEach((group) => {
      const standings = calculateGroupStandings({ group, matches, players, seedOrder });
      standings.slice(0, 4).forEach((row, index) => {
        const entry = players.find((player) => player.id === row.entryId);
        if (entry) {
          divisions[`division${index + 1}`].push({
            ...entry,
            groupRank: row.rank,
            groupWins: row.wins,
            groupGameDifference: row.gameDifference,
            seedRank: seedIndex.get(row.entryId) || 9999,
          });
        }
      });
    });

  Object.keys(divisions).forEach((key) => {
    divisions[key].sort(
      (a, b) =>
        (b.groupWins || 0) - (a.groupWins || 0) ||
        (b.groupGameDifference || 0) - (a.groupGameDifference || 0) ||
        (a.seedRank || 9999) - (b.seedRank || 9999)
    );
  });

  return divisions;
}

export function generateKnockoutEntriesFromGroupStandings({
  groups,
  matches,
  players,
  targetEventId,
  qualifiersPerGroup = 2,
  seedOrder = [],
}) {
  const seedIndex = makeSeedIndex(seedOrder);
  const rows = [];

  groups
    .filter((group) => group.eventId === targetEventId)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .forEach((group) => {
      const standings = calculateGroupStandings({ group, matches, players, seedOrder });
      standings.slice(0, Number(qualifiersPerGroup) || 1).forEach((row) => {
        const entry = players.find((player) => player.id === row.entryId);
        if (!entry) return;
        rows.push({
          ...entry,
          groupRank: row.rank,
          groupWins: row.wins,
          groupGameDifference: row.gameDifference,
          seedRank: seedIndex.get(row.entryId) || 9999,
        });
      });
    });

  return rows.sort(
    (a, b) =>
      (a.groupRank || 9999) - (b.groupRank || 9999) ||
      (b.groupWins || 0) - (a.groupWins || 0) ||
      (b.groupGameDifference || 0) - (a.groupGameDifference || 0) ||
      (a.seedRank || 9999) - (b.seedRank || 9999)
  );
}

export function getStageDivision(stage) {
  if (stage?.division) return Number(stage.division);
  const text = `${stage?.nameZh || ""} ${stage?.nameEn || ""}`;
  const divisionMatch = text.match(/division\s*([1-4])|div\s*([1-4])|第\s*([1-4一二三四])|第([一二三四])/i);
  const divisionValue = divisionMatch?.[1] || divisionMatch?.[2] || divisionMatch?.[3] || divisionMatch?.[4];
  const zhDivisionMap = { 一: 1, 二: 2, 三: 3, 四: 4 };
  if (divisionValue) return Number(zhDivisionMap[divisionValue] || divisionValue);
  const match = text.match(/division\s*([1-4])|div\s*([1-4])|第\s*([1-4])\s*组/i);
  return match ? Number(match[1] || match[2] || match[3]) : null;
}
