import { useEffect, useState } from "react";
import { CATEGORIES } from "../constants/categories.js";

function selectionLabel(selectedCategoryIds, t) {
  if (selectedCategoryIds.length === 0) return t("allEvents");
  return t("selectedCount", { count: selectedCategoryIds.length });
}

export default function EventFilter({
  selectedCategoryIds,
  language,
  t,
  onCategoryChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftIds, setDraftIds] = useState(selectedCategoryIds);

  useEffect(() => {
    if (isOpen) {
      setDraftIds(selectedCategoryIds);
    }
  }, [isOpen, selectedCategoryIds]);

  function toggleCategory(categoryId) {
    setDraftIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  }

  function applySelection() {
    onCategoryChange(draftIds);
    setIsOpen(false);
  }

  function clearSelection() {
    setDraftIds([]);
    onCategoryChange([]);
    setIsOpen(false);
  }

  return (
    <>
      <button className="event-filter-button" type="button" onClick={() => setIsOpen(true)}>
        <span>{t("filterByEvent")}</span>
        <strong>{selectionLabel(selectedCategoryIds, t)}</strong>
      </button>

      {isOpen && (
        <div className="event-sheet-backdrop" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section
            className="event-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("selectEvents")}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="event-sheet-header">
              <h2>{t("selectEvents")}</h2>
              <p>{selectionLabel(draftIds, t)}</p>
            </div>

            <div className="event-options">
              {CATEGORIES.map((category) => (
                <label key={category.id} className="event-option">
                  <span>{category[language]}</span>
                  <input
                    type="checkbox"
                    checked={draftIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                  />
                </label>
              ))}
            </div>

            <div className="event-sheet-actions">
              <button className="ghost-button" type="button" onClick={clearSelection}>
                {t("clear")}
              </button>
              <button className="primary-button" type="button" onClick={applySelection}>
                {t("apply")}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
