import { useMemo, useState } from "react";
import { CATEGORIES, getCategoryLabel } from "../constants/categories.js";
import PlayerForm, { emptyPlayer } from "./PlayerForm.jsx";
import { ratingLabel } from "./PlayerAutocomplete.jsx";

function normalize(value) {
  return String(value).trim().toLowerCase();
}

export default function AdminPlayersManager({ players, matches, language, t, onPlayersChange }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [sort, setSort] = useState("name");
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);

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

        if (sort === "unrated") {
          const aUnrated = a.rating === null || a.rating === undefined ? 0 : 1;
          const bUnrated = b.rating === null || b.rating === undefined ? 0 : 1;
          return aUnrated - bUnrated || a.name.localeCompare(b.name);
        }

        return a.name.localeCompare(b.name);
      });
  }, [categoryId, players, search, sort]);

  function openAdd() {
    setEditingId(null);
    setDraft({ ...emptyPlayer });
  }

  function openEdit(player) {
    setEditingId(player.id);
    setDraft({
      ...player,
      rating: player.rating ?? "",
      categories: [...player.categories],
    });
  }

  function closeForm() {
    setDraft(null);
    setEditingId(null);
  }

  function normalizeDraft() {
    return {
      ...draft,
      name: draft.name.trim(),
      rating: draft.rating === "" || draft.rating === null ? null : Number(draft.rating),
      categories: draft.categories.length ? draft.categories : ["singles"],
    };
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextPlayer = normalizeDraft();

    if (editingId) {
      onPlayersChange(
        players.map((player) =>
          player.id === editingId ? { ...nextPlayer, id: editingId } : player
        )
      );
    } else {
      onPlayersChange([
        ...players,
        {
          ...nextPlayer,
          id: `p${Date.now()}`,
        },
      ]);
    }

    closeForm();
  }

  function deletePlayer(id) {
    onPlayersChange(players.filter((player) => player.id !== id));
  }

  function matchCount(playerId, playerName) {
    return matches.filter(
      (match) =>
        match.playerAId === playerId ||
        match.playerBId === playerId ||
        match.playerAName.includes(playerName) ||
        match.playerBName.includes(playerName)
    ).length;
  }

  return (
    <section className="admin-panel">
      <div className="admin-toolbar split">
        <div className="list-tools compact">
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
              <option value="unrated">{t("unratedFirst")}</option>
            </select>
          </label>
        </div>
        <button className="primary-button" type="button" onClick={openAdd}>
          {t("addPlayer")}
        </button>
      </div>

      <div className="admin-list">
        {visiblePlayers.map((player) => (
          <article className="admin-row player-row" key={player.id}>
            <div className="admin-match-main">
              <span className="avatar-pill">{player.name.slice(0, 1)}</span>
              <div>
                <strong>{player.name}</strong>
                <p>{player.gender} · {ratingLabel(player.rating, t)}</p>
                <div className="category-pills">
                  {player.categories.map((id) => (
                    <span key={id}>{getCategoryLabel(id, language)}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="player-match-count">
              <span>{t("matches")}</span>
              <strong>{matchCount(player.id, player.name)}</strong>
            </div>

            <div className="row-actions">
              <button className="ghost-button" type="button" onClick={() => openEdit(player)}>
                {t("edit")}
              </button>
              <button className="danger-button" type="button" onClick={() => deletePlayer(player.id)}>
                {t("delete")}
              </button>
            </div>
          </article>
        ))}
      </div>

      {draft && (
        <PlayerForm
          value={draft}
          language={language}
          t={t}
          title={editingId ? t("editPlayer") : t("addPlayer")}
          onChange={setDraft}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}
