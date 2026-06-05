import { useEffect, useMemo, useState } from "react";
import ScheduleBoard from "./components/ScheduleBoard.jsx";
import AdminLogin from "./components/AdminLogin.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import { clearLocalCacheData } from "./utils/storage.js";
import { defaultEventTimeline, defaultTournamentSettings } from "./data/demoTournament.js";
import {
  DATA_SOURCE,
  importOfficialEntriesData,
  importOfficialDoublesPairsData,
  loadAllData,
  saveBreaksData,
  saveEventTimelineData,
  saveGroupsData,
  saveDoublesPairsData,
  saveMatchesData,
  savePlayersData,
  saveSeedingsData,
  saveStagesData,
  saveTableControlsData,
  saveTournamentControlData,
  saveTournamentSettingsData,
  subscribeToTournamentData,
} from "./services/dataRepository.js";
import { LANGUAGE_KEY } from "./i18n/translations.js";
import { compareMatchesBySchedule } from "./utils/matchSchedule.js";

const ADMIN_LOGGED_IN_KEY = "adminLoggedIn";
const ADMIN_REMEMBERED_KEY = "adminRemembered";
const LEGACY_ADMIN_SESSION_KEY = "table_tennis_admin_session";

const isLocalStorageMode = DATA_SOURCE === "localStorage";

const emptyTournamentControl = {
  status: "not_started",
  startedAt: null,
  pausedAt: null,
  activeBreakId: null,
};

function getPath() {
  return window.location.pathname || "/";
}

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function hasAdminSession() {
  return (
    localStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true" ||
    sessionStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true"
  );
}

