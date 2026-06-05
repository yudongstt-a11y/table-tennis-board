export default function PublicTimeline({ items, language, t }) {
  return (
    <section className="public-section">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">{t("eventTimeline")}</p>
          <h2>{t("eventTimeline")}</h2>
        </div>
      </div>

      <div className="timeline-list">
        {items.map((item) => {
          const title = language === "zh" ? item.titleZh : item.titleEn || item.titleZh;
          const description =
            language === "zh" ? item.descriptionZh : item.descriptionEn || item.descriptionZh;

          return (
            <article className="timeline-item" key={item.id}>
              <time>
                {item.timeStart}
                {item.timeEnd ? ` - ${item.timeEnd}` : ""}
              </time>
              <div>
                <strong>{title}</strong>
                {description && <p>{description}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
