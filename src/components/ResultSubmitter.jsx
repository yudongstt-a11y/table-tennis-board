import { useMemo, useState } from "react";

function parseExistingResult(score, winnerGames) {
  const parts = String(score || "")
    .split("-")
    .map((part) => Number(part));

  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part))) {
    return { winnerSide: "", loserScore: 0 };
  }

  if (parts[0] === winnerGames) return { winnerSide: "A", loserScore: parts[1] };
  if (parts[1] === winnerGames) return { winnerSide: "B", loserScore: parts[0] };
  return { winnerSide: "", loserScore: 0 };
}

export default function ResultSubmitter({ match, t, mode = "submit", onSubmit }) {
  const winnerGames = match.winnerGames || 3;
  const loserScoreOptions = Array.from({ length: winnerGames }, (_, index) => index);
  const initial = useMemo(
    () => parseExistingResult(match.score, winnerGames),
    [match.score, winnerGames]
  );
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
          <small>{winnerGames} {t("gamesToWin")}</small>
          {winnerSide === "A" && <strong>{t("winner")}</strong>}
        </button>
        <b>vs</b>
        <button
          className={winnerSide === "B" ? "winner-card selected" : "winner-card"}
          type="button"
          onClick={() => setWinnerSide("B")}
        >
          <span>{match.playerBName}</span>
          <small>{winnerGames} {t("gamesToWin")}</small>
          {winnerSide === "B" && <strong>{t("winner")}</strong>}
        </button>
      </div>

      <div className="loser-score-picker">
        <span>{t("losingSideGames")}</span>
        <div>
          {loserScoreOptions.map((value) => (
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
