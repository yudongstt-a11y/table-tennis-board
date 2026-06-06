import { useState } from "react";
import { runPlayerSaveTestData, runStageSaveTestData } from "../services/dataRepository.js";

function ResultList({ title, results }) {
  if (!results.length) return null;

  return (
    <div className="diagnostic-test-block">
      <h3>{title}</h3>
      <div className="admin-list">
        {results.map((result) => (
          <article className={result.ok ? "admin-row diagnostic-ok" : "admin-row diagnostic-error"} key={result.step}>
            <strong>{result.step}</strong>
            <span>{result.ok ? "OK" : "Failed"}</span>
            {result.detail && <small>{result.detail}</small>}
          </article>
        ))}
      </div>
    </div>
  );
}

export default function AdminDiagnostics({
  dataSource,
  dataSourceError,
  supabaseDiagnostics,
  tournamentSettings,
  t,
}) {
  const [stageResults, setStageResults] = useState([]);
  const [playerResults, setPlayerResults] = useState([]);
  const [stageError, setStageError] = useState("");
  const [playerError, setPlayerError] = useState("");
  const [running, setRunning] = useState("");

  async function runStageTest() {
    setRunning("stage");
    setStageError("");
    setStageResults([]);
    try {
      setStageResults(await runStageSaveTestData());
    } catch (error) {
      setStageError(error.message || String(error));
    } finally {
      setRunning("");
    }
  }

  async function runPlayerTest() {
    setRunning("player");
    setPlayerError("");
    setPlayerResults([]);
    try {
      setPlayerResults(await runPlayerSaveTestData());
    } catch (error) {
      setPlayerError(error.message || String(error));
    } finally {
      setRunning("");
    }
  }

  const tables = [
    "tournaments",
    "players",
    "stages",
    "groups",
    "matches",
    "event_timeline_items",
    "table_controls",
    "breaks",
  ];

  return (
    <section className="admin-panel">
      <div className="admin-toolbar split">
        <div>
          <h2>{diagnosticsLabel}</h2>
          <p className={dataSource === "supabase" ? "subtle" : "data-source-warning"}>
            {dataSource === "supabase" ? t("supabaseLiveDatabase") : t("localStorageDataSource")}
          </p>
        </div>
        <div className="row-actions">
          <button className="ghost-button" type="button" onClick={runStageTest} disabled={Boolean(running)}>
            {running === "stage" ? t("savingStage") : stageTestLabel}
          </button>
          <button className="ghost-button" type="button" onClick={runPlayerTest} disabled={Boolean(running)}>
            {running === "player" ? t("savingStage") : playerTestLabel}
          </button>
        </div>
      </div>

      {dataSourceError && <div className="form-error">{dataSourceError}</div>}

      <section className="workflow-card diagnostics-panel">
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
            <span>{supabaseDiagnostics?.tournament?.slug || tournamentSettings.slug || "-"}</span>
          </div>
          <div>
            <strong>Tournament id</strong>
            <span>{supabaseDiagnostics?.tournament?.id || tournamentSettings.id || "-"}</span>
          </div>
          <div>
            <strong>{t("tournamentName")}</strong>
            <span>{tournamentSettings.nameZh || tournamentSettings.nameEn || "-"}</span>
          </div>
          <div>
            <strong>Last fetch</strong>
            <span>{supabaseDiagnostics?.lastFetchedAt || "-"}</span>
          </div>
          {tables.map((table) => {
            const info = supabaseDiagnostics?.tables?.[table];
            return (
              <div className={info?.error ? "diagnostic-error" : ""} key={table}>
                <strong>{table}</strong>
                <span>{info ? info.count : 0}</span>
                {info?.error && <small>{info.error}</small>}
              </div>
            );
          })}
        </div>
      </section>

      {stageError && <div className="form-error">{stageError}</div>}
      {playerError && <div className="form-error">{playerError}</div>}
      <ResultList title={stageTestLabel} results={stageResults} />
      <ResultList title={playerTestLabel} results={playerResults} />
    </section>
  );
}
  const diagnosticsLabel = t("diagnostics") === "diagnostics" ? "系统检查 / Diagnostics" : t("diagnostics");
  const stageTestLabel = t("runStageSaveTest") === "runStageSaveTest" ? "运行阶段保存测试 / Run Stage Save Test" : t("runStageSaveTest");
  const playerTestLabel = t("runPlayerSaveTest") === "runPlayerSaveTest" ? "运行选手保存测试 / Run Player Save Test" : t("runPlayerSaveTest");
