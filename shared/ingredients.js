// Canonical ingredient dictionary.
//
// This is NOT recipe content: it is the lookup table that lets us line up a recipe's
// ingredient line ("2 poitrines de poulet"), a flyer item ("POITRINES DE POULET 4,99/lb")
// and a Statistics Canada average price ("Chicken breasts, per kilogram").
//
// d     = density in g/ml (to convert cups / tablespoons to grams)  — approximation
// u     = grams for one bare unit ("1 oignon", or one item sold "each") — approximation
// units = grams for named sub-units (gousse, tranche, branche)
// pk    = how many units a flyer item sold "each" normally contains (eggs: 12)
// fb    = id to borrow a price from when this one has none (generic "poulet" -> breast)
// ro    = recipe-only: too vague to be matched against flyer product names
// free  = costs nothing (water)
// Every weight conversion is an estimate, which is why the UI labels costs as estimates.

const rows = [];
const I = (id, fr, en, cat, syn, o = {}) => rows.push({ id, fr, en, cat, syn: syn.split('|'), ...o });

// ---- Viandes / Meat
I('chicken_breast', 'Poitrine de poulet', 'Chicken breast', 'meat', 'poitrine de poulet|poitrine poulet desossee|chicken breast|blanc de poulet|filet de poulet|chicken tender|chicken cutlet', { u: 200 });
I('chicken_thigh', 'Haut de cuisse de poulet', 'Chicken thigh', 'meat', 'haut de cuisse de poulet|haut de cuisse|chicken thigh|cuisse de poulet|chicken leg|pilon de poulet|chicken drumstick|pilon', { u: 120 });
I('chicken_whole', 'Poulet entier', 'Whole chicken', 'meat', 'poulet entier|whole chicken|poulet a rotir|roasting chicken', { u: 1600 });
I('chicken_wing', 'Ailes de poulet', 'Chicken wings', 'meat', 'aile de poulet|chicken wing', { u: 90 });
I('chicken_ground', 'Poulet haché', 'Ground chicken', 'meat', 'poulet hache|ground chicken');
I('chicken', 'Poulet', 'Chicken', 'meat', 'poulet|chicken|poulet cuit|cooked chicken', { ro: 1, fb: 'chicken_breast', u: 200 });
I('turkey_ground', 'Dinde hachée', 'Ground turkey', 'meat', 'dinde hachee|dindon hache|ground turkey');
I('turkey', 'Dinde', 'Turkey', 'meat', 'dinde|dindon|turkey|poitrine de dinde|turkey breast', { ro: 1, fb: 'turkey_ground' });
I('beef_ground', 'Bœuf haché', 'Ground beef', 'meat', 'boeuf hache|ground beef|minced beef|beef mince|viande hachee|steak hache');
I('beef_stew', 'Cubes de bœuf à ragoût', 'Stewing beef', 'meat', 'cube de boeuf|boeuf a ragout|boeuf en cube|stewing beef|stew beef|beef stew meat|beef chuck|chuck roast|palette de boeuf|boeuf a braiser|rosbif|roti de boeuf|beef roast|roti de palette');
I('beef_steak', 'Bifteck', 'Steak', 'meat', 'bifteck|steak|bavette|flank steak|sirloin|surlonge|contre filet|striploin|faux filet|ribeye|entrecote|filet mignon', { u: 250 });
I('beef', 'Bœuf', 'Beef', 'meat', 'boeuf|beef', { ro: 1, fb: 'beef_stew' });
I('pork_ground', 'Porc haché', 'Ground pork', 'meat', 'porc hache|ground pork');
I('pork_chop', 'Côtelettes de porc', 'Pork chops', 'meat', 'cotelette de porc|pork chop', { u: 170 });
I('pork_tenderloin', 'Filet de porc', 'Pork tenderloin', 'meat', 'filet de porc|pork tenderloin', { u: 450 });
I('pork_loin', 'Longe de porc', 'Pork loin', 'meat', 'longe de porc|pork loin|roti de porc|pork roast');
I('pork_shoulder', 'Épaule de porc', 'Pork shoulder', 'meat', 'epaule de porc|pork shoulder|pork butt|soc de porc|porc effiloche');
I('pork_ribs', 'Côtes levées', 'Pork ribs', 'meat', 'cote levee|pork rib|spare rib|back rib|cotes de dos');
I('pork', 'Porc', 'Pork', 'meat', 'porc|pork', { ro: 1, fb: 'pork_loin' });
I('bacon', 'Bacon', 'Bacon', 'meat', 'bacon|lardon', { u: 375, units: { tranche: 20 } });
I('ham', 'Jambon', 'Ham', 'meat', 'jambon|ham', { units: { tranche: 25 } });
I('sausage', 'Saucisses', 'Sausages', 'meat', 'saucisse|sausage|saucisse italienne|italian sausage|chorizo|merguez', { u: 90 });
I('lamb', 'Agneau', 'Lamb', 'meat', 'agneau|lamb|gigot');
I('veal', 'Veau', 'Veal', 'meat', 'veau|veal|veau hache|ground veal');
I('prosciutto', 'Prosciutto', 'Prosciutto', 'meat', 'prosciutto|pancetta', { units: { tranche: 15 } });
I('pepperoni', 'Pepperoni', 'Pepperoni', 'meat', 'pepperoni|salami');

