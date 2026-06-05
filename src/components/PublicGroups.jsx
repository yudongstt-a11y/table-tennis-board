import { useMemo, useState } from "react";
import { CATEGORIES, getCategoryLabel } from "../constants/categories.js";
import { getStageFormatLabel } from "../constants/matchFormats.js";
import { ratingLabel } from "./PlayerAutocomplete.jsx";

const eventTabs = [
  { id: "singles", zh: "综合单打", en: "Singles" },
  { id: "womens_singles", zh: "女子单打", en: "Women's Singles" },
  { id: "mixed_doubles", zh: "双打组", en: "Doubles" },
];

function stageName(stage, language) {
  if (!stage) return "";
  return language === "zh" ? stage.nameZh : stage.nameEn || stage.nameZh;
}

function matchWinnerName(match) {
  if (!match.winnerSide) return "";
  return match.winnerSide === "A" ? match.playerAName : match.playerBName;
}

function stageLabel(index, t) {
  if (index === 0) return t("stageOne");
  if (index === 1) return t("stageTwo");
  return `${t("stages")} ${index + 1}`;
}

function roundLabel(round, totalRounds, t) {
  if (round === totalRounds) return t("final");
  if (totalRounds === 3 && round === 2) return "Semi Final";
  return `${t("round")} ${round}`;
}

function GroupCards({ groups, playerMap, language, t }) {
  return (
    <div className="group-results-grid">
      {groups.map((group) => (
        <article className="group-card" key={group.id}>
          <div className="group-card-header">
            <h3>{group.name}</h3>
            <span>{group.playerIds.length} {t("players")}</span>
          </div>
          <div className="group-player-list">
            {group.playerIds.map((playerId, index) => {
              const player = playerMap.get(playerId);
              return (
                <div className="group-player-row public-group-player" key={playerId}>
                  <span>
                    {index + 1}. {player?.name || playerId} ·{" "}
                    {player ? ratingLabel(player.rating, t) : t("unrated")}
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}

function BracketRounds({ matches, t }) {
  const rounds = new Map();
  matches.forEach((match) => {
    const round = Number(match.bracketRound || match.roundNumber) || 1;
    const current = rounds.get(round) || [];
    current.push(match);
    rounds.set(round, current);
  });

  const sortedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);
  if (!sortedRounds.length) return <div className="empty-state">{t("noStageData")}</div>;

  return (
    <div className="bracket-board">
      {sortedRounds.map(([round, roundMatches]) => (
        <section className="bracket-round" key={round}>
          <h3>{roundLabel(round, sortedRounds.length, t)}</h3>
          {roundMatches
            .sort(
              (a, b) =>
                (Number(a.bracketPosition) || 0) - (Number(b.bracketPosition) || 0) ||
                String(a.time).localeCompare(String(b.time))
            )
            .map((match) => {
              const winner = matchWinnerName(match);
              return (
                <article className="bracket-match" key={match.id}>
                  <strong>{match.round || `${t("round")} ${round}`}</strong>
                  {match.isBye ? (
                    <p>{match.playerAName || match.playerBName} · {t("advancedByBye")}</p>
                  ) : (
                    <>
                      <p className={winner === match.playerAName ? "winner-line" : ""}>
                        {match.playerAName || "TBD"}
                      </p>
                      <p className={winner === match.playerBName ? "winner-line" : ""}>
                        {match.playerBName || "TBD"}
                      </p>
                      {match.score && <span>{match.score}</span>}
                    </>
                  )}
                </article>
              );
            })}
        </section>
      ))}
    </div>
  );
}

export default function PublicGroups({ groups, matches, players, stages, language, t }) {
  const [activeEventId, setActiveEventId] = useState("singles");
  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const publishedGroups = groups.filter((group) => group.published);

  const eventStages = useMemo(
    () =>
      stages
        .filter((stage) => stage.eventId === activeEventId)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
    [activeEventId, stages]
  );

  const eventGroups = publishedGroups.filter((group) => group.eventId === activeEventId);
  const eventMatches = matches.filter((match) => match.eventId === activeEventId || match.categoryId === activeEventId);
  const hasAnyEventData = eventGroups.length > 0 || eventMatches.some((match) => match.stageFormat !== "round_robin");

  return (
    <section className="public-section">
      <nav className="sub-tabs event-tabs" aria-label="Event group tabs">
        {eventTabs.map((event) => (
          <button
            className={activeEventId === event.id ? "active" : ""}
            key={event.id}
            type="button"
            onClick={() => setActiveEventId(event.id)}
          >
            {event[language]}
          </button>
        ))}
      </nav>

      {!hasAnyEventData && <div className="empty-state">{t("noGroupsAvailable")}</div>}

      {eventStages.map((stage, index) => {
        const stageGroups = eventGroups
          .filter((group) => group.stageId === stage.id)
          .sort((a, b) => a.order - b.order);
        const stageMatches = eventMatches
          .filter((match) => match.stageId === stage.id)
          .sort(
            (a, b) =>
              (Number(a.bracketRound || a.roundNumber) || 0) -
                (Number(b.bracketRound || b.roundNumber) || 0) ||
              (Number(a.bracketPosition) || 0) - (Number(b.bracketPosition) || 0)
          );
        const hasStageData = stageGroups.length > 0 || stageMatches.length > 0;

        return (
          <section className="group-public-section" key={stage.id}>
            <div className="section-title-row">
              <div>
                <p className="eyebrow">
                  {getCategoryLabel(activeEventId, language)} · {stageLabel(index, t)}
                </p>
                <h2>{stageName(stage, language)}</h2>
                <p className="subtle">{getStageFormatLabel(stage.format, language)}</p>
              </div>
            </div>

            {!hasStageData ? (
              <div className="empty-state compact-empty">{t("noStageData")}</div>
            ) : stage.format === "round_robin" ? (
              stageGroups.length ? (
                <GroupCards groups={stageGroups} playerMap={playerMap} language={language} t={t} />
              ) : (
                <div className="empty-state compact-empty">{t("noStageData")}</div>
              )
            ) : (
              <BracketRounds matches={stageMatches} t={t} />
            )}
          </section>
        );
      })}

      {hasAnyEventData && eventStages.length === 0 && (
        <section className="group-public-section">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">{getCategoryLabel(activeEventId, language)}</p>
              <h2>{activeEventId === "mixed_doubles" ? t("doubles") : getCategoryLabel(activeEventId, language)}</h2>
            </div>
          </div>
          <GroupCards groups={eventGroups} playerMap={playerMap} language={language} t={t} />
        </section>
      )}
    </section>
  );
}
