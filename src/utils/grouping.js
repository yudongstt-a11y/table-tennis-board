import { generateRoundRobinPairings, seedPlayers } from "./matchGeneration.js";

function groupName(index) {
  return `Group ${String.fromCharCode(65 + index)}`;
}

export function sortPlayersForSeeding(players) {
  return seedPlayers(players);
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

export function averageRating(playerIds, playersById) {
  const ratings = playerIds
    .map((id) => playersById.get(id)?.rating)
    .filter((rating) => rating !== null && rating !== undefined && rating !== "");

  if (!ratings.length) return null;
  return Math.round(ratings.reduce((sum, rating) => sum + Number(rating), 0) / ratings.length);
}

export function createGroupMatches({ groups, playersById, stage, eventId }) {
  const baseTime = new Date("2026-06-15T09:00:00");

  return groups.flatMap((group) => {
    const groupPlayers = group.playerIds.map((id) => playersById.get(id)).filter(Boolean);
    const rounds = generateRoundRobinPairings(groupPlayers);

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
          playerAId: playerA.id,
          playerAName: playerA.name,
          playerARating: playerA.rating,
          playerBId: playerB.id,
          playerBName: playerB.name,
          playerBRating: playerB.rating,
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
