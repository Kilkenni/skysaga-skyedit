import { STRINGS } from "../i18n/strings";
import { inputStyle, actionBtn } from "../styles/inline";
import { ENTITIES, ENTITY_CATEGORIES, ENTITY_REGISTRY, ENTITY_CATALOGUE, EntityRegEntry, EntityCategory } from "../constants";
import { useEntityList } from "../hooks/useEntityList";
import { EntityStore } from "../lib/EntityStore";
import { useMemo, useState } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels, RadioGroup, Radio } from '@headlessui/react';


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
    const filtered = {...ENTITY_REGISTRY};
    for(const key in filtered) {
      filtered[key] = (filtered[key] as EntityRegEntry[]).filter((entity) => {
          return entity.name.toLowerCase().includes(query);
      });
    }
    return filtered;
  }, [entityCategory, entitySearchQuery]);

  // Place game entities from Entities.json. The server spawns each one by name and sets its properties. Colours: red creatures, yellow NPCs, blue devices (with their voxel footprint), grey objects. The Airship is the player spawn, one per map

  function setEntityItems(id: number, text: string) {
    const items = text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    entities.update(id, {items});
  }

  return (
    <div className="flex flex-col gap-2 px-2.5 py-3 w-full h-full overflow-y-auto"
      style={{
        borderBottom: "1px solid #1e222b",
        background: "#1c1219",
      }}
    >
      <div style={{ fontSize: 11, color: "#e0a3c0" }}>{t.entitiesHint}</div>

      <TabGroup className={"flex flex-col overflow-hidden max-h-full pb-2.5 bg-gray-950"}>
        <TabList className={" px-2 pt-2"}>
          {ENTITY_CATEGORIES.map((cat) => {
            return (
              <Tab className={"bg-gray-800 border-gray-600 border-2 rounded-t-md p-2 data-selected:pb-4 align-bottom"} key={cat}>{cat}</Tab>
            );
          })}
        </TabList>
        <TabPanels className={"h-full min-h-0"}>
          {ENTITY_CATEGORIES.map((cat) => {
            const CAT = cat.toUpperCase();
            const ENTITY_COLORS:Record<EntityCategory, string> = { 
              creature: "border-red-900 data-checked:bg-red-600", 
              npc: "border-yellow-900 data-checked:bg-yellow-600", 
              device: "border-blue-900 data-checked:bg-blue-600", 
              object: "border-gray-900 data-checked:bg-gray-600", 
              service: "border-purple-900 data-checked:bg-purple-600",
            };
            
            return (
              <TabPanel key={cat} className={"flex flex-col max-h-full items-start gap-2 px-0.5 py-1.5"}>
                <p>Count: {ENTITY_REGISTRY[CAT].length}</p>
                <input
                  type="text"
                  value={entitySearchQuery}
                  onChange={(e) => setEntitySearchQuery(e.target.value)}
                  placeholder={t.entitySearchPlaceholder}
                  style={{ ...inputStyle, width: "100%" }}
                />
                <RadioGroup value={placingEntityName} onChange={setPlacingEntityName} className={"flex flex-wrap min-h-0 max-h-full max-w-full overflow-y-scroll"}>
                  {(filteredEntities[CAT] as EntityRegEntry[]).map((ent) => {
                    const {name, icon} = ent;
                    // Disable if it is a singleton and already placed
                    const disabled = ENTITY_CATALOGUE.singleton.has(name) && entityInstances.findIndex((ent) => ent.name === name) > -1;

                    return (
                      <Radio value={name} key={name} disabled={disabled} className={`block m-1 h-16 w-16 border-2 data-disabled:opacity-25 ${ENTITY_COLORS[cat]}`} title={name + (disabled? " already placed" : "")}>
                        <img src={`./src/assets/entity-icons/${icon}.png`} alt={name} width="100%" height="100%"/>
                      </Radio>
                    );
                  })}
                </RadioGroup>
                {filteredEntities[CAT].length === 0 && (
                  <div style={{ color: "#5c6272", padding: 4 }}>
                    {t.noEntityMatches}
                  </div>
                )}
              </TabPanel>
            );
          })}
        </TabPanels>
      </TabGroup>
    </div>
  );
}
