import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, getCategoryLabel } from "../constants/categories.js";
import { getStageFormatLabel } from "../constants/matchFormats.js";
import {
  averageRating,
  averageEntryRating,
  calculateGroupCount,
  createGroupMatches,
  generateFairEntryGroups,
  generateFairGroups,
  groupEntryIds,
  sortPlayersForSeeding,
} from "../utils/grouping.js";
import {
  buildDoublesEntriesFromPlayers,
  doublesEntryDisplayName,
  doublesEntryRatingLine,
  doublesEntrySummary,
} from "../utils/doublesEntries.js";
import { generateKnockoutMatches } from "../utils/knockoutBracket.js";
import { ratingLabel } from "./PlayerAutocomplete.jsx";

function seedingId(eventId, stageId) {
  return `seed_${eventId}_${stageId}`;
}

function groupStorageId(eventId, stageId, order) {
  return `group_${eventId}_${stageId}_${order}`;
}

export default function AdminGroupingManager({
  players,
  stages,
  seedings,
  groups,
  matches,
  tournamentSettings,
  language,
  t,
  onSeedingsChange,
  onGroupsChange,
  onMatchesChange,
}) {
  const [eventId, setEventId] = useState("singles");
  const [stageId, setStageId] = useState("");
  const [seedPlayerIds, setSeedPlayerIds] = useState([]);
  const [groupSize, setGroupSize] = useState(4);
  const [groupCount, setGroupCount] = useState("");
  const [draftGroups, setDraftGroups] = useState([]);
  const [notice, setNotice] = useState("");
  const [generateDraft, setGenerateDraft] = useState(null);

  const eventPlayers = useMemo(
    () =>
      players.filter((player) => {
        if (!player.categories.includes(eventId)) return false;
        if (eventId === "womens_singles") return player.gender === "Female";
        return true;
      }),
    [eventId, players]
  );
  const isDoublesEvent = eventId === "mixed_doubles";
  const pairEntries = useMemo(() => buildDoublesEntriesFromPlayers(players), [players]);
  const pairSummary = useMemo(() => doublesEntrySummary(pairEntries), [pairEntries]);
  const eventEntries = isDoublesEvent ? pairEntries : eventPlayers;

  const eventStages = useMemo(
    () => stages.filter((stage) => stage.eventId === eventId),
    [eventId, stages]
  );

  const selectedStage = eventStages.find((stage) => stage.id === stageId) || eventStages[0];
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const currentGroups = groups.filter((group) => group.eventId === eventId && group.stageId === selectedStage?.id);

  useEffect(() => {
    if (!eventStages.length) {
      setStageId("");
      return;
    }
    if (!eventStages.some((stage) => stage.id === stageId)) {
      setStageId(eventStages[0].id);
    }
  }, [eventStages, stageId]);

  useEffect(() => {
    if (!selectedStage) return;
    const stored = seedings.find((item) => item.id === seedingId(eventId, selectedStage.id));
    const defaultIds = isDoublesEvent
      ? pairEntries.map((pair) => pair.id)
      : sortPlayersForSeeding(eventPlayers).map((player) => player.id);
    const validIds =
      stored?.playerIds?.filter((id) => eventEntries.some((entry) => entry.id === id)) || [];
    const missingIds = defaultIds.filter((id) => !validIds.includes(id));
    setSeedPlayerIds([...validIds, ...missingIds]);
    setDraftGroups(currentGroups.map((group) => ({
      ...group,
      entryType: group.entryType || (isDoublesEvent ? "pair" : "player"),
      entryIds: [...groupEntryIds(group)],
      playerIds: [...(group.playerIds || [])],
    })));
  }, [eventId, eventPlayers, eventEntries, isDoublesEvent, pairEntries, selectedStage?.id]);

  const entriesById = useMemo(() => new Map(eventEntries.map((entry) => [entry.id, entry])), [eventEntries]);
  const seededPlayers = seedPlayerIds.map((id) => entriesById.get(id)).filter(Boolean);
  const resolvedGroupCount = calculateGroupCount(seedPlayerIds.length, groupSize, groupCount);

  function moveSeed(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= seedPlayerIds.length) return;
    const nextIds = [...seedPlayerIds];
    [nextIds[index], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[index]];
    setSeedPlayerIds(nextIds);
  }

  function autoSortSeeds() {
    setSeedPlayerIds(
      isDoublesEvent
        ? pairEntries.map((pair) => pair.id)
        : sortPlayersForSeeding(eventPlayers).map((player) => player.id)
    );
    setNotice(t("unratedAtEnd"));
  }

  function saveSeeding() {
    if (!selectedStage) return;
    const id = seedingId(eventId, selectedStage.id);
    const nextSeeding = {
      id,
      eventId,
      stageId: selectedStage.id,
      playerIds: seedPlayerIds,
      updatedAt: new Date().toISOString(),
    };
    onSeedingsChange([...seedings.filter((item) => item.id !== id), nextSeeding]);
    setNotice(t("bulkActionCompleted"));
  }

  function generateGroups() {
    if (!selectedStage) return;
    const generated = isDoublesEvent
      ? generateFairEntryGroups({
          seedEntryIds: seedPlayerIds,
          groupCount: resolvedGroupCount,
          groupSize,
          entryType: "pair",
        })
      : generateFairGroups({
          seedPlayerIds,
          groupCount: resolvedGroupCount,
          groupSize,
        });
    const nextGroups = generated.map((group) => ({
      ...group,
      id: groupStorageId(eventId, selectedStage.id, group.order),
      eventId,
      stageId: selectedStage.id,
      entryType: isDoublesEvent ? "pair" : "player",
      entryIds: groupEntryIds(group),
      published: false,
    }));
    setDraftGroups(nextGroups);
    setNotice("");
  }

  function movePlayerToGroup(playerId, targetGroupId) {
    setDraftGroups((currentGroups) =>
      currentGroups.map((group) => {
        const ids = groupEntryIds(group);
        const withoutPlayer = ids.filter((id) => id !== playerId);
        if (group.id === targetGroupId) {
          return {
            ...group,
            entryIds: [...withoutPlayer, playerId],
            playerIds: group.entryType === "pair" ? [] : [...withoutPlayer, playerId],
          };
        }
        return {
          ...group,
          entryIds: withoutPlayer,
          playerIds: group.entryType === "pair" ? [] : withoutPlayer,
        };
      })
    );
  }

  function removeFromGroups(playerId) {
    setDraftGroups((currentGroups) =>
      currentGroups.map((group) => ({
        ...group,
        entryIds: groupEntryIds(group).filter((id) => id !== playerId),
        playerIds: group.entryType === "pair" ? [] : group.playerIds.filter((id) => id !== playerId),
      }))
    );
  }

  function saveGroups() {
    if (!selectedStage || !draftGroups.length) return;
    if (currentGroups.length && !window.confirm(t("overwriteGroupsConfirm"))) return;

    const nextGroups = [
      ...groups.filter((group) => !(group.eventId === eventId && group.stageId === selectedStage.id)),
      ...draftGroups.map((group) => ({
        ...group,
        published: currentGroups.some((currentGroup) => currentGroup.published),
      })),
    ];
    onGroupsChange(nextGroups);
    setNotice(t("groupsSaved"));
  }

  function setGroupsPublished(published) {
    if (!selectedStage) return;
    onGroupsChange(
      groups.map((group) =>
        group.eventId === eventId && group.stageId === selectedStage.id
          ? { ...group, published }
          : group
      )
    );
    setDraftGroups((current) => current.map((group) => ({ ...group, published })));
    setNotice(published ? t("groupsPublished") : t("groupsUnpublished"));
  }

  function openGenerateMatches() {
    if (!selectedStage) return;
    setGenerateDraft({
      tableCount: tournamentSettings.tableCount,
      selectedTables: tournamentSettings.tableNames.slice(0, tournamentSettings.tableCount),
      scope: "current_stage",
      startTime: "09:30",
      error: "",
    });
  }

  function groupsForStage(stageId) {
    if (stageId === selectedStage?.id && draftGroups.length) return draftGroups;
    return groups.filter((group) => group.stageId === stageId);
  }

  function stagesForScope(scope) {
    if (!selectedStage) return [];
    if (scope === "current_stage") return [selectedStage];
    if (scope === "current_event") return eventStages;
    return stages;
  }

  function tableOrderMap(existingMatches) {
    const map = new Map();
    existingMatches.forEach((match) => {
      if (!match.table) return;
      map.set(match.table, Math.max(map.get(match.table) || 0, Number(match.tableOrder) || 0));
    });
    return map;
  }

  function withAssignedTables(rawMatches, stageTables, orderMap, startMsByTable) {
    return rawMatches
      .sort(
        (a, b) =>
          (Number(a.roundNumber) || 0) - (Number(b.roundNumber) || 0) ||
          String(a.groupId).localeCompare(String(b.groupId))
      )
      .map((match, index) => {
        const table = stageTables[index % stageTables.length];
        const nextOrder = (orderMap.get(table) || 0) + 1;
        orderMap.set(table, nextOrder);

        let time = match.time;
        if (startMsByTable) {
          const startMs = startMsByTable.get(table);
          time = new Date(startMs).toISOString().slice(0, 19);
          startMsByTable.set(table, startMs + (Number(match.defaultMinutes) || 25) * 60 * 1000);
        }

        return {
          ...match,
          table,
          tableOrder: nextOrder,
          stageOrder: Number(match.stageOrder || selectedStage?.order || 1),
          batchIndex: nextOrder,
          time,
        };
      });
  }

  function confirmGenerateMatches(event) {
    event.preventDefault();
    if (!selectedStage) return;
    const selectedTables = generateDraft.selectedTables.slice(0, Number(generateDraft.tableCount) || 1);
    if (!selectedTables.length) {
      setGenerateDraft((draft) => ({ ...draft, error: t("selectTargetTable") }));
      return;
    }

    const targetStages = stagesForScope(generateDraft.scope)
      .filter((stage) => groupsForStage(stage.id).length)
      .sort((a, b) => Number(a.order) - Number(b.order));
    const stagesByOrder = new Map();
    targetStages.forEach((stage) => {
      const order = Number(stage.order) || 1;
      stagesByOrder.set(order, [...(stagesByOrder.get(order) || []), stage]);
    });

    for (const [, batchStages] of stagesByOrder) {
      const allocated = batchStages.reduce((sum, stage) => sum + (Number(stage.tableAllocation) || 1), 0);
      if (allocated > selectedTables.length) {
        setGenerateDraft((draft) => ({ ...draft, error: t("stageAllocationExceeded") }));
        return;
      }
    }

    const targetStageIds = new Set(targetStages.map((stage) => stage.id));
    const retainedMatches = matches.filter((match) => !targetStageIds.has(match.stageId));
    const startDate = generateDraft.startTime
      ? new Date(`${tournamentSettings.date || "2026-06-15"}T${generateDraft.startTime}:00`)
      : null;
    let batchStartMs = startDate && !Number.isNaN(startDate.getTime()) ? startDate.getTime() : null;
    const orderMap = tableOrderMap(retainedMatches);
    const generatedMatches = [];

    Array.from(stagesByOrder.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([order, batchStages]) => {
        let tableCursor = 0;
        let batchMaxEndMs = batchStartMs;

        batchStages.forEach((stage) => {
          const allocation = Number(stage.tableAllocation) || 1;
          const stageTables = selectedTables.slice(tableCursor, tableCursor + allocation);
          tableCursor += allocation;

          const rawMatches = createGroupMatches({
            groups: groupsForStage(stage.id),
            playersById,
            entriesById: stage.eventId === "mixed_doubles" ? new Map(pairEntries.map((pair) => [pair.id, pair])) : playersById,
            stage,
            eventId: stage.eventId,
          }).map((match) => ({ ...match, stageOrder: order }));
          const startMsByTable = batchStartMs
            ? new Map(stageTables.map((table) => [table, batchStartMs]))
            : null;
          const assigned = withAssignedTables(rawMatches, stageTables, orderMap, startMsByTable);
          generatedMatches.push(...assigned);

          if (startMsByTable) {
            const stageEndMs = Math.max(...Array.from(startMsByTable.values()));
            batchMaxEndMs = Math.max(batchMaxEndMs || stageEndMs, stageEndMs);
          }
        });

        if (batchStartMs) batchStartMs = batchMaxEndMs;
      });

    onMatchesChange([...retainedMatches, ...generatedMatches]);
    setGenerateDraft(null);
    setNotice(t("matchesGenerated"));
  }

  function generateKnockoutBracket() {
    if (!selectedStage || selectedStage.format !== "knockout") return;
    if (!seededPlayers.length) return;

    if (!window.confirm(t("generateKnockoutConfirm"))) return;

    const generatedMatches = generateKnockoutMatches({
      entries: seededPlayers,
      stage: selectedStage,
      tournamentId: tournamentSettings.id,
    });
    const retainedMatches = matches.filter((match) => match.stageId !== selectedStage.id);
    onMatchesChange([...retainedMatches, ...generatedMatches]);
    setNotice(t("matchesGenerated"));
  }

  const assignedIds = new Set(draftGroups.flatMap((group) => groupEntryIds(group)));
  const unassignedPlayers = seededPlayers.filter((player) => !assignedIds.has(player.id));
  const entryCountLabel = isDoublesEvent
    ? `${pairEntries.length} ${t("doublesEntries")}`
    : `${eventPlayers.length} ${t("players")}`;

  return (
    <section className="admin-panel grouping-panel">
      <div className="workflow-grid">
        <section className="workflow-card">
          <p className="eyebrow">Step 1</p>
          <h2>{t("selectEvent")}</h2>
          <div className="segmented grouping-segmented">
            {CATEGORIES.map((category) => (
              <button
                className={eventId === category.id ? "active" : ""}
                key={category.id}
                type="button"
                onClick={() => setEventId(category.id)}
              >
                {category[language]}
              </button>
            ))}
          </div>
          <p className="subtle">{entryCountLabel}</p>
          {isDoublesEvent && (
            <p className="subtle">
              {pairSummary.confirmed} {t("confirmedPairs")}, {pairSummary.needsPartner} {t("playersNeedPartners")}
            </p>
          )}
        </section>

        <section className="workflow-card">
          <p className="eyebrow">Step 2</p>
          <h2>{t("selectStage")}</h2>
          <select value={selectedStage?.id || ""} onChange={(event) => setStageId(event.target.value)}>
            {eventStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {language === "zh" ? stage.nameZh : stage.nameEn}
              </option>
            ))}
          </select>
          {selectedStage && (
            <p className="subtle">
              {getStageFormatLabel(selectedStage.format, language)}
              {selectedStage.format !== "round_robin" ? ` 路 ${t("roundRobinGroupingHint")}` : ""}
            </p>
          )}
        </section>
      </div>

      <section className="workflow-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Step 3</p>
            <h2>{isDoublesEvent ? t("pairSeedingOrder") : t("seedingOrder")}</h2>
            <p className="subtle">
              {isDoublesEvent ? t("doublesSeedingHelp") : t("seedingOrderHelp")}
            </p>
          </div>
          <div className="row-actions">
            <button className="ghost-button" type="button" onClick={autoSortSeeds}>
              {t("autoSortByRating")}
            </button>
            <button className="ghost-button" type="button" onClick={autoSortSeeds}>
              {t("resetOrder")}
            </button>
            <button className="primary-button" type="button" onClick={saveSeeding}>
              {t("saveSeedingOrder")}
            </button>
            {selectedStage?.format === "knockout" && (
              <button className="primary-button" type="button" onClick={generateKnockoutBracket}>
                {t("generateKnockoutBracket")}
              </button>
            )}
          </div>
        </div>

        <div className="seed-list">
          {seededPlayers.map((entry, index) => (
            <article className="seed-row" key={entry.id}>
              <strong className="seed-rank">#{index + 1}</strong>
              <div className="seed-player-main">
                <b>{isDoublesEvent ? doublesEntryDisplayName(entry, language) : entry.name}</b>
                {isDoublesEvent ? (
                  <>
                    <p>{doublesEntryRatingLine(entry, t)}</p>
                    {entry.notes && <p className="subtle">{entry.notes}</p>}
                  </>
                ) : (
                  <>
                    <p>{entry.gender} · {ratingLabel(entry.rating, t)}</p>
                    <div className="category-pills">
                      {entry.categories.map((id) => (
                        <span key={id}>{getCategoryLabel(id, language)}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="seed-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => moveSeed(index, -1)}
                  disabled={index === 0}
                >
                  {t("moveUp")}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => moveSeed(index, 1)}
                  disabled={index === seededPlayers.length - 1}
                >
                  {t("moveDown")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-card">
        <p className="eyebrow">Step 4</p>
        <h2>{t("groupingSettings")}</h2>
        <div className="group-settings">
          <label>
            <span>{t("playersPerGroup")}</span>
            <input
              min="2"
              type="number"
              value={groupSize}
              onChange={(event) => {
                setGroupSize(event.target.value);
                setGroupCount("");
              }}
            />
          </label>
          <label>
            <span>{t("numberOfGroups")}</span>
            <input
              min="1"
              type="number"
              value={groupCount}
              onChange={(event) => setGroupCount(event.target.value)}
            />
          </label>
          <div className="form-hint">
            {t("autoCalculateGroups")}: {resolvedGroupCount} · {t("autoCalculateGroupSize")}
          </div>
          <button className="primary-button" type="button" onClick={generateGroups}>
            {t("generateGroups")}
          </button>
        </div>
      </section>

      {notice && <div className="status-notice">{notice}</div>}

      {draftGroups.length > 0 && (
        <section className="workflow-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Step 5</p>
              <h2>{t("groupResults")}</h2>
            </div>
            <div className="row-actions">
              <button className="primary-button" type="button" onClick={saveGroups}>
                {t("saveGroups")}
              </button>
              <button className="ghost-button" type="button" onClick={() => setGroupsPublished(!currentGroups.some((group) => group.published))}>
                {currentGroups.some((group) => group.published) ? t("unpublishGroups") : t("publishGroups")}
              </button>
              <button className="ghost-button" type="button" onClick={openGenerateMatches}>
                {t("generateGroupMatches")}
              </button>
            </div>
          </div>

          <div className="group-results-grid">
            {draftGroups.map((group) => (
              <article className="group-card" key={group.id}>
                <div className="group-card-header">
                  <h3>{group.name}</h3>
                  <span>
                    {groupEntryIds(group).length}{" "}
                    {group.entryType === "pair" ? t("doublesEntries") : t("players")}
                  </span>
                </div>
                <p className="subtle">
                  {t("averageRating")}:{" "}
                  {group.entryType === "pair"
                    ? averageEntryRating(groupEntryIds(group), entriesById) ?? t("unrated")
                    : averageRating(group.playerIds, playersById) ?? t("unrated")}
                </p>
                <div className="group-player-list">
                  {groupEntryIds(group).map((playerId, index) => {
                    const player = group.entryType === "pair" ? entriesById.get(playerId) : playersById.get(playerId);
                    if (!player) return null;

                    return (
                      <div className="group-player-row" key={playerId}>
                        <span>
                          {index + 1}.{" "}
                          {group.entryType === "pair"
                            ? `${doublesEntryDisplayName(player, language)} · ${t("totalRating")} ${player.totalRating ?? t("unrated")}`
                            : `${player.name} · ${ratingLabel(player.rating, t)}`}
                        </span>
                        <select value={group.id} onChange={(event) => movePlayerToGroup(playerId, event.target.value)}>
                          {draftGroups.map((targetGroup) => (
                            <option key={targetGroup.id} value={targetGroup.id}>
                              {t("moveTo")} {targetGroup.name}
                            </option>
                          ))}
                        </select>
                        <button className="ghost-button" type="button" onClick={() => removeFromGroups(playerId)}>
                          {t("delete")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>

          {unassignedPlayers.length > 0 && (
            <section className="unassigned-box">
              <h3>{t("unassigned")}</h3>
              {unassignedPlayers.map((player) => (
                <div className="group-player-row" key={player.id}>
                  <span>
                    {isDoublesEvent
                      ? `${doublesEntryDisplayName(player, language)} · ${t("totalRating")} ${player.totalRating ?? t("unrated")}`
                      : `${player.name} · ${ratingLabel(player.rating, t)}`}
                  </span>
                  <select defaultValue="" onChange={(event) => movePlayerToGroup(player.id, event.target.value)}>
                    <option value="" disabled>{t("moveTo")}</option>
                    {draftGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </section>
          )}
        </section>
      )}

      {generateDraft && (
        <div className="modal-backdrop" role="presentation">
          <section className="match-modal" role="dialog" aria-modal="true" aria-label={t("generateMatchesSettings")}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{t("autoAssignTables")}</p>
                <h2>{t("generateMatchesSettings")}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setGenerateDraft(null)}>
                X
              </button>
            </div>

            <form className="match-form" onSubmit={confirmGenerateMatches}>
              <label>
                <span>{t("tablesToUse")}</span>
                <input
                  type="number"
                  min="1"
                  max={tournamentSettings.tableCount}
                  value={generateDraft.tableCount}
                  onChange={(event) =>
                    setGenerateDraft((draft) => ({
                      ...draft,
                      tableCount: event.target.value,
                      selectedTables: tournamentSettings.tableNames.slice(0, Number(event.target.value) || 1),
                      error: "",
                    }))
                  }
                />
              </label>

              <label>
                <span>{t("generationScope")}</span>
                <select
                  value={generateDraft.scope}
                  onChange={(event) =>
                    setGenerateDraft((draft) => ({ ...draft, scope: event.target.value, error: "" }))
                  }
                >
                  <option value="current_stage">{t("currentStage")}</option>
                  <option value="current_event">{t("currentEventStages")}</option>
                  <option value="all_events">{t("allEventStages")}</option>
                </select>
              </label>

              <label>
                <span>{t("startTime")}</span>
                <input
                  type="time"
                  value={generateDraft.startTime}
                  onChange={(event) =>
                    setGenerateDraft((draft) => ({ ...draft, startTime: event.target.value }))
                  }
                />
              </label>

              <fieldset className="category-checkboxes">
                <legend>{t("selectTables")}</legend>
                {tournamentSettings.tableNames.map((table) => (
                  <label key={table}>
                    <input
                      type="checkbox"
                      checked={generateDraft.selectedTables.includes(table)}
                      onChange={() =>
                        setGenerateDraft((draft) => {
                          const selectedTables = draft.selectedTables.includes(table)
                            ? draft.selectedTables.filter((item) => item !== table)
                            : [...draft.selectedTables, table];
                          return {
                            ...draft,
                            selectedTables,
                            tableCount: selectedTables.length,
                            error: "",
                          };
                        })
                      }
                    />
                    <span>{table}</span>
                  </label>
                ))}
              </fieldset>

              <div className="form-hint">
                {t("sameOrderCanRunTogether")}. {t("lowerNumbersEarlier")}.
              </div>
              {generateDraft.error && <div className="form-error">{generateDraft.error}</div>}

              <div className="form-actions">
                <button className="ghost-button" type="button" onClick={() => setGenerateDraft(null)}>
                  {t("cancel")}
                </button>
                <button className="primary-button" type="submit">
                  {t("generateGroupMatches")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

