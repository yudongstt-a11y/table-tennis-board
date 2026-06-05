import { useMemo, useState } from "react";
import { getCategoryLabel } from "../constants/categories.js";
import { getStageFormatLabel } from "../constants/matchFormats.js";
import { groupEntryIds } from "../utils/grouping.js";
import {
  buildDoublesEntriesFromPlayers,
  doublesEntryDisplayName,
} from "../utils/doublesEntries.js";
import { compareMatchesBySchedule } from "../utils/matchSchedule.js";
import { calculateGroupStandings } from "../utils/standings.js";
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

function NextStageInfo({ stage, t }) {
  const config = stage?.nextStageConfig || {};
  if (stage?.format !== "round_robin" || !config.mode) return null;

  if (config.mode === "knockout") {
    return (
      <div className="next-stage-info">
        <strong>{t("nextStageFormat")}: {t("knockout")}</strong>
        <p>{t("qualifiersPerGroup")}: {config.qualifiersPerGroup || 1}</p>
      </div>
    );
  }

  const divisionCount = Number(config.divisionCount) || 4;
  return (
    <div className="next-stage-info">
      <strong>{t("nextStageFormat")}: {t("bestDivisionMode")}</strong>
      {Array.from({ length: divisionCount }, (_, index) => (
        <p key={index}>{t(`groupRank${index + 1}EntersDivision${index + 1}`)}</p>
      ))}
    </div>
  );
}

function StandingsTable({ standings, t }) {
  return (
    <div className="standings-table-wrap">
      <h4>{t("groupStandings")}</h4>
      <table className="standings-table">
        <thead>
          <tr>
            <th>{t("rank")}</th>
            <th>{t("player")}</th>
            <th>{t("winsShort")}</th>
            <th>{t("lossesShort")}</th>
            <th>{t("gamesForShort")}</th>
            <th>{t("gamesAgainstShort")}</th>
            <th>{t("gameDifferenceShort")}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr key={row.entryId}>
              <td>{row.rank}</td>
              <td>
                {row.name}
                {row.needsManualConfirmation && <span className="manual-rank-note"> · {t("rankingNeedsManualConfirmation")}</span>}
              </td>
              <td>{row.wins}</td>
              <td>{row.losses}</td>
              <td>{row.gamesFor}</td>
              <td>{row.gamesAgainst}</td>
              <td>{row.gameDifference}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupCards({ groups, playerMap, pairMap, matches, language, t }) {
  return (
    <div className="group-results-grid">
      {groups.map((group) => {
        const isPairGroup = group.entryType === "pair";
        const entryIds = groupEntryIds(group);

        return (
          <article className="group-card" key={group.id}>
            <div className="group-card-header">
              <h3>{group.name}</h3>
              <span>
                {entryIds.length} {isPairGroup ? t("doublesPairsCount") : t("players")}
              </span>
            </div>
            <div className="group-player-list">
              {entryIds.map((entryId, index) => {
                const entry = isPairGroup ? pairMap.get(entryId) : playerMap.get(entryId);
                const line = isPairGroup
                  ? `${entry ? doublesEntryDisplayName(entry, language) : entryId} · ${t("totalRating")} ${
                      entry?.totalRating ?? t("unrated")
                    }`
                  : `${entry?.name || entryId} · ${entry ? ratingLabel(entry.rating, t) : t("unrated")}`;

                return (
                  <div className="group-player-row public-group-player" key={entryId}>
                    <span>{index + 1}. {line}</span>
                  </div>
                );
              })}
            </div>
            <StandingsTable
              standings={calculateGroupStandings({
                group,
                matches,
                players: isPairGroup ? Array.from(pairMap.values()) : Array.from(playerMap.values()),
                seedOrder: entryIds,
              })}
              t={t}
            />
          </article>
        );
      })}
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
          <h3>{roundMatches[0]?.round || roundLabel(round, sortedRounds.length, t)}</h3>
          {roundMatches
            .sort(
              (a, b) =>
                (Number(a.bracketPosition) || 0) - (Number(b.bracketPosition) || 0) ||
                compareMatchesBySchedule(a, b)
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

export default function PublicGroups({ groups, matches, players, doublesPairs = [], stages, language, t }) {
  const [activeEventId, setActiveEventId] = useState("singles");
  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const pairEntries = useMemo(() => buildDoublesEntriesFromPlayers(players), [players]);
  const pairMap = useMemo(() => new Map(pairEntries.map((pair) => [pair.id, pair])), [pairEntries]);
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
                <NextStageInfo stage={stage} t={t} />
              </div>
            </div>

            {!hasStageData ? (
              <div className="empty-state compact-empty">{t("noStageData")}</div>
            ) : stage.format === "round_robin" ? (
              stageGroups.length ? (
                <GroupCards groups={stageGroups} playerMap={playerMap} pairMap={pairMap} matches={stageMatches} language={language} t={t} />
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
          <GroupCards groups={eventGroups} playerMap={playerMap} pairMap={pairMap} matches={eventMatches} language={language} t={t} />
        </section>
      )}
    </section>
  );
}