// ---- Poissons / Fish
I('salmon', 'Saumon', 'Salmon', 'fish', 'saumon|salmon|filet de saumon|salmon fillet|pave de saumon', { u: 150 });
I('salmon_smoked', 'Saumon fumé', 'Smoked salmon', 'fish', 'saumon fume|smoked salmon');
I('white_fish', 'Poisson blanc', 'White fish', 'fish', 'morue|cod|aiglefin|haddock|tilapia|sole|pangasius|basa|goberge|pollock|poisson blanc|white fish|fish fillet|filet de poisson|truite|trout|dore|flétan|halibut', { u: 150 });
I('shrimp', 'Crevettes', 'Shrimp', 'fish', 'crevette|shrimp|prawn', { u: 12 });
I('tuna_can', 'Thon en conserve', 'Canned tuna', 'pantry', 'thon en conserve|canned tuna|thon pale|thon blanc|flaked tuna|thon|tuna', { u: 120 });
I('scallop', 'Pétoncles', 'Scallops', 'fish', 'petoncle|scallop');
I('mussels', 'Moules', 'Mussels', 'fish', 'moule|mussel');
I('sardine', 'Sardines', 'Sardines', 'pantry', 'sardine|anchois|anchovy|anchovies');

// ---- Œufs & produits laitiers / Eggs & dairy
I('egg', 'Œufs', 'Eggs', 'dairy', 'oeuf|egg|jaune oeuf|egg yolk|blanc oeuf|egg white', { u: 55, pk: 12 });
I('milk', 'Lait', 'Milk', 'dairy', 'lait|milk|lait 2%|lait entier|whole milk|lait 3,25%|lait ecreme', { d: 1.03 });
I('cream_35', 'Crème 35 %', 'Whipping cream', 'dairy', 'creme 35|creme a fouetter|creme a cuisson|whipping cream|heavy cream|cooking cream|creme epaisse|double cream|creme 15|creme champetre|creme', { d: 1 });
I('cream_10', 'Crème 10 %', 'Half-and-half', 'dairy', 'creme 10|creme a cafe|half half|creme legere|light cream', { d: 1.01 });
I('sour_cream', 'Crème sure', 'Sour cream', 'dairy', 'creme sure|sour cream|creme fraiche|creme aigre', { d: 1 });
I('butter', 'Beurre', 'Butter', 'dairy', 'beurre|butter|beurre sale|beurre non sale|unsalted butter|salted butter', { d: 0.96 });
I('margarine', 'Margarine', 'Margarine', 'dairy', 'margarine', { d: 0.96 });
I('yogurt', 'Yogourt', 'Yogurt', 'dairy', 'yogourt|yogurt|yaourt|yoghurt|yogourt nature|plain yogurt', { d: 1.03 });
I('yogurt_greek', 'Yogourt grec', 'Greek yogurt', 'dairy', 'yogourt grec|greek yogurt|greek yoghurt|skyr', { d: 1.05 });
I('cheddar', 'Cheddar', 'Cheddar', 'dairy', 'cheddar|fromage cheddar|cheddar cheese|fromage rape|shredded cheese|fromage en grain|cheese curd|monterey jack|colby|tex mex', { d: 0.45 });
I('mozzarella', 'Mozzarella', 'Mozzarella', 'dairy', 'mozzarella|fromage mozzarella|bocconcini|provolone', { d: 0.45 });
I('parmesan', 'Parmesan', 'Parmesan', 'dairy', 'parmesan|parmigiano|romano|pecorino|grana padano', { d: 0.42 });
I('feta', 'Feta', 'Feta', 'dairy', 'feta|fromage feta', { d: 0.6 });
I('cream_cheese', 'Fromage à la crème', 'Cream cheese', 'dairy', 'fromage a la creme|cream cheese|mascarpone', { d: 0.96 });
I('ricotta', 'Ricotta', 'Ricotta', 'dairy', 'ricotta|cottage|fromage cottage|cottage cheese', { d: 1.03 });
I('swiss', 'Fromage suisse', 'Swiss cheese', 'dairy', 'fromage suisse|swiss cheese|gruyere|emmental|gouda|havarti|brie|camembert|fromage de chevre|goat cheese|fromage bleu|blue cheese|halloumi|paneer', { d: 0.45, units: { tranche: 20 } });
I('cheese', 'Fromage', 'Cheese', 'dairy', 'fromage|cheese', { ro: 1, fb: 'cheddar', d: 0.45, units: { tranche: 20 } });
I('tofu', 'Tofu', 'Tofu', 'dairy', 'tofu|tofu ferme|firm tofu|tempeh', { u: 454 });
I('soy_milk', 'Boisson végétale', 'Plant milk', 'dairy', 'boisson de soya|lait de soya|soy milk|lait amande|almond milk|boisson amande|lait avoine|oat milk|boisson avoine', { d: 1.03 });
I('coconut_milk', 'Lait de coco', 'Coconut milk', 'pantry', 'lait de coco|lait de noix de coco|coconut milk|creme de coco|coconut cream', { d: 0.97, u: 400 });
I('condensed_milk', 'Lait condensé', 'Condensed milk', 'pantry', 'lait condense|condensed milk|lait evapore|evaporated milk|lait concentre', { d: 1.2, u: 370 });

