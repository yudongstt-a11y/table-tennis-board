import { useState } from "react";
import { getTranslator } from "../i18n/translations.js";
import LanguageToggle from "./LanguageToggle.jsx";

export default function AdminLogin({ language, onLanguageChange, onLogin, onBack }) {
  const t = getTranslator(language);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const result = onLogin(username, password);
    if (!result.ok) {
      setError(t("usernameOrPasswordWrong"));
    }
  }

  return (
    <main className="page auth-page">
      <section className="auth-card">
        <div className="auth-topbar">
          <p className="eyebrow">{t("admin")}</p>
          <LanguageToggle language={language} onLanguageChange={onLanguageChange} />
        </div>
        <h1>{t("loginTitle")}</h1>
        <p className="subtle">{t("loginSubtitle")}</p>

        <form className="admin-form" onSubmit={handleSubmit}>
          <label>
            <span>{t("username")}</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>
          <label>
            <span>{t("password")}</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" type="submit">
            {t("login")}
          </button>
          <button className="ghost-button full" type="button" onClick={onBack}>
            {t("backToSchedule")}
          </button>
        </form>
      </section>
    </main>
  );
}
