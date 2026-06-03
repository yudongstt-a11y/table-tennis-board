import { useMemo, useState } from "react";
import { getCategoryLabel } from "../constants/categories.js";

function normalize(value) {
  return String(value).trim().toLowerCase();
}

export function ratingLabel(rating, t) {
  return rating === null || rating === undefined || rating === ""
    ? t("unrated")
    : `${t("rating")} ${rating}`;
}

export default function PlayerAutocomplete({
  label,
  value,
  players,
  language,
  t,
  placeholder,
  onInputChange,
  onSelect,
  required = false,
}) {
  const [focused, setFocused] = useState(false);
  const term = normalize(value);

  const suggestions = useMemo(() => {
    if (!term) return [];

    return players
      .filter((player) => normalize(player.name).includes(term))
      .sort((a, b) => {
        const aStarts = normalize(a.name).startsWith(term) ? 0 : 1;
        const bStarts = normalize(b.name).startsWith(term) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }, [players, term]);

  return (
    <label className="autocomplete-field">
      {label && <span>{label}</span>}
      <input
        value={value}
        onChange={(event) => onInputChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder={placeholder || t("playerName")}
        required={required}
      />
      {focused && suggestions.length > 0 && (
        <div className="suggestion-list">
          {suggestions.map((player) => (
            <button
              key={player.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(player)}
            >
              <strong>{player.name}</strong>
              <span>
                {ratingLabel(player.rating, t)} ·{" "}
                {player.categories.map((id) => getCategoryLabel(id, language)).join(", ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}