// ---- Légumes / Vegetables
I('onion', 'Oignon', 'Onion', 'produce', 'oignon|onion|oignon jaune|yellow onion|oignon rouge|red onion|oignon blanc|oignon espagnol', { u: 150, d: 0.6 });
I('green_onion', 'Oignon vert', 'Green onion', 'produce', 'oignon vert|green onion|scallion|echalote verte|spring onion|ciboule', { u: 15, d: 0.4 });
I('shallot', 'Échalote française', 'Shallot', 'produce', 'echalote francaise|echalote|shallot', { u: 40, d: 0.6 });
I('garlic', 'Ail', 'Garlic', 'produce', 'ail|garlic|gousse ail|garlic clove|ail hache|minced garlic|clove garlic|clove of garlic', { u: 5, d: 0.6, units: { gousse: 5 }, pk: 9 });
I('ginger', 'Gingembre', 'Ginger', 'produce', 'gingembre|ginger|gingembre frais|fresh ginger', { u: 15, d: 0.5 });
I('carrot', 'Carottes', 'Carrots', 'produce', 'carotte|carrot', { u: 70, d: 0.55 });
I('celery', 'Céleri', 'Celery', 'produce', 'celeri|celery', { u: 500, d: 0.45, units: { branche: 50 } });
I('potato', 'Pommes de terre', 'Potatoes', 'produce', 'pomme de terre|potato|patate|grelot|baby potato|pomme de terre rouge|russet|yukon gold', { u: 200, d: 0.65 });
I('sweet_potato', 'Patate douce', 'Sweet potato', 'produce', 'patate douce|sweet potato|yam', { u: 250, d: 0.6 });
I('tomato', 'Tomates', 'Tomatoes', 'produce', 'tomate|tomato|tomate italienne|roma tomato|tomate sur vigne', { u: 120, d: 0.75 });
I('cherry_tomato', 'Tomates cerises', 'Cherry tomatoes', 'produce', 'tomate cerise|cherry tomato|tomate raisin|grape tomato', { u: 15, d: 0.6 });
I('bell_pepper', 'Poivron', 'Bell pepper', 'produce', 'poivron|bell pepper|poivron rouge|red pepper|poivron vert|green pepper|piment doux|sweet pepper|poivron jaune|poivron orange', { u: 150, d: 0.55 });
I('hot_pepper', 'Piment fort', 'Hot pepper', 'produce', 'jalapeno|piment fort|chili pepper|piment thai|serrano|habanero|piment oiseau|red chili|green chili', { u: 15, d: 0.5 });
I('cucumber', 'Concombre', 'Cucumber', 'produce', 'concombre|cucumber|concombre anglais|english cucumber|concombre libanais', { u: 300, d: 0.55 });
I('zucchini', 'Courgette', 'Zucchini', 'produce', 'courgette|zucchini', { u: 200, d: 0.55 });
I('eggplant', 'Aubergine', 'Eggplant', 'produce', 'aubergine|eggplant', { u: 450, d: 0.35 });
I('broccoli', 'Brocoli', 'Broccoli', 'produce', 'brocoli|broccoli', { u: 450, d: 0.3 });
I('cauliflower', 'Chou-fleur', 'Cauliflower', 'produce', 'chou fleur|cauliflower', { u: 800, d: 0.45 });
I('cabbage', 'Chou', 'Cabbage', 'produce', 'chou|cabbage|chou vert|green cabbage|chou rouge|red cabbage|chou de savoie|chou nappa|napa cabbage|chou chinois', { u: 1000, d: 0.3 });
I('brussels', 'Choux de Bruxelles', 'Brussels sprouts', 'produce', 'chou de bruxelles|brussels sprout', { u: 20, d: 0.4 });
I('kale', 'Chou frisé (kale)', 'Kale', 'produce', 'kale|chou frise|chou kale|bette a carde|swiss chard|rapini', { u: 200, d: 0.07 });
I('spinach', 'Épinards', 'Spinach', 'produce', 'epinard|spinach|bebe epinard|baby spinach|roquette|arugula', { u: 300, d: 0.13 });
I('lettuce', 'Laitue', 'Lettuce', 'produce', 'laitue|lettuce|laitue romaine|romaine|laitue iceberg|iceberg|mesclun|salad mix|laitue boston|coeur de romaine', { u: 450, d: 0.2 });
I('mushroom', 'Champignons', 'Mushrooms', 'produce', 'champignon|mushroom|champignon blanc|cremini|champignon de paris|portobello|shiitake|pleurote', { u: 18, d: 0.3 });
I('leek', 'Poireau', 'Leek', 'produce', 'poireau|leek', { u: 250, d: 0.4 });
I('corn', 'Maïs', 'Corn', 'produce', 'mais|corn|mais en grain|corn kernel|epi de mais|corn on the cob|mais sucre|sweet corn', { u: 250, d: 0.65 });
I('peas', 'Petits pois', 'Peas', 'frozen', 'petit pois|pois vert|green pea|peas|pois surgele|frozen pea|pois mange tout|snow pea|pois sucre|sugar snap', { d: 0.6 });
I('green_beans', 'Haricots verts', 'Green beans', 'produce', 'haricot vert|green bean|haricot jaune|feve verte', { d: 0.45 });
I('asparagus', 'Asperges', 'Asparagus', 'produce', 'asperge|asparagus', { u: 20, d: 0.55 });
I('squash', 'Courge', 'Squash', 'produce', 'courge|squash|courge musquee|butternut|courge spaghetti|spaghetti squash|citrouille|pumpkin|courge poivree|acorn squash', { u: 1100, d: 0.6 });
I('beet', 'Betteraves', 'Beets', 'produce', 'betterave|beet|beetroot', { u: 150, d: 0.6 });
I('turnip', 'Navet / rutabaga', 'Turnip / rutabaga', 'produce', 'navet|turnip|rutabaga|panais|parsnip|celeri rave|celeriac', { u: 400, d: 0.6 });
I('radish', 'Radis', 'Radish', 'produce', 'radis|radish|daikon', { u: 15, d: 0.5 });
I('fennel', 'Fenouil', 'Fennel', 'produce', 'fenouil|fennel|bulbe de fenouil', { u: 250, d: 0.4 });
I('bok_choy', 'Bok choy', 'Bok choy', 'produce', 'bok choy|pak choi|bok choi', { u: 150, d: 0.3 });
I('bean_sprouts', 'Fèves germées', 'Bean sprouts', 'produce', 'feve germee|bean sprout|germe de soya', { d: 0.4 });
I('avocado', 'Avocat', 'Avocado', 'produce', 'avocat|avocado', { u: 170, d: 0.6 });
I('frozen_veg', 'Légumes surgelés', 'Frozen vegetables', 'frozen', 'legume surgele|frozen vegetable|macedoine|mixed vegetable|legume congele|edamame', { d: 0.6 });

