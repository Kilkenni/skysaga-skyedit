import { STRINGS } from "../i18n/strings";
import { inputStyle, actionBtn } from "../styles/inline";
import { ENTITIES, ENTITY_CATEGORIES, ENTITY_COLORS, ENTITY_CATEGORY, ENTITY_CATALOGUE } from "../constants";
import { useEntityList } from "../hooks/useEntityList";
import { EntityStore } from "../lib/EntityStore";
import { useMemo, useState } from "react";

interface Props {
  entities: EntityStore,
  placingEntityName: string | null,
  setPlacingEntityName: (name: string | null) => void,
}

export default function EntitiesPanel({
  entities,
  placingEntityName,
  setPlacingEntityName,
}: Props) {
  const [entityCategory, setEntityCategory] = useState("all");
  const [entitySearchQuery, setEntitySearchQuery] = useState("");
  const [openItemsId, setOpenItemsId] = useState<number|null>(null);
  const entityInstances = useEntityList(entities);
  const t = STRINGS.en;

  const filteredEntities = useMemo(() => {
    const query = entitySearchQuery.toLowerCase(); // once, not once per entity
    return ENTITIES.filter((entity) => {
        return (entityCategory === "all" || entity.category === entityCategory) &&
        entity.name.toLowerCase().includes(query);
    });
  }, [entityCategory, entitySearchQuery]);

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
        maxHeight: 340,
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 11, color: "#e0a3c0" }}>{t.entitiesHint}</div>

      {placingEntityName && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 6,
            background: "#3a1b2c",
            border: "1px solid #ff5fa2",
          }}
        >
          <span style={{ fontSize: 12, flex: 1 }}>
            {t.entityArmed(placingEntityName)}
          </span>
          <button style={actionBtn} onClick={() => setPlacingEntityName(null)}>
            {t.cancel}
          </button>
        </div>
      )}

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
          flexDirection: "column",
          gap: 2,
          maxHeight: 140,
          overflowY: "auto",
          border: "1px solid #2a2f3a",
          borderRadius: 6,
          padding: 4,
        }}
      >
        {filteredEntities
          .slice(0, 200)
          .map((en) => {
            const n = en.name;
            const isSingleton = ENTITY_CATALOGUE.singleton.has(n);
            const alreadyPlaced =
              isSingleton && entityInstances.some((e) => e.name === n);
            return (
              <div
                key={n}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "3px 6px",
                  borderRadius: 4,
                  background: placingEntityName === n ? "#3a1b2c" : "transparent",
                  opacity: alreadyPlaced ? 0.5 : 1,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    flexShrink: 0,
                    background: "#" + ENTITY_COLORS[en.category].toString(16).padStart(6, "0"),
                  }}
                />
                <span style={{ fontSize: 12, flex: 1 }}>{n}</span>
                {isSingleton && (
                  <span style={{ fontSize: 10, color: "#8a91a3" }}>
                    {t.entitySingletonBadge}
                  </span>
                )}
                <button
                  style={{ ...actionBtn, padding: "2px 8px" }}
                  onClick={() => setPlacingEntityName(n)}
                  disabled={alreadyPlaced}
                  title={alreadyPlaced ? t.entitySingletonBlocked(n) : undefined}
                >
                  📍
                </button>
              </div>
            );
          })}
        {filteredEntities.length === 0 && (
          <div style={{ fontSize: 12, color: "#5c6272", padding: 4 }}>
            {t.noEntityMatches}
          </div>
        )}
      </div>

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

      {entityInstances.map((inst) => (
        <div
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
        </div>
      ))}
    </div>
  );
}
