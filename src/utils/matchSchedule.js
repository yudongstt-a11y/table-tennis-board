import { getMatchFormat } from "../constants/matchFormats.js";

const BRISBANE_TIME_ZONE = "Australia/Brisbane";
const BRISBANE_OFFSET_HOURS = 10;

export function getMatchScheduledTime(match) {
  return match?.scheduledTime || match?.scheduled_time || match?.time || "";
}

export function getMatchDurationMinutes(match) {
  return Number(match?.defaultMinutes || match?.defaultMatchMinutes || getMatchFormat(match?.matchFormat).defaultMinutes);
}

export function brisbaneDateTimeToIso(dateValue, timeValue) {
  if (!dateValue || !timeValue) return "";
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return "";

  const utcMs = Date.UTC(year, month - 1, day, hour - BRISBANE_OFFSET_HOURS, minute, 0);
  return new Date(utcMs).toISOString();
}

export function toBrisbaneInputDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: BRISBANE_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function fromBrisbaneInputDateTime(inputValue) {
  if (!inputValue) return "";
  const [dateValue, timeValue] = inputValue.split("T");
  return brisbaneDateTimeToIso(dateValue, timeValue);
}

export function formatMatchTime(match, t) {
  const value = getMatchScheduledTime(match);
  if (!value) return t ? t("timeTbd") : "Time TBD";

  return new Intl.DateTimeFormat("en-AU", {
    timeZone: BRISBANE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatMatchDate(match, language, t) {
  const value = getMatchScheduledTime(match);
  if (!value) return t ? t("timeTbd") : "Time TBD";

  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-AU", {
    timeZone: BRISBANE_TIME_ZONE,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));
}

export function compareMatchesBySchedule(a, b) {
  const aTime = getMatchScheduledTime(a);
  const bTime = getMatchScheduledTime(b);
  const aMs = aTime ? new Date(aTime).getTime() : Number.POSITIVE_INFINITY;
  const bMs = bTime ? new Date(bTime).getTime() : Number.POSITIVE_INFINITY;
  if (aMs !== bMs) return aMs - bMs;

  const tableCompare = String(a.table || "").localeCompare(String(b.table || ""));
  if (tableCompare !== 0) return tableCompare;

  return (Number(a.tableOrder) || 0) - (Number(b.tableOrder) || 0);
}

export function recalculateScheduledTimes(matches, { startTime, tournamentDate }) {
  if (!startTime) {
    return matches.map((match) => ({
      ...match,
      scheduledTime: "",
      time: "",
    }));
  }

  const dateValue = tournamentDate || "2026-06-06";
  const baseIso = brisbaneDateTimeToIso(dateValue, startTime);
  if (!baseIso) return matches;

  const tableCursor = new Map();
  const ordered = [...matches].sort((a, b) => {
    const tableCompare = String(a.table || "").localeCompare(String(b.table || ""));
    if (tableCompare !== 0) return tableCompare;
    return (Number(a.tableOrder) || 0) - (Number(b.tableOrder) || 0) || compareMatchesBySchedule(a, b);
  });
  const nextById = new Map();

  ordered.forEach((match) => {
    if (!match.table || match.isBye) {
      nextById.set(match.id, { ...match, scheduledTime: "", time: "" });
      return;
    }

    const startMs = tableCursor.get(match.table) ?? new Date(baseIso).getTime();
    const scheduledTime = new Date(startMs).toISOString();
    tableCursor.set(match.table, startMs + getMatchDurationMinutes(match) * 60 * 1000);
    nextById.set(match.id, { ...match, scheduledTime, time: scheduledTime });
  });

  return matches.map((match) => nextById.get(match.id) || match);
}
