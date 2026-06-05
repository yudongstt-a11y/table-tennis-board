import { useEffect, useState } from "react";

function buildTableNames(count, currentNames = []) {
  const tableCount = Math.max(1, Number(count) || 1);
  return Array.from({ length: tableCount }, (_, index) => currentNames[index] || `Table ${index + 1}`);
}

const emptyTimelineItem = {
  timeStart: "09:00",
  timeEnd: "",
  titleZh: "",
  titleEn: "",
  descriptionZh: "",
  descriptionEn: "",
  order: 1,
};

export default function TournamentSetup({
  settings,
  eventTimeline,
  dataSource,
  dataSourceError,
  supabaseDiagnostics,
  language,
  t,
  onSettingsChange,
  onEventTimelineChange,
}) {
  const [draft, setDraft] = useState(settings);
  const [timelineDraft, setTimelineDraft] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  function updateSetting(field, value) {
    if (field === "tableCount") {
      setDraft((current) => ({
        ...current,
        tableCount: Number(value) || 1,
        tableNames: buildTableNames(value, current.tableNames),
      }));
      return;
    }

    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateTableName(index, value) {
    setDraft((current) => {
      const tableNames = [...current.tableNames];
      tableNames[index] = value;
      return { ...current, tableNames };
    });
  }

  function saveSettings(event) {
    event.preventDefault();
    onSettingsChange({
      ...draft,
      tableNames: buildTableNames(draft.tableCount, draft.tableNames),
    });
    setNotice(t("saveTournamentSetup"));
  }

  function openTimelineItem(item = null) {
    setTimelineDraft(item ? { ...item } : { ...emptyTimelineItem, order: eventTimeline.length + 1 });
  }

  function saveTimelineItem(event) {
    event.preventDefault();
    const normalized = {
      ...timelineDraft,
      id: timelineDraft.id || `timeline_${Date.now()}`,
      order: Number(timelineDraft.order) || eventTimeline.length + 1,
    };
    onEventTimelineChange(
      timelineDraft.id
        ? eventTimeline.map((item) => (item.id === timelineDraft.id ? normalized : item))
        : [...eventTimeline, normalized]
    );
    setTimelineDraft(null);
    setNotice(t("saveTimeline"));
  }

  function deleteTimelineItem(id) {
    onEventTimelineChange(eventTimeline.filter((item) => item.id !== id));
  }

  function moveTimelineItem(id, direction) {
    const index = eventTimeline.findIndex((item) => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= eventTimeline.length) return;

    const nextItems = [...eventTimeline];
    [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
    onEventTimelineChange(nextItems.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })));
  }

  return (
    <section className="admin-panel setup-panel">
      <form className="workflow-card match-form setup-form" onSubmit={saveSettings}>
        <div className="section-title-row wide-field">
          <div>
            <p className="eyebrow">{t("tournamentSetup")}</p>
            <h2>{t("tournamentSetup")}</h2>
            <p className={dataSource === "localStorage" || dataSourceError ? "data-source-warning" : "subtle"}>
              {dataSource === "supabase" ? t("supabaseLiveDatabase") : t("localStorageDataSource")}
            </p>
            {dataSource === "supabase" &&
              supabaseDiagnostics &&
              (!supabaseDiagnostics.config?.urlConfigured || !supabaseDiagnostics.config?.anonKeyConfigured) && (
                <p className="data-source-warning">{t("supabaseConfigMissing")}</p>
              )}
            {dataSourceError && <p className="data-source-warning">{dataSourceError}</p>}
            {dataSource === "localStorage" && <p className="data-source-warning">{t("localStorageWarning")}</p>}
          </div>
          <button className="primary-button" type="submit">
            {t("saveTournamentSetup")}
          </button>
        </div>

        <label>
          <span>{t("tournamentName")}</span>
          <input value={draft.nameZh} onChange={(event) => updateSetting("nameZh", event.target.value)} />
        </label>
        <label>
          <span>{t("tournamentNameEn")}</span>
          <input value={draft.nameEn} onChange={(event) => updateSetting("nameEn", event.target.value)} />
        </label>
        <label>
          <span>{t("tournamentDate")}</span>
          <input type="date" value={draft.date} onChange={(event) => updateSetting("date", event.target.value)} />
        </label>
        <label>
          <span>{t("venue")}</span>
          <input value={draft.venue} onChange={(event) => updateSetting("venue", event.target.value)} />
        </label>
        <label>
          <span>{t("organiser")}</span>
          <input value={draft.organiser} onChange={(event) => updateSetting("organiser", event.target.value)} />
        </label>
        <label>
          <span>{t("tableCount")}</span>
          <input
            type="number"
            min="1"
            value={draft.tableCount}
            onChange={(event) => updateSetting("tableCount", event.target.value)}
          />
        </label>

        <fieldset className="category-checkboxes table-name-grid">
          <legend>{t("tableNames")}</legend>
          {buildTableNames(draft.tableCount, draft.tableNames).map((name, index) => (
            <label key={index}>
              <span>{t("table")} {index + 1}</span>
              <input value={name} onChange={(event) => updateTableName(index, event.target.value)} />
            </label>
          ))}
        </fieldset>

        <label className="wide-field">
          <span>{t("tournamentNotes")}</span>
          <textarea value={draft.notes || ""} onChange={(event) => updateSetting("notes", event.target.value)} />
        </label>
      </form>

      {notice && <div className="status-notice">{notice}</div>}

      {dataSource === "supabase" && (
        <section className="workflow-card diagnostics-panel">
          <div>
            <p className="eyebrow">{t("supabaseDiagnostics")}</p>
            <h2>{t("supabaseDiagnostics")}</h2>
          </div>
          <div className="diagnostics-grid">
            <div>
              <strong>Supabase URL</strong>
              <span>{supabaseDiagnostics?.config?.urlConfigured ? t("configured") : t("missing")}</span>
            </div>
            <div>
              <strong>Supabase anon key</strong>
              <span>{supabaseDiagnostics?.config?.anonKeyConfigured ? t("configured") : t("missing")}</span>
            </div>
            <div>
              <strong>Tournament slug</strong>
              <span>{supabaseDiagnostics?.tournament?.slug || "-"}</span>
            </div>
            <div>
              <strong>Tournament id</strong>
              <span>{supabaseDiagnostics?.tournament?.id || "-"}</span>
            </div>
            <div>
              <strong>Last fetch</strong>
              <span>{supabaseDiagnostics?.lastFetchedAt || "-"}</span>
            </div>
            {[
              "tournaments",
              "players",
              "stages",
              "groups",
              "matches",
              "event_timeline_items",
              "table_controls",
              "breaks",
            ].map((table) => {
              const info = supabaseDiagnostics?.tables?.[table];
              return (
                <div className={info?.error ? "diagnostic-error" : ""} key={table}>
                  <strong>{table} loaded</strong>
                  <span>{info ? info.count : 0}</span>
                  {info?.error && <small>{info.error}</small>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="workflow-card timeline-admin-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{t("eventTimeline")}</p>
            <h2>{t("eventTimeline")}</h2>
          </div>
          <button className="primary-button" type="button" onClick={() => openTimelineItem()}>
            {t("addTimelineItem")}
          </button>
        </div>

        <div className="admin-list">
          {eventTimeline.map((item, index) => (
            <article className="admin-row timeline-admin-row" key={item.id}>
              <div>
                <strong>
                  {item.timeStart}
                  {item.timeEnd ? ` - ${item.timeEnd}` : ""} ·{" "}
                  {language === "zh" ? item.titleZh : item.titleEn || item.titleZh}
                </strong>
                <p>{language === "zh" ? item.descriptionZh : item.descriptionEn || item.descriptionZh}</p>
              </div>
              <div className="row-actions">
                <button className="ghost-button" type="button" onClick={() => moveTimelineItem(item.id, -1)}>
                  ↑
                </button>
                <button className="ghost-button" type="button" onClick={() => moveTimelineItem(item.id, 1)}>
                  ↓
                </button>
                <button className="ghost-button" type="button" onClick={() => openTimelineItem(item)}>
                  {t("edit")}
                </button>
                <button className="danger-button" type="button" onClick={() => deleteTimelineItem(item.id)}>
                  {t("delete")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {timelineDraft && (
        <div className="modal-backdrop" role="presentation">
          <section className="match-modal" role="dialog" aria-modal="true" aria-label={t("eventTimeline")}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{t("eventTimeline")}</p>
                <h2>{t("addTimelineItem")}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setTimelineDraft(null)}>
                X
              </button>
            </div>
            <form className="match-form" onSubmit={saveTimelineItem}>
              <label>
                <span>{t("startTime")}</span>
                <input
                  type="time"
                  value={timelineDraft.timeStart}
                  onChange={(event) => setTimelineDraft((item) => ({ ...item, timeStart: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>{t("endTime")}</span>
                <input
                  type="time"
                  value={timelineDraft.timeEnd}
                  onChange={(event) => setTimelineDraft((item) => ({ ...item, timeEnd: event.target.value }))}
                />
              </label>
              <label>
                <span>{t("titleZh")}</span>
                <input
                  value={timelineDraft.titleZh}
                  onChange={(event) => setTimelineDraft((item) => ({ ...item, titleZh: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>{t("titleEn")}</span>
                <input
                  value={timelineDraft.titleEn}
                  onChange={(event) => setTimelineDraft((item) => ({ ...item, titleEn: event.target.value }))}
                />
              </label>
              <label>
                <span>{t("order")}</span>
                <input
                  type="number"
                  min="1"
                  value={timelineDraft.order}
                  onChange={(event) => setTimelineDraft((item) => ({ ...item, order: event.target.value }))}
                />
              </label>
              <label className="wide-field">
                <span>{t("descriptionZh")}</span>
                <textarea
                  value={timelineDraft.descriptionZh}
                  onChange={(event) => setTimelineDraft((item) => ({ ...item, descriptionZh: event.target.value }))}
                />
              </label>
              <label className="wide-field">
                <span>{t("descriptionEn")}</span>
                <textarea
                  value={timelineDraft.descriptionEn}
                  onChange={(event) => setTimelineDraft((item) => ({ ...item, descriptionEn: event.target.value }))}
                />
              </label>
              <div className="form-actions">
                <button className="ghost-button" type="button" onClick={() => setTimelineDraft(null)}>
                  {t("cancel")}
                </button>
                <button className="primary-button" type="submit">
                  {t("saveTimeline")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
