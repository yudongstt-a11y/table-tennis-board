import { useMemo, useState } from "react";
import { getCategoryLabel } from "../constants/categories.js";
import { getMatchFormatLabel } from "../constants/matchFormats.js";
import { tables } from "../data/demoPlayers.js";
import {
  calculateRemainingSeconds,
  formatCountdown,
  formatOvertime,
  formatSignedTime,
} from "../utils/matchTimer.js";
import {
  pauseAllUnfinishedMatches,
  queueSort,
  startNextRound,
  startNextTableMatch,
  startTournament,
} from "../utils/matchProgression.js";
import ResultSubmitter from "./ResultSubmitter.jsx";

function matchLine(match, language) {
  return `${getCategoryLabel(match.categoryId, language)} · ${match.round}`;
}

function Countdown({ match, t }) {
  if (match.status !== "Playing") return null;

  const remaining = calculateRemainingSeconds(match);
  return (
    <div className="countdown-line">
      <span>{t("countdown")}</span>
      {remaining <= 0 ? (
        <strong className="overtime-label">{t("overtime")} {formatOvertime(remaining)}</strong>
      ) : (
        <strong>{formatCountdown(remaining)}</strong>
      )}
    </div>
  );
}

export default function TournamentControl({
  matches,
  tableControls,
  breaks,
  stages,
  tournamentControl,
  language,
  t,
  onTournamentStateChange,
  onBreaksChange,
  onTournamentControlChange,
  onSubmitResult,
  onMoveMatch,
}) {
  const [moveDraft, setMoveDraft] = useState({});
  const [breakDraft, setBreakDraft] = useState(null);

  const byTable = useMemo(() => {
    const grouped = new Map(tables.map((table) => [table, []]));
    matches.forEach((match) => {
      if (match.table && grouped.has(match.table) && match.status !== "Finished") {
        grouped.get(match.table).push(match);
      }
    });
    grouped.forEach((items, table) => grouped.set(table, items.sort(queueSort)));
    return grouped;
  }, [matches]);

  function roundNumber(match) {
    if (Number.isFinite(Number(match.roundNumber))) return Number(match.roundNumber);
    if (Number.isFinite(Number(match.bracketRound))) return Number(match.bracketRound);
    const found = String(match.round || "").match(/\d+/);
    return found ? Number(found[0]) : null;
  }

  function canStartBreak(item) {
    const targetMatches = matches.filter(
      (match) => match.stageId === item.afterStageId && roundNumber(match) === Number(item.afterRound)
    );
    return (
      targetMatches.length > 0 &&
      targetMatches.every((match) => match.status === "Finished" || match.isBye)
    );
  }

  function handleStartTournament() {
    if (tournamentControl.status !== "not_started") return;
    const next = startTournament(matches, tableControls);
    onTournamentStateChange(next.matches, next.tableControls);
    onTournamentControlChange({
      status: "running",
      startedAt: Date.now(),
      pausedAt: null,
      activeBreakId: null,
    });
  }

  function handleStartNextRound() {
    const next = startNextRound(matches, tableControls);
    onTournamentStateChange(next.matches, next.tableControls);
  }

  function startNext(table) {
    const next = startNextTableMatch(matches, table, tableControls);
    onTournamentStateChange(next.matches, next.tableControls);
  }

  function handleStartBreak(item) {
    onTournamentStateChange(pauseAllUnfinishedMatches(matches), tableControls);
    onBreaksChange(
      breaks.map((breakItem) =>
        breakItem.id === item.id
          ? { ...breakItem, status: "active", startedAt: Date.now(), endedAt: null }
          : breakItem
      )
    );
    onTournamentControlChange({
      ...tournamentControl,
      status: "paused",
      pausedAt: Date.now(),
      activeBreakId: item.id,
    });
  }

  function handleEndBreak(item) {
    onBreaksChange(
      breaks.map((breakItem) =>
        breakItem.id === item.id
          ? { ...breakItem, status: "completed", endedAt: Date.now() }
          : breakItem
      )
    );
    onTournamentControlChange({
      ...tournamentControl,
      status: "running",
      pausedAt: null,
      activeBreakId: null,
    });
  }

  function saveBreak(event) {
    event.preventDefault();
    const normalized = {
      ...breakDraft,
      id: breakDraft.id || `break_${Date.now()}`,
      afterRound: Number(breakDraft.afterRound) || 1,
      durationMinutes: Number(breakDraft.durationMinutes) || 10,
      status: breakDraft.status || "scheduled",
      startedAt: breakDraft.startedAt || null,
      endedAt: breakDraft.endedAt || null,
    };

    onBreaksChange(
      breakDraft.id
        ? breaks.map((item) => (item.id === breakDraft.id ? normalized : item))
        : [...breaks, normalized]
    );
    setBreakDraft(null);
  }

  function deleteBreak(id) {
    onBreaksChange(breaks.filter((item) => item.id !== id));
  }

  function submitMove(match) {
    const targetTable = moveDraft[match.id];
    if (!targetTable || targetTable === match.table) return;

    if (match.status === "Playing" && !window.confirm(t("confirmMovePlaying"))) return;

    onMoveMatch(match.id, targetTable);
    setMoveDraft((current) => ({ ...current, [match.id]: "" }));
  }

  return (
    <>
      <section className="admin-panel">
        <div className="admin-toolbar split">
          <div>
            <h2>{t("tournamentControl")}</h2>
            <p className="subtle">{t(`tournament_${tournamentControl.status}`)}</p>
          </div>
          <div className="control-actions">
            <button
              className="primary-button"
              type="button"
              onClick={handleStartTournament}
              disabled={tournamentControl.status !== "not_started"}
            >
              {tournamentControl.status === "not_started" ? t("startTournament") : t("tournamentStarted")}
            </button>
            {tournamentControl.status === "running" && (
              <button className="ghost-button" type="button" onClick={handleStartNextRound}>
                {t("startNextRound")}
              </button>
            )}
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                setBreakDraft({
                  nameZh: "",
                  nameEn: "",
                  afterStageId: stages[0]?.id || "",
                  afterRound: 1,
                  durationMinutes: 30,
                  status: "scheduled",
                })
              }
            >
              {t("addBreak")}
            </button>
          </div>
        </div>

        {tournamentControl.status === "paused" && (
          <div className="status-notice break-notice">{t("breakInProgress")}</div>
        )}

        <section className="break-panel">
          <h3>{t("break")}</h3>
          <div className="break-list">
            {breaks.map((item) => {
              const stage = stages.find((stageItem) => stageItem.id === item.afterStageId);
              const ready = canStartBreak(item);
              const isActive = tournamentControl.activeBreakId === item.id && item.status === "active";

              return (
                <article className="break-card" key={item.id}>
                  <div>
                    <strong>{language === "zh" ? item.nameZh : item.nameEn}</strong>
                    <p>
                      {(language === "zh" ? stage?.nameZh : stage?.nameEn) || item.afterStageId} ·{" "}
                      {t("insertAfterRound")} {item.afterRound} · {item.durationMinutes} {t("minutes")}
                    </p>
                    {ready && item.status === "scheduled" && (
                      <span className="time-bank positive">
                        {t("roundCompletedBreakReady", { round: item.afterRound })}
                      </span>
                    )}
                  </div>
                  <div className="row-actions">
                    {isActive ? (
                      <button className="primary-button" type="button" onClick={() => handleEndBreak(item)}>
                        {t("endBreak")}
                      </button>
                    ) : (
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => handleStartBreak(item)}
                        disabled={tournamentControl.status !== "running" || item.status !== "scheduled"}
                      >
                        {t("startBreak")}
                      </button>
                    )}
                    <button className="ghost-button" type="button" onClick={() => setBreakDraft({ ...item })}>
                      {t("edit")}
                    </button>
                    <button className="danger-button" type="button" onClick={() => deleteBreak(item.id)}>
                      {t("delete")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="control-grid">
          {tables.map((table) => {
            const queue = byTable.get(table) || [];
            const playing = queue.find((match) => match.status === "Playing");
            const upcoming = queue.filter((match) => match.status === "Upcoming");
            const current = playing || null;
            const timeBankSeconds = Number(tableControls?.[table]?.timeBankSeconds) || 0;

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
                <div
                  className={
                    timeBankSeconds > 0
                      ? "time-bank positive"
                      : timeBankSeconds < 0
                        ? "time-bank negative"
                        : "time-bank"
                  }
                >
                  {t("timeBank")}: {formatSignedTime(timeBankSeconds)}
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
                      <button className="ghost-button" type="button" onClick={() => startNext(table)}>
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

      {breakDraft && (
        <div className="modal-backdrop" role="presentation">
          <section className="match-modal" role="dialog" aria-modal="true" aria-label={t("break")}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{t("break")}</p>
                <h2>{breakDraft.id ? t("editBreak") : t("addBreak")}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setBreakDraft(null)}>
                X
              </button>
            </div>
            <form className="match-form" onSubmit={saveBreak}>
              <label>
                <span>{t("breakName")} / 中文</span>
                <input
                  value={breakDraft.nameZh}
                  onChange={(event) => setBreakDraft((draft) => ({ ...draft, nameZh: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>{t("breakName")} / English</span>
                <input
                  value={breakDraft.nameEn}
                  onChange={(event) => setBreakDraft((draft) => ({ ...draft, nameEn: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>{t("insertAfterStage")}</span>
                <select
                  value={breakDraft.afterStageId}
                  onChange={(event) => setBreakDraft((draft) => ({ ...draft, afterStageId: event.target.value }))}
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {language === "zh" ? stage.nameZh : stage.nameEn}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("insertAfterRound")}</span>
                <input
                  type="number"
                  min="1"
                  value={breakDraft.afterRound}
                  onChange={(event) => setBreakDraft((draft) => ({ ...draft, afterRound: event.target.value }))}
                />
              </label>
              <label>
                <span>{t("durationMinutes")}</span>
                <input
                  type="number"
                  min="1"
                  value={breakDraft.durationMinutes}
                  onChange={(event) =>
                    setBreakDraft((draft) => ({ ...draft, durationMinutes: event.target.value }))
                  }
                />
              </label>
              <div className="form-actions">
                <button className="ghost-button" type="button" onClick={() => setBreakDraft(null)}>
                  {t("cancel")}
                </button>
                <button className="primary-button" type="submit">
                  {t("save")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