// ---- Fines herbes / Herbs
I('parsley', 'Persil', 'Parsley', 'produce', 'persil|parsley|persil frais|persil plat|persil italien', { u: 60, d: 0.25, units: { branche: 2 } });
I('cilantro', 'Coriandre fraîche', 'Cilantro', 'produce', 'coriandre fraiche|cilantro|fresh coriander|coriandre', { u: 60, d: 0.2, units: { branche: 2 } });
I('basil', 'Basilic', 'Basil', 'produce', 'basilic|basil|basilic frais|fresh basil', { u: 30, d: 0.1, units: { branche: 3 } });
I('dill', 'Aneth', 'Dill', 'produce', 'aneth|dill', { u: 30, d: 0.1, units: { branche: 2 } });
I('mint', 'Menthe', 'Mint', 'produce', 'menthe|mint|menthe fraiche', { u: 30, d: 0.1, units: { branche: 2 } });
I('chives', 'Ciboulette', 'Chives', 'produce', 'ciboulette|chive', { u: 25, d: 0.2 });
I('thyme', 'Thym', 'Thyme', 'spices', 'thym|thyme', { d: 0.2, units: { branche: 1 } });
I('rosemary', 'Romarin', 'Rosemary', 'spices', 'romarin|rosemary', { d: 0.2, units: { branche: 2 } });

