import { getMatchFormat } from "../constants/matchFormats.js";
import {
  applyBonusTimeToNextMatch,
  calculateRemainingSeconds,
  startMatchTimer,
  stopMatchTimer,
} from "./matchTimer.js";

function byQueue(a, b) {
  const tableOrderDiff = (Number(a.tableOrder) || 1000) - (Number(b.tableOrder) || 1000);
  if (tableOrderDiff !== 0) return tableOrderDiff;
  return new Date(a.time) - new Date(b.time);
}

function byTime(a, b) {
  return new Date(a.time) - new Date(b.time);
}

function tableMatches(matches, table) {
  return matches
    .filter((match) => match.table === table && !match.isBye)
    .sort(byQueue);
}

function keepSinglePlayingOnTable(matches, table, playingMatchId) {
  return matches.map((match) => {
    if (match.table !== table || match.id === playingMatchId || match.status === "Finished") {
      return match;
    }

    if (match.status === "Playing") {
      return { ...match, status: "Upcoming", countdownActive: false };
    }

    return match;
  });
}

function normalizeTableOrder(matches, table) {
  const ordered = tableMatches(matches, table);
  const orderMap = new Map(ordered.map((match, index) => [match.id, index + 1]));

  return matches.map((match) =>
    orderMap.has(match.id) ? { ...match, tableOrder: orderMap.get(match.id) } : match
  );
}

export function isFirstTableMatch(matches, matchId) {
  const match = matches.find((item) => item.id === matchId);
  if (!match || match.isBye || !match.table) return false;

  const firstMatch = tableMatches(matches, match.table)[0];
  return firstMatch?.id === matchId;
}

export function startFirstTableMatch(matches, matchId) {
  const match = matches.find((item) => item.id === matchId);
  if (!match || match.status !== "Upcoming" || !isFirstTableMatch(matches, matchId)) {
    return matches;
  }

  const started = startMatchTimer(matches, matchId);
  return keepSinglePlayingOnTable(started, match.table, matchId);
}

export function startNextTableMatch(matches, table) {
  const nextMatch = tableMatches(matches, table).find((match) => match.status === "Upcoming");
  if (!nextMatch) return matches;

  const started = startMatchTimer(matches, nextMatch.id);
  return keepSinglePlayingOnTable(started, table, nextMatch.id);
}

export function autoAdvanceTable(matches, finishedMatchId, bonusSeconds = 0) {
  const finishedMatch = matches.find((match) => match.id === finishedMatchId);
  if (!finishedMatch || finishedMatch.status !== "Finished" || !finishedMatch.table) return matches;

  const ordered = tableMatches(matches, finishedMatch.table).sort(byTime);
  const finishedIndex = ordered.findIndex((match) => match.id === finishedMatchId);
  if (finishedIndex === -1) return matches;

  const nextMatch = ordered
    .slice(finishedIndex + 1)
    .find((match) => match.status === "Upcoming");

  if (!nextMatch) return matches;

  let updated = applyBonusTimeToNextMatch(matches, nextMatch.id, bonusSeconds);
  updated = startMatchTimer(updated, nextMatch.id);
  return keepSinglePlayingOnTable(updated, finishedMatch.table, nextMatch.id);
}

export function buildScore(winnerSide, loserScore, winnerGames = 3) {
  const loser = Number(loserScore);
  return winnerSide === "A" ? `${winnerGames}-${loser}` : `${loser}-${winnerGames}`;
}

function playerPayload(match, side) {
  const prefix = side === "A" ? "playerA" : "playerB";
  return {
    [`${prefix}Id`]: match[`${prefix}Id`],
    [`${prefix}Name`]: match[`${prefix}Name`],
    [`${prefix}Rating`]: match[`${prefix}Rating`],
  };
}

function fillSlot(match, side, sourceMatch, sourceSide) {
  if (!match || !side) return match;

  const sourcePrefix = sourceSide === "A" ? "playerA" : "playerB";
  const targetPrefix = side === "A" ? "playerA" : "playerB";

  return {
    ...match,
    [`${targetPrefix}Id`]: sourceMatch[`${sourcePrefix}Id`],
    [`${targetPrefix}Name`]: sourceMatch[`${sourcePrefix}Name`],
    [`${targetPrefix}Rating`]: sourceMatch[`${sourcePrefix}Rating`],
  };
}

export function advanceBracketWinner(matches, matchId) {
  const match = matches.find((item) => item.id === matchId);
  if (!match?.nextMatchId || !match.nextSlot || !match.winnerSide) return matches;

  return matches.map((item) =>
    item.id === match.nextMatchId ? fillSlot(item, match.nextSlot, match, match.winnerSide) : item
  );
}

export function advancePlacementWinnerLoser(matches, matchId) {
  const match = matches.find((item) => item.id === matchId);
  if (!match?.winnerSide) return matches;

  const loserSide = match.winnerSide === "A" ? "B" : "A";

  return matches.map((item) => {
    if (item.id === match.winnerNextMatchId) {
      return fillSlot(item, match.winnerNextSlot, match, match.winnerSide);
    }

    if (item.id === match.loserNextMatchId && !match.isBye) {
      return fillSlot(item, match.loserNextSlot, match, loserSide);
    }

    return item;
  });
}

export function submitMatchResult(matches, matchId, winnerSide, loserScore) {
  const existingMatch = matches.find((match) => match.id === matchId);
  if (!existingMatch) return matches;

  const wasFinished = existingMatch.status === "Finished";
  const winnerGames = existingMatch.winnerGames || getMatchFormat(existingMatch.matchFormat).winnerGames;
  const score = buildScore(winnerSide, loserScore, winnerGames);
  const remainingSeconds = Math.max(0, calculateRemainingSeconds(existingMatch) || 0);
  const loserSide = winnerSide === "A" ? "B" : "A";

  let updated = stopMatchTimer(matches, matchId).map((match) =>
    match.id === matchId
      ? {
          ...match,
          status: "Finished",
          score,
          winnerSide,
          winnerId: match[`player${winnerSide}Id`] || null,
          loserId: match[`player${loserSide}Id`] || null,
          countdownActive: false,
          overtime: remainingSeconds <= 0,
        }
      : match
  );

  updated = advanceBracketWinner(updated, matchId);
  updated = advancePlacementWinnerLoser(updated, matchId);

  if (!wasFinished) {
    updated = autoAdvanceTable(updated, matchId, remainingSeconds);
  }

  return updated;
}

export function moveMatchToTable(matches, matchId, targetTable) {
  const moving = matches.find((match) => match.id === matchId);
  if (!moving || moving.status === "Finished" || !targetTable) return matches;

  const targetPlaying = tableMatches(matches, targetTable).find((match) => match.status === "Playing");
  const nextOrder = targetPlaying ? (Number(targetPlaying.tableOrder) || 1) + 0.5 : 0.5;
  const nextStatus = moving.status === "Playing" && targetPlaying ? "Upcoming" : moving.status;

  let updated = matches.map((match) =>
    match.id === matchId
      ? {
          ...match,
          table: targetTable,
          tableOrder: nextOrder,
          status: nextStatus,
          countdownActive: nextStatus === "Playing" ? match.countdownActive : false,
        }
      : match
  );

  updated = normalizeTableOrder(updated, targetTable);
  if (moving.table && moving.table !== targetTable) {
    updated = normalizeTableOrder(updated, moving.table);
  }

  if (nextStatus === "Playing") {
    updated = keepSinglePlayingOnTable(updated, targetTable, matchId);
  }

  return updated;
}

export function queueSort(a, b) {
  return byQueue(a, b);
}
