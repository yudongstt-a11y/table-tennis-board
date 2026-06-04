import { useEffect, useMemo, useState } from "react";
import ScheduleBoard from "./components/ScheduleBoard.jsx";
import AdminLogin from "./components/AdminLogin.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import { getMatches, getPlayers, saveMatches, savePlayers } from "./utils/storage.js";
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
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) || "zh");
  const [isLoggedIn, setIsLoggedIn] = useState(() => hasAdminSession());

  useEffect(() => {
    const onPopState = () => setPath(getPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const hasSession = hasAdminSession();
    setIsLoggedIn(hasSession);

    if (path === "/admin" && hasSession) {
      navigate("/admin/dashboard");
    }
  }, [path]);

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
  }

  function updateLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_KEY, nextLanguage);
  }

  function updatePlayers(nextPlayers) {
    const sorted = [...nextPlayers].sort((a, b) => a.name.localeCompare(b.name));
    setPlayers(sorted);
    savePlayers(sorted);
  }

  function replaceAllData(nextData) {
    setMatches(nextData.matches);
    setPlayers(nextData.players);
  }

  function handleLogin(username, password, rememberMe) {
    if (username === "admin" && password === "123456") {
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

  if (path === "/admin/dashboard" || path === "/admin/players") {
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
        initialTab={path === "/admin/players" ? "players" : "matches"}
        language={language}
        matches={sortedMatches}
        players={sortedPlayers}
        onLanguageChange={updateLanguage}
        onMatchesChange={updateMatches}
        onPlayersChange={updatePlayers}
        onReplaceAllData={replaceAllData}
        onLogout={handleLogout}
        onPublicView={() => navigate("/")}
      />
    );
  }

  return (
    <ScheduleBoard
      matches={sortedMatches}
      players={sortedPlayers}
      language={language}
      onLanguageChange={updateLanguage}
      onAdminClick={() => navigate("/admin")}
    />
  );
}
