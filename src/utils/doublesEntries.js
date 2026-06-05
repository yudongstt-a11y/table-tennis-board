function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function slug(value) {
  const normalized = normalizeName(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || encodeURIComponent(String(value || "entry")).replace(/%/g, "").toLowerCase();
}

function hasRating(value) {
  return value !== null && value !== undefined && value !== "";
}

function ratingNumber(value) {
  return hasRating(value) ? Number(value) : null;
}

function entryRatings(playerA, playerB = null) {
  const ratingA = ratingNumber(playerA?.rating);
  const ratingB = ratingNumber(playerB?.rating);
  const ratings = [ratingA, ratingB].filter((rating) => rating !== null && !Number.isNaN(rating));
  const totalRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) : null;
  const averageRating = ratings.length ? totalRating / ratings.length : null;

  return {
    playerARating: ratingA,
    playerBRating: ratingB,
    totalRating,
    averageRating,
  };
}

function sortDoublesEntries(entries) {
  return [...entries].sort((a, b) => {
    if (a.totalRating !== null && b.totalRating === null) return -1;
    if (a.totalRating === null && b.totalRating !== null) return 1;
    if (a.totalRating !== null && b.totalRating !== null) return b.totalRating - a.totalRating;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function doublesEntryDisplayName(entry, language = "zh") {
  if (entry.needsPartner) {
    return `${entry.playerAName} / ${language === "zh" ? "待配" : "TBD"}`;
  }
  return entry.displayName || `${entry.playerAName} / ${entry.playerBName}`;
}

export function buildDoublesEntriesFromPlayers(players) {
  const eligiblePlayers = players.filter((player) => player.categories?.includes("mixed_doubles"));
  const playersByName = new Map(eligiblePlayers.map((player) => [normalizeName(player.name), player]));
  const consumed = new Set();
  const entries = [];

  eligiblePlayers.forEach((player) => {
    const playerKey = normalizeName(player.name);
    if (consumed.has(playerKey)) return;

    const partnerName = String(player.doublesPartner || "").trim();
    const partner = partnerName ? playersByName.get(normalizeName(partnerName)) : null;

    if (partnerName) {
      const partnerKey = normalizeName(partnerName);
      const ratings = entryRatings(player, partner);
      const notes = partner ? "" : "搭档未在选手列表中找到";
      const entry = {
        id: `pair_${slug(player.name)}_${slug(partnerName)}`,
        entryType: "pair",
        type: "pair",
        playerAId: player.id,
        playerAName: player.name,
        playerARating: ratings.playerARating,
        playerBId: partner?.id || null,
        playerBName: partnerName,
        playerBRating: ratings.playerBRating,
        displayName: `${player.name} / ${partnerName}`,
        totalRating: ratings.totalRating,
        averageRating: ratings.averageRating,
        needsPartner: false,
        notes,
      };

      entries.push(entry);
      consumed.add(playerKey);
      if (partner) consumed.add(partnerKey);
      return;
    }

    if (player.needsDoublesPartner || !partnerName) {
      const ratings = entryRatings(player);
      entries.push({
        id: `solo_${slug(player.name)}`,
        entryType: "solo",
        type: "solo",
        playerAId: player.id,
        playerAName: player.name,
        playerARating: ratings.playerARating,
        playerBId: null,
        playerBName: "",
        playerBRating: null,
        displayName: `${player.name} / 待配`,
        totalRating: ratings.totalRating,
        averageRating: ratings.averageRating,
        needsPartner: true,
        notes: "需要双打搭档",
      });
      consumed.add(playerKey);
    }
  });

  return sortDoublesEntries(entries);
}

export function doublesEntryRatingLine(entry, t) {
  const ratingA = entry.playerARating ?? t("unrated");
  const ratingB = entry.needsPartner ? (t("tbd") || "TBD") : entry.playerBRating ?? t("unrated");
  return `${entry.playerAName} ${ratingA} + ${entry.needsPartner ? (t("tbd") || "TBD") : entry.playerBName} ${ratingB} = ${t("totalRating")} ${entry.totalRating ?? t("unrated")}`;
}

export function doublesEntrySummary(entries) {
  return {
    total: entries.length,
    confirmed: entries.filter((entry) => !entry.needsPartner).length,
    needsPartner: entries.filter((entry) => entry.needsPartner).length,
  };
}
