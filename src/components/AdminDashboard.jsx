import { useEffect, useMemo, useState } from "react";
import { getCategoryLabel } from "../constants/categories.js";
import { getMatchFormatLabel } from "../constants/matchFormats.js";
import { getTranslator } from "../i18n/translations.js";
import {
  isFirstTableMatch,
  moveMatchToTable,
  startFirstTableMatch,
  submitMatchResult,
} from "../utils/matchProgression.js";
import { calculateRemainingSeconds, formatCountdown, formatOvertime } from "../utils/matchTimer.js";
import { resetDemoData } from "../utils/storage.js";
import AdminGroupingManager from "./AdminGroupingManager.jsx";
import AdminPlayersManager from "./AdminPlayersManager.jsx";
import AdminStagesManager from "./AdminStagesManager.jsx";
import LanguageToggle from "./LanguageToggle.jsx";
import MatchForm, { emptyMatch } from "./MatchForm.jsx";
import ResultSubmitter from "./ResultSubmitter.jsx";
import TournamentControl from "./TournamentControl.jsx";
import TournamentSetup from "./TournamentSetup.jsx";

function toInputTime(time) {
  return String(time).slice(0, 16);
}

function fromInputTime(time) {
  return time.length === 16 ? `${time}:00` : time;
}

function displayTime(time) {
  return new Intl.DateTimeFormat("en-AU", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(time));
}

function syncMatchesWithPlayers(matches, players) {
  const playerMap = new Map(players.map((player) => [player.id, player]));

  return matches.map((match) => {
    const playerA = playerMap.get(match.playerAId);
    const playerB = playerMap.get(match.playerBId);

    return {
      ...match,
      playerAName: playerA?.name ?? match.playerAName,
      playerBName: playerB?.name ?? match.playerBName,
      playerARating: playerA ? playerA.rating : match.playerARating,
      playerBRating: playerB ? playerB.rating : match.playerBRating,
    };
  });
}

