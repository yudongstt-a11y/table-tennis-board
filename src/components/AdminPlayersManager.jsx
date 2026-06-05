import { useMemo, useState } from "react";
import { CATEGORIES, getCategoryLabel } from "../constants/categories.js";
import {
  officialDoublesPairs,
  officialPlayers,
  playersNeedDoublesPartner,
} from "../data/officialPlayers.js";
import PlayerForm, { emptyPlayer } from "./PlayerForm.jsx";
import { ratingLabel } from "./PlayerAutocomplete.jsx";

function normalize(value) {
  return String(value).trim().toLowerCase();
}

function slugifyName(name) {
  return (
    normalize(name)
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "player"
  );
}

function prepareOfficialPlayer(entry, existingPlayer = null, index = 0) {
  return {
    ...existingPlayer,
    ...entry,
    id: existingPlayer?.id || `p_${slugifyName(entry.name)}_${Date.now()}_${index}`,
    name: entry.name.trim(),
    gender: entry.gender || "Other",
    rating: typeof entry.rating === "number" ? entry.rating : null,
    ratingNote: entry.ratingNote || "",
    categories: Array.from(new Set(entry.categories || [])),
    doublesPartner: entry.doublesPartner || "",
    needsDoublesPartner: Boolean(entry.needsDoublesPartner),
    notes: entry.notes || "",
  };
}

function defaultBulkDraft(action) {
  return {
    action,
    categoryIds: [],
    rating: "",
    error: "",
  };
}