export default function App() {
  const [path, setPath] = useState(getPath);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [stages, setStages] = useState([]);
  const [tableControls, setTableControls] = useState({});
  const [breaks, setBreaks] = useState([]);
  const [tournamentControl, setTournamentControl] = useState(emptyTournamentControl);
  const [tournamentSettings, setTournamentSettings] = useState(defaultTournamentSettings);
  const [eventTimeline, setEventTimeline] = useState(defaultEventTimeline);
  const [seedings, setSeedings] = useState([]);
  const [groups, setGroups] = useState([]);
  const [doublesPairs, setDoublesPairs] = useState([]);
  const [dataSourceError, setDataSourceError] = useState("");
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) || "zh");
  const [isLoggedIn, setIsLoggedIn] = useState(() => hasAdminSession());

  useEffect(() => {
    const onPopState = () => setPath(getPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    loadAllData()
      .then((nextData) => {
        if (!active) return;
        replaceAllData(nextData);
        setDataSourceError("");
        unsubscribe = subscribeToTournamentData(() => {
          loadAllData()
            .then((freshData) => {
              replaceAllData(freshData);
              setDataSourceError("");
            })
            .catch((error) => setDataSourceError(error.message));
        });
      })
      .catch((error) => {
        if (active) setDataSourceError(error.message);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const hasSession = hasAdminSession();
    setIsLoggedIn(hasSession);

    if (path === "/admin" && hasSession) {
      navigate("/admin/dashboard");
    }
  }, [path]);

  useEffect(() => {
    if (tournamentControl.status !== "not_started") return;

    const needsReset = matches.some((match) => !match.isBye && match.status !== "Upcoming");
    if (!needsReset) return;

    updateMatches(
      matches.map((match) =>
        match.isBye
          ? match
          : {
              ...match,
              status: "Upcoming",
              countdownActive: false,
              startedAt: null,
            }
      )
    );
  }, [tournamentControl.status]);

  const sortedMatches = useMemo(
    () => [...matches].sort(compareMatchesBySchedule),
    [matches]
  );

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.name.localeCompare(b.name)),
    [players]
  );

  function updateMatches(nextMatches) {
    const sorted = [...nextMatches].sort(compareMatchesBySchedule);
    setMatches(sorted);
    saveMatchesData(sorted).catch((error) => setDataSourceError(error.message));
  }

  function updateLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_KEY, nextLanguage);
  }

  function updatePlayers(nextPlayers) {
    const sorted = [...nextPlayers].sort((a, b) => a.name.localeCompare(b.name));
    setPlayers(sorted);
    savePlayersData(sorted).catch((error) => setDataSourceError(error.message));
  }

  function updateStages(nextStages) {
    const sorted = [...nextStages].sort((a, b) => a.order - b.order);
    setStages(sorted);
    saveStagesData(sorted).catch((error) => setDataSourceError(error.message));
  }

  function updateTableControls(nextTableControls) {
    setTableControls(nextTableControls);
    saveTableControlsData(nextTableControls).catch((error) => setDataSourceError(error.message));
  }

  function updateBreaks(nextBreaks) {
    setBreaks(nextBreaks);
    saveBreaksData(nextBreaks).catch((error) => setDataSourceError(error.message));
  }

  function updateTournamentControl(nextTournamentControl) {
    setTournamentControl(nextTournamentControl);
    saveTournamentControlData(nextTournamentControl, tournamentSettings).catch((error) =>
      setDataSourceError(error.message)
    );
  }

  function updateTournamentSettings(nextTournamentSettings) {
    setTournamentSettings(nextTournamentSettings);
    saveTournamentSettingsData(nextTournamentSettings, tournamentControl).catch((error) =>
      setDataSourceError(error.message)
    );
    setTableControls((current) => {
      const nextControls = Object.fromEntries(
        nextTournamentSettings.tableNames.map((table) => [
          table,
          current[table] || { timeBankSeconds: 0 },
        ])
      );
      saveTableControlsData(nextControls).catch((error) => setDataSourceError(error.message));
      return nextControls;
    });
  }

  function updateEventTimeline(nextEventTimeline) {
    const sorted = [...nextEventTimeline].sort(
      (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.timeStart).localeCompare(String(b.timeStart))
    );
    setEventTimeline(sorted);
    saveEventTimelineData(sorted).catch((error) => setDataSourceError(error.message));
  }

  function updateSeedings(nextSeedings) {
    setSeedings(nextSeedings);
    saveSeedingsData(nextSeedings).catch((error) => setDataSourceError(error.message));
  }

  function updateGroups(nextGroups) {
    setGroups(nextGroups);
    saveGroupsData(nextGroups).catch((error) => setDataSourceError(error.message));
  }

  function updateDoublesPairs(nextDoublesPairs) {
    setDoublesPairs(nextDoublesPairs);
    saveDoublesPairsData(nextDoublesPairs, players).catch((error) => setDataSourceError(error.message));
  }

  function updateTournamentState(nextMatches, nextTableControls) {
    updateMatches(nextMatches);
    updateTableControls(nextTableControls);
  }

  function replaceAllData(nextData) {
    setMatches(nextData.matches);
    setPlayers(nextData.players);
    setStages(nextData.stages);
    setTableControls(nextData.tableControls);
    setBreaks(nextData.breaks);
    setTournamentControl(nextData.tournamentControl);
    setTournamentSettings(nextData.tournamentSettings);
    setEventTimeline(nextData.eventTimeline);
    setSeedings(nextData.seedings);
    setGroups(nextData.groups);
    setDoublesPairs(nextData.doublesPairs || []);
    setDataSourceError(nextData.dataSourceError || "");
  }

  function clearLocalCache() {
    clearLocalCacheData();
    if (isLocalStorageMode) {
      loadAllData()
        .then((nextData) => replaceAllData(nextData))
        .catch((error) => setDataSourceError(error.message));
    }
  }

  function importOfficialEntries(playersForImport) {
    return importOfficialEntriesData(playersForImport)
      .then((nextData) => {
        replaceAllData(nextData);
        setDataSourceError("");
      })
      .catch((error) => {
        setDataSourceError(error.message);
        throw error;
      });
  }

  function importOfficialDoublesPairs(playersForImport) {
    return importOfficialDoublesPairsData(playersForImport)
      .then(() => loadAllData())
      .then((nextData) => replaceAllData(nextData))
      .catch((error) => setDataSourceError(error.message));
  }

  function handleLogin(username, password, rememberMe) {
    const normalizedUsername = username.trim().toLowerCase();

    if (normalizedUsername === "admin" && password === "123456") {
      localStorage.removeItem(LEGACY_ADMIN_SESSION_KEY);

      if (rememberMe) {
        localStorage.setItem(ADMIN_LOGGED_IN_KEY, "true");
        localStorage.setItem(ADMIN_REMEMBERED_KEY, "true");
        sessionStorage.removeItem(ADMIN_LOGGED_IN_KEY);
      } else {
        sessionStorage.setItem(ADMIN_LOGGED_IN_KEY, "true");
        localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
        localStorage.removeItem(ADMIN_REMEMBERED_KEY);
      }

      setIsLoggedIn(true);
      navigate("/admin/dashboard");
      return { ok: true };
    }

    return { ok: false, message: "Incorrect username or password" };
  }

  function handleLogout() {
    localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
    localStorage.removeItem(ADMIN_REMEMBERED_KEY);
    localStorage.removeItem(LEGACY_ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_LOGGED_IN_KEY);
    setIsLoggedIn(false);
    navigate("/admin");
  }

  if (path === "/admin") {
    return (
      <AdminLogin
        language={language}
        onLanguageChange={updateLanguage}
        onLogin={handleLogin}
        onBack={() => navigate("/")}
      />
    );
  }

  if (
    path === "/admin/dashboard" ||
    path === "/admin/setup" ||
    path === "/admin/players" ||
    path === "/admin/stages" ||
    path === "/admin/grouping" ||
    path === "/admin/control"
  ) {
    if (!isLoggedIn && !hasAdminSession()) {
      return (
        <AdminLogin
          language={language}
          onLanguageChange={updateLanguage}
          onLogin={handleLogin}
          onBack={() => navigate("/")}
        />
      );
    }

    return (
      <AdminDashboard
        initialTab={
          path === "/admin/players"
            ? "players"
            : path === "/admin/setup"
              ? "setup"
              : path === "/admin/stages"
                ? "stages"
                : path === "/admin/grouping"
                  ? "grouping"
                  : path === "/admin/control"
                    ? "control"
                    : "matches"
        }
        language={language}
        matches={sortedMatches}
        players={sortedPlayers}
        stages={stages}
        tableControls={tableControls}
        breaks={breaks}
        tournamentControl={tournamentControl}
        tournamentSettings={tournamentSettings}
        eventTimeline={eventTimeline}
        dataSource={DATA_SOURCE}
        dataSourceError={dataSourceError}
        seedings={seedings}
        groups={groups}
        doublesPairs={doublesPairs}
        onLanguageChange={updateLanguage}
        onMatchesChange={updateMatches}
        onPlayersChange={updatePlayers}
        onStagesChange={updateStages}
        onTableControlsChange={updateTableControls}
        onBreaksChange={updateBreaks}
        onTournamentControlChange={updateTournamentControl}
        onTournamentSettingsChange={updateTournamentSettings}
        onEventTimelineChange={updateEventTimeline}
        onSeedingsChange={updateSeedings}
        onGroupsChange={updateGroups}
        onDoublesPairsChange={updateDoublesPairs}
        onTournamentStateChange={updateTournamentState}
        onReplaceAllData={replaceAllData}
        onOfficialDoublesImport={importOfficialDoublesPairs}
        onOfficialEntriesImport={importOfficialEntries}
        onClearLocalCache={clearLocalCache}
        onLogout={handleLogout}
        onPublicView={() => navigate("/")}
      />
    );
  }

  return (
    <ScheduleBoard
      matches={sortedMatches}
      players={sortedPlayers}
      stages={stages}
      groups={groups}
      doublesPairs={doublesPairs}
      tournamentSettings={tournamentSettings}
      eventTimeline={eventTimeline}
      dataSourceError={dataSourceError}
      language={language}
      tournamentControl={tournamentControl}
      onLanguageChange={updateLanguage}
      onAdminClick={() => navigate("/admin")}
    />
  );
}
