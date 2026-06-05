import { useMemo, useState } from "react";
import { CATEGORIES, getCategoryLabel } from "../constants/categories.js";
import { ratingLabel } from "./PlayerAutocomplete.jsx";
import MatchCard from "./MatchCard.jsx";

function normalize(value) {
  return String(value).trim().toLowerCase();
}

function upcomingCountFor(playerId, playerName, matches) {
  return matches.filter(
    (match) =>
      match.status === "Upcoming" &&
      (match.playerAId === playerId ||
        match.playerBId === playerId ||
        match.playerAName.includes(playerName) ||
        match.playerBName.includes(playerName))
  ).length;
}

function matchesForPlayer(player, matches) {
  return matches
    .filter(
      (match) =>
        match.playerAId === player.id ||
        match.playerBId === player.id ||
        match.playerAName.includes(player.name) ||
        match.playerBName.includes(player.name)
    )
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

export default function PublicPlayersList({ players, matches, language, t }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [sort, setSort] = useState("name");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const visiblePlayers = useMemo(() => {
    const term = normalize(search);

    return players
      .filter((player) => {
        const matchesSearch = !term || normalize(player.name).includes(term);
        const matchesCategory = categoryId === "all" || player.categories.includes(categoryId);
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sort === "rating-desc") {
          return (b.rating ?? -1) - (a.rating ?? -1) || a.name.localeCompare(b.name);
        }

        if (sort === "rating-asc") {
          return (a.rating ?? 99999) - (b.rating ?? 99999) || a.name.localeCompare(b.name);
        }

        return a.name.localeCompare(b.name);
      });
  }, [categoryId, players, search, sort]);

  const selectedMatches = selectedPlayer ? matchesForPlayer(selectedPlayer, matches) : [];

  return (
    <section className="players-section">
      <div className="list-tools">
        <label>
          <span>{t("search")}</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("playerName")}
          />
        </label>
        <label>
          <span>{t("category")}</span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="all">{t("allCategories")}</option>
            {CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category[language]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("sort")}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="name">{t("name")}</option>
            <option value="rating-desc">{t("ratingHighToLow")}</option>
            <option value="rating-asc">{t("ratingLowToHigh")}</option>
          </select>
        </label>
      </div>

      <div className="player-list">
        {visiblePlayers.map((player, index) => (
          <button
            className="player-row public-player-row"
            key={player.id}
            type="button"
            onClick={() => setSelectedPlayer(player)}
          >
            <strong className="player-rank">#{index + 1}</strong>
            <div className="player-row-main">
              <strong>{player.name}</strong>
              <p>{player.gender} · {ratingLabel(player.rating, t)}</p>
              <div className="category-pills">
                {player.categories.map((id) => (
                  <span key={id}>{getCategoryLabel(id, language)}</span>
                ))}
              </div>
            </div>
            <div className="player-row-meta">
              <span>{upcomingCountFor(player.id, player.name, matches)}</span>
              <strong>{t("upcoming")}</strong>
            </div>
          </button>
        ))}
      </div>

      {selectedPlayer && (
        <div className="modal-backdrop" role="presentation">
          <section className="player-drawer" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="eyebrow">{t("relatedMatches")}</p>
                <h2>{selectedPlayer.name}</h2>
                <p className="subtle">
                  {ratingLabel(selectedPlayer.rating, t)} ·{" "}
                  {selectedPlayer.categories.map((id) => getCategoryLabel(id, language)).join(", ")}
                </p>
              </div>
              <button className="ghost-button" type="button" onClick={() => setSelectedPlayer(null)}>
                {t("backToPlayers")}
              </button>
            </div>
            <div className="drawer-match-list">
              {selectedMatches.map((match) => (
                <MatchCard key={match.id} match={match} language={language} t={t} compact />
              ))}
              {selectedMatches.length === 0 && <div className="empty-state">{t("noMatches")}</div>}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