// ---- Fruits
I('lemon', 'Citron', 'Lemon', 'produce', 'citron|lemon|jus de citron|lemon juice|zeste de citron|lemon zest', { u: 100, d: 1 });
I('lime', 'Lime', 'Lime', 'produce', 'lime|jus de lime|lime juice|citron vert', { u: 65, d: 1 });
I('orange', 'Orange', 'Orange', 'produce', 'orange|clementine|mandarine|mandarin|tangerine', { u: 180, d: 1 });
I('orange_juice', "Jus d'orange", 'Orange juice', 'dairy', 'jus orange|orange juice', { d: 1.04 });
I('apple', 'Pommes', 'Apples', 'produce', 'pomme|apple|pomme mcintosh|pomme cortland|pomme gala|granny smith|honeycrisp', { u: 180, d: 0.5 });
I('banana', 'Bananes', 'Bananas', 'produce', 'banane|banana', { u: 120, d: 0.9 });
I('strawberry', 'Fraises', 'Strawberries', 'produce', 'fraise|strawberry', { u: 15, d: 0.6 });
I('blueberry', 'Bleuets', 'Blueberries', 'produce', 'bleuet|blueberry|myrtille', { d: 0.62 });
I('raspberry', 'Framboises', 'Raspberries', 'produce', 'framboise|raspberry|mure|blackberry', { d: 0.52 });
I('frozen_fruit', 'Fruits surgelés', 'Frozen fruit', 'frozen', 'fruit surgele|frozen fruit|petit fruit surgele|frozen berry|fruit congele|baie surgelee|mixed berry|petit fruit', { d: 0.6 });
I('cranberry', 'Canneberges', 'Cranberries', 'produce', 'canneberge|cranberry|canneberge sechee|dried cranberry', { d: 0.45 });
I('grape', 'Raisins', 'Grapes', 'produce', 'raisin rouge|raisin vert|grape|raisin frais|raisin sans pepin', { d: 0.6 });
I('pear', 'Poires', 'Pears', 'produce', 'poire|pear', { u: 170, d: 0.6 });
I('peach', 'Pêches', 'Peaches', 'produce', 'peche|peach|nectarine|prune|plum|abricot|apricot', { u: 140, d: 0.65 });
I('mango', 'Mangue', 'Mango', 'produce', 'mangue|mango', { u: 300, d: 0.65 });
I('pineapple', 'Ananas', 'Pineapple', 'produce', 'ananas|pineapple', { u: 1500, d: 0.65 });
I('melon', 'Melon', 'Melon', 'produce', 'melon|cantaloup|cantaloupe|melon eau|watermelon|pasteque|melon miel|honeydew', { u: 1500, d: 0.65 });
I('raisins', 'Raisins secs', 'Raisins', 'pantry', 'raisin sec|raisins|sultana|datte|medjool|figue|fig|pruneau|prune seche', { d: 0.65 });

