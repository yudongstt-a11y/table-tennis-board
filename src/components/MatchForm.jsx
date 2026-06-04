import { CATEGORIES } from "../constants/categories.js";
import { getMatchFormat, getMatchFormatLabel, getStageFormatLabel } from "../constants/matchFormats.js";
import { tables } from "../data/demoPlayers.js";
import PlayerAutocomplete from "./PlayerAutocomplete.jsx";

export const emptyMatch = {
  time: "2026-06-15T09:00",
  table: "Table 1",
  tableOrder: 1000,
  eventId: "singles",
  categoryId: "singles",
  stageId: "stage_001",
  stageFormat: "round_robin",
  matchFormat: "best_of_5",
  winnerGames: 3,
  defaultMinutes: 25,
  defaultMatchMinutes: 25,
  remainingSeconds: null,
  countdownActive: false,
  overtime: false,
  groupId: "",
  bracketRound: null,
  bracketPosition: null,
  round: "Group Stage",
  playerAId: "",
  playerAName: "",
  playerBId: "",
  playerBName: "",
  playerARating: null,
  playerBRating: null,
  status: "Upcoming",
  score: "",
  winnerSide: null,
  winnerId: null,
  loserId: null,
  isBye: false,
};

export default function MatchForm({ value, players, stages = [], language, t, title, onChange, onCancel, onSubmit }) {
  const isDoubles = value.categoryId === "mixed_doubles";

  function updateField(field, nextValue) {
    onChange({ ...value, [field]: nextValue });
  }

  function updateStage(stageId) {
    const stage = stages.find((item) => item.id === stageId);
    if (!stage) {
      updateField("stageId", stageId);
      return;
    }

    const format = getMatchFormat(stage.matchFormat);
    onChange({
      ...value,
      stageId,
      eventId: stage.eventId,
      categoryId: stage.eventId,
      stageFormat: stage.format,
      matchFormat: stage.matchFormat,
      winnerGames: format.winnerGames,
      defaultMinutes: format.defaultMinutes,
      defaultMatchMinutes: format.defaultMinutes,
      remainingSeconds: value.status === "Playing" ? format.defaultMinutes * 60 : value.remainingSeconds,
    });
  }

  function selectPlayer(side, player) {
    const prefix = side === "A" ? "playerA" : "playerB";
    onChange({
      ...value,
      [`${prefix}Id`]: player.id,
      [`${prefix}Name`]: player.name,
      [`${prefix}Rating`]: player.rating,
    });
  }

  function typePlayer(side, name) {
    const prefix = side === "A" ? "playerA" : "playerB";
    onChange({
      ...value,
      [`${prefix}Id`]: "",
      [`${prefix}Name`]: name,
      [`${prefix}Rating`]: null,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="match-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Match Editor</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Close">
            X
          </button>
        </div>

        <form className="match-form" onSubmit={onSubmit}>
          <label>
            <span>{t("time")}</span>
            <input
              type="datetime-local"
              value={value.time}
              onChange={(event) => updateField("time", event.target.value)}
              required
            />
          </label>

          <label>
            <span>{t("table")}</span>
            <select value={value.table} onChange={(event) => updateField("table", event.target.value)}>
              {tables.map((table) => (
                <option key={table}>{table}</option>
              ))}
            </select>
          </label>

          <label>
            <span>{t("stages")}</span>
            <select value={value.stageId || ""} onChange={(event) => updateStage(event.target.value)}>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {language === "zh" ? stage.nameZh : stage.nameEn}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t("category")}</span>
            <select
              value={value.categoryId}
              onChange={(event) => updateField("categoryId", event.target.value)}
            >
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category[language]}
                </option>
              ))}
            </select>
          </label>

          <div className="form-hint">
            {getStageFormatLabel(value.stageFormat, language)} ·{" "}
            {getMatchFormatLabel(value.matchFormat, language)} ·{" "}
            {t("defaultDuration")}: {value.defaultMinutes || value.defaultMatchMinutes} {t("minutes")}
          </div>

          <label>
            <span>{t("round")}</span>
            <input
              value={value.round}
              onChange={(event) => updateField("round", event.target.value)}
              required
            />
          </label>

          <PlayerAutocomplete
            label={isDoubles ? t("pairA") : t("playerA")}
            value={value.playerAName}
            players={players}
            language={language}
            t={t}
            onInputChange={(name) => typePlayer("A", name)}
            onSelect={(player) => selectPlayer("A", player)}
            required
          />

          <PlayerAutocomplete
            label={isDoubles ? t("pairB") : t("playerB")}
            value={value.playerBName}
            players={players}
            language={language}
            t={t}
            onInputChange={(name) => typePlayer("B", name)}
            onSelect={(player) => selectPlayer("B", player)}
            required
          />

          <label>
            <span>{t("status")}</span>
            <select
              value={value.status}
              onChange={(event) => updateField("status", event.target.value)}
            >
              <option value="Upcoming">{t("upcoming")}</option>
              <option value="Playing">{t("playing")}</option>
              <option value="Finished">{t("finished")}</option>
            </select>
          </label>

          <label className={value.status === "Finished" ? "score-field emphasized" : "score-field"}>
            <span>{t("score")}</span>
            <input
              value={value.score}
              onChange={(event) => updateField("score", event.target.value)}
              placeholder="3-1"
            />
          </label>

          <div className="form-actions">
            <button className="ghost-button" type="button" onClick={onCancel}>
              {t("cancel")}
            </button>
            <button className="primary-button" type="submit">
              {t("saveMatch")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
