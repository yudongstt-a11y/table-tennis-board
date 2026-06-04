export function autoAdvanceTable(matches, finishedMatchId) {
  const finishedMatch = matches.find((match) => match.id === finishedMatchId);
  if (!finishedMatch || finishedMatch.status !== "Finished") return matches;

  const tableMatches = matches
    .filter((match) => match.table === finishedMatch.table)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
  const finishedIndex = tableMatches.findIndex((match) => match.id === finishedMatchId);
  if (finishedIndex === -1) return matches;

  const nextMatch = tableMatches
    .slice(finishedIndex + 1)
    .find((match) => match.status === "Upcoming");

  if (!nextMatch) return matches;

  return matches.map((match) => {
    if (match.id === nextMatch.id) {
      return { ...match, status: "Playing" };
    }

    if (
      match.table === finishedMatch.table &&
      match.id !== finishedMatchId &&
      match.id !== nextMatch.id &&
      match.status === "Playing"
    ) {
      return { ...match, status: "Upcoming" };
    }

    return match;
  });
}