// ---- Pâtes, grains, boulangerie / Pasta, grains, bakery
I('pasta', 'Pâtes alimentaires', 'Pasta', 'pantry', 'pate alimentaire|pasta|spaghetti|penne|macaroni|fusilli|linguine|fettuccine|rigatoni|farfalle|orzo|lasagne|lasagna|spaghettini|rotini|tagliatelle|coquille|pasta shell|nouille aux oeufs|egg noodle|pates alimentaires', { d: 0.42 });
I('rice_noodle', 'Nouilles de riz', 'Rice noodles', 'pantry', 'nouille de riz|rice noodle|vermicelle de riz|rice vermicelli|nouille ramen|ramen noodle|nouille soba|soba|nouille udon|udon|nouille|noodle', { d: 0.4 });
I('rice', 'Riz', 'Rice', 'pantry', 'riz|rice|riz blanc|white rice|riz basmati|basmati|riz jasmin|jasmine rice|riz a grain long|long grain rice|riz brun|brown rice|riz arborio|arborio', { d: 0.8 });
I('quinoa', 'Quinoa', 'Quinoa', 'pantry', 'quinoa|couscous|boulgour|bulgur|orge|barley|farro|millet', { d: 0.75 });
I('oats', "Flocons d'avoine", 'Rolled oats', 'pantry', 'flocon avoine|rolled oat|gruau|oatmeal|avoine|oats|quick oat', { d: 0.38 });
I('flour', 'Farine', 'Flour', 'pantry', 'farine|flour|farine tout usage|all purpose flour|farine de ble|farine non blanchie|bread flour|farine a pain|whole wheat flour|farine de ble entier', { d: 0.53 });
I('cornstarch', 'Fécule de maïs', 'Cornstarch', 'pantry', 'fecule de mais|cornstarch|corn starch|fecule', { d: 0.54 });
I('cornmeal', 'Semoule de maïs', 'Cornmeal', 'pantry', 'semoule de mais|cornmeal|polenta|semoule', { d: 0.65 });
I('bread', 'Pain', 'Bread', 'bakery', 'pain|bread|pain tranche|sliced bread|pain de ble|pain blanc|baguette|pain croute|ciabatta|pain au levain|sourdough', { u: 675, units: { tranche: 35 } });
I('buns', 'Pains à burger / hot-dog', 'Buns', 'bakery', 'pain a hamburger|pain hamburger|burger bun|hamburger bun|pain a hot dog|hot dog bun|pain kaiser|brioche bun|petit pain|bun|roll|pain sous marin', { u: 60, pk: 8 });
I('tortilla', 'Tortillas', 'Tortillas', 'bakery', 'tortilla|pita|pain naan|naan|wrap|pain plat|flatbread', { u: 50, pk: 8 });
I('breadcrumbs', 'Chapelure', 'Breadcrumbs', 'pantry', 'chapelure|breadcrumb|bread crumb|panko', { d: 0.45 });
I('pie_crust', 'Pâte à tarte / feuilletée', 'Pie / puff pastry', 'frozen', 'pate a tarte|pie crust|pate feuilletee|puff pastry|pate brisee|pate a pizza|pizza dough|pate phyllo|phyllo', { u: 400 });
I('crackers', 'Craquelins', 'Crackers', 'pantry', 'craquelin|cracker|biscuit soda|graham|chapelure graham', { d: 0.4 });
I('yeast', 'Levure', 'Yeast', 'pantry', 'levure|yeast|levure instantanee|instant yeast|levure seche', { d: 0.6, u: 8 });
I('baking_powder', 'Poudre à pâte', 'Baking powder', 'pantry', 'poudre a pate|baking powder|levure chimique', { d: 0.9 });
I('baking_soda', 'Bicarbonate de soude', 'Baking soda', 'pantry', 'bicarbonate de soude|baking soda|bicarbonate', { d: 0.9 });

// ---- Légumineuses, noix / Legumes, nuts
I('chickpeas', 'Pois chiches', 'Chickpeas', 'pantry', 'pois chiche|chickpea|garbanzo', { d: 0.68, u: 400 });
I('black_beans', 'Haricots noirs', 'Black beans', 'pantry', 'haricot noir|black bean|feve noire', { d: 0.72, u: 400 });
I('kidney_beans', 'Haricots rouges', 'Kidney beans', 'pantry', 'haricot rouge|kidney bean|feve rouge|haricot pinto|pinto bean|haricot romain', { d: 0.72, u: 400 });
I('white_beans', 'Haricots blancs', 'White beans', 'pantry', 'haricot blanc|white bean|cannellini|navy bean|feve blanche|feve au lard|baked bean|haricot de lima|lima bean|legumineuse|mixed bean', { d: 0.72, u: 400 });
I('lentils', 'Lentilles', 'Lentils', 'pantry', 'lentille|lentil|lentille verte|lentille rouge|red lentil|lentille corail|pois casse|split pea', { d: 0.8 });
I('peanut_butter', "Beurre d'arachide", 'Peanut butter', 'pantry', 'beurre arachide|peanut butter|beurre amande|almond butter|tahini|tahini beurre de sesame', { d: 1.08 });
I('peanuts', 'Arachides', 'Peanuts', 'pantry', 'arachide|peanut|cacahuete', { d: 0.6 });
I('almonds', 'Amandes', 'Almonds', 'pantry', 'amande|almond|amande effilee|sliced almond|poudre amande|almond flour', { d: 0.55 });
I('walnuts', 'Noix', 'Walnuts / nuts', 'pantry', 'noix de grenoble|walnut|pacane|pecan|noix de cajou|cashew|noisette|hazelnut|pistache|pistachio|noix de pin|pine nut|noix|nuts', { d: 0.5 });
I('seeds', 'Graines', 'Seeds', 'pantry', 'graine de sesame|sesame seed|graine de tournesol|sunflower seed|graine de citrouille|pumpkin seed|graine de chia|chia|graine de lin|flax|chanvre|hemp', { d: 0.6 });
I('coconut', 'Noix de coco râpée', 'Shredded coconut', 'pantry', 'noix de coco|coconut|noix de coco rapee|shredded coconut', { d: 0.35 });

