/* Hem istemci hem sunucu tarafından kullanılan ortak oyun kuralları (tek doğruluk kaynağı). */
(function (root) {
  const RECIPES = {
    Axe:        { cost: { Wood: 3, Stone: 2 }, out: "Axe", icon: "🪓" },
    Spear:      { cost: { Wood: 3, Stone: 1, Fiber: 1 }, out: "Spear", icon: "🔱" },
    Bow:        { cost: { Wood: 3, Fiber: 4 }, out: "Bow", icon: "🏹" },
    Arrow:      { cost: { Wood: 1, Stone: 1 }, out: "Arrow", n: 5, icon: "➳" },
    Flashlight: { cost: { Stone: 2, Fiber: 2 }, out: "Flashlight", icon: "🔦" },
    Backpack:   { cost: { Fiber: 8, Wood: 1 }, out: "Backpack", icon: "🎒" },
    FishingRod: { cost: { Wood: 2, Fiber: 3 }, out: "FishingRod", icon: "🎣" },
    WaterBottle:{ cost: { Fiber: 2, Wood: 1 }, out: "WaterBottle", icon: "🧴" },
    Torch:      { cost: { Wood: 1, Fiber: 2 }, out: "Torch", icon: "🔥" },
    Club:       { cost: { Wood: 2, Fiber: 1 }, out: "Club", icon: "🏏" }
  };
  const BUILDS = {
    Campfire:  { cost: { Wood: 5, Stone: 2 }, icon: "🔥", r: 0.9 },
    Shelter:   { cost: { Wood: 10, Fiber: 5 }, icon: "⛺", r: 2.2 },
    WoodHouse: { cost: { Wood: 25, Stone: 5, Fiber: 6 }, icon: "🏠", r: 3.4 },
    Chest:     { cost: { Wood: 8 }, icon: "📦", r: 0.9 },
    WaterCollector: { cost: { Wood: 4, Fiber: 4 }, icon: "🌧️", r: 0.9 },
    Defense:   { cost: { Wood: 6, Stone: 1 }, icon: "🚧", r: 1.1 },
    SpikeTrap: { cost: { Wood: 4, Stone: 2, Fiber: 1 }, icon: "🪤", r: 0.8 }
  };
  const FOOD = { Banana: [8, 3], Coconut: [6, 10], Berries: [6, 2], CookedMeat: [35, 0], CookedFish: [28, 0], RawMeat: [12, -10], RawFish: [8, -6] }; // [yemek, su]
  const ISLAND_LIMIT = 98, MAX_BUILDS = 60, REACH = 6.5, PLACE_MIN_DIST = 2.2;
  const QUESTS = [
    { id: "survive", goal: 1 }, { id: "supplies", goal: 4 }, { id: "shelter", goal: 1 }, { id: "camp", goal: 1 },
    { id: "radio", goal: 1 }, { id: "parts", goal: 3 }, { id: "tower", goal: 1 }, { id: "signal", goal: 1 }, { id: "rescue", goal: 90 }
  ];
  const api = { RECIPES, BUILDS, FOOD, ISLAND_LIMIT, MAX_BUILDS, REACH, PLACE_MIN_DIST, QUESTS };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.WI_RULES = api;
})(typeof window !== "undefined" ? window : globalThis);
