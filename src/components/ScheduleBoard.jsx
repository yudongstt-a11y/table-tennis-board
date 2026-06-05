import { useEffect, useMemo, useState } from "react";
import { getCategoryLabel } from "../constants/categories.js";
import { getTranslator } from "../i18n/translations.js";
import FilterBar from "./FilterBar.jsx";
import MatchCard from "./MatchCard.jsx";
import PublicPlayersList from "./PublicPlayersList.jsx";
import PublicGroups from "./PublicGroups.jsx";
import PublicTimeline from "./PublicTimeline.jsx";
import LanguageToggle from "./LanguageToggle.jsx";

function todayLabel(matches, language) {
  const first = matches[0]?.time || new Date().toISOString();
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(first));
}

function normalize(value) {
  return String(value).trim().toLowerCase();
}

export default function ScheduleBoard({
  matches,
  players,
  stages,
  groups,
  doublesPairs,
  tournamentSettings,
  eventTimeline,
  dataSourceError,
  language,
  tournamentControl,
  onLanguageChange,
  onAdminClick,
}) {
  const t = getTranslator(language);
  const [activeTab, setActiveTab] = useState("schedule");
  const [search, setSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedTable, setSelectedTable] = useState("All Tables");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleMatches = useMemo(() => {
    const term = normalize(search);

    return matches.filter((match) => {
      const tableMode = selectedTable !== "All Tables";
      const matchesTable = !tableMode || match.table === selectedTable;
      const matchesStatus = tableMode
        ? ["Upcoming", "Playing"].includes(match.status)
        : status === "All" || match.status === status;
      const matchesCategory =
        selectedCategoryIds.length === 0 || selectedCategoryIds.includes(match.categoryId);
      const matchesPlayer =
        !selectedPlayerId ||
        match.playerAId === selectedPlayerId ||
        match.playerBId === selectedPlayerId;
      const categoryLabel = getCategoryLabel(match.categoryId, language);
      const matchesSearch =
        !term ||
        normalize(match.playerAName).includes(term) ||
        normalize(match.playerBName).includes(term) ||
        normalize(categoryLabel).includes(term) ||
        normalize(match.table).includes(term) ||
        normalize(match.round).includes(term);

      return matchesTable && matchesStatus && matchesCategory && matchesPlayer && matchesSearch;
    });
  }, [language, matches, search, selectedCategoryIds, selectedPlayerId, status, selectedTable]);

  const playingCount = matches.filter((match) => match.status === "Playing").length;
  const upcomingCount = matches.filter((match) => match.status === "Upcoming").length;
  const tournamentName =
    language === "zh"
      ? tournamentSettings.nameZh
      : tournamentSettings.nameEn || tournamentSettings.nameZh;
  const tournamentDate = tournamentSettings.date
    ? new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(`${tournamentSettings.date}T00:00:00`))
    : todayLabel(matches, language);

  function handleSearchChange(value) {
    setSearch(value);
    setSelectedPlayerId("");
  }

  function handlePlayerSelect(player) {
    setSearch(player.name);
    setSelectedPlayerId(player.id);
    setSelectedTable("All Tables");
    setActiveTab("schedule");
  }

  function handleTableChange(table) {
    setSelectedTable(table);
    if (table !== "All Tables") {
      setStatus("All");
      setSelectedPlayerId("");
      setSearch("");
    }
  }

  return (
    <main className="page public-page">
      <header className="public-header">
        <div>
          <p className="eyebrow">{t("publicBoard")}</p>
          <h1>{tournamentName || t("appTitle")}</h1>
          <p className="subtle">{t("liveSchedule")}</p>
        </div>
        <div className="header-actions">
          <LanguageToggle language={language} onLanguageChange={onLanguageChange} />
          <div className="live-summary">
            <span>{playingCount} {t("playing")}</span>
            <strong>{upcomingCount} {t("upcoming")}</strong>
          </div>
        </div>
      </header>

      <section className="tournament-info-card">
        <div>
          <span>{t("tournamentDate")}</span>
          <strong>{tournamentDate}</strong>
        </div>
        <div>
          <span>{t("venue")}</span>
          <strong>{tournamentSettings.venue}</strong>
        </div>
        <div>
          <span>{t("tables")}</span>
          <strong>{tournamentSettings.tableCount}</strong>
        </div>
      </section>

      <section className={`tournament-banner ${tournamentControl?.status || "not_started"}`}>
        <strong>{t(`tournament_${tournamentControl?.status || "not_started"}`)}</strong>
        {tournamentControl?.status === "paused" && <span>{t("matchesPaused")}</span>}
      </section>

      {dataSourceError && (
        <section className="data-source-error-banner">
          <strong>{t("supabaseConfigMissing")}</strong>
          <span>{t("supabaseEnvHelp")}</span>
        </section>
      )}

      <nav className="top-tabs" aria-label="Public sections">
        <button
          className={activeTab === "schedule" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("schedule")}
        >
          {t("schedule")}
        </button>
        <button
          className={activeTab === "players" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("players")}
        >
          {t("players")}
        </button>
        <button
          className={activeTab === "groups" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("groups")}
        >
          {t("groups")}
        </button>
        <button
          className={activeTab === "timeline" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("timeline")}
        >
          {t("timeline")}
        </button>
      </nav>

      {activeTab === "players" ? (
        <PublicPlayersList players={players} matches={matches} language={language} t={t} />
      ) : activeTab === "groups" ? (
        <PublicGroups
          groups={groups}
          matches={matches}
          players={players}
          doublesPairs={doublesPairs}
          stages={stages}
          language={language}
          t={t}
        />
      ) : activeTab === "timeline" ? (
        <PublicTimeline items={eventTimeline} language={language} t={t} />
      ) : (
        <>
          <FilterBar
            search={search}
            status={status}
            selectedTable={selectedTable}
            selectedCategoryIds={selectedCategoryIds}
            players={players}
            tableNames={tournamentSettings.tableNames}
            language={language}
            t={t}
            onSearchChange={handleSearchChange}
            onPlayerSelect={handlePlayerSelect}
            onStatusChange={setStatus}
            onTableChange={handleTableChange}
            onCategoryChange={setSelectedCategoryIds}
          />

          <section className="schedule-heading">
            <div>
              <h2>{selectedTable === "All Tables" ? t("matches") : selectedTable}</h2>
              <p>
                {visibleMatches.length} {t("matchesShown")}
                {selectedTable !== "All Tables" ? ` · ${t("upcomingPlayingOnly")}` : ""}
              </p>
            </div>
          </section>

          <section className="match-list" aria-label="Match list">
            {visibleMatches.map((match) => (
              <MatchCard key={match.id} match={match} language={language} t={t} />
            ))}
            {visibleMatches.length === 0 && <div className="empty-state">{t("noMatches")}</div>}
          </section>
        </>
      )}

      <footer className="page-footer">
        <button className="admin-link" type="button" onClick={onAdminClick}>
          {t("adminEntry")}
        </button>
      </footer>
    </main>
  );
}
