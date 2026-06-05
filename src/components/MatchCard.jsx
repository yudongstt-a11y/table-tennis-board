import { getCategoryLabel } from "../constants/categories.js";
import { getMatchFormatLabel } from "../constants/matchFormats.js";
import { calculateRemainingSeconds, formatCountdown, formatOvertime } from "../utils/matchTimer.js";
import { formatMatchDate, formatMatchTime, getMatchScheduledTime } from "../utils/matchSchedule.js";

function playerLabel(name, rating) {
  if (rating === null || rating === undefined || rating === "") return name;
  return `${name} (${rating})`;
}

function statusText(status, t) {
  return t(status.toLowerCase());
}

export default function MatchCard({ match, language, t, compact = false }) {
  const isFinished = match.status === "Finished";
  const scheduledTime = getMatchScheduledTime(match);
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
        <strong>{formatMatchTime(match, t)}</strong>
        <span>{scheduledTime ? formatMatchDate(match, language, t) : ""}</span>
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
            {isOvertime ? `${t("overtime")} ${formatOvertime(remaining)}` : formatCountdown(remaining)}
          </span>
        )}
        <strong className={match.score || isFinished ? "" : "empty-score"}>
          {scoreText}
        </strong>
      </div>
    </article>
  );
}
