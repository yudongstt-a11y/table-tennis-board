import { getMatchFormat } from "../constants/matchFormats.js";

const BRACKET_SIZES = [2, 4, 8, 16, 32, 64];

function entryName(entry) {
  return entry?.displayName || entry?.name || "";
}

function entryRating(entry) {
  if (entry?.entryType === "pair" || entry?.type === "pair") {
    return entry.totalRating ?? entry.averageRating ?? null;
  }

  return entry?.rating ?? null;
}

function entryMembers(entry) {
  if (entry?.playerAMembers?.length) return entry.playerAMembers;
  if (entry?.members?.length) return entry.members;

  const names = [entry?.playerAName, entry?.playerBName].filter(Boolean);
  return names.length ? names : null;
}

function participantPayload(entry, side) {
  const prefix = side === "A" ? "playerA" : "playerB";
  return {
    [`${prefix}Id`]: entry?.id || null,
    [`${prefix}Name`]: entryName(entry),
    [`${prefix}Rating`]: entryRating(entry),
    [`${prefix}Members`]: entryMembers(entry),
  };
}

function roundNamesForSize(bracketSize) {
  return getKnockoutRounds(bracketSize);
}

function standardSeedSlotOrder(bracketSize) {
  let order = [1, 2];

  while (order.length < bracketSize) {
    const nextSize = order.length * 2;
    order = order.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }

  return order;
}

