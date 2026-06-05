function ratingValue(player) {
  return player.rating === null || player.rating === undefined ? -Infinity : Number(player.rating);
}

function toScheduledIso(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function seedPlayers(players) {
  return [...players].sort((a, b) => {
    const seedDiff = (Number(a.seed) || 9999) - (Number(b.seed) || 9999);
    if (seedDiff !== 0) return seedDiff;
    return ratingValue(b) - ratingValue(a);
  });
}

export function generateRoundRobinPairings(players) {
  const seeded = seedPlayers(players);

  if (seeded.length === 3) {
    return [
      [[seeded[0], seeded[2]]],
      [[seeded[1], seeded[2]]],
      [[seeded[0], seeded[1]]],
    ];
  }

  if (seeded.length === 4) {
    return [
      [[seeded[0], seeded[3]], [seeded[1], seeded[2]]],
      [[seeded[0], seeded[2]], [seeded[1], seeded[3]]],
      [[seeded[0], seeded[1]], [seeded[2], seeded[3]]],
    ];
  }

  const hasBye = seeded.length % 2 === 1;
  const rotating = hasBye ? [...seeded, null] : [...seeded];
  const roundCount = rotating.length - 1;
  const half = rotating.length / 2;
  const rounds = [];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const round = [];

    for (let index = 0; index < half; index += 1) {
      const playerA = rotating[index];
      const playerB = rotating[rotating.length - 1 - index];
      if (playerA && playerB) {
        round.push([playerA, playerB]);
      }
    }

    rounds.push(round);
    rotating.splice(1, 0, rotating.pop());
  }

  return rounds;
}

export function createRoundRobinMatches({ players, stage, startTime, tableList }) {
  const rounds = generateRoundRobinPairings(players);
  const start = new Date(startTime);

  return rounds.flatMap((round, roundIndex) =>
    round.map(([playerA, playerB], matchIndex) => {
      const time = toScheduledIso(start.getTime() + roundIndex * stage.defaultMatchMinutes * 60 * 1000);
      return {
        id: `m${Date.now()}_${roundIndex}_${matchIndex}`,
        eventId: stage.eventId,
        categoryId: stage.eventId,
        stageId: stage.id,
        stageFormat: stage.format,
        matchFormat: stage.matchFormat,
        winnerGames: stage.winnerGames,
        defaultMinutes: stage.defaultMatchMinutes,
        defaultMatchMinutes: stage.defaultMatchMinutes,
        remainingSeconds: null,
        groupId: "group_a",
        round: `Round ${roundIndex + 1}`,
        scheduledTime: time,
        time,
        table: tableList[matchIndex % tableList.length],
        tableOrder: roundIndex * 100 + matchIndex,
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
}
