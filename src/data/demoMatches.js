import { demoPlayers, tables } from "./demoPlayers.js";

export { tables };

const rounds = ["Group Stage", "Round 1", "Round 2", "Quarterfinal", "Semifinal", "Final"];
const statuses = ["Finished", "Playing", "Upcoming"];
const categoryCycle = [
  "singles",
  "womens_singles",
  "mixed_doubles",
  "singles",
  "mixed_doubles",
  "womens_singles",
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

function scoreFor(status, index) {
  if (status === "Finished") {
    return ["3-0", "3-1", "3-2", "2-1"][index % 4];
  }

  if (status === "Playing") {
    return ["1-0", "1-1", "2-1"][index % 3];
  }

  return "";
}

function eligiblePlayers(categoryId) {
  if (categoryId === "womens_singles") {
    return demoPlayers.filter((player) => player.gender === "Female");
  }

  return demoPlayers.filter((player) => player.categories.includes("singles"));
}

export const demoMatches = Array.from({ length: 36 }, (_, index) => {
  const status = index < 10 ? statuses[0] : index < 16 ? statuses[1] : statuses[2];
  const categoryId = categoryCycle[index % categoryCycle.length];
  const isDoubles = categoryId === "mixed_doubles";
  const pool = eligiblePlayers(categoryId);
  const playerA = pool[index % pool.length];
  const playerB = pool[(index + 5) % pool.length];
  const pair = doublesPairs[index % doublesPairs.length];

  return {
    id: `m${String(index + 1).padStart(3, "0")}`,
    time: timeAt(index),
    table: tables[index % tables.length],
    categoryId,
    round: rounds[index % rounds.length],
    playerAId: isDoubles ? "" : playerA.id,
    playerAName: isDoubles ? pair[0] : playerA.name,
    playerBId: isDoubles ? "" : playerB.id,
    playerBName: isDoubles ? pair[1] : playerB.name,
    playerARating: isDoubles ? null : playerA.rating,
    playerBRating: isDoubles ? null : playerB.rating,
    status,
    score: scoreFor(status, index),
  };
});