function copyWinnerToSlot(match, side, sourceMatch, winnerSide) {
  const targetPrefix = side === "A" ? "playerA" : "playerB";
  const sourcePrefix = winnerSide === "A" ? "playerA" : "playerB";

  return {
    ...match,
    [`${targetPrefix}Id`]: sourceMatch[`${sourcePrefix}Id`],
    [`${targetPrefix}Name`]: sourceMatch[`${sourcePrefix}Name`],
    [`${targetPrefix}Rating`]: sourceMatch[`${sourcePrefix}Rating`],
    [`${targetPrefix}Members`]: sourceMatch[`${sourcePrefix}Members`] || null,
  };
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function advanceByeMatches(matches) {
  let nextMatches = matches;

  nextMatches
    .filter((match) => match.isBye && match.status === "Finished" && match.nextMatchId && match.nextSlot)
    .forEach((byeMatch) => {
      nextMatches = nextMatches.map((match) =>
        match.id === byeMatch.nextMatchId
          ? copyWinnerToSlot(match, byeMatch.nextSlot, byeMatch, byeMatch.winnerSide)
          : match
      );
    });

  return nextMatches;
}

export function getBracketSize(entryCount) {
  const count = Math.max(1, Number(entryCount) || 1);
  const size = BRACKET_SIZES.find((item) => item >= count);
  if (!size) {
    throw new Error("Knockout brackets currently support up to 64 entries.");
  }
  return size;
}

export function getKnockoutRounds(bracketSize) {
  const roundsBySize = {
    2: ["Final"],
    4: ["SF", "Final"],
    8: ["QF", "SF", "Final"],
    16: ["R16", "QF", "SF", "Final"],
    32: ["R32", "R16", "QF", "SF", "Final"],
    64: ["R64", "R32", "R16", "QF", "SF", "Final"],
  };

  return roundsBySize[bracketSize] || roundsBySize[getBracketSize(bracketSize)];
}

export function generateSeedPositions(bracketSize) {
  const size = getBracketSize(bracketSize);
  let positions = [1];

  while (positions.length < size) {
    const nextSize = positions.length * 2;
    positions = positions.flatMap((position) => [position, nextSize + 1 - position]);
  }

  const mapping = Object.fromEntries(positions.map((position, index) => [index + 1, position]));

  // The event uses the common published draw convention where seeds 3 and 4
  // sit on opposite half-final lines for a 32 draw: 3 -> 17, 4 -> 16.
  if (size >= 4) {
    [mapping[3], mapping[4]] = [mapping[4], mapping[3]];
  }

  return mapping;
}

export function generateKnockoutBracketEntries(seedEntries) {
  const entries = seedEntries.filter(Boolean);
  const bracketSize = getBracketSize(entries.length);
  const seedPositions = generateSeedPositions(bracketSize);
  const slotSeeds = standardSeedSlotOrder(bracketSize);

  return slotSeeds.map((seed, slotIndex) => ({
    seed,
    position: seedPositions[seed] || slotIndex + 1,
    slot: slotIndex + 1,
    entry: entries[seed - 1] || null,
    isBye: seed > entries.length,
  }));
}

export function generateFirstRoundMatches(bracketEntries) {
  const matches = [];

  for (let index = 0; index < bracketEntries.length; index += 2) {
    matches.push({
      bracketPosition: matches.length + 1,
      slotA: bracketEntries[index],
      slotB: bracketEntries[index + 1],
    });
  }

  return matches;
}

export function generateKnockoutMatches({ entries, stage, tournamentId }) {
  const cleanEntries = entries.filter(Boolean);
  if (!cleanEntries.length) return [];

  const bracketSize = getBracketSize(cleanEntries.length);
  const roundNames = roundNamesForSize(bracketSize);
  const matchFormat = stage.matchFormat || "best_of_5";
  const format = getMatchFormat(matchFormat);
  const winnerGames = Number(stage.winnerGames || format.winnerGames);
  const defaultMinutes = Number(stage.defaultMinutes || format.defaultMinutes);
  const defaultSeconds = defaultMinutes * 60;
  const bracketEntries = generateKnockoutBracketEntries(cleanEntries);
  const firstRound = generateFirstRoundMatches(bracketEntries);
  const rounds = [];

  let matchesInRound = bracketSize / 2;
  for (let roundIndex = 0; roundIndex < roundNames.length; roundIndex += 1) {
    const roundNumber = roundIndex + 1;
    const roundName = roundNames[roundIndex];
    const roundMatches = [];

    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex += 1) {
      const id = makeId(`ko_${stage.id}_${roundNumber}_${matchIndex + 1}`);
      const baseMatch = {
        id,
        tournamentId,
        eventId: stage.eventId,
        category: stage.eventId,
        categoryId: stage.eventId,
        stageId: stage.id,
        stageFormat: "knockout",
        matchFormat,
        winnerGames,
        defaultMinutes,
        defaultSeconds,
        round: roundName,
        roundNumber,
        bracketRound: roundNumber,
        bracketPosition: matchIndex + 1,
        table: "",
        tableOrder: null,
        scheduledTime: "",
        time: "",
        isBye: false,
        status: "Upcoming",
        score: "",
        winnerSide: null,
        winnerId: null,
        loserId: null,
        playerAId: null,
        playerAName: "",
        playerARating: null,
        playerAMembers: null,
        playerBId: null,
        playerBName: "",
        playerBRating: null,
        playerBMembers: null,
        nextMatchId: null,
        nextSlot: null,
      };

      if (roundIndex === 0) {
        const pairing = firstRound[matchIndex];
        const entryA = pairing.slotA?.entry || null;
        const entryB = pairing.slotB?.entry || null;
        const isBye = !entryA || !entryB;
        const winnerSide = isBye ? (entryA ? "A" : "B") : null;

        roundMatches.push({
          ...baseMatch,
          ...participantPayload(entryA, "A"),
          ...participantPayload(entryB, "B"),
          playerAName: entryA ? entryName(entryA) : "Bye",
          playerBName: entryB ? entryName(entryB) : "Bye",
          isBye,
          status: isBye ? "Finished" : "Upcoming",
          score: isBye ? "Bye" : "",
          winnerSide,
          winnerId: winnerSide === "A" ? entryA?.id || null : entryB?.id || null,
        });
      } else {
        roundMatches.push(baseMatch);
      }
    }

    rounds.push(roundMatches);
    matchesInRound = Math.max(1, matchesInRound / 2);
  }

  for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex += 1) {
    rounds[roundIndex] = rounds[roundIndex].map((match, matchIndex) => ({
      ...match,
      nextMatchId: rounds[roundIndex + 1][Math.floor(matchIndex / 2)].id,
      nextSlot: matchIndex % 2 === 0 ? "A" : "B",
    }));
  }

  return advanceByeMatches(rounds.flat());
}
