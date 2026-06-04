import { getMatchFormat } from "../constants/matchFormats.js";

export function getDefaultSeconds(matchFormat) {
  return getMatchFormat(matchFormat).defaultMinutes * 60;
}

export function formatCountdown(seconds) {
  const normalized = Math.max(0, Math.floor(Number(seconds) || 0));
  return formatDuration(normalized);
}

export function formatOvertime(seconds) {
  return formatDuration(Math.abs(Math.floor(Number(seconds) || 0)));
}

export function formatSignedTime(seconds) {
  const value = Math.floor(Number(seconds) || 0);
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${formatDuration(Math.abs(value))}`;
}

function formatDuration(totalSeconds) {
  const normalized = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const restSeconds = normalized % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
}

export function calculateRemainingSeconds(match, now = Date.now()) {
  if (match.status !== "Playing") {
    return match.remainingSeconds ?? null;
  }

  const baseSeconds =
    match.remainingSeconds ?? (match.defaultMinutes || match.defaultMatchMinutes || 25) * 60;
  if (!match.countdownActive || !match.startedAt) {
    return baseSeconds;
  }

  const elapsedSeconds = Math.floor((now - Number(match.startedAt)) / 1000);
  return baseSeconds - elapsedSeconds;
}

export function getMatchDefaultSeconds(match) {
  return (match.defaultMinutes || match.defaultMatchMinutes || getMatchFormat(match.matchFormat).defaultMinutes) * 60;
}

export function startMatchTimer(matches, matchId, initialSeconds = null) {
  const now = Date.now();

  return matches.map((match) => {
    if (match.id !== matchId) return match;

    const defaultSeconds = getMatchDefaultSeconds(match);
    const remainingSeconds = initialSeconds ?? match.remainingSeconds ?? defaultSeconds;

    return {
      ...match,
      status: "Playing",
      remainingSeconds,
      startedAt: now,
      countdownActive: true,
      overtime: remainingSeconds < 0,
    };
  });
}

export function stopMatchTimer(matches, matchId) {
  const now = Date.now();

  return matches.map((match) => {
    if (match.id !== matchId) return match;

    const remainingSeconds = calculateRemainingSeconds(match, now);

    return {
      ...match,
      remainingSeconds,
      countdownActive: false,
      overtime: remainingSeconds <= 0,
    };
  });
}

export function applyBonusTimeToNextMatch(matches, nextMatchId, bonusSeconds) {
  return matches.map((match) => {
    if (match.id !== nextMatchId) return match;

    const defaultSeconds = getMatchDefaultSeconds(match);
    return {
      ...match,
      remainingSeconds: defaultSeconds + Math.max(0, Number(bonusSeconds) || 0),
    };
  });
}
