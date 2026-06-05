import { useEffect, useMemo, useState } from "react";
import ScheduleBoard from "./components/ScheduleBoard.jsx";
import AdminLogin from "./components/AdminLogin.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import {
  getMatches,
  getPlayers,
  getStages,
  getTableControls,
  getBreaks,
  getTournamentControl,
  getTournamentSettings,
  getEventTimeline,
  getSeedings,
  getGroups,
  saveMatches,
  savePlayers,
  saveStages,
  saveTableControls,
  saveBreaks,
  saveTournamentControl,
  saveTournamentSettings,
  saveEventTimeline,
  saveSeedings,
  saveGroups,
} from "./utils/storage.js";
import {
  DATA_SOURCE,
  importOfficialDoublesPairsData,
  loadAllData,
  saveBreaksData,
  saveEventTimelineData,
  saveGroupsData,
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

const ADMIN_LOGGED_IN_KEY = "adminLoggedIn";
const ADMIN_REMEMBERED_KEY = "adminRemembered";
const LEGACY_ADMIN_SESSION_KEY = "table_tennis_admin_session";

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
  const [matches, setMatches] = useState(() => getMatches());
  const [players, setPlayers] = useState(() => getPlayers());
  const [stages, setStages] = useState(() => getStages());
  const [tableControls, setTableControls] = useState(() => getTableControls());
  const [breaks, setBreaks] = useState(() => getBreaks());
  const [tournamentControl, setTournamentControl] = useState(() => getTournamentControl());
  const [tournamentSettings, setTournamentSettings] = useState(() => getTournamentSettings());
  const [eventTimeline, setEventTimeline] = useState(() => getEventTimeline());
  const [seedings, setSeedings] = useState(() => getSeedings());
  const [groups, setGroups] = useState(() => getGroups());
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
    loadAllData().then((nextData) => {
      if (!active) return;
      replaceAllData(nextData);
      setDataSourceError(nextData.dataSourceError || "");
      unsubscribe = subscribeToTournamentData(() => {
        loadAllData().then((freshData) => {
          replaceAllData(freshData);
          setDataSourceError(freshData.dataSourceError || "");
        });
      });
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
    () => [...matches].sort((a, b) => new Date(a.time) - new Date(b.time)),
    [matches]
  );

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.name.localeCompare(b.name)),
    [players]
  );

  function updateMatches(nextMatches) {
    const sorted = [...nextMatches].sort((a, b) => new Date(a.time) - new Date(b.time));
    setMatches(sorted);
    saveMatches(sorted);
    saveMatchesData(sorted).catch((error) => setDataSourceError(error.message));
  }

  function updateLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_KEY, nextLanguage);
  }

  function updatePlayers(nextPlayers) {
    const sorted = [...nextPlayers].sort((a, b) => a.name.localeCompare(b.name));
    setPlayers(sorted);
    savePlayers(sorted);
    savePlayersData(sorted).catch((error) => setDataSourceError(error.message));
  }

  function updateStages(nextStages) {
    const sorted = [...nextStages].sort((a, b) => a.order - b.order);
    setStages(sorted);
    saveStages(sorted);
    saveStagesData(sorted).catch((error) => setDataSourceError(error.message));
  }

  function updateTableControls(nextTableControls) {
    setTableControls(nextTableControls);
    saveTableControls(nextTableControls);
    saveTableControlsData(nextTableControls).catch((error) => setDataSourceError(error.message));
  }

  function updateBreaks(nextBreaks) {
    setBreaks(nextBreaks);
    saveBreaks(nextBreaks);
    saveBreaksData(nextBreaks).catch((error) => setDataSourceError(error.message));
  }

  function updateTournamentControl(nextTournamentControl) {
    setTournamentControl(nextTournamentControl);
    saveTournamentControl(nextTournamentControl);
    saveTournamentControlData(nextTournamentControl, tournamentSettings).catch((error) =>
      setDataSourceError(error.message)
    );
  }

  function updateTournamentSettings(nextTournamentSettings) {
    setTournamentSettings(nextTournamentSettings);
    saveTournamentSettings(nextTournamentSettings);
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
      saveTableControls(nextControls);
      saveTableControlsData(nextControls).catch((error) => setDataSourceError(error.message));
      return nextControls;
    });
  }

  function updateEventTimeline(nextEventTimeline) {
    const sorted = [...nextEventTimeline].sort(
      (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.timeStart).localeCompare(String(b.timeStart))
    );
    setEventTimeline(sorted);
    saveEventTimeline(sorted);
    saveEventTimelineData(sorted).catch((error) => setDataSourceError(error.message));
  }

  function updateSeedings(nextSeedings) {
    setSeedings(nextSeedings);
    saveSeedings(nextSeedings);
    saveSeedingsData(nextSeedings).catch((error) => setDataSourceError(error.message));
  }

  function updateGroups(nextGroups) {
    setGroups(nextGroups);
    saveGroups(nextGroups);
    saveGroupsData(nextGroups).catch((error) => setDataSourceError(error.message));
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
    setDataSourceError(nextData.dataSourceError || "");
  }

  function importOfficialDoublesPairs(playersForImport) {
    importOfficialDoublesPairsData(playersForImport).catch((error) => setDataSourceError(error.message));
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
        onTournamentStateChange={updateTournamentState}
        onReplaceAllData={replaceAllData}
        onOfficialDoublesImport={importOfficialDoublesPairs}
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
