import { useMemo, useState } from "react";
import { getCategoryLabel } from "../constants/categories.js";
import { getTranslator } from "../i18n/translations.js";
import FilterBar from "./FilterBar.jsx";
import MatchCard from "./MatchCard.jsx";
import PublicPlayersList from "./PublicPlayersList.jsx";
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

export default function ScheduleBoard({ matches, players, language, onLanguageChange, onAdminClick }) {
  const t = getTranslator(language);
  const [activeTab, setActiveTab] = useState("schedule");
  const [search, setSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedTable, setSelectedTable] = useState("All Tables");

  const visibleMatches = useMemo(() => {
    const term = normalize(search);

    return matches.filter((match) => {
      const tableMode = selectedTable !== "All Tables";
      const matchesTable = !tableMode || match.table === selectedTable;
      const matchesStatus = tableMode
        ? ["Upcoming", "Playing"].includes(match.status)
        : status === "All" || match.status === status;
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

      return matchesTable && matchesStatus && matchesPlayer && matchesSearch;
    });
  }, [language, matches, search, selectedPlayerId, status, selectedTable]);

  const playingCount = matches.filter((match) => match.status === "Playing").length;
  const upcomingCount = matches.filter((match) => match.status === "Upcoming").length;

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
          <h1>{t("appTitle")}</h1>
          <p className="subtle">{todayLabel(matches, language)} · {t("liveSchedule")}</p>
        </div>
        <div className="header-actions">
          <LanguageToggle language={language} onLanguageChange={onLanguageChange} />
          <div className="live-summary">
            <span>{playingCount} {t("playing")}</span>
            <strong>{upcomingCount} {t("upcoming")}</strong>
          </div>
          <button className="ghost-button" type="button" onClick={onAdminClick}>
            {t("admin")}
          </button>
        </div>
      </header>

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
      </nav>

      {activeTab === "players" ? (
        <PublicPlayersList players={players} matches={matches} language={language} t={t} />
      ) : (
        <>
          <FilterBar
            search={search}
            status={status}
            selectedTable={selectedTable}
            players={players}
            language={language}
            t={t}
            onSearchChange={handleSearchChange}
            onPlayerSelect={handlePlayerSelect}
            onStatusChange={setStatus}
            onTableChange={handleTableChange}
          />

          <section className="schedule-heading">
            <div>
              <h2>{selectedTable === "All Tables" ? t("matches") : `${selectedTable}`}</h2>
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
    </main>
  );
}
