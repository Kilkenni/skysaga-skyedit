/**
 * slicer to extract specific data from GeoData and enhance Editor's data files
 * usage: geodataParser.ts [--exportcat] [--extractdeco]
 */

import fs from 'node:fs/promises';

type ObjectType = "Clothing"|
                  "Consumable"|
                  "CraftingDevice"|
                  "Currency"|
                  "Furniture"|
                  "Generated"|
                  "Generic"|
                  "InteractableDevice"|
                  "Key"|
                  "LogicNetworkDevice"|
                  "MysteryBox"|
                  "PortalStone"|
                  "SpawnCreature"|
                  "Tool"|
                  "Voxel"|
                  "VoxelProp";

type PhysicalProperties = "Action_Projectile_DartTrap"|
                          "Action_Projectile_Medium"|
                          "Action_Projectile_Strong"|
                          "Action_Projectile_Weak"|
                          "Default"|
                          "Equipment_Armour_Event_HalloweenPumpkin_Head"|
                          "Equipment_Armour_Heavy_Arms"|
                          "Equipment_Armour_Heavy_Head"|
                          "Equipment_Armour_Heavy_Legs"|
                          "Equipment_Armour_Heavy_Torso"|
                          "Equipment_Armour_Light_Arms"|
                          "Equipment_Armour_Light_Head"|
                          "Equipment_Armour_Light_Legs"|
                          "Equipment_Armour_Light_Torso"|
                          "Equipment_Armour_Medium_Arms"|
                          "Equipment_Armour_Medium_Head"|
                          "Equipment_Armour_Medium_Legs"|
                          "Equipment_Armour_Medium_Torso"|
                          "Equipment_Armour_Snowman_Head"|
                          "Spawner_PortalRift"|
                          "Tool_Archetype_Horn"|
                          "Tool_Basic_Pick"|
                          "Tool_Basic_SharpRock"|
                          "Tool_Light_Pick"|
                          "Tool_PVPFlag"|
                          "Tool_Rock"|
                          "Tool_Settler_CastingWand"|
                          "Tool_Torch"|
                          "Tool_Volume_Build"|
                          "Trap_DartTrap"|
                          "Trap_SpringTrap"|
                          "Voxel"|
                          "VoxelProp"|
                          "Weapon_Ai_Explosive_Large"|
                          "Weapon_Ai_Explosive_Medium"|
                          "Weapon_Ai_Explosive_Small"|
                          "Weapon_Ai_Heavy"|
                          "Weapon_Ai_Ranged"|
                          "Weapon_Ai_ScarabSpit"|
                          "Weapon_Ai_YetiMace"|
                          "Weapon_Ai_YetiRock"|
                          "Weapon_Archetype_2HandedHeavy"|
                          "Weapon_Archetype_Axe"|
                          "Weapon_Archetype_Bomb"|
                          "Weapon_Archetype_Bow"|
                          "Weapon_Archetype_Dagger"|
                          "Weapon_Archetype_Mace"|
                          "Weapon_Archetype_Shield"|
                          "Weapon_Archetype_Spear"|
                          "Weapon_Archetype_Staff"|
                          "Weapon_Archetype_Sword"|
                          "_Device";

type FurnitureType = ""|
                    "Bed"|
                    "Chair"|
                    "Decoration"|
                    "Equipment"|
                    "Fence"|
                    "Instrument"|
                    "Lighting"|
                    "Other"|
                    "Pot"|
                    "Rug"|
                    "Shrine"|
                    "Sign"|
                    "Statue"|
                    "Storage"|
                    "Structural"|
                    "Table"|
                    "Tableware"|
                    "Tiles"|
                    "Window";

