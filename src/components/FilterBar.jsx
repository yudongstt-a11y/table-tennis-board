import { tables } from "../data/demoPlayers.js";
import PlayerAutocomplete from "./PlayerAutocomplete.jsx";

const statuses = ["All", "Upcoming", "Playing", "Finished"];

function statusLabel(status, t) {
  if (status === "All") return t("all");
  return t(status.toLowerCase());
}

export default function FilterBar({
  search,
  status,
  selectedTable,
  players,
  language,
  t,
  onSearchChange,
  onPlayerSelect,
  onStatusChange,
  onTableChange,
}) {
  return (
    <section className="filter-panel" aria-label="Schedule filters">
      <PlayerAutocomplete
        label={t("search")}
        value={search}
        players={players}
        language={language}
        t={t}
        placeholder={t("searchPlaceholder")}
        onInputChange={onSearchChange}
        onSelect={onPlayerSelect}
      />

      <div className="filter-group">
        <span className="filter-title">{t("status")}</span>
        <div className="segmented">
          {statuses.map((item) => (
            <button
              key={item}
              className={status === item ? "active" : ""}
              type="button"
              onClick={() => onStatusChange(item)}
            >
              {statusLabel(item, t)}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group table-filter-group">
        <span className="filter-title">{t("tables")}</span>
        <div className="table-tabs">
          {["All Tables", ...tables].map((table) => (
            <button
              key={table}
              className={selectedTable === table ? "active" : ""}
              type="button"
              onClick={() => onTableChange(table)}
            >
              {table === "All Tables" ? t("allTables") : table}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
