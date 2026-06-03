import { useEffect, useMemo, useState } from "react";
import { getCategoryLabel } from "../constants/categories.js";
import { getTranslator } from "../i18n/translations.js";
import MatchForm, { emptyMatch } from "./MatchForm.jsx";
import AdminPlayersManager from "./AdminPlayersManager.jsx";
import LanguageToggle from "./LanguageToggle.jsx";
import { resetDemoData } from "../utils/storage.js";

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
  onLanguageChange,
  onMatchesChange,
  onPlayersChange,
  onReplaceAllData,
  onLogout,
  onPublicView,
}) {
  const t = getTranslator(language);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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
    setEditingId(null);
    setDraft({ ...emptyMatch });
  }

  function openEdit(match) {
    setEditingId(match.id);
    setDraft({ ...match, time: toInputTime(match.time) });
  }

  function closeForm() {
    setDraft(null);
    setEditingId(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const normalized = { ...draft, time: fromInputTime(draft.time) };

    if (editingId) {
      onMatchesChange(
        matches.map((match) => (match.id === editingId ? { ...normalized, id: editingId } : match))
      );
    } else {
      onMatchesChange([
        ...matches,
        {
          ...normalized,
          id: `m${Date.now()}`,
        },
      ]);
    }

    closeForm();
  }

  function deleteMatch(id) {
    onMatchesChange(matches.filter((match) => match.id !== id));
  }

  function quickUpdate(id, field, value) {
    onMatchesChange(matches.map((match) => (match.id === id ? { ...match, [field]: value } : match)));
  }

  function handlePlayersChange(nextPlayers) {
    onPlayersChange(nextPlayers);
    onMatchesChange(syncMatchesWithPlayers(matches, nextPlayers));
  }

  function restoreDemoData() {
    onReplaceAllData(resetDemoData());
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
        <button
          className={activeTab === "matches" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("matches")}
        >
          {t("matches")}
        </button>
        <button
          className={activeTab === "players" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("players")}
        >
          {t("players")}
        </button>
      </nav>

      {activeTab === "players" ? (
        <AdminPlayersManager
          players={players}
          matches={matches}
          language={language}
          t={t}
          onPlayersChange={handlePlayersChange}
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

          <section className="admin-list">
            {matches.map((match) => (
              <article className="admin-row" key={match.id}>
                <div className="admin-match-main">
                  <span className="table-pill">{match.table}</span>
                  <div>
                    <strong>{displayTime(match.time)}</strong>
                    <p>{getCategoryLabel(match.categoryId, language)} · {match.round}</p>
                    <p>{match.playerAName} vs {match.playerBName}</p>
                  </div>
                </div>

                <div className="admin-inline-controls">
                  <select
                    value={match.status}
                    onChange={(event) => quickUpdate(match.id, "status", event.target.value)}
                    aria-label="Update match status"
                  >
                    <option value="Upcoming">{t("upcoming")}</option>
                    <option value="Playing">{t("playing")}</option>
                    <option value="Finished">{t("finished")}</option>
                  </select>
                  <input
                    className={match.status === "Finished" ? "emphasized-input" : ""}
                    value={match.score}
                    onChange={(event) => quickUpdate(match.id, "score", event.target.value)}
                    placeholder={t("score")}
                    aria-label="Update match score"
                  />
                </div>

                <div className="row-actions">
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
          language={language}
          t={t}
          title={editingId ? t("editMatch") : t("addMatch")}
          onChange={setDraft}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  );
}