export default function AdminDashboard({
  initialTab = "matches",
  language,
  matches,
  players,
  stages,
  tableControls,
  breaks,
  tournamentControl,
  tournamentSettings,
  eventTimeline,
  seedings,
  groups,
  onLanguageChange,
  onMatchesChange,
  onPlayersChange,
  onStagesChange,
  onTableControlsChange,
  onBreaksChange,
  onTournamentControlChange,
  onTournamentSettingsChange,
  onEventTimelineChange,
  onSeedingsChange,
  onGroupsChange,
  onTournamentStateChange,
  onReplaceAllData,
  onLogout,
  onPublicView,
}) {
  const t = getTranslator(language);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [statusNotice, setStatusNotice] = useState("");
  const [moveDraft, setMoveDraft] = useState({});
  const [, setTick] = useState(0);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const counts = useMemo(
    () => ({
      total: matches.length,
      playing: matches.filter((match) => match.status === "Playing").length,
      upcoming: matches.filter((match) => match.status === "Upcoming").length,
      finished: matches.filter((match) => match.status === "Finished").length,
    }),
    [matches]
  );

  function openAdd() {
    const stage = stages[0];
    setEditingId(null);
    setDraft({
      ...emptyMatch,
      stageId: stage?.id || emptyMatch.stageId,
      eventId: stage?.eventId || emptyMatch.eventId,
      categoryId: stage?.eventId || emptyMatch.categoryId,
      stageFormat: stage?.format || emptyMatch.stageFormat,
      matchFormat: stage?.matchFormat || emptyMatch.matchFormat,
      winnerGames: stage?.winnerGames || emptyMatch.winnerGames,
      defaultMinutes: stage?.defaultMatchMinutes || emptyMatch.defaultMinutes,
      defaultMatchMinutes: stage?.defaultMatchMinutes || emptyMatch.defaultMatchMinutes,
      table: tournamentSettings.tableNames[0] || emptyMatch.table,
      tableOrder: Date.now(),
    });
  }

  function openEdit(match) {
    setEditingId(match.id);
    setDraft({ ...match, time: toInputTime(match.time) });
  }

  function closeForm() {
    setDraft(null);
    setEditingId(null);
  }

  function normalizeDraft() {
    const stage = stages.find((item) => item.id === draft.stageId);
    return {
      ...draft,
      time: fromInputTime(draft.time),
      eventId: draft.eventId || draft.categoryId,
      tableOrder: Number.isFinite(Number(draft.tableOrder)) ? Number(draft.tableOrder) : Date.now(),
      stageFormat: draft.stageFormat || stage?.format || "round_robin",
      matchFormat: draft.matchFormat || stage?.matchFormat || "best_of_5",
      winnerGames: draft.winnerGames || stage?.winnerGames || 3,
      defaultMinutes: draft.defaultMinutes || stage?.defaultMatchMinutes || 25,
      defaultMatchMinutes: draft.defaultMatchMinutes || draft.defaultMinutes || stage?.defaultMatchMinutes || 25,
    };
  }

  function handleSubmit(event) {
    event.preventDefault();
    const normalized = normalizeDraft();

    if (editingId) {
      onMatchesChange(
        matches.map((match) => (match.id === editingId ? { ...normalized, id: editingId } : match))
      );
    } else {
      onMatchesChange([...matches, { ...normalized, id: `m${Date.now()}` }]);
    }

    closeForm();
  }

  function deleteMatch(id) {
    onMatchesChange(matches.filter((match) => match.id !== id));
  }

  function handleStartMatch(matchId) {
    const next = startFirstTableMatch(matches, matchId, tableControls);
    onTournamentStateChange(next.matches, next.tableControls);
  }

  function handleSubmitResult(matchId, winnerSide, loserScore) {
    const beforePlaying = matches
      .filter((match) => match.status === "Playing")
      .map((match) => match.id);
    const next = submitMatchResult(
      matches,
      matchId,
      winnerSide,
      loserScore,
      tableControls,
      tournamentControl.status
    );
    const after = next.matches;
    const afterPlaying = after.filter((match) => match.status === "Playing").map((match) => match.id);

    if (afterPlaying.some((id) => !beforePlaying.includes(id))) {
      setStatusNotice(t("nextMatchAutoPlaying"));
    }

    onTournamentStateChange(after, next.tableControls);
  }

  function handleMoveMatch(matchId, targetTable) {
    const moving = matches.find((match) => match.id === matchId);
    if (!moving || moving.status === "Finished" || !targetTable) return;

    if (moving.status === "Playing" && !window.confirm(t("confirmMovePlaying"))) {
      return;
    }

    onMatchesChange(moveMatchToTable(matches, matchId, targetTable));
    setMoveDraft((current) => ({ ...current, [matchId]: "" }));
  }

  function handlePlayersChange(nextPlayers) {
    onPlayersChange(nextPlayers);
    onMatchesChange(syncMatchesWithPlayers(matches, nextPlayers));
  }

  function restoreDemoData() {
    onReplaceAllData(resetDemoData());
  }

  function renderCountdown(match) {
    if (match.status !== "Playing") return null;

    const remaining = calculateRemainingSeconds(match);
    return (
      <div className="countdown-line compact-countdown">
        <span>{t("countdown")}</span>
        {remaining <= 0 ? (
          <strong className="overtime-label">
            {t("overtime")} {formatOvertime(remaining)}
          </strong>
        ) : (
          <strong>{formatCountdown(remaining)}</strong>
        )}
      </div>
    );
  }

  function renderMoveTable(match) {
    if (match.status === "Finished" || match.isBye) {
      return <span className="subtle small-text">{t("finished")}</span>;
    }

    return (
      <div className="move-table-row">
        <select
          value={moveDraft[match.id] || ""}
          onChange={(event) =>
            setMoveDraft((current) => ({ ...current, [match.id]: event.target.value }))
          }
        >
          <option value="">{t("selectTargetTable")}</option>
          {tournamentSettings.tableNames
            .filter((table) => table !== match.table)
            .map((table) => (
              <option key={table} value={table}>{table}</option>
            ))}
        </select>
        <button
          className="ghost-button"
          type="button"
          disabled={!moveDraft[match.id]}
          onClick={() => handleMoveMatch(match.id, moveDraft[match.id])}
        >
          {t("moveTable")}
        </button>
      </div>
    );
  }

  function renderMatchAction(match) {
    const isFirst = isFirstTableMatch(matches, match.id);

    if (match.isBye) {
      return (
        <div className="match-admin-action">
          <span className="status-badge finished">{t("advancedByBye")}</span>
        </div>
      );
    }

    if (match.status === "Upcoming") {
      return (
        <div className="match-admin-action">
          <span className="status-badge upcoming">{t("upcoming")}</span>
          {isFirst ? (
            <button className="primary-button" type="button" onClick={() => handleStartMatch(match.id)}>
              {t("startMatch")}
            </button>
          ) : (
            <p className="waiting-note">{t("waitingPreviousMatch")}</p>
          )}
        </div>
      );
    }

    if (match.status === "Playing") {
      return <ResultSubmitter match={match} t={t} mode="submit" onSubmit={handleSubmitResult} />;
    }

    return (
      <div className="finished-admin-block">
        <div className="finished-summary">
          <span className="status-badge finished">{t("finished")}</span>
          <strong>{t("matchResult")}: {match.score || t("finishedScorePending")}</strong>
        </div>
        <ResultSubmitter match={match} t={t} mode="edit" onSubmit={handleSubmitResult} />
      </div>
    );
  }

  return (
    <main className="page admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h1>{t("adminTitle")}</h1>
          <p className="subtle">{t("adminSubtitle")}</p>
        </div>
        <div className="admin-actions">
          <LanguageToggle language={language} onLanguageChange={onLanguageChange} />
          <button className="ghost-button" type="button" onClick={onPublicView}>
            {t("publicView")}
          </button>
          {activeTab === "matches" && (
            <button className="primary-button" type="button" onClick={openAdd}>
              {t("addMatch")}
            </button>
          )}
          <button className="ghost-button" type="button" onClick={onLogout}>
            {t("logout")}
          </button>
        </div>
      </header>

      <nav className="top-tabs" aria-label="Admin sections">
        {["setup", "matches", "players", "stages", "grouping", "control"].map((tab) => (
          <button
            className={activeTab === tab ? "active" : ""}
            type="button"
            onClick={() => setActiveTab(tab)}
            key={tab}
          >
            {t(tab)}
          </button>
        ))}
      </nav>

      {activeTab === "setup" ? (
        <TournamentSetup
          settings={tournamentSettings}
          eventTimeline={eventTimeline}
          language={language}
          t={t}
          onSettingsChange={onTournamentSettingsChange}
          onEventTimelineChange={onEventTimelineChange}
        />
      ) : activeTab === "players" ? (
        <AdminPlayersManager
          players={players}
          matches={matches}
          language={language}
          t={t}
          onPlayersChange={handlePlayersChange}
        />
      ) : activeTab === "stages" ? (
        <AdminStagesManager stages={stages} language={language} t={t} onStagesChange={onStagesChange} />
      ) : activeTab === "grouping" ? (
        <AdminGroupingManager
          players={players}
          stages={stages}
          seedings={seedings}
          groups={groups}
          matches={matches}
          language={language}
          t={t}
          onSeedingsChange={onSeedingsChange}
          onGroupsChange={onGroupsChange}
          onMatchesChange={onMatchesChange}
        />
      ) : activeTab === "control" ? (
        <TournamentControl
          matches={matches}
          tableControls={tableControls}
          breaks={breaks}
          stages={stages}
          tournamentControl={tournamentControl}
          language={language}
          t={t}
          onTournamentStateChange={onTournamentStateChange}
          onBreaksChange={onBreaksChange}
          onTournamentControlChange={onTournamentControlChange}
          onSubmitResult={handleSubmitResult}
          onMoveMatch={handleMoveMatch}
          tableNames={tournamentSettings.tableNames}
        />
      ) : (
        <>
          <section className="stats-grid">
            <div><span>{t("total")}</span><strong>{counts.total}</strong></div>
            <div><span>{t("playing")}</span><strong>{counts.playing}</strong></div>
            <div><span>{t("upcoming")}</span><strong>{counts.upcoming}</strong></div>
            <div><span>{t("finished")}</span><strong>{counts.finished}</strong></div>
          </section>

          <section className="admin-toolbar">
            <button className="ghost-button" type="button" onClick={restoreDemoData}>
              {t("restoreDemoData")}
            </button>
          </section>
          {statusNotice && <div className="status-notice">{statusNotice}</div>}

          <section className="admin-list">
            {matches.map((match) => (
              <article className="admin-row match-admin-row" key={match.id}>
                <div className="admin-match-main">
                  <span className="table-pill">{match.table || t("advancedByBye")}</span>
                  <div>
                    <strong>{displayTime(match.time)}</strong>
                    <p>
                      {getCategoryLabel(match.categoryId, language)} · {match.round} ·{" "}
                      {getMatchFormatLabel(match.matchFormat, language)}
                    </p>
                    <p>{match.isBye ? t("advancedByBye") : `${match.playerAName} vs ${match.playerBName}`}</p>
                    {renderCountdown(match)}
                  </div>
                </div>

                {renderMatchAction(match)}

                <div className="row-actions">
                  {renderMoveTable(match)}
                  <button className="ghost-button" type="button" onClick={() => openEdit(match)}>
                    {t("edit")}
                  </button>
                  <button className="danger-button" type="button" onClick={() => deleteMatch(match.id)}>
                    {t("delete")}
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {draft && (
        <MatchForm
          value={draft}
          players={players}
          stages={stages}
          language={language}
          t={t}
          title={editingId ? t("editMatch") : t("addMatch")}
          onChange={setDraft}
          onCancel={closeForm}
          onSubmit={handleSubmit}
          tableNames={tournamentSettings.tableNames}
        />
      )}
    </main>
  );
}
