import { useMemo, useState } from "react";
import { getCategoryLabel } from "../constants/categories.js";
import { getMatchFormatLabel } from "../constants/matchFormats.js";
import { tables } from "../data/demoPlayers.js";
import { calculateRemainingSeconds, formatCountdown } from "../utils/matchTimer.js";
import { queueSort, startNextTableMatch } from "../utils/matchProgression.js";
import ResultSubmitter from "./ResultSubmitter.jsx";

function matchLine(match, language) {
  return `${getCategoryLabel(match.categoryId, language)} · ${match.round}`;
}

function Countdown({ match, t }) {
  if (match.status !== "Playing") return null;

  const remaining = calculateRemainingSeconds(match);
  const overtime = remaining <= 0;

  return (
    <div className="countdown-line">
      <span>{t("countdown")}</span>
      {overtime ? (
        <strong className="overtime-label">{t("overtime")}</strong>
      ) : (
        <strong>{formatCountdown(remaining)}</strong>
      )}
    </div>
  );
}

export default function TournamentControl({
  matches,
  language,
  t,
  onMatchesChange,
  onSubmitResult,
  onMoveMatch,
}) {
  const [moveDraft, setMoveDraft] = useState({});

  const byTable = useMemo(() => {
    const grouped = new Map(tables.map((table) => [table, []]));
    matches.forEach((match) => {
      if (match.table && grouped.has(match.table) && match.status !== "Finished") {
        grouped.get(match.table).push(match);
      }
    });

    grouped.forEach((items, table) => {
      grouped.set(table, items.sort(queueSort));
    });

    return grouped;
  }, [matches]);

  function startNext(table) {
    onMatchesChange(startNextTableMatch(matches, table));
  }

  function submitMove(match) {
    const targetTable = moveDraft[match.id];
    if (!targetTable || targetTable === match.table) return;

    if (match.status === "Playing" && !window.confirm(t("confirmMovePlaying"))) {
      return;
    }

    onMoveMatch(match.id, targetTable);
    setMoveDraft((current) => ({ ...current, [match.id]: "" }));
  }

  return (
    <section className="admin-panel">
      <div className="admin-toolbar split">
        <div>
          <h2>{t("tournamentControl")}</h2>
          <p className="subtle">{t("insertAfterCurrentMatch")}</p>
        </div>
      </div>

      <div className="control-grid">
        {tables.map((table) => {
          const queue = byTable.get(table) || [];
          const playing = queue.find((match) => match.status === "Playing");
          const upcoming = queue.filter((match) => match.status === "Upcoming");
          const current = playing || null;

          return (
            <article className="control-card" key={table}>
              <div className="control-card-header">
                <h3>{table}</h3>
                {current ? (
                  <span className="status-badge playing">{t("playing")}</span>
                ) : (
                  <span className="status-badge upcoming">{t("upcoming")}</span>
                )}
              </div>

              {current ? (
                <div className="control-current">
                  <p className="eyebrow">{t("currentMatch")}</p>
                  <strong>{current.playerAName} vs {current.playerBName}</strong>
                  <p>{matchLine(current, language)} · {getMatchFormatLabel(current.matchFormat, language)}</p>
                  <Countdown match={current} t={t} />
                  <ResultSubmitter match={current} t={t} onSubmit={onSubmitResult} />
                  <div className="move-table-row">
                    <select
                      value={moveDraft[current.id] || ""}
                      onChange={(event) =>
                        setMoveDraft((draft) => ({ ...draft, [current.id]: event.target.value }))
                      }
                    >
                      <option value="">{t("selectTargetTable")}</option>
                      {tables
                        .filter((target) => target !== current.table)
                        .map((target) => (
                          <option key={target} value={target}>{target}</option>
                        ))}
                    </select>
                    <button className="ghost-button" type="button" onClick={() => submitMove(current)}>
                      {t("moveTable")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state compact-empty">
                  {t("noActiveMatch")}
                  {upcoming[0] && (
                    <button className="primary-button" type="button" onClick={() => startNext(table)}>
                      {t("startNextMatch")}
                    </button>
                  )}
                </div>
              )}

              <div className="next-queue">
                <p className="eyebrow">{t("nextRound")}</p>
                {upcoming.slice(0, 3).map((match) => (
                  <div className="queue-item" key={match.id}>
                    <strong>{match.playerAName} vs {match.playerBName}</strong>
                    <span>{t("expected")}: {match.defaultMinutes || match.defaultMatchMinutes} {t("minutes")}</span>
                    <div className="move-table-row">
                      <select
                        value={moveDraft[match.id] || ""}
                        onChange={(event) =>
                          setMoveDraft((draft) => ({ ...draft, [match.id]: event.target.value }))
                        }
                      >
                        <option value="">{t("selectTargetTable")}</option>
                        {tables
                          .filter((target) => target !== match.table)
                          .map((target) => (
                            <option key={target} value={target}>{target}</option>
                          ))}
                      </select>
                      <button className="ghost-button" type="button" onClick={() => submitMove(match)}>
                        {t("moveTable")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