type StatTemplate = "Armour"|
                    "Battleaxe"|
                    "Blast"|
                    "Bow"|
                    "Dagger"|
                    "Default"|
                    "Eating"|
                    "GiantClub"|
                    "Hatchet"|
                    "Mace"|
                    "Pick"|
                    "Portal_Stone"|
                    "Rock"|
                    "Scroll"|
                    "Shield"|
                    "Spit"|
                    "StonePickaxe"|
                    "Swipe"|
                    "Sword"|
                    "Voxel"|
                    "WarHammer";

type SubCategory = ""|
                    "Animal Meat"|
                    "Animal Skin"|
                    "Animal foodstuffs"|
                    "Arms"|
                    "Blueprint"|
                    "Blunt Weapons"|
                    "Crafting"|
                    "Crop"|
                    "CustomSpawner"|
                    "Edged Weapons"|
                    "Fabrics"|
                    "Feathers"|
                    "Flora"|
                    "Gems"|
                    "Head"|
                    "Igniter"|
                    "Leaderboard"|
                    "Legs"|
                    "Light Source"|
                    "Logic"|
                    "Misc"|
                    "Missiles"|
                    "Multiplayer"|
                    "Normal Portal Stones"|
                    "PVP"|
                    "Picks"|
                    "Portal Fragments"|
                    "Ranged Weapons"|
                    "Rocks"|
                    "Scroll"|
                    "Shields"|
                    "Storage"|
                    "Timed Portal Stones"|
                    "Torso"|
                    "Wax Candle";

interface Resource {
  Name: string, 
  Index: number,
  AbilitiesSets,
  AllowLocation: "Anywhere"|"AnywhereExceptAdventures"|"AnywhereExceptAdventuresAndBlueprints"|"HomeIsland"|"HomeIslandAndGuildIslands",
  AllowOtherTeamUse: boolean,
  AllowSameTeamUse: boolean,
  AutoCollectStyleOverride: "None"|"OnPickupCreated",
  AutoEquipOnCraft: boolean,
  AutoEquipOnFirstCollect: boolean,
  Biome: "Jungle"|"Forest"|"Desert"|"Mountain",
  Clothing: {
              InventorySlot: "Arms"|"Head"|"Legs"|"Torso",
              IsArmour: boolean,
            },
  Consumable,
  CraftingDevice: {
    ConstructionTime: number,
    QueueLength: number,
  },
  Currency: { Denomination },
  DefaultBoost,
  Device: { ConstructionTime: number },
  EntityBlueprint,
  EquipInSpecialSlotOverride,
  EquippedAction,
  FoodCategory: ""|"Foliage"|"Meat",
  Furniture: { FurnitureType: FurnitureType },
  Generated,
  Generic,
  HardCurrencyOnly: boolean,
  HarvestType: ""|"Normal"|"Butcher"|"Shear",
  IsDestroyable: boolean,
  IsDiscardable: boolean,
  IsDismantlable: boolean,
  IsEquippableItem: boolean,
  IsHiddenFromChronicle: boolean,
  IsInventoryItem: boolean,
  IsLosableOverride: boolean,
  IsNameShownOnReticule: boolean,
  IsOverridingAutoCollectStyle: boolean,
  IsOverridingEquipInSpecialSlot: boolean,
  IsOverridingLosableType: boolean,
  IsOverridingRestorePreviousOnUnequip: boolean,
  IsOverridingStackLimit: boolean,
  IsQuestItem: boolean,
  IsRecipeToMakeThisVital: boolean,
  IsSellable: boolean,
  IsStorable: boolean,
  IsStorableInGuildChests: boolean,
  IsTwoHanded: boolean,
  IsUsableByPlayer: boolean,
  KeepQuestItemOnExit: boolean,
  Lifetime,
  LogicNetworkDevice: {
                        ConstructionTime: number,
                        LogicNetworkType,
                        StateShownViaEmissive: boolean
                      },
  LootChestStackLimit: number,
  MaterialCategories,
  MaxRecipeDepth: number,
  NumPerkMaterials: number,
  ObjectType: ObjectType,
  OnCollectedByPlayerActions,
  OverrideUIReticule: "Default"|"Bow",
  PerkEntries,
  PhysicalProperties: PhysicalProperties,
  PickupBlueprint: ""|"PVPFlagPickup_Blue"|"PVPFlagPickup_Red"|"Pickup"|"pickup",
  PointsValue: number,
  PortalStone,
  RarityLevel: "Common"|"Uncommon"|"Rare"|"Epic"|"Legendary"|"Unknown",
  RequiredRecipeForLootList,
  Requirements,
  RequiresDurability: boolean,
  RequiresRecipe: boolean,
  RestorePreviousOnUnequipOverride,
  ShowPerkTypes,
  SpawnCreature,
  StackLimitOverride,
  StatTemplate: StatTemplate,
  SubCategory: SubCategory,
  SupportsPhotoDisplay: boolean,
  TagList: { Values: { Value }[] },
  Tool: { IsWeapon: boolean },
  TotalValue: number,
  TradeIn,
  ValidPalettes: "" | "TitanPaletteSet" | string,
  VariablePerkEntries,
  Voxel,
  XPForHarvesting: number,
}

