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
  tableAllocation: 1,
};

function normalizeStage(stage, id) {
  const format = getMatchFormat(stage.matchFormat);

  return {
    ...stage,
    id,
    winnerGames: format.winnerGames,
    defaultMatchMinutes: format.defaultMinutes,
    order: Number(stage.order) || 1,
    tableAllocation: Math.max(1, Number(stage.tableAllocation) || 1),
  };
}

export default function AdminStagesManager({ stages, tournamentSettings, language, t, onStagesChange }) {
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.order - b.order),
    [stages]
  );
  const stageBatches = useMemo(() => {
    const map = new Map();
    sortedStages.forEach((stage) => {
      const order = Number(stage.order) || 1;
      map.set(order, [...(map.get(order) || []), stage]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [sortedStages]);

  function openAdd() {
    setEditingId("");
    setError("");
    setDraft({ ...emptyStage, order: stages.length + 1 });
  }

  function openEdit(stage) {
    setEditingId(stage.id);
    setError("");
    setDraft({ ...stage });
  }

  function closeForm() {
    setDraft(null);
    setEditingId("");
    setError("");
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveStage(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const id = editingId || "";
    const normalized = normalizeStage(draft, id);
    const nextStages = editingId
      ? stages.map((stage) => (stage.id === editingId ? normalized : stage))
      : [...stages, normalized];
    const sameOrderTotal = nextStages
      .filter((stage) => Number(stage.order) === Number(normalized.order))
      .reduce((sum, stage) => sum + (Number(stage.tableAllocation) || 1), 0);

    if (sameOrderTotal > tournamentSettings.tableCount) {
      setError(t("stageAllocationExceeded"));
      return;
    }

    try {
      setIsSaving(true);
      console.log("[Stages] saving stage to Supabase", {
        tournamentSlug: tournamentSettings.slug,
        tournamentId: tournamentSettings.id,
        id: editingId || null,
        eventId: normalized.eventId,
        format: normalized.format,
        stageOrder: normalized.order,
      });
      const savedStages = await onStagesChange(nextStages);
      console.log("[Stages] loaded stages count", Array.isArray(savedStages) ? savedStages.length : nextStages.length);
      setNotice(t("stageSaved"));
      closeForm();
    } catch (error) {
      setError(error.message || String(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteStage(id) {
    setError("");
    setNotice("");
    try {
      setIsSaving(true);
      const savedStages = await onStagesChange(stages.filter((stage) => stage.id !== id));
      console.log("[Stages] deleted stage", id, "loaded stages count", Array.isArray(savedStages) ? savedStages.length : stages.length - 1);
      setNotice(t("stageDeleted"));
    } catch (error) {
      setError(error.message || String(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-toolbar split">
        <div>
          <h2>{t("stages")}</h2>
          <p className="subtle">{t("stageManagementHint")}</p>
          <p className="subtle">{t("supabaseLiveDatabase")}</p>
        </div>
        <button className="primary-button" type="button" onClick={openAdd}>
          {t("addStage")}
        </button>
      </div>

      {notice && <div className="status-notice">{notice}</div>}
      {error && !draft && <div className="form-error">{error}</div>}

      <div className="stage-batch-list">
        {stageBatches.map(([order, batchStages]) => {
          const totalAllocated = batchStages.reduce(
            (sum, stage) => sum + (Number(stage.tableAllocation) || 1),
            0
          );
          const overLimit = totalAllocated > tournamentSettings.tableCount;

          return (
            <article className={overLimit ? "stage-batch-card over-limit" : "stage-batch-card"} key={order}>
              <div>
                <strong>{t("stageOrder")} {order}</strong>
                <span>{t("allocatedTables")}: {totalAllocated} / {tournamentSettings.tableCount}</span>
              </div>
              <p>
                {batchStages
                  .map((stage) => `${language === "zh" ? stage.nameZh : stage.nameEn} · ${stage.tableAllocation || 1}`)
                  .join(" | ")}
              </p>
            </article>
          );
        })}
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
              <div><dt>{t("tablesAllocated")}</dt><dd>{stage.tableAllocation || 1}</dd></div>
            </dl>
            <div className="row-actions">
              <button className="ghost-button" type="button" onClick={() => openEdit(stage)}>
                {t("edit")}
              </button>
                <button className="danger-button" type="button" onClick={() => deleteStage(stage.id)} disabled={isSaving}>
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
                <span>{t("stageOrder")}</span>
                <input
                  type="number"
                  min="1"
                  value={draft.order}
                  onChange={(event) => updateDraft("order", event.target.value)}
                />
                <small className="field-help">{t("stageOrderHelp")}</small>
              </label>
              <label>
                <span>{t("tablesAllocated")}</span>
                <input
                  type="number"
                  min="1"
                  max={tournamentSettings.tableCount}
                  value={draft.tableAllocation}
                  onChange={(event) => updateDraft("tableAllocation", event.target.value)}
                />
                <small className="field-help">{t("tablesAllocatedHelp")}</small>
              </label>
              <div className="form-hint">
                {t("winner")}: {getMatchFormat(draft.matchFormat).winnerGames} 路{" "}
                {t("defaultDuration")}: {getMatchFormat(draft.matchFormat).defaultMinutes} {t("minutes")}
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="form-actions">
                <button className="ghost-button" type="button" onClick={closeForm} disabled={isSaving}>
                  {t("cancel")}
                </button>
                <button className="primary-button" type="submit" disabled={isSaving}>
                  {isSaving ? t("savingStage") : t("save")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

