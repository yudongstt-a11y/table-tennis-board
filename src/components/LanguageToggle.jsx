export default function LanguageToggle({ language, onLanguageChange }) {
  return (
    <div className="language-toggle" aria-label="Language">
      <button
        className={language === "zh" ? "active" : ""}
        type="button"
        onClick={() => onLanguageChange("zh")}
      >
        中文
      </button>
      <button
        className={language === "en" ? "active" : ""}
        type="button"
        onClick={() => onLanguageChange("en")}
      >
        English
      </button>
    </div>
  );
}
