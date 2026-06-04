import { useState } from "react";
import { CATEGORIES } from "../constants/categories.js";

export const emptyPlayer = {
  name: "",
  gender: "Male",
  rating: "",
  categories: ["singles"],
};

export default function PlayerForm({ value, language, t, title, error, onChange, onCancel, onSubmit }) {
  const [warning, setWarning] = useState("");

  function updateField(field, nextValue) {
    if (field === "gender" && nextValue !== "Female" && value.categories.includes("womens_singles")) {
      onChange({
        ...value,
        gender: nextValue,
        categories: value.categories.filter((categoryId) => categoryId !== "womens_singles"),
      });
      setWarning(t("womensOnly"));
      return;
    }

    onChange({ ...value, [field]: nextValue });
  }

  function toggleCategory(category) {
    if (category.id === "womens_singles" && value.gender !== "Female") {
      setWarning(t("womensOnly"));
      return;
    }

    const hasCategory = value.categories.includes(category.id);
    const nextCategories = hasCategory
      ? value.categories.filter((item) => item !== category.id)
      : [...value.categories, category.id];

    setWarning("");
    onChange({ ...value, categories: nextCategories });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="match-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Player Editor</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Close">
            X
          </button>
        </div>

        <form className="match-form" onSubmit={onSubmit}>
          <label>
            <span>{t("playerName")}</span>
            <input
              value={value.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
          </label>

          <label>
            <span>{t("gender")}</span>
            <select value={value.gender} onChange={(event) => updateField("gender", event.target.value)}>
              <option value="Male">{t("male")}</option>
              <option value="Female">{t("female")}</option>
              <option value="Other">{t("other")}</option>
            </select>
          </label>

          <label>
            <span>{t("rating")}</span>
            <input
              type="number"
              min="0"
              value={value.rating ?? ""}
              onChange={(event) => updateField("rating", event.target.value)}
              placeholder={t("unrated")}
            />
          </label>

          <fieldset className="category-checkboxes">
            <legend>{t("events")}</legend>
            {CATEGORIES.map((category) => {
              const disabled = category.id === "womens_singles" && value.gender !== "Female";
              return (
                <label key={category.id} className={disabled ? "disabled" : ""}>
                  <input
                    type="checkbox"
                    checked={value.categories.includes(category.id)}
                    disabled={disabled}
                    onChange={() => toggleCategory(category)}
                  />
                  <span>{category[language]}</span>
                </label>
              );
            })}
          </fieldset>

          {warning && <div className="form-warning">{warning}</div>}
          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button className="ghost-button" type="button" onClick={onCancel}>
              {t("cancel")}
            </button>
            <button className="primary-button" type="submit">
              {t("savePlayer")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
