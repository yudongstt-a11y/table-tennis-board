function byTime(a, b) {
  return new Date(a.time) - new Date(b.time);
}

export function isFirstTableMatch(matches, matchId) {
  const match = matches.find((item) => item.id === matchId);
  if (!match) return false;

  const firstMatch = matches
    .filter((item) => item.table === match.table)
    .sort(byTime)[0];

  return firstMatch?.id === matchId;
}

function keepSinglePlayingOnTable(matches, table, playingMatchId) {
  return matches.map((match) => {
    if (match.table !== table || match.id === playingMatchId || match.status === "Finished") {
      return match;
    }

    if (match.status === "Playing") {
      return { ...match, status: "Upcoming" };
    }

    return match;
  });
}

export function startFirstTableMatch(matches, matchId) {
  const match = matches.find((item) => item.id === matchId);
  if (!match || match.status !== "Upcoming" || !isFirstTableMatch(matches, matchId)) {
    return matches;
  }

  const started = matches.map((item) =>
    item.id === matchId ? { ...item, status: "Playing" } : item
  );

  return keepSinglePlayingOnTable(started, match.table, matchId);
}

export function autoAdvanceTable(matches, finishedMatchId) {
  const finishedMatch = matches.find((match) => match.id === finishedMatchId);
  if (!finishedMatch || finishedMatch.status !== "Finished") return matches;

  const tableMatches = matches
    .filter((match) => match.table === finishedMatch.table)
    .sort(byTime);
  const finishedIndex = tableMatches.findIndex((match) => match.id === finishedMatchId);
  if (finishedIndex === -1) return matches;

  const nextMatch = tableMatches
    .slice(finishedIndex + 1)
    .find((match) => match.status === "Upcoming");

  if (!nextMatch) return matches;

  const advanced = matches.map((match) =>
    match.id === nextMatch.id ? { ...match, status: "Playing" } : match
  );

  return keepSinglePlayingOnTable(advanced, finishedMatch.table, nextMatch.id);
}

export function buildScore(winnerSide, loserScore) {
  const loser = Number(loserScore);
  return winnerSide === "A" ? `3-${loser}` : `${loser}-3`;
}

export function submitMatchResult(matches, matchId, winnerSide, loserScore) {
  const existingMatch = matches.find((match) => match.id === matchId);
  if (!existingMatch) return matches;

  const wasFinished = existingMatch.status === "Finished";
  const score = buildScore(winnerSide, loserScore);
  let updated = matches.map((match) =>
    match.id === matchId ? { ...match, status: "Finished", score } : match
  );

  if (!wasFinished) {
    updated = autoAdvanceTable(updated, matchId);
  }

  return updated;
}
