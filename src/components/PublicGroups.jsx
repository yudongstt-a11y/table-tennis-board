import { useMemo, useState } from "react";
import { getCategoryLabel } from "../constants/categories.js";
import { ratingLabel } from "./PlayerAutocomplete.jsx";

function stageName(stage, language) {
  if (!stage) return "";
  return language === "zh" ? stage.nameZh : stage.nameEn || stage.nameZh;
}

function matchWinnerName(match) {
  if (!match.winnerSide) return "";
  return match.winnerSide === "A" ? match.playerAName : match.playerBName;
}

export default function PublicGroups({ groups, matches, players, stages, language, t }) {
  const [activeView, setActiveView] = useState("groups");
  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const stageMap = useMemo(() => new Map(stages.map((stage) => [stage.id, stage])), [stages]);
  const publishedGroups = groups.filter((group) => group.published);
  const knockoutMatches = matches
    .filter((match) => match.stageFormat === "knockout" || stageMap.get(match.stageId)?.format === "knockout")
    .sort(
      (a, b) =>
        (Number(a.bracketRound) || 0) - (Number(b.bracketRound) || 0) ||
        (Number(a.bracketPosition) || 0) - (Number(b.bracketPosition) || 0)
    );

  const groupedByEventStage = useMemo(() => {
    const map = new Map();
    publishedGroups.forEach((group) => {
      const key = `${group.eventId}_${group.stageId}`;
      const current = map.get(key) || [];
      current.push(group);
      map.set(key, current);
    });
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      eventId: items[0].eventId,
      stageId: items[0].stageId,
      groups: items.sort((a, b) => a.order - b.order),
    }));
  }, [publishedGroups]);

  const bracketRounds = useMemo(() => {
    const map = new Map();
    knockoutMatches.forEach((match) => {
      const round = Number(match.bracketRound) || 1;
      const current = map.get(round) || [];
      current.push(match);
      map.set(round, current);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [knockoutMatches]);

  return (
    <section className="public-section">
      <nav className="sub-tabs" aria-label="Group views">
        <button
          className={activeView === "groups" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("groups")}
        >
          {t("groupList")}
        </button>
        <button
          className={activeView === "bracket" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("bracket")}
        >
          {t("bracket")}
        </button>
      </nav>

      {activeView === "groups" ? (
        groupedByEventStage.length ? (
          groupedByEventStage.map((section) => (
            <section className="group-public-section" key={section.key}>
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">{getCategoryLabel(section.eventId, language)}</p>
                  <h2>{stageName(stageMap.get(section.stageId), language)}</h2>
                </div>
              </div>
              <div className="group-results-grid">
                {section.groups.map((group) => (
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
            </section>
          ))
        ) : (
          <div className="empty-state">{t("noGroupsAvailable")}</div>
        )
      ) : bracketRounds.length ? (
        <div className="bracket-board">
          {bracketRounds.map(([round, roundMatches]) => (
            <section className="bracket-round" key={round}>
              <h3>{round === bracketRounds.length ? t("final") : `${t("round")} ${round}`}</h3>
              {roundMatches.map((match) => {
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
      ) : (
        <div className="empty-state">{t("noBracketAvailable")}</div>
      )}
    </section>
  );
}