// ---- Conserves, sauces, condiments
I('canned_tomato', 'Tomates en conserve', 'Canned tomatoes', 'pantry', 'tomate en conserve|canned tomato|tomate en des|diced tomato|tomate broyee|crushed tomato|tomate entiere|whole tomato|tomate italienne en conserve|passata|coulis de tomate|tomato puree|puree de tomate|tomate concassee', { d: 1.03, u: 796 });
I('tomato_paste', 'Pâte de tomates', 'Tomato paste', 'pantry', 'pate de tomate|tomato paste|concentre de tomate', { d: 1.1, u: 156 });
I('tomato_sauce', 'Sauce tomate', 'Tomato sauce', 'pantry', 'sauce tomate|tomato sauce|sauce marinara|marinara|sauce pour pate|pasta sauce|sauce a spaghetti|sauce a pizza|pizza sauce|sauce arrabbiata', { d: 1.03, u: 650 });
I('sundried_tomato', 'Tomates séchées', 'Sun-dried tomatoes', 'pantry', 'tomate sechee|sun dried tomato|sundried tomato', { d: 0.5 });
I('salsa', 'Salsa', 'Salsa', 'pantry', 'salsa|pico de gallo', { d: 1.05 });
I('broth_chicken', 'Bouillon de poulet', 'Chicken broth', 'pantry', 'bouillon de poulet|chicken broth|chicken stock|fond de volaille|bouillon de volaille', { d: 1 });
I('broth_beef', 'Bouillon de bœuf', 'Beef broth', 'pantry', 'bouillon de boeuf|beef broth|beef stock|fond de veau|fond de boeuf', { d: 1 });
I('broth_veg', 'Bouillon de légumes', 'Vegetable broth', 'pantry', 'bouillon de legume|vegetable broth|vegetable stock|bouillon|broth|stock|dashi', { d: 1 });
I('olive_oil', "Huile d'olive", 'Olive oil', 'pantry', 'huile olive|olive oil|huile olive extra vierge|extra virgin olive oil', { d: 0.92 });
I('veg_oil', 'Huile végétale', 'Vegetable oil', 'pantry', 'huile vegetale|vegetable oil|huile de canola|canola oil|huile de tournesol|sunflower oil|huile de pepin de raisin|huile arachide|huile avocat|avocado oil|huile neutre|neutral oil|huile de mais|huile a friture|huile de cuisson|cooking oil|huile|oil', { d: 0.92 });
I('sesame_oil', 'Huile de sésame', 'Sesame oil', 'pantry', 'huile de sesame|sesame oil|huile de sesame grille', { d: 0.92 });
I('coconut_oil', 'Huile de coco', 'Coconut oil', 'pantry', 'huile de coco|huile de noix de coco|coconut oil', { d: 0.92 });
I('vinegar', 'Vinaigre', 'Vinegar', 'pantry', 'vinaigre|vinegar|vinaigre blanc|white vinegar|vinaigre de cidre|cider vinegar|vinaigre de vin|wine vinegar|vinaigre de riz|rice vinegar|vinaigre balsamique|balsamic|vinaigre de xeres', { d: 1.01 });
I('soy_sauce', 'Sauce soya', 'Soy sauce', 'pantry', 'sauce soya|soy sauce|sauce soja|tamari|sauce tamari', { d: 1.15 });
I('fish_sauce', 'Sauce de poisson', 'Fish sauce', 'pantry', 'sauce de poisson|fish sauce|sauce aux huitres|oyster sauce|sauce hoisin|hoisin|sauce teriyaki|teriyaki|mirin', { d: 1.15 });
I('hot_sauce', 'Sauce piquante', 'Hot sauce', 'pantry', 'sauce piquante|hot sauce|sriracha|sambal|tabasco|gochujang|harissa|pate de cari|curry paste|sambal oelek', { d: 1.1 });
I('worcestershire', 'Sauce Worcestershire', 'Worcestershire sauce', 'pantry', 'sauce worcestershire|worcestershire|sauce bbq|bbq sauce|barbecue sauce|sauce barbecue|fumee liquide', { d: 1.1 });
I('ketchup', 'Ketchup', 'Ketchup', 'pantry', 'ketchup|sauce chili', { d: 1.15 });
I('mustard', 'Moutarde', 'Mustard', 'pantry', 'moutarde|mustard|moutarde de dijon|dijon|moutarde a l ancienne|moutarde jaune', { d: 1.05 });
I('mayo', 'Mayonnaise', 'Mayonnaise', 'pantry', 'mayonnaise|mayo', { d: 0.92 });
I('pesto', 'Pesto', 'Pesto', 'pantry', 'pesto', { d: 1 });
I('olives', 'Olives', 'Olives', 'pantry', 'olive|olive noire|black olive|olive verte|green olive|kalamata|capre|caper', { d: 0.6 });
I('pickles', 'Cornichons', 'Pickles', 'pantry', 'cornichon|pickle|relish', { d: 0.6, u: 30 });
I('jam', 'Confiture', 'Jam', 'pantry', 'confiture|jam|gelee|jelly|marmelade|tartinade', { d: 1.3 });
I('wine', 'Vin', 'Wine', 'other', 'vin blanc|white wine|vin rouge|red wine|vin|wine|biere|beer|cidre|cider|xeres|sherry|porto', { d: 1 });

