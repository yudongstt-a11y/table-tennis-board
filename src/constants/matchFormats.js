export const MATCH_FORMATS = [
  {
    id: "best_of_3",
    zh: "三局两胜",
    en: "Best of 3",
    winnerGames: 2,
    defaultMinutes: 15,
  },
  {
    id: "best_of_5",
    zh: "五局三胜",
    en: "Best of 5",
    winnerGames: 3,
    defaultMinutes: 25,
  },
  {
    id: "best_of_7",
    zh: "七局四胜",
    en: "Best of 7",
    winnerGames: 4,
    defaultMinutes: 45,
  },
];

export const STAGE_FORMATS = [
  { id: "round_robin", zh: "小组循环", en: "Round Robin" },
  { id: "knockout", zh: "淘汰赛", en: "Knockout" },
  { id: "placement", zh: "排位赛", en: "Placement" },
];

export function getMatchFormat(formatId = "best_of_5") {
  return MATCH_FORMATS.find((format) => format.id === formatId) || MATCH_FORMATS[1];
}

export function getStageFormat(formatId = "round_robin") {
  return STAGE_FORMATS.find((format) => format.id === formatId) || STAGE_FORMATS[0];
}

export function getMatchFormatLabel(formatId, language = "zh") {
  const format = getMatchFormat(formatId);
  return format[language] || format.en;
}

export function getStageFormatLabel(formatId, language = "zh") {
  const format = getStageFormat(formatId);
  return format[language] || format.en;
}
