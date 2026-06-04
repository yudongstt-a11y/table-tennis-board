import { useMemo, useState } from "react";
import { CATEGORIES, getCategoryLabel } from "../constants/categories.js";
import {
  MATCH_FORMATS,
  STAGE_FORMATS,
  getMatchFormat,
  getMatchFormatLabel,
  getStageFormatLabel,
} from "../constants/matchFormats.js";

const emptyStage = {
  nameZh: "",
  nameEn: "",
  eventId: "singles",
  format: "round_robin",
  matchFormat: "best_of_5",
  order: 1,
};

function normalizeStage(stage, id) {
  const format = getMatchFormat(stage.matchFormat);

  return {
    ...stage,
    id,
    winnerGames: format.winnerGames,
    defaultMatchMinutes: format.defaultMinutes,
    order: Number(stage.order) || 1,
  };
}

export default function AdminStagesManager({ stages, language, t, onStagesChange }) {
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState("");

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.order - b.order),
    [stages]
  );

  function openAdd() {
    setEditingId("");
    setDraft({ ...emptyStage, order: stages.length + 1 });
  }

  function openEdit(stage) {
    setEditingId(stage.id);
    setDraft({ ...stage });
  }

  function closeForm() {
    setDraft(null);
    setEditingId("");
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveStage(event) {
    event.preventDefault();
    const id = editingId || `stage_${Date.now()}`;
    const normalized = normalizeStage(draft, id);

    if (editingId) {
      onStagesChange(stages.map((stage) => (stage.id === editingId ? normalized : stage)));
    } else {
      onStagesChange([...stages, normalized]);
    }

    closeForm();
  }

  function deleteStage(id) {
    onStagesChange(stages.filter((stage) => stage.id !== id));
  }

  return (
    <section className="admin-panel">
      <div className="admin-toolbar split">
        <div>
          <h2>{t("stages")}</h2>
          <p className="subtle">{t("stageManagementHint")}</p>
        </div>
        <button className="primary-button" type="button" onClick={openAdd}>
          {t("addStage")}
        </button>
      </div>

      <div className="stage-grid">
        {sortedStages.map((stage) => (
          <article className="stage-card" key={stage.id}>
            <div>
              <span className="table-pill">#{stage.order}</span>
              <h3>{language === "zh" ? stage.nameZh : stage.nameEn}</h3>
              <p>{getCategoryLabel(stage.eventId, language)}</p>
            </div>
            <dl>
              <div><dt>{t("stageFormat")}</dt><dd>{getStageFormatLabel(stage.format, language)}</dd></div>
              <div><dt>{t("matchFormat")}</dt><dd>{getMatchFormatLabel(stage.matchFormat, language)}</dd></div>
              <div><dt>{t("defaultDuration")}</dt><dd>{stage.defaultMatchMinutes} {t("minutes")}</dd></div>
            </dl>
            <div className="row-actions">
              <button className="ghost-button" type="button" onClick={() => openEdit(stage)}>
                {t("edit")}
              </button>
              <button className="danger-button" type="button" onClick={() => deleteStage(stage.id)}>
                {t("delete")}
              </button>
            </div>
          </article>
        ))}
      </div>

      {draft && (
        <div className="modal-backdrop" role="presentation">
          <section className="match-modal" role="dialog" aria-modal="true" aria-label={t("stages")}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{t("stages")}</p>
                <h2>{editingId ? t("editStage") : t("addStage")}</h2>
              </div>
              <button className="icon-button" type="button" onClick={closeForm} aria-label="Close">
                X
              </button>
            </div>

            <form className="match-form" onSubmit={saveStage}>
              <label>
                <span>{t("stageNameZh")}</span>
                <input value={draft.nameZh} onChange={(event) => updateDraft("nameZh", event.target.value)} required />
              </label>
              <label>
                <span>{t("stageNameEn")}</span>
                <input value={draft.nameEn} onChange={(event) => updateDraft("nameEn", event.target.value)} required />
              </label>
              <label>
                <span>{t("category")}</span>
                <select value={draft.eventId} onChange={(event) => updateDraft("eventId", event.target.value)}>
                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category[language]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("stageFormat")}</span>
                <select value={draft.format} onChange={(event) => updateDraft("format", event.target.value)}>
                  {STAGE_FORMATS.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format[language]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("matchFormat")}</span>
                <select value={draft.matchFormat} onChange={(event) => updateDraft("matchFormat", event.target.value)}>
                  {MATCH_FORMATS.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format[language]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("order")}</span>
                <input
                  type="number"
                  min="1"
                  value={draft.order}
                  onChange={(event) => updateDraft("order", event.target.value)}
                />
              </label>
              <div className="form-hint">
                {t("winner")}: {getMatchFormat(draft.matchFormat).winnerGames} ·{" "}
                {t("defaultDuration")}: {getMatchFormat(draft.matchFormat).defaultMinutes} {t("minutes")}
              </div>
              <div className="form-actions">
                <button className="ghost-button" type="button" onClick={closeForm}>
                  {t("cancel")}
                </button>
                <button className="primary-button" type="submit">
                  {t("save")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