interface GeoData {
  Abilities,
  AbilitiesSets,
  AbilitySelectionList,
  AbilitySelectionTable,
  AbilityTagsSets,
  Actions,
  ActionsOnEventList,
  ActionStateProgressions,
  ActiveWindows,
  AdventureCosts,
  AdventureNameTemplates,
  Adventures,
  AIAnimStates,
  AIAwarenessTraits,
  AICapabilities,
  AIEntityRelationshipTables,
  AIEntityTypes,
  AIFightingAbilities,
  AIHearingTraits,
  AIMovementTraits,
  AIPersistenceTraits,
  AIRelationshipDescriptions,
  AIRestlessnessTraits,
  AISleepTraits,
  AITimeSlots,
  AlwaysActions,
  AnimatedSequences,
  AreaOfEffects,
  Backstories,
  BiomePalettes,
  BiomePaletteSets,
  Biomes,
  BiomeThemeLists,
  BiomeThemes,
  BlueprintConstructorComponentData,
  BlueprintDataStoreComponentData,
  BlueprintDeviceList,
  BlueprintTags,
  BuildCompetitionCriteria,
  BuildCompetitionJudge,
  BuildCompetitions,
  BuildCompetitionThemes,
  BuildOffRewardSets,
  BuildOffTopicCategories,
  BuildOffTopics,
  CashShopBundles,
  CharacterAttachments,
  CharacterCustomisationLists,
  ChargeGroups,
  Charges,
  Combos,
  Conditions,
  ContentSchedule,
  CraftingFilterEntries,
  CreatureLists,
  CreatureSets,
  DailyRewardSets,
  DailyRewardTracks,
  DamageTypes,
  DestructionRewardComponentData,
  DungeonPieceSpecs,
  DungeonSpecs,
  Durabilities,
  DynamicPlaceAgainstSameEntityDatas,
  DynamicPlaceAgainstWallDatas,
  Emotes,
  EnemyAIComponentData,
  EntityActions,
  EquipmentSpeeds,
  EquippedActions,
  Events,
  ExportedActions,
  ExportedAnimInfos,
  ExportedEntityInfos,
  ExportedMeshInfos,
  GameModeProperties,
  GameQueueEncatchments,
  GlobalConstants,
  GlobalConstantsBlueprints,
  GlobalConstantsBuildCompetition,
  GlobalConstantsCombat,
  GlobalConstantsCondition,
  GlobalConstantsCrafting,
  GlobalConstantsDirectionalIndicators,
  GlobalConstantsEconomy,
  GlobalConstantsInteractableDevices,
  GlobalConstantsLockableFeatures,
  GlobalConstantsLogicNetwork,
  GlobalConstantsPhysicalProperties,
  GlobalConstantsRecipe,
  GlobalConstantsResourceCategory,
  GlobalConstantsRewards,
  GlobalConstantsUI,
  GlobalConstantsWorlds,
  HarvestTypes,
  HeightMapGenerators,
  HomeIslandTitles,
  InstanceShopComponentData,
  InteractionComponentData,
  InventoryComponentData,
  InventoryLoadOutLists,
  InventoryLoadOuts,
  IslandGenerators,
  JobChallenges,
  Jobs,
  KeyRequirements,
  LandmarkComponentData,
  LeaderboardDisplays,
  LogicNetworkAlphaNumericalNodes,
  LogicNetworkCageSpawner,
  LookAtComponentData,
  LootLists,
  LootTables,
  MapGeneratorGlobalConstants,
  MapSizeCategories,
  MapSizes,
  MapSpecs,
  MaterialCustomisations,
  Materials,
  Movements,
  MysteryBoxSpecs,
  MysteryCraftingComponentData,
  MysteryCraftingProperty,
  Narrative,
  NarrativeLists,
  NoiseModules,
  NPCs,
  OnScreenPrompts,
  OreReplacementList,
  OverheadIconComponentData,
  OverheadUIConfig,
  PerkEffects,
  Perks,
  PermissionsOverrideComponentData,
  PhysicalProperties,
  PhysicalPropertiesCategories,
  PlayerSigils,
  ProjectileComponentData,
  ProximityComponentData,
  QuestVendorComponentData,
  Reaches,
  Recipes,
  RecipeVariants,
  Regions,
  Resistances,
  ResourceFilters,
  Resources: Resource[],
  RewardMail,
  ScaleRanges,
  SequentialCombos,
  SharedLandmarkDatas,
  SharedVoxelDatas,
  SoundSets,
  SpawnParams,
  Staminas,
  StatCalculatorLinearInterpolators,
  StatTemplates,
  StorageUI,
  StorageUIArchetype,
  StrataGenerators,
  Strengths,
  Tags,
  Temperature,
  TerrainBases,
  TerrainGenerators,
  TimeOfDayPresetLists,
  TimeOfDayPresets,
  TopLayerGenerators,
  Topographies,
  Tribes,
  UseTimes,
  VariablePerkSet,
  Videos,
  VoxelActions,
  VoxelLinkComponentData,
  Voxels,
  VoxelTouchActionDatas,
  VoxelTouchOrientationDatas,
  WeightedPerkTable,
  Weights,
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const geodata = [JSON.parse(await fs.readFile(path.join(__dirname, `../temp/GeoData.json`), "utf8"))][0] as GeoData;

const args:string[] = process.argv.slice(2);
const exportCat = args.indexOf("--exportcat") > 0;
//const extractDeco = args.indexOf("--extractdeco") > 0;
const extractDeco = true;


if(exportCat) {
  for(const cat in geodata) {
    const catContent = geodata[cat];
    await fs.writeFile(path.join(__dirname, `../temp/geodata-slice/GeoData-${cat}.json`), JSON.stringify(catContent, null, 2));
  }
}

const resKeys = new Set;
import entities from "../src/data/entity-device.json" with {type: "json"};
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if(extractDeco) {
  for(const resource of geodata.Resources) {
    const index = entities.findIndex((ent) => resource.Name.toLowerCase() === ent.name.toLowerCase());
    if(index > -1) {
      entities[index] = {
        ...entities[index]!,
        index: resource.Index,
        objectType: resource.ObjectType,
        biome: resource.Biome,
        furniture: resource.Furniture,
        rarityLevel: resource.RarityLevel,
        subCategory: resource.SubCategory? resource.SubCategory : undefined,
      } as any;
    }
  }

  await fs.writeFile(path.join(__dirname,`../temp/entity-device.json`), JSON.stringify(entities, null, 2));
}


// const arr = Array.from(resKeys).sort();


// for(const key of arr) {
//   // console.log(`${key},`);
//   console.log(`"${key}"|`)
// }
