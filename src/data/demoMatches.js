import { demoPlayers, tables } from "./demoPlayers.js";

export { tables };

const rounds = ["Group Stage", "Round 1", "Round 2", "Quarterfinal", "Semifinal", "Final"];
const statuses = ["Finished", "Playing", "Upcoming"];
const stageCycle = [
  {
    eventId: "singles",
    categoryId: "singles",
    stageId: "stage_001",
    stageFormat: "round_robin",
    matchFormat: "best_of_5",
    winnerGames: 3,
    defaultMinutes: 25,
  },
  {
    eventId: "womens_singles",
    categoryId: "womens_singles",
    stageId: "stage_002",
    stageFormat: "round_robin",
    matchFormat: "best_of_5",
    winnerGames: 3,
    defaultMinutes: 25,
  },
  {
    eventId: "mixed_doubles",
    categoryId: "mixed_doubles",
    stageId: "stage_003",
    stageFormat: "knockout",
    matchFormat: "best_of_3",
    winnerGames: 2,
    defaultMinutes: 15,
  },
  {
    eventId: "singles",
    categoryId: "singles",
    stageId: "stage_004",
    stageFormat: "placement",
    matchFormat: "best_of_7",
    winnerGames: 4,
    defaultMinutes: 45,
  },
];

const doublesPairs = [
  ["Alex Chen / Ryan Li", "Ethan Wang / Lucas Zhao"],
  ["Ella Yu / Sophia Lin", "Hannah Hu / Arianna Zhang"],
  ["Max Zhang / Leo Huang", "Olivia Yang / Mia Chen"],
  ["Jason Xu / Andy Wong", "Anna Feng / Bella Tang"],
  ["Noah Lee / Tony Qian", "Grace Liu / Chloe Wang"],
  ["Eric Zhao / William Tan", "Lucy He / Cindy Luo"],
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function timeAt(index) {
  const startMinutes = 9 * 60;
  const minutes = startMinutes + index * (index % 2 === 0 ? 15 : 20);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `2026-06-15T${pad(hour)}:${pad(minute)}:00`;
}

function scoreFor(status, winnerGames, index) {
  if (status !== "Finished") return "";

  const loser = index % winnerGames;
  return index % 2 === 0 ? `${winnerGames}-${loser}` : `${loser}-${winnerGames}`;
}

function eligiblePlayers(categoryId) {
  if (categoryId === "womens_singles") {
    return demoPlayers.filter((player) => player.gender === "Female");
  }

  return demoPlayers.filter((player) => player.categories.includes("singles"));
}

export const demoMatches = Array.from({ length: 36 }, (_, index) => {
  const status = index < 6 ? statuses[0] : index < 12 ? statuses[1] : statuses[2];
  const stage = stageCycle[index % stageCycle.length];
  const isDoubles = stage.categoryId === "mixed_doubles";
  const pool = eligiblePlayers(stage.categoryId);
  const playerA = pool[index % pool.length];
  const playerB = pool[(index + 5) % pool.length];
  const pair = doublesPairs[index % doublesPairs.length];
  const table = tables[index % tables.length];
  const isBye = index === 14;
  const remainingSeconds =
    status === "Playing"
      ? Math.max(120, stage.defaultMinutes * 60 - (index - 5) * 180)
      : status === "Finished"
        ? 0
        : null;

  return {
    id: `m${String(index + 1).padStart(3, "0")}`,
    ...stage,
    time: timeAt(index),
    table: isBye ? "" : table,
    tableOrder: index,
    groupId: stage.stageFormat === "round_robin" ? `group_${index % 3}` : "",
    bracketRound: stage.stageFormat === "round_robin" ? null : Math.floor(index / 8) + 1,
    bracketPosition: stage.stageFormat === "round_robin" ? null : (index % 8) + 1,
    nextMatchId: stage.stageFormat === "knockout" ? `m${String(index + 9).padStart(3, "0")}` : "",
    nextSlot: stage.stageFormat === "knockout" ? (index % 2 === 0 ? "A" : "B") : "",
    winnerNextMatchId: stage.stageFormat === "placement" ? `m${String(index + 9).padStart(3, "0")}` : "",
    winnerNextSlot: stage.stageFormat === "placement" ? (index % 2 === 0 ? "A" : "B") : "",
    loserNextMatchId: stage.stageFormat === "placement" ? `m${String(index + 10).padStart(3, "0")}` : "",
    loserNextSlot: stage.stageFormat === "placement" ? (index % 2 === 0 ? "B" : "A") : "",
    playerAId: isDoubles ? "" : playerA.id,
    playerAName: isDoubles ? pair[0] : playerA.name,
    playerARating: isDoubles ? null : playerA.rating,
    playerBId: isBye ? "" : isDoubles ? "" : playerB.id,
    playerBName: isBye ? "Bye" : isDoubles ? pair[1] : playerB.name,
    playerBRating: isBye || isDoubles ? null : playerB.rating,
    isBye,
    status: isBye ? "Finished" : status,
    score: isBye ? "BYE" : scoreFor(status, stage.winnerGames, index),
    winnerSide: isBye ? "A" : null,
    winnerId: isBye ? (isDoubles ? "" : playerA.id) : null,
    loserId: null,
    remainingSeconds,
    startedAt: status === "Playing" ? Date.now() - (index - 5) * 180000 : null,
    countdownActive: status === "Playing",
    overtime: false,
  };
});
