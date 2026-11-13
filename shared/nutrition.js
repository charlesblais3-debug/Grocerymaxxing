// Nutrient values per 100 g of each canonical ingredient, used to CALCULATE macros for
// recipes whose source publishes none. Calculated values are always labelled as such.
//
// Figures are typical values for the raw/as-sold generic food, in line with the Canadian
// Nutrient File and USDA FoodData Central, rounded. An ingredient group ("white fish",
// "nuts") uses a representative member. They are approximations: a recipe's real values
// depend on brands, trimming, draining and how much cooking fat stays in the pan.
//
// [kcal, protein g, carbohydrate g, fat g, fibre g]
export const NUTRITION = {
  // Meat
  chicken_breast: [120, 22.5, 0, 2.6, 0], chicken_thigh: [177, 18, 0, 11, 0], chicken_drumstick: [161, 18, 0, 9.2, 0],
  chicken_whole: [140, 12.5, 0, 10, 0], // per 100 g as bought (bone-in, about 68 % edible)
  chicken_wing: [126, 10.5, 0, 9.3, 0], // as bought, bone-in
  chicken_ground: [143, 17.4, 0, 8.1, 0], chicken: [120, 22.5, 0, 2.6, 0],
  turkey_ground: [148, 19.7, 0, 7.7, 0], turkey: [114, 23.5, 0, 1.5, 0],
  beef_ground: [215, 18.6, 0, 15, 0], beef_stew: [160, 21, 0, 8, 0], beef_steak: [190, 20.5, 0, 12, 0], beef: [170, 21, 0, 9, 0],
  pork_ground: [263, 16.9, 0, 21.2, 0], pork_chop: [170, 21, 0, 9, 0], pork_tenderloin: [120, 21, 0, 3.5, 0], pork_loin: [166, 21, 0, 8.5, 0],
  pork_shoulder: [186, 17.4, 0, 12.4, 0], pork_ribs: [200, 13, 0, 16.5, 0], pork: [166, 21, 0, 8.5, 0],
  bacon: [417, 12.6, 1.3, 39.7, 0], ham: [145, 21, 1.5, 5.5, 0], sausage: [300, 14, 2, 26, 0], lamb: [230, 17.5, 0, 17.5, 0],
  duck: [135, 19, 0, 6, 0], veal: [144, 19.4, 0, 6.8, 0], prosciutto: [250, 26, 0.3, 16, 0], pepperoni: [490, 21, 1.5, 44, 0],
  // Fish
  salmon: [208, 20.4, 0, 13.4, 0], salmon_smoked: [117, 18.3, 0, 4.3, 0], white_fish: [82, 18, 0, 0.7, 0], trout: [141, 19.9, 0, 6.2, 0],
  shrimp: [85, 20, 0.2, 0.5, 0], tuna_can: [116, 25.5, 0, 0.8, 0], scallop: [69, 12, 3.2, 0.5, 0], mussels: [86, 11.9, 3.7, 2.2, 0], sardine: [208, 24.6, 0, 11.5, 0],
  // Dairy & eggs
  egg: [143, 12.6, 0.7, 9.5, 0], milk: [50, 3.3, 4.8, 2, 0], cream_35: [340, 2.1, 2.8, 36, 0], cream_10: [118, 3, 4.3, 10, 0],
  sour_cream: [181, 2.9, 4.6, 17, 0], butter: [717, 0.9, 0.1, 81, 0], margarine: [717, 0.2, 0.7, 80.7, 0], yogurt: [61, 3.5, 4.7, 3.3, 0],
  yogurt_greek: [73, 10, 3.9, 1.9, 0], cheddar: [403, 23, 3.1, 33, 0], cheese_curds: [370, 24, 2, 30, 0], mozzarella: [300, 22, 2.2, 22.4, 0],
  bocconcini: [250, 18, 2, 19, 0], parmesan: [420, 36, 3.5, 28, 0], feta: [264, 14.2, 4.1, 21.3, 0], cream_cheese: [342, 6, 4.1, 34, 0],
  ricotta: [150, 11.3, 3, 10, 0], swiss: [380, 27, 1.5, 29, 0], brie: [334, 20.8, 0.5, 27.7, 0], goat_cheese: [320, 20, 1, 26, 0],
  blue_cheese: [353, 21.4, 2.3, 28.7, 0], halloumi: [321, 21, 2.5, 25, 0], cheese: [380, 24, 2.5, 30, 0],
  tofu: [120, 13, 2.5, 7, 1.5], soy_milk: [40, 2.8, 2.5, 1.9, 0.4], coconut_milk: [197, 2.2, 2.8, 21.3, 0], condensed_milk: [321, 7.9, 54.4, 8.7, 0], hummus: [237, 7.8, 14.3, 17.8, 5.4],
  // Vegetables
  onion: [40, 1.1, 9.3, 0.1, 1.7], green_onion: [32, 1.8, 7.3, 0.2, 2.6], shallot: [72, 2.5, 16.8, 0.1, 3.2], garlic: [149, 6.4, 33, 0.5, 2.1],
  ginger: [80, 1.8, 18, 0.8, 2], carrot: [41, 0.9, 9.6, 0.2, 2.8], celery: [14, 0.7, 3, 0.2, 1.6], potato: [77, 2, 17.5, 0.1, 2.2],
  sweet_potato: [86, 1.6, 20.1, 0.1, 3], tomato: [18, 0.9, 3.9, 0.2, 1.2], cherry_tomato: [18, 0.9, 3.9, 0.2, 1.2], bell_pepper: [28, 1, 6.3, 0.3, 2],
  hot_pepper: [29, 0.9, 6.5, 0.4, 2.8], cucumber: [15, 0.7, 3.6, 0.1, 0.5], zucchini: [17, 1.2, 3.1, 0.3, 1], eggplant: [25, 1, 5.9, 0.2, 3],
  broccoli: [34, 2.8, 6.6, 0.4, 2.6], cauliflower: [25, 1.9, 5, 0.3, 2], cabbage: [25, 1.3, 5.8, 0.1, 2.5], brussels: [43, 3.4, 9, 0.3, 3.8],
  kale: [35, 2.9, 4.4, 1.5, 4.1], spinach: [23, 2.9, 3.6, 0.4, 2.2], lettuce: [15, 1.2, 2.9, 0.2, 1.5], mushroom: [22, 3.1, 3.3, 0.3, 1],
  leek: [61, 1.5, 14.2, 0.3, 1.8], corn: [86, 3.3, 19, 1.4, 2.7], peas: [81, 5.4, 14.5, 0.4, 5.1], green_beans: [31, 1.8, 7, 0.2, 2.7],
  asparagus: [20, 2.2, 3.9, 0.1, 2.1], squash: [45, 1, 11.7, 0.1, 2], beet: [43, 1.6, 9.6, 0.2, 2.8], turnip: [36, 1.1, 8.4, 0.2, 2.3],
  radish: [16, 0.7, 3.4, 0.1, 1.6], fennel: [31, 1.2, 7.3, 0.2, 3.1], bok_choy: [13, 1.5, 2.2, 0.2, 1], bean_sprouts: [30, 3, 5.9, 0.2, 1.8],
  avocado: [160, 2, 8.5, 14.7, 6.7], frozen_veg: [65, 3.3, 13, 0.5, 4], parsley: [36, 3, 6.3, 0.8, 3.3], cilantro: [23, 2.1, 3.7, 0.5, 2.8],
  basil: [23, 3.2, 2.7, 0.6, 1.6], dill: [43, 3.5, 7, 1.1, 2.1], mint: [44, 3.3, 8.4, 0.7, 6.8], chives: [30, 3.3, 4.4, 0.7, 2.5],
  // Fruit
  lemon: [22, 0.4, 6.9, 0.2, 0.3], lime: [25, 0.4, 8.4, 0.1, 0.4], orange: [47, 0.9, 11.8, 0.1, 2.4], orange_juice: [45, 0.7, 10.4, 0.2, 0.2],
  apple: [52, 0.3, 13.8, 0.2, 2.4], banana: [89, 1.1, 22.8, 0.3, 2.6], strawberry: [32, 0.7, 7.7, 0.3, 2], blueberry: [57, 0.7, 14.5, 0.3, 2.4],
  raspberry: [52, 1.2, 11.9, 0.7, 6.5], frozen_fruit: [50, 0.8, 12, 0.3, 3], cranberry: [308, 0.1, 82, 1.1, 5.3], grape: [69, 0.7, 18.1, 0.2, 0.9],
  pear: [57, 0.4, 15.2, 0.1, 3.1], peach: [39, 0.9, 9.5, 0.3, 1.5], mango: [60, 0.8, 15, 0.4, 1.6], pineapple: [50, 0.5, 13.1, 0.1, 1.4],
  melon: [34, 0.8, 8.2, 0.2, 0.9], kiwi: [61, 1.1, 14.7, 0.5, 3], grapefruit: [42, 0.8, 10.7, 0.1, 1.6], raisins: [299, 3.1, 79.2, 0.5, 3.7],
  // Grains & bakery (dry weight for pasta, rice, grains)
  pasta: [371, 13, 74.7, 1.5, 3.2], rice_noodle: [364, 6, 80, 0.6, 1.6], rice: [365, 7.1, 80, 0.7, 1.3], quinoa: [368, 14.1, 64.2, 6.1, 7],
  oats: [379, 13.2, 67.7, 6.5, 10.1], flour: [364, 10.3, 76.3, 1, 2.7], cornstarch: [381, 0.3, 91.3, 0.1, 0.9], cornmeal: [370, 7.1, 79, 1.8, 3.9],
  bread: [265, 9, 49, 3.2, 2.7], buns: [279, 9.5, 49.5, 4.3, 2.1], tortilla: [304, 8.2, 50, 7.8, 3], breadcrumbs: [395, 13.4, 72, 5.3, 4.5],
  pie_crust: [470, 6, 45, 30, 1.5], crackers: [430, 9.5, 70, 12, 2.8], croutons: [465, 10.8, 63.5, 18.3, 5], yeast: [325, 40.4, 41.2, 7.6, 26.9],
  baking_powder: [53, 0, 27.7, 0, 0.2], baking_soda: [0, 0, 0, 0, 0],
  // Legumes, nuts (canned/cooked weight for beans; dry for lentils)
  chickpeas: [139, 7, 22.5, 2.6, 6.4], black_beans: [91, 6, 16.6, 0.3, 6.9], kidney_beans: [84, 5.2, 15, 0.6, 5.5], white_beans: [114, 7.3, 21, 0.3, 5],
  lentils: [352, 24.6, 63.4, 1.1, 10.7], peanut_butter: [598, 22.2, 22.3, 51.4, 5], peanuts: [567, 25.8, 16.1, 49.2, 8.5], almonds: [579, 21.2, 21.6, 49.9, 12.5],
  walnuts: [654, 15.2, 13.7, 65.2, 6.7], seeds: [570, 19, 20, 49, 10], coconut: [660, 6.9, 23.7, 64.5, 16.3],
  // Canned goods, sauces, condiments
  canned_tomato: [21, 1, 4.3, 0.2, 1], tomato_paste: [82, 4.3, 18.9, 0.5, 4.1], tomato_sauce: [50, 1.6, 8, 1.5, 1.8], sundried_tomato: [213, 5.1, 23.3, 14.1, 5.8],
  salsa: [29, 1.5, 6.6, 0.2, 1.9], broth_chicken: [6, 0.6, 0.4, 0.2, 0], broth_beef: [7, 1.1, 0.1, 0.2, 0], broth_veg: [5, 0.2, 0.9, 0.1, 0],
  olive_oil: [884, 0, 0, 100, 0], veg_oil: [884, 0, 0, 100, 0], sesame_oil: [884, 0, 0, 100, 0], coconut_oil: [892, 0, 0, 99.1, 0],
  vinegar: [20, 0, 0.6, 0, 0], soy_sauce: [53, 8.1, 4.9, 0.6, 0.8], fish_sauce: [60, 3, 11, 0.2, 0], hot_sauce: [50, 1.5, 9, 1, 2],
  worcestershire: [130, 0.5, 30, 0.4, 0.5], ketchup: [101, 1, 27.4, 0.1, 0.3], mustard: [66, 4.4, 5.3, 4, 3.3], mayo: [680, 1, 0.6, 75, 0],
  pesto: [450, 5, 6, 45, 2], miso: [199, 11.7, 26.5, 6, 5.4], kimchi: [15, 1.1, 2.4, 0.5, 1.6], dressing: [430, 1, 7, 44, 0.3],
  olives: [145, 1, 3.8, 15.3, 3.3], canned_soup: [55, 1.2, 6, 3, 0.4], ice_cream: [207, 3.5, 23.6, 11, 0.7], chips: [536, 7, 53, 34.6, 4.4], mini_cucumber: [15, 0.7, 3.6, 0.1, 0.5], spinach_frozen: [29, 3.6, 4.2, 0.6, 3.6], salad_mix: [17, 1.4, 3.2, 0.2, 1.8], mini_pepper: [28, 1, 6.3, 0.3, 2], capers: [23, 2.4, 4.9, 0.9, 3.2], pickles: [12, 0.5, 2.4, 0.2, 1], jam: [250, 0.4, 65, 0.1, 1], wine: [82, 0.1, 2.6, 0, 0],
  // Sugar & baking
  sugar: [387, 0, 100, 0, 0], brown_sugar: [380, 0.1, 98, 0, 0], icing_sugar: [389, 0, 99.8, 0, 0], maple_syrup: [260, 0, 67, 0.1, 0],
  honey: [304, 0.3, 82.4, 0, 0.2], chocolate: [535, 6, 59, 31, 6], cocoa: [228, 19.6, 57.9, 13.7, 33.2], vanilla: [288, 0.1, 12.7, 0.1, 0],
  gelatin: [335, 85.6, 0, 0.1, 0],
  buttermilk: [40, 3.3, 4.8, 0.9, 0], whipped_cream: [257, 3.2, 12.5, 22.2, 0], cooking_spray: [0, 0, 0, 0, 0], pomegranate: [83, 1.7, 18.7, 1.2, 4],
  cherries: [63, 1.1, 16, 0.2, 2.1], plantain: [122, 1.3, 31.9, 0.4, 2.3], lemongrass: [99, 1.8, 25.3, 0.5, 0], horseradish: [48, 1.2, 11.3, 0.7, 3.3],
  guacamole: [155, 2, 8.6, 14, 6], refried_beans: [90, 5, 13.5, 2, 4.4], alfredo: [150, 2.5, 5, 13.5, 0], gravy: [50, 1.5, 5.5, 2.3, 0.3],
  granola: [471, 10, 64, 20, 7], english_muffin: [227, 8.9, 44.2, 1.7, 3.5], applesauce: [68, 0.2, 17.5, 0.2, 1.2], seaweed: [35, 5.8, 5.1, 0.3, 0.3],
  spirits: [231, 0, 0, 0, 0], coleslaw_mix: [27, 1.2, 6.2, 0.1, 2.4], green_chiles: [21, 0.7, 4.6, 0.3, 1.7],
  // Seasonings contribute next to nothing at recipe quantities.
  salt: [0, 0, 0, 0, 0], pepper: [251, 10.4, 64, 3.3, 25.3], spice: [280, 11, 55, 9, 28], thyme: [101, 5.6, 24.5, 1.7, 14], rosemary: [131, 3.3, 20.7, 5.9, 14.1], water: [0, 0, 0, 0, 0],
};

/**
 * Total nutrients of a parsed ingredient list, or null when too much of it is unknown.
 * A recipe qualifies only if every protein and at least 85 % of its quantified lines
 * are recognised, weighed and present in the table.
 */
export function computeNutrition(ings, isProtein) {
  let known = 0;
  let relevant = 0;
  const t = [0, 0, 0, 0, 0];
  for (const l of ings) {
    if (l.nq) continue; // "salt to taste", "oil for the pan": no quantity to count
    const n = l.ing && NUTRITION[l.ing];
    const light = l.ing === 'salt' || l.ing === 'water' || l.ing === 'spice' || l.ing === 'pepper';
    if (!n || l.g == null) {
      if (isProtein(l.ing)) return null;
      if (!light) relevant++;
      continue;
    }
    if (!light) { relevant++; known++; }
    for (let i = 0; i < 5; i++) t[i] += (l.g * n[i]) / 100;
  }
  if (relevant < 3 || known / relevant < 0.85) return null;
  return { kcal: t[0], protein: t[1], carbs: t[2], fat: t[3], fiber: t[4] };
}
