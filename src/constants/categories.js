export const CATEGORIES = [
  {
    id: "singles",
    zh: "综合单打",
    en: "Singles",
    genderRestriction: "none",
  },
  {
    id: "womens_singles",
    zh: "女子单打",
    en: "Women's Singles",
    genderRestriction: "female",
  },
  {
    id: "mixed_doubles",
    zh: "（混合）双打",
    en: "(Mixed) Doubles",
    genderRestriction: "none",
  },
];

export function getCategory(categoryId) {
  return CATEGORIES.find((category) => category.id === categoryId) || CATEGORIES[0];
}

export function getCategoryLabel(categoryId, language = "zh") {
  const category = getCategory(categoryId);
  return category[language] || category.zh;
}

export function categoryIdFromLegacy(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    [
      "singles",
      "综合单打",
      "缁煎悎鍗曟墦",
      "division 1",
      "division 2",
      "division 3",
      "division 4",
    ].includes(normalized)
  ) {
    return "singles";
  }

  if (["womens_singles", "women's singles", "女子单打", "濂冲瓙鍗曟墦"].includes(normalized)) {
    return "womens_singles";
  }

  if (["mixed_doubles", "(mixed) doubles", "双打", "鍙屾墦", "（混合）双打"].includes(normalized)) {
    return "mixed_doubles";
  }

  return "singles";
}
