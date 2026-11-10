import { STRINGS } from "../i18n/strings";
import { inputStyle, actionBtn } from "../styles/inline";
import { ENTITIES, ENTITY_CATEGORIES, ENTITY_COLORS, ENTITY_CATEGORY, ENTITY_CATALOGUE, EntityCategory } from "../constants";
import { useEntityList } from "../hooks/useEntityList";
import { EntityStore } from "../lib/EntityStore";
import { useMemo, useState } from "react";
import { EntityData } from "../lib/entities";

interface Props {
  entities: EntityStore,
}

function getEntityCategory(entity: EntityData): EntityCategory {
  const category = ENTITY_CATEGORY.get(entity.name);
  return category || "service";
}

export default function EntityInstancesList({
  entities,
}: Props) {
  const [entityCategory, setEntityCategory] = useState("all");
  const [entitySearchQuery, setEntitySearchQuery] = useState("");
  const [openItemsId, setOpenItemsId] = useState<number|null>(null);
  const entityInstances = useEntityList(entities);
  const t = STRINGS.en;

  const filteredInstances = useMemo(() => {
    const query = entitySearchQuery.toLowerCase(); // once, not once per entity
    return entityInstances.filter((entity) => {
      return (entityCategory === "all" || getEntityCategory(entity) === entityCategory) &&
      entity.name.toLowerCase().includes(query);
    });
  }, [entityInstances, entityCategory, entitySearchQuery]);

  function setEntityItems(id: number, text: string) {
    const items = text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    entities.update(id, {items});
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
        borderBottom: "1px solid #1e222b",
        background: "#1c1219",
        //maxHeight: 340,
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 11, color: "#e0a3c0" }}>{t.entitiesHint}</div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {["all", ...ENTITY_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setEntityCategory(c)}
            style={{
              ...actionBtn,
              padding: "3px 8px",
              background: entityCategory === c ? "#22314d" : actionBtn.background,
            }}
          >
            {c === "all" ? t.entityCategoryAll : t.entityCategoryNames[c]} (
              {/* //todo : compute once at module level, outside the component */}
            {c === "all" ? ENTITIES.length : ENTITIES.filter((en) => en.category === c).length})
          </button>
        ))}
      </div>
      <input
        type="text"
        value={entitySearchQuery}
        onChange={(e) => setEntitySearchQuery(e.target.value)}
        placeholder={t.entitySearchPlaceholder}
        style={{ ...inputStyle, width: "100%" }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid #2a2f3a",
          paddingTop: 8,
          marginTop: 2,
        }}
      >
        <div style={{ fontSize: 11, color: "#8a91a3" }}>
          {t.entitiesPlacedCount(entityInstances.length)}
        </div>
        {entityInstances.length > 0 && (
          <button style={actionBtn} onClick={() => entities.clear()}>
            {t.clearAll}
          </button>
        )}
      </div>

      <ul>
        {filteredInstances.map((inst) => (
          <li
            key={inst.id}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              padding: "5px 8px",
              borderRadius: 6,
              background: "#0e1117",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: ENTITY_CATEGORY.has(inst.name)
                  ? "#" + ENTITY_COLORS[ENTITY_CATEGORY.get(inst.name) || "service"].toString(16).padStart(6, "0")
                  : "#ff5fa2",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, flex: 1 }}>{inst.name}</span>
            {!ENTITY_CATEGORY.has(inst.name) && (
              <span style={{ fontSize: 10, color: "#ffb86b" }}>{t.entityServiceBadge}</span>
            )}
            <span style={{ fontSize: 11, color: "#8a91a3" }}>
              {inst.x}, {inst.y}, {inst.z}
            </span>
            <button
              style={{ ...actionBtn, background: openItemsId === inst.id ? "#22314d" : actionBtn.background }}
              onClick={() => setOpenItemsId(openItemsId === inst.id ? null : inst.id)}
              title={t.entityItemsHint}
            >
              {t.entityItems} ({(inst.items || []).length})
            </button>
            <button style={actionBtn} onClick={() => entities.remove(inst.id)}>
              {t.slotDelete}
            </button>
            {openItemsId === inst.id && (
              <textarea
                defaultValue={(inst.items || []).join("\n")}
                onBlur={(event) => setEntityItems(inst.id, event.target.value)}
                placeholder={t.entityItemsHint}
                rows={6}
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box", flexBasis: "100%", fontSize: 11 }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