export default function AdminPlayersManager({ players, matches, language, t, onPlayersChange }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [sort, setSort] = useState("name");
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [bulkDraft, setBulkDraft] = useState(null);
  const [bulkNotice, setBulkNotice] = useState("");

  const selectedSet = useMemo(() => new Set(selectedPlayerIds), [selectedPlayerIds]);

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

  const visibleIds = visiblePlayers.map((player) => player.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));

  function openAdd() {
    setEditingId(null);
    setFormError("");
    setDraft({ ...emptyPlayer });
  }

  function openEdit(player) {
    setEditingId(player.id);
    setFormError("");
    setDraft({
      ...player,
      rating: player.rating ?? "",
      categories: [...player.categories],
      ratingNote: player.ratingNote || "",
      doublesPartner: player.doublesPartner || "",
      needsDoublesPartner: Boolean(player.needsDoublesPartner),
      notes: player.notes || "",
    });
  }

  function closeForm() {
    setDraft(null);
    setEditingId(null);
    setFormError("");
  }

  function normalizeDraft() {
    return {
      ...draft,
      name: draft.name.trim(),
      rating: draft.rating === "" || draft.rating === null ? null : Number(draft.rating),
      ratingNote: draft.ratingNote || "",
      categories: draft.categories.length ? draft.categories : ["singles"],
      doublesPartner: draft.doublesPartner || "",
      needsDoublesPartner: Boolean(draft.needsDoublesPartner),
      notes: draft.notes || "",
    };
  }

  function validateDraft() {
    if (!draft.name.trim()) return t("enterPlayerName");
    if (!draft.gender) return t("selectGender");
    if (!draft.categories.length) return t("selectAtLeastOneEvent");
    if (draft.rating !== "" && draft.rating !== null && Number.isNaN(Number(draft.rating))) {
      return t("ratingMustBeNumber");
    }
    if (draft.gender !== "Female" && draft.categories.includes("womens_singles")) {
      return t("womensOnly");
    }
    return "";
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateDraft();
    if (validationError) {
      setFormError(validationError);
      return;
    }

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
    if (!window.confirm(t("confirmDeletePlayer"))) return;
    onPlayersChange(players.filter((player) => player.id !== id));
    setSelectedPlayerIds((ids) => ids.filter((item) => item !== id));
  }

  function importOfficialEntries() {
    if (!window.confirm(t("confirmImportOfficialEntries"))) return;

    const officialByName = new Map(
      officialPlayers.map((player) => [normalize(player.name), player])
    );
    const existingNames = new Set(players.map((player) => normalize(player.name)));

    const nextPlayers = players.map((player) => {
      const officialPlayer = officialByName.get(normalize(player.name));
      return officialPlayer ? prepareOfficialPlayer(officialPlayer, player) : player;
    });

    const additions = officialPlayers
      .filter((player) => !existingNames.has(normalize(player.name)))
      .map((player, index) => prepareOfficialPlayer(player, null, index));

    onPlayersChange([...nextPlayers, ...additions]);
    setSelectedPlayerIds([]);
    setBulkNotice(
      t("officialImportComplete", {
        players: officialPlayers.length,
        doubles: officialDoublesPairs.length,
        needs: playersNeedDoublesPartner.length,
      })
    );
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

  function togglePlayer(id) {
    setBulkNotice("");
    setSelectedPlayerIds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
    );
  }

  function toggleSelectAllVisible() {
    setBulkNotice("");
    if (allVisibleSelected) {
      setSelectedPlayerIds((ids) => ids.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedPlayerIds((ids) => Array.from(new Set([...ids, ...visibleIds])));
  }

  function clearSelection() {
    setSelectedPlayerIds([]);
    setBulkNotice("");
  }

  function deleteSelected() {
    const count = selectedPlayerIds.length;
    if (!count) return;
    const message = `${t("confirmBulkDeletePlayers", { count })} ${t("bulkDeleteKeepsMatches")}`;
    if (!window.confirm(message)) return;

    onPlayersChange(players.filter((player) => !selectedSet.has(player.id)));
    setSelectedPlayerIds([]);
    setBulkNotice(t("bulkActionCompleted"));
  }

  function toggleBulkCategory(categoryId) {
    setBulkDraft((current) => {
      const hasCategory = current.categoryIds.includes(categoryId);
      return {
        ...current,
        error: "",
        categoryIds: hasCategory
          ? current.categoryIds.filter((id) => id !== categoryId)
          : [...current.categoryIds, categoryId],
      };
    });
  }

  function applyBulkEvents() {
    if (!bulkDraft.categoryIds.length) {
      setBulkDraft((current) => ({ ...current, error: t("selectEvents") }));
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    const nextPlayers = players.map((player) => {
      if (!selectedSet.has(player.id)) return player;

      if (bulkDraft.action === "add-events") {
        const allowedCategories = bulkDraft.categoryIds.filter((id) => {
          if (id === "womens_singles" && player.gender !== "Female") {
            return false;
          }
          return true;
        });
        if (allowedCategories.length !== bulkDraft.categoryIds.length) {
          skippedCount += 1;
        }

        const nextCategories = Array.from(new Set([...player.categories, ...allowedCategories]));
        if (nextCategories.length !== player.categories.length) updatedCount += 1;
        return { ...player, categories: nextCategories };
      }

      const nextCategories = player.categories.filter((id) => !bulkDraft.categoryIds.includes(id));
      if (nextCategories.length !== player.categories.length) updatedCount += 1;
      return { ...player, categories: nextCategories };
    });

    onPlayersChange(nextPlayers);
    setBulkDraft(null);
    setBulkNotice(
      skippedCount > 0
        ? `${t("bulkEventsAddedWithSkipped", { count: updatedCount })} ${t("bulkGenderSkipped", { count: skippedCount })}`
        : t("bulkActionCompleted")
    );
  }

  function applyBulkRating(clear = false) {
    if (!clear && (bulkDraft.rating === "" || Number.isNaN(Number(bulkDraft.rating)))) {
      setBulkDraft((current) => ({ ...current, error: t("ratingMustBeNumber") }));
      return;
    }

    const nextRating = clear ? null : Number(bulkDraft.rating);
    onPlayersChange(
      players.map((player) =>
        selectedSet.has(player.id) ? { ...player, rating: nextRating } : player
      )
    );
    setBulkDraft(null);
    setBulkNotice(t("bulkActionCompleted"));
  }

  const selectedCountText =
    selectedPlayerIds.length > 0
      ? t("playersSelected", { count: selectedPlayerIds.length })
      : t("noPlayersSelected");

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
        <div className="row-actions">
          <button className="ghost-button" type="button" onClick={importOfficialEntries}>
            {t("importOfficialEntries")}
          </button>
          <button className="primary-button" type="button" onClick={openAdd}>
            {t("addPlayer")}
          </button>
        </div>
      </div>

      <div className="bulk-selection-bar">
        <div>
          <button className="ghost-button" type="button" onClick={toggleSelectAllVisible}>
            {allVisibleSelected ? t("cancelSelectAll") : t("selectAll")}
          </button>
          <strong>{selectedCountText}</strong>
        </div>
        {selectedPlayerIds.length > 0 && (
          <div className="bulk-actions">
            <span>{t("bulkActions")}</span>
            <button className="danger-button" type="button" onClick={deleteSelected}>
              {t("deleteSelected")}
            </button>
            <button className="ghost-button" type="button" onClick={() => setBulkDraft(defaultBulkDraft("add-events"))}>
              {t("addEvent")}
            </button>
            <button className="ghost-button" type="button" onClick={() => setBulkDraft(defaultBulkDraft("remove-events"))}>
              {t("removeEvent")}
            </button>
            <button className="ghost-button" type="button" onClick={() => setBulkDraft(defaultBulkDraft("set-rating"))}>
              {t("setRating")}
            </button>
            <button className="ghost-button" type="button" onClick={clearSelection}>
              {t("clearSelection")}
            </button>
          </div>
        )}
      </div>

      {bulkNotice && <div className="status-notice">{bulkNotice}</div>}

      <div className="admin-list">
        {visiblePlayers.map((player) => {
          const selected = selectedSet.has(player.id);

          return (
            <article
              className={selected ? "admin-row player-row selected-player-row" : "admin-row player-row"}
              key={player.id}
            >
              <label className="player-select-checkbox" aria-label={`${t("select")} ${player.name}`}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => togglePlayer(player.id)}
                />
              </label>

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
                  <div className="player-extra-info">
                    {player.ratingNote && (
                      <span>
                        {t("ratingNote")}: {player.ratingNote}
                      </span>
                    )}
                    {player.doublesPartner && (
                      <span>
                        {t("doublesPartner")}: {player.doublesPartner}
                      </span>
                    )}
                    {player.needsDoublesPartner && <span>{t("needsDoublesPartner")}</span>}
                    {player.notes && (
                      <span>
                        {t("notes")}: {player.notes}
                      </span>
                    )}
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
          );
        })}
      </div>

      {bulkDraft && (
        <div className="modal-backdrop" role="presentation">
          <section className="match-modal" role="dialog" aria-modal="true" aria-label={t("bulkActions")}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{t("bulkActions")}</p>
                <h2>
                  {bulkDraft.action === "set-rating"
                    ? t("setRating")
                    : bulkDraft.action === "add-events"
                      ? t("addEvent")
                      : t("removeEvent")}
                </h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setBulkDraft(null)}>
                X
              </button>
            </div>

            {bulkDraft.action === "set-rating" ? (
              <form className="match-form" onSubmit={(event) => { event.preventDefault(); applyBulkRating(false); }}>
                <label>
                  <span>{t("rating")}</span>
                  <input
                    type="number"
                    value={bulkDraft.rating}
                    onChange={(event) =>
                      setBulkDraft((current) => ({ ...current, rating: event.target.value, error: "" }))
                    }
                  />
                </label>
                {bulkDraft.error && <div className="form-error">{bulkDraft.error}</div>}
                <div className="form-actions">
                  <button className="ghost-button" type="button" onClick={() => setBulkDraft(null)}>
                    {t("cancel")}
                  </button>
                  <button className="ghost-button" type="button" onClick={() => applyBulkRating(true)}>
                    {t("clearRating")}
                  </button>
                  <button className="primary-button" type="submit">
                    {t("apply")}
                  </button>
                </div>
              </form>
            ) : (
              <div className="match-form">
                <fieldset className="category-checkboxes">
                  <legend>{t("selectEvents")}</legend>
                  {CATEGORIES.map((category) => (
                    <label key={category.id}>
                      <input
                        type="checkbox"
                        checked={bulkDraft.categoryIds.includes(category.id)}
                        onChange={() => toggleBulkCategory(category.id)}
                      />
                      <span>{category[language]}</span>
                    </label>
                  ))}
                </fieldset>
                {bulkDraft.error && <div className="form-error">{bulkDraft.error}</div>}
                <div className="form-actions">
                  <button className="ghost-button" type="button" onClick={() => setBulkDraft(null)}>
                    {t("cancel")}
                  </button>
                  <button className="primary-button" type="button" onClick={applyBulkEvents}>
                    {t("apply")}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {draft && (
        <PlayerForm
          value={draft}
          language={language}
          t={t}
          title={editingId ? t("editPlayer") : t("addPlayer")}
          error={formError}
          onChange={(nextDraft) => {
            setFormError("");
            setDraft(nextDraft);
          }}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}
