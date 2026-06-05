import { generateRoundRobinPairings, seedPlayers } from "./matchGeneration.js";

function groupName(index) {
  return `Group ${String.fromCharCode(65 + index)}`;
}

export function sortPlayersForSeeding(players) {
  return seedPlayers(players);
}

export function averagePairRating(pair) {
  const ratings = [pair.playerARating, pair.playerBRating].filter(
    (rating) => rating !== null && rating !== undefined && rating !== ""
  );

  if (!ratings.length) return null;
  return ratings.reduce((sum, rating) => sum + Number(rating), 0) / ratings.length;
}

export function pairDisplayName(pair) {
  return pair.displayName || `${pair.playerAName} / ${pair.playerBName}`;
}

export function buildDoublesPairEntries(pairs, players) {
  const playersByName = new Map(players.map((player) => [player.name.toLowerCase(), player]));

  return pairs
    .filter((pair) => (pair.status || "confirmed") === "confirmed")
    .map((pair, index) => {
      const playerA = playersByName.get(String(pair.playerAName || pair.playerA || "").toLowerCase());
      const playerB = playersByName.get(String(pair.playerBName || pair.playerB || "").toLowerCase());
      const entry = {
        id: pair.id || `pair_${index}_${pair.playerAName || pair.playerA}_${pair.playerBName || pair.playerB}`,
        type: "pair",
        displayName: `${pair.playerAName || pair.playerA} / ${pair.playerBName || pair.playerB}`,
        playerAName: pair.playerAName || pair.playerA,
        playerBName: pair.playerBName || pair.playerB,
        playerAId: pair.playerAId || playerA?.id || "",
        playerBId: pair.playerBId || playerB?.id || "",
        playerARating: pair.playerARating ?? playerA?.rating ?? null,
        playerBRating: pair.playerBRating ?? playerB?.rating ?? null,
        notes: pair.notes || "",
      };
      return {
        ...entry,
        averageRating: averagePairRating(entry),
      };
    })
    .sort((a, b) => {
      const aRating = a.averageRating;
      const bRating = b.averageRating;
      if (aRating !== null && bRating === null) return -1;
      if (aRating === null && bRating !== null) return 1;
      if (aRating !== null && bRating !== null) return bRating - aRating;
      return pairDisplayName(a).localeCompare(pairDisplayName(b));
    });
}

export function calculateGroupCount(totalPlayers, groupSize, groupCount) {
  if (Number(groupCount) >= 1) return Number(groupCount);
  if (Number(groupSize) >= 2) return Math.ceil(totalPlayers / Number(groupSize));
  return Math.max(1, Math.ceil(totalPlayers / 4));
}

export function generateFairGroups({ seedPlayerIds, groupCount }) {
  const count = Math.max(1, Number(groupCount) || 1);
  const groups = Array.from({ length: count }, (_, index) => ({
    name: groupName(index),
    order: index + 1,
    playerIds: [],
  }));

  seedPlayerIds.forEach((playerId, index) => {
    const round = Math.floor(index / count);
    const position = index % count;
    const groupIndex = round % 2 === 0 ? position : count - 1 - position;
    groups[groupIndex].playerIds.push(playerId);
  });

  return groups;
}

export function groupEntryIds(group) {
  return group.entryIds || group.playerIds || [];
}

export function generateFairEntryGroups({ seedEntryIds, groupCount, entryType = "player" }) {
  return generateFairGroups({ seedPlayerIds: seedEntryIds, groupCount }).map((group) => ({
    ...group,
    entryType,
    entryIds: group.playerIds,
    playerIds: entryType === "player" ? group.playerIds : [],
  }));
}

export function averageRating(playerIds, playersById) {
  const ratings = playerIds
    .map((id) => playersById.get(id)?.rating)
    .filter((rating) => rating !== null && rating !== undefined && rating !== "");

  if (!ratings.length) return null;
  return Math.round(ratings.reduce((sum, rating) => sum + Number(rating), 0) / ratings.length);
}

export function averageEntryRating(entryIds, entriesById) {
  const ratings = entryIds
    .map((id) => entriesById.get(id)?.averageRating ?? entriesById.get(id)?.rating)
    .filter((rating) => rating !== null && rating !== undefined && rating !== "");

  if (!ratings.length) return null;
  return Math.round((ratings.reduce((sum, rating) => sum + Number(rating), 0) / ratings.length) * 10) / 10;
}

export function createGroupMatches({ groups, playersById, entriesById = playersById, stage, eventId }) {
  const baseTime = new Date("2026-06-15T09:00:00");

  return groups.flatMap((group) => {
    const isPairs = group.entryType === "pair";
    const groupEntries = groupEntryIds(group).map((id) => entriesById.get(id) || playersById.get(id)).filter(Boolean);
    const rounds = generateRoundRobinPairings(groupEntries);

    return rounds.flatMap((round, roundIndex) =>
      round.map(([playerA, playerB], matchIndex) => {
        const time = new Date(
          baseTime.getTime() + (group.order - 1) * 60 * 60 * 1000 + roundIndex * 20 * 60 * 1000
        );

        return {
          id: `m_group_${stage.id}_${group.order}_${roundIndex + 1}_${matchIndex + 1}_${Date.now()}`,
          eventId,
          categoryId: eventId,
          stageId: stage.id,
          stageFormat: stage.format,
          matchFormat: stage.matchFormat,
          winnerGames: stage.winnerGames,
          defaultMinutes: stage.defaultMatchMinutes,
          defaultMatchMinutes: stage.defaultMatchMinutes,
          remainingSeconds: null,
          countdownActive: false,
          overtime: false,
          groupId: group.id,
          bracketRound: null,
          bracketPosition: null,
          round: `${group.name} - Round ${roundIndex + 1}`,
          roundNumber: roundIndex + 1,
          time: time.toISOString().slice(0, 19),
          table: "",
          tableOrder: 1000 + group.order * 100 + roundIndex * 10 + matchIndex,
          playerAId: isPairs ? "" : playerA.id,
          playerAName: isPairs ? pairDisplayName(playerA) : playerA.name,
          playerARating: isPairs ? playerA.totalRating ?? playerA.averageRating : playerA.rating,
          playerAMembers: isPairs
            ? [playerA.playerAName, playerA.playerBName].filter(Boolean)
            : [playerA.name],
          playerBId: isPairs ? "" : playerB.id,
          playerBName: isPairs ? pairDisplayName(playerB) : playerB.name,
          playerBRating: isPairs ? playerB.totalRating ?? playerB.averageRating : playerB.rating,
          playerBMembers: isPairs
            ? [playerB.playerAName, playerB.playerBName].filter(Boolean)
            : [playerB.name],
          isBye: false,
          status: "Upcoming",
          score: "",
          winnerSide: null,
          winnerId: null,
          loserId: null,
        };
      })
    );
  });
}
