import { getCategoryLabel } from "../constants/categories.js";
import { getMatchFormatLabel } from "../constants/matchFormats.js";
import { calculateRemainingSeconds, formatCountdown } from "../utils/matchTimer.js";

function formatTime(dateString) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function formatDate(dateString, language) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-AU", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(dateString));
}

function playerLabel(name, rating) {
  if (rating === null || rating === undefined || rating === "") return name;
  return `${name} (${rating})`;
}

function statusText(status, t) {
  return t(status.toLowerCase());
}

export default function MatchCard({ match, language, t, compact = false }) {
  const isFinished = match.status === "Finished";
  const remaining = calculateRemainingSeconds(match);
  const isOvertime = match.status === "Playing" && remaining <= 0;
  const scoreText = (() => {
    if (!isFinished) return match.score || "TBD";
    if (match.isBye) return t("advancedByBye");
    return match.score ? `${t("result")}: ${match.score}` : t("finishedScorePending");
  })();

  return (
    <article className={`match-card ${match.status.toLowerCase()} ${compact ? "compact" : ""}`}>
      <div className="match-time">
        <strong>{formatTime(match.time)}</strong>
        <span>{formatDate(match.time, language)}</span>
      </div>

      <div className="match-main">
        <div className="match-meta">
          <span className="table-pill">{match.table}</span>
          <span>{getCategoryLabel(match.categoryId, language)}</span>
          <span>{match.round}</span>
          <span>{getMatchFormatLabel(match.matchFormat, language)}</span>
        </div>

        <div className="players">
          {match.isBye ? (
            <span>{match.playerAName} · {t("advancedByBye")}</span>
          ) : (
            <>
              <span>{playerLabel(match.playerAName, match.playerARating)}</span>
              <b>vs</b>
              <span>{playerLabel(match.playerBName, match.playerBRating)}</span>
            </>
          )}
        </div>
      </div>

      <div className="match-result">
        <span className={`status-badge ${match.status.toLowerCase()}`}>
          {statusText(match.status, t)}
        </span>
        {match.status === "Playing" && (
          <span className={isOvertime ? "overtime-label" : "countdown-badge"}>
            {isOvertime ? t("overtime") : formatCountdown(remaining)}
          </span>
        )}
        <strong className={match.score || isFinished ? "" : "empty-score"}>
          {scoreText}
        </strong>
      </div>
    </article>
  );
}
