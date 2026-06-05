import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, getCategoryLabel } from "../constants/categories.js";
import { getStageFormatLabel } from "../constants/matchFormats.js";
import {
  averageRating,
  calculateGroupCount,
  createGroupMatches,
  generateFairGroups,
  sortPlayersForSeeding,
} from "../utils/grouping.js";
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

  const eventPlayers = useMemo(
    () =>
      players.filter((player) => {
        if (!player.categories.includes(eventId)) return false;
        if (eventId === "womens_singles") return player.gender === "Female";
        return true;
      }),
    [eventId, players]
  );

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
    const defaultIds = sortPlayersForSeeding(eventPlayers).map((player) => player.id);
    const validIds = stored?.playerIds?.filter((id) => eventPlayers.some((player) => player.id === id)) || [];
    const missingIds = defaultIds.filter((id) => !validIds.includes(id));
    setSeedPlayerIds([...validIds, ...missingIds]);
    setDraftGroups(currentGroups.map((group) => ({ ...group, playerIds: [...group.playerIds] })));
  }, [eventId, eventPlayers, selectedStage?.id]);

  const seededPlayers = seedPlayerIds.map((id) => playersById.get(id)).filter(Boolean);
  const resolvedGroupCount = calculateGroupCount(seedPlayerIds.length, groupSize, groupCount);

  function moveSeed(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= seedPlayerIds.length) return;
    const nextIds = [...seedPlayerIds];
    [nextIds[index], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[index]];
    setSeedPlayerIds(nextIds);
  }

  function autoSortSeeds() {
    setSeedPlayerIds(sortPlayersForSeeding(eventPlayers).map((player) => player.id));
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
    const nextGroups = generateFairGroups({
      seedPlayerIds,
      groupCount: resolvedGroupCount,
      groupSize,
    }).map((group) => ({
      ...group,
      id: groupStorageId(eventId, selectedStage.id, group.order),
      eventId,
      stageId: selectedStage.id,
      published: false,
    }));
    setDraftGroups(nextGroups);
    setNotice("");
  }

  function movePlayerToGroup(playerId, targetGroupId) {
    setDraftGroups((currentGroups) =>
      currentGroups.map((group) => {
        const withoutPlayer = group.playerIds.filter((id) => id !== playerId);
        if (group.id === targetGroupId) {
          return { ...group, playerIds: [...withoutPlayer, playerId] };
        }
        return { ...group, playerIds: withoutPlayer };
      })
    );
  }

  function removeFromGroups(playerId) {
    setDraftGroups((currentGroups) =>
      currentGroups.map((group) => ({
        ...group,
        playerIds: group.playerIds.filter((id) => id !== playerId),
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

  function generateGroupMatches() {
    if (!selectedStage || !draftGroups.length) return;
    if (!window.confirm(t("generateGroupMatchesConfirm"))) return;

    const nextGroupMatches = createGroupMatches({
      groups: draftGroups,
      playersById,
      stage: selectedStage,
      eventId,
    });

    const retainedMatches = matches.filter(
      (match) => !(match.eventId === eventId && match.stageId === selectedStage.id && match.groupId)
    );
    onMatchesChange([...retainedMatches, ...nextGroupMatches]);
    setNotice(t("matchesGenerated"));
  }

  const assignedIds = new Set(draftGroups.flatMap((group) => group.playerIds));
  const unassignedPlayers = seededPlayers.filter((player) => !assignedIds.has(player.id));

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
          <p className="subtle">{eventPlayers.length} {t("players")}</p>
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
            <h2>{t("seedingOrder")}</h2>
            <p className="subtle">{t("seedingOrderHelp")}</p>
          </div>
          <div className="row-actions">
            <button className="ghost-button" type="button" onClick={autoSortSeeds}>
              {t("autoSortByRating")}
            </button>
            <button className="ghost-button" type="button" onClick={() => setSeedPlayerIds(sortPlayersForSeeding(eventPlayers).map((player) => player.id))}>
              {t("resetOrder")}
            </button>
            <button className="primary-button" type="button" onClick={saveSeeding}>
              {t("saveSeedingOrder")}
            </button>
          </div>
        </div>

        <div className="seed-list">
          {seededPlayers.map((player, index) => (
            <article className="seed-row" key={player.id}>
              <strong className="seed-rank">#{index + 1}</strong>
              <div className="seed-player-main">
                <b>{player.name}</b>
                <p>{player.gender} · {ratingLabel(player.rating, t)}</p>
                <div className="category-pills">
                  {player.categories.map((id) => (
                    <span key={id}>{getCategoryLabel(id, language)}</span>
                  ))}
                </div>
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
            {t("autoCalculateGroups")}: {resolvedGroupCount} 路 {t("autoCalculateGroupSize")}
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
              <button className="ghost-button" type="button" onClick={generateGroupMatches}>
                {t("generateGroupMatches")}
              </button>
            </div>
          </div>

          <div className="group-results-grid">
            {draftGroups.map((group) => (
              <article className="group-card" key={group.id}>
                <div className="group-card-header">
                  <h3>{group.name}</h3>
                  <span>{group.playerIds.length} {t("players")}</span>
                </div>
                <p className="subtle">
                  {t("averageRating")}: {averageRating(group.playerIds, playersById) ?? t("unrated")}
                </p>
                <div className="group-player-list">
                  {group.playerIds.map((playerId, index) => {
                    const player = playersById.get(playerId);
                    if (!player) return null;

                    return (
                      <div className="group-player-row" key={playerId}>
                        <span>{index + 1}. {player.name} 路 {ratingLabel(player.rating, t)}</span>
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
                  <span>{player.name} 路 {ratingLabel(player.rating, t)}</span>
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
    </section>
  );
}

