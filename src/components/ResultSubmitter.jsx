import { useMemo, useState } from "react";

function parseExistingResult(score) {
  const parts = String(score || "")
    .split("-")
    .map((part) => Number(part));

  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part))) {
    return { winnerSide: "", loserScore: 0 };
  }

  if (parts[0] === 3) return { winnerSide: "A", loserScore: parts[1] };
  if (parts[1] === 3) return { winnerSide: "B", loserScore: parts[0] };
  return { winnerSide: "", loserScore: 0 };
}

export default function ResultSubmitter({ match, t, mode = "submit", onSubmit }) {
  const initial = useMemo(() => parseExistingResult(match.score), [match.score]);
  const [winnerSide, setWinnerSide] = useState(initial.winnerSide);
  const [loserScore, setLoserScore] = useState(initial.loserScore ?? 0);
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!winnerSide) {
      setError(t("pleaseSelectWinner"));
      return;
    }

    setError("");
    onSubmit(match.id, winnerSide, loserScore);
  }

  return (
    <section className="result-submitter">
      <div className="result-submit-heading">
        <strong>{mode === "edit" ? t("editResult") : t("selectWinner")}</strong>
        {match.status === "Finished" && match.score && (
          <span>{t("matchResult")}: {match.score}</span>
        )}
      </div>

      <div className="winner-grid">
        <button
          className={winnerSide === "A" ? "winner-card selected" : "winner-card"}
          type="button"
          onClick={() => setWinnerSide("A")}
        >
          <span>{match.playerAName}</span>
          {winnerSide === "A" && <strong>{t("winner")}</strong>}
        </button>
        <b>vs</b>
        <button
          className={winnerSide === "B" ? "winner-card selected" : "winner-card"}
          type="button"
          onClick={() => setWinnerSide("B")}
        >
          <span>{match.playerBName}</span>
          {winnerSide === "B" && <strong>{t("winner")}</strong>}
        </button>
      </div>

      <div className="loser-score-picker">
        <span>{t("losingSideGames")}</span>
        <div>
          {[0, 1, 2].map((value) => (
            <button
              key={value}
              className={loserScore === value ? "active" : ""}
              type="button"
              onClick={() => setLoserScore(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <button className="primary-button result-submit-button" type="button" onClick={handleSubmit}>
        {t("submitResult")}
      </button>
    </section>
  );
}
