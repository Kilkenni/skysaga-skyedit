/**
 * Quick and dirty auto-match of icons to entities
 */

import path from 'node:path';
import fs from "node:fs/promises";
import entities from "../src/data/entities.json" with {type: "json"};
import { ENTITY_CATALOGUE } from '../src/constants.ts';

const OVERWRITE = false;

interface entityIcon {
  name: string,
  category: string,
  icon?: string | string[],
}

const iconsDir = path.resolve("../temp/icons");
const outputDir = path.resolve("../src/data");
const entityIcons: entityIcon[] = Array.from(entities);
const iconsInventory = await fs.readdir(iconsDir, {encoding: "utf8", withFileTypes: true});
const icons = iconsInventory.filter((file) => {
  return (
    !file.isDirectory() &&                                    // skip directories
    path.extname(file.name).toLowerCase() === '.png' &&       // skip non-pngs
    !path.basename(file.name).toLowerCase().includes("icon_mask")  // skip masks
  );
});

const unmatched = new Set(icons.map(file => file.name));

for(const entity of entityIcons) {
  const entName = entity.name;
  const candidates = icons.filter((icon) => icon.name.toLowerCase().includes(`${entName}_icon`.toLowerCase()));
  if(candidates.length > 0)
    if(candidates.length === 1) {
      entity.icon = candidates[0]!.name;
      unmatched.delete(entity.icon); // we have found a clear match
    }
    else
      entity.icon = candidates.map((file) => file.name);
}

for(const entity of entityIcons) {
  if(Array.isArray(entity.icon) === false)
    continue; //only arrays
  const filtered:string[] = [];
  for(const candidate of entity.icon) {
    if(unmatched.has(candidate))
      filtered.push(candidate);
  }
  if(filtered.length === 0)
    entity.icon = undefined;
  else if (filtered.length === 1)
    entity.icon = filtered[0];
  else {
    entity.icon = filtered;
    console.log(filtered);
  }
}

const categories = new Set(ENTITY_CATALOGUE.categories.values());
for(const cat of categories) {
  const arr: entityIcon[] = entityIcons.filter((ent) => ent.category === cat);
  if(!OVERWRITE) {
    try {
      fs.access(`${outputDir}/entity-${cat}.json`);
      console.log(`${outputDir}/entity-${cat}.json exists, overwrite disabled`)
    }
    catch(e) {
      await fs.writeFile(`${outputDir}/entity-${cat}.json`, JSON.stringify(arr, null, 2));
    }
  }
  else {
    await fs.writeFile(`${outputDir}/entity-${cat}.json`, JSON.stringify(arr, null, 2));
  }
}

for(const entity of entityIcons) {
  if(typeof entity.icon === "string")
    await fs.copyFile(`${iconsDir}/${entity.icon}`, `../src/assets/entity-icons/${entity.icon}`);
}