// ---- Sucre & pâtisserie / Baking
I('sugar', 'Sucre', 'Sugar', 'pantry', 'sucre|sugar|sucre granule|granulated sugar|sucre blanc', { d: 0.85 });
I('brown_sugar', 'Cassonade', 'Brown sugar', 'pantry', 'cassonade|brown sugar|sucre brun', { d: 0.9 });
I('icing_sugar', 'Sucre à glacer', 'Icing sugar', 'pantry', 'sucre a glacer|icing sugar|powdered sugar|sucre en poudre|confectioner sugar', { d: 0.5 });
I('maple_syrup', "Sirop d'érable", 'Maple syrup', 'pantry', 'sirop erable|maple syrup', { d: 1.32 });
I('honey', 'Miel', 'Honey', 'pantry', 'miel|honey|sirop de mais|corn syrup|melasse|molasses|sirop agave|agave', { d: 1.4 });
I('chocolate', 'Chocolat', 'Chocolate', 'pantry', 'chocolat|chocolate|pepite de chocolat|chocolate chip|chocolat noir|dark chocolate|chocolat mi sucre|semi sweet chocolate|chocolat au lait|chocolat blanc', { d: 0.7 });
I('cocoa', 'Cacao', 'Cocoa', 'pantry', 'cacao|cocoa|poudre de cacao|cocoa powder', { d: 0.42 });
I('vanilla', 'Vanille', 'Vanilla', 'pantry', 'vanille|vanilla|extrait de vanille|vanilla extract|essence de vanille', { d: 0.9 });
I('gelatin', 'Gélatine', 'Gelatin', 'pantry', 'gelatine|gelatin|pectine|pectin', { d: 0.6, u: 7 });

// ---- Épices / Spices (flyers rarely carry them; priced only when a real price is found)
I('salt', 'Sel', 'Salt', 'spices', 'sel|salt|sel de mer|sea salt|sel casher|kosher salt|fleur de sel|gros sel|sel a marinade|pickling salt', { d: 1.2, ro: 1 });
I('pepper', 'Poivre', 'Pepper', 'spices', 'poivre|black pepper|poivre noir|poivre moulu|ground pepper|pepper', { d: 0.45, ro: 1 });
I('spice', 'Épices', 'Spices', 'spices', 'cumin|paprika|cannelle|cinnamon|muscade|nutmeg|curcuma|turmeric|cari|curry|poudre de cari|curry powder|garam masala|poudre de chili|chili powder|assaisonnement au chili|flocon de piment|chili flake|red pepper flake|piment de cayenne|cayenne|origan|oregano|herbe de provence|herbes italiennes|italian seasoning|assaisonnement italien|feuille de laurier|bay leaf|laurier|clou de girofle|ground clove|noix de muscade|coriandre moulue|ground coriander|graine de coriandre|poudre ail|garlic powder|poudre oignon|onion powder|sel ail|sel oignon|paprika fume|smoked paprika|gingembre moulu|ground ginger|cardamome|cardamom|piment de la jamaique|allspice|quatre epices|graine de moutarde|mustard seed|moutarde seche|dry mustard|graine de fenouil|fennel seed|carvi|caraway|sumac|zaatar|epice a steak|steak spice|assaisonnement|seasoning|epice|spice|sauge|sage|estragon|tarragon|marjolaine|basilic seche|dried basil|persil seche|dried parsley|thym seche|aneth seche|anis etoile|star anise|safran|saffron|gochugaru|piment d espelette|sel de celeri|graine de celeri', { d: 0.45, ro: 1 });
I('water', 'Eau', 'Water', 'other', 'eau|water|eau froide|eau chaude|eau tiede|eau bouillante|glacon', { d: 1, free: 1, ro: 1 });

export const INGREDIENTS = rows;
export const ING_BY_ID = Object.fromEntries(rows.map((r) => [r.id, r]));

export const AISLES = {
  produce: { fr: 'Fruits et légumes', en: 'Produce' },
  meat: { fr: 'Viandes', en: 'Meat' },
  fish: { fr: 'Poissons et fruits de mer', en: 'Fish & seafood' },
  dairy: { fr: 'Produits laitiers et œufs', en: 'Dairy & eggs' },
  bakery: { fr: 'Boulangerie', en: 'Bakery' },
  pantry: { fr: 'Garde-manger', en: 'Pantry' },
  frozen: { fr: 'Surgelés', en: 'Frozen' },
  spices: { fr: 'Épices', en: 'Spices' },
  other: { fr: 'Autres', en: 'Other' },
};
