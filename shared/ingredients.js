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
// su    = grams for one unit as SOLD when it differs (a garlic bulb, a bunch of green onions)
// ru    = grams for one bare unit in a RECIPE when it differs from the store unit
//         ("4 bacon" = 4 slices, but bacon sold "each" = a 375 g pack)
// pa    = price as another ingredient (chicken, beef and vegetable broth sell at one price)
// free  = costs nothing (water)
// Every weight conversion is an estimate, which is why the UI labels costs as estimates.

const rows = [];
// In a synonym list, ";" separates MEMBERS of a group: foods that share an aisle, a density
// and nutrition but are different products with different prices (peach ; plum ; apricot).
// A member is never priced as another one. A member starting with "*" is the generic name
// ("nuts", "white fish"): a recipe that asks for it accepts any member.
const I = (id, fr, en, cat, syn, o = {}) => {
  // A member is identified by its first name ("peach~prune"), never by its position, so the
  // price history stays valid when this list is edited.
  const members = syn.split(';').map((m) => { const names = m.replace(/^\*/, '').split('|'); return { generic: m.startsWith('*'), key: names[0].replace(/ /g, '_'), syn: names }; });
  rows.push({ id, fr, en, cat, syn: members.flatMap((m) => m.syn), members, ...o });
};

// ---- Viandes / Meat
I('chicken_breast', 'Poitrine de poulet', 'Chicken breast', 'meat', 'poitrine de poulet|poitrine poulet desossee|chicken breast|blanc de poulet|filet de poulet|chicken tender|chicken cutlet', { d: 0.6, u: 200 });
I('chicken_thigh', 'Haut de cuisse de poulet', 'Chicken thigh', 'meat', 'haut de cuisse de poulet|haut de cuisse|chicken thigh', { d: 0.6, u: 120 });
I('chicken_drumstick', 'Pilons / cuisses de poulet', 'Chicken drumsticks / legs', 'meat', 'cuisse de poulet|chicken leg|chicken pieces|chicken piece|morceaux de poulet|morceau de poulet|chicken leg quarter|bone-in chicken|pilon de poulet|chicken drumstick|pilon|drumstick', { u: 130, fb: 'chicken_thigh' });
I('chicken_whole', 'Poulet entier', 'Whole chicken', 'meat', 'poulet entier|whole chicken|poulet a rotir|roasting chicken', { u: 1600 });
I('chicken_wing', 'Ailes de poulet', 'Chicken wings', 'meat', 'aile de poulet|chicken wing|wingette|wingettes|drummette|drummettes|drummies|aile de poulet coupee', { u: 90 });
I('chicken_ground', 'Poulet haché', 'Ground chicken', 'meat', 'poulet hache|ground chicken', { d: 0.9 });
I('chicken', 'Poulet', 'Chicken', 'meat', 'poulet|chicken|poulet cuit|cooked chicken|volaille|poitrine de volaille|volaille cuite', { d: 0.6, ro: 1, fb: 'chicken_breast', u: 200 });
I('turkey_ground', 'Dinde hachée', 'Ground turkey', 'meat', 'dinde hachee|dindon hache|ground turkey', { d: 0.9, fb: 'chicken_ground' });
I('turkey', 'Dinde', 'Turkey', 'meat', 'dinde|dindon|turkey|poitrine de dinde|turkey breast', { d: 0.6, ro: 1, fb: 'chicken_breast', units: { escalope: 110, tranche: 25 } });
I('beef_ground', 'Bœuf haché', 'Ground beef', 'meat', 'boeuf hache|ground beef|minced beef|beef mince|viande hachee|steak hache', { d: 0.9 });
I('beef_stew', 'Cubes de bœuf à ragoût', 'Stewing beef', 'meat', 'cube de boeuf|boeuf a ragout|boeuf en cube|stewing beef|stew beef|beef stew meat|boeuf a braiser|bison|bison stew meat|cube de bison;palette de boeuf|beef chuck|chuck roast|rosbif|roti de boeuf|beef roast', { d: 0.6 });
I('beef_steak', 'Bifteck', 'Steak', 'meat', '*bifteck|steak;bavette|flank steak;surlonge|sirloin;contre filet|striploin|faux filet;entrecote|ribeye;filet mignon', { u: 250 });
I('beef', 'Bœuf', 'Beef', 'meat', 'boeuf|beef', { d: 0.6, ro: 1, fb: 'beef_stew~cube_de_boeuf' });
I('pork_ground', 'Porc haché', 'Ground pork', 'meat', 'porc hache|ground pork', { d: 0.9 });
I('pork_chop', 'Côtelettes de porc', 'Pork chops', 'meat', 'cotelette de porc|pork chop|pork loin chop|loin chop|cotelette de longe|cotelette de longe de porc|pork rib chop|cotelette de porc desossee', { u: 170 });
I('pork_tenderloin', 'Filet de porc', 'Pork tenderloin', 'meat', 'filet de porc|pork tenderloin', { u: 450 });
I('pork_loin', 'Longe de porc', 'Pork loin', 'meat', 'longe de porc|pork loin|roti de porc|pork roast', { units: { tranche: 25 } });
I('pork_shoulder', 'Épaule de porc', 'Pork shoulder', 'meat', 'epaule de porc|pork shoulder|pork butt|soc de porc|porc effiloche|jambon d epaule|jambon picnic|epaule picnic|picnic ham|picnic shoulder|pork picnic', { d: 0.6 });
I('pork_ribs', 'Côtes levées', 'Pork ribs', 'meat', 'cote levee|pork rib|spare rib|back rib|cotes de dos');
I('pork', 'Porc', 'Pork', 'meat', 'porc|pork', { d: 0.6, ro: 1, fb: 'pork_loin' });
I('bacon', 'Bacon', 'Bacon', 'meat', 'bacon|lardon', { d: 0.5, u: 375, ru: 20, units: { tranche: 20 } });
I('ham', 'Jambon', 'Ham', 'meat', 'jambon|ham', { d: 0.6, units: { tranche: 25 }, ru: 25 });
I('sausage', 'Saucisses', 'Sausages', 'meat', '*saucisse|sausage|saucisse italienne|italian sausage|bratwurst|boudin|saucisse fraiche|saucisse de toulouse|kielbasa;chorizo;merguez', { d: 0.6, u: 90 });
I('duck', 'Canard', 'Duck', 'meat', '*canard|duck;magret|poitrine de canard|duck breast;cuisse de canard|duck leg|canard confit|duck confit', { u: 240 });
I('lamb', 'Agneau', 'Lamb', 'meat', 'agneau|lamb|gigot|mutton|mouton|epaule d agneau|lamb shoulder', { d: 0.6 });
I('veal', 'Veau', 'Veal', 'meat', 'veau|veal|veau hache|ground veal', { d: 0.9, u: 110 });
I('prosciutto', 'Prosciutto', 'Prosciutto', 'meat', 'prosciutto|pancetta', { d: 0.5, units: { tranche: 15 } });
I('pepperoni', 'Pepperoni', 'Pepperoni', 'meat', 'pepperoni;salami|saucisson;mortadelle|mortadella;capicollo;smoked meat|pastrami|viande fumee|corned beef', { d: 0.6, mfb: 1, units: { tranche: 10 } });

// ---- Poissons / Fish
I('salmon', 'Saumon', 'Salmon', 'fish', 'saumon|salmon|filet de saumon|salmon fillet|pave de saumon', { d: 0.6, u: 150 });
I('salmon_smoked', 'Saumon fumé', 'Smoked salmon', 'fish', 'saumon fume|smoked salmon');
I('white_fish', 'Poisson blanc', 'White fish', 'fish', '*poisson blanc|white fish|fish fillet|filet de poisson|boston blue|merlu|hake;morue|cod;aiglefin|haddock;tilapia;sole|plie|plaice;pangasius|basa;goberge|pollock;dore|walleye;fletan|halibut;sebaste|redfish|ocean perch', { d: 0.6, u: 150, mfb: 1 });
I('trout', 'Truite', 'Trout', 'fish', 'truite|trout|truite arc en ciel|rainbow trout|omble|arctic char', { d: 0.6, u: 150 });
I('shrimp', 'Crevettes', 'Shrimp', 'fish', 'crevette|shrimp|prawn', { d: 0.6, u: 12 });
I('tuna_can', 'Thon en conserve', 'Canned tuna', 'pantry', 'thon en conserve|canned tuna|thon pale|thon blanc|flaked tuna|thon|tuna', { d: 0.6, u: 120 });
I('scallop', 'Pétoncles', 'Scallops', 'fish', 'petoncle|scallop', { u: 25 });
I('mussels', 'Moules', 'Mussels', 'fish', 'moule|mussel');
I('sardine', 'Sardines', 'Sardines', 'pantry', 'sardine;anchois|anchovy|anchovies', { u: 4 });

// ---- Œufs & produits laitiers / Eggs & dairy
I('egg', 'Œufs', 'Eggs', 'dairy', 'oeuf|egg|jaune oeuf|egg yolk|blanc oeuf|egg white|oeuf entier|blanc d oeuf|egg whites|liquid egg|oeufs liquides', { u: 55, pk: 12, d: 1.03 });
I('milk', 'Lait', 'Milk', 'dairy', 'lait|milk|lait 2%|lait entier|whole milk|lait 3,25%|lait ecreme', { d: 1.03, units: { filet: 15 } });
I('cream_35', 'Crème 35 %', 'Whipping cream', 'dairy', 'creme 35|cream|creme a fouetter|creme a cuisson|whipping cream|heavy cream|cooking cream|creme epaisse|double cream|creme 15|creme champetre|creme', { d: 1 });
I('cream_10', 'Crème 10 %', 'Half-and-half', 'dairy', 'creme 10|creme a cafe|half half|creme legere|light cream|melange laitier|melange laitier pour cuisson|creme de soya|creme vegetale', { d: 1.01 });
I('sour_cream', 'Crème sure', 'Sour cream', 'dairy', 'creme sure|sour cream|soured cream|creme fraiche|creme aigre', { d: 1 });
I('butter', 'Beurre', 'Butter', 'dairy', 'beurre|butter|beurre sale|beurre non sale|unsalted butter|salted butter|ghee|beurre clarifie', { d: 0.96, units: { stick: 113 } });
I('margarine', 'Margarine', 'Margarine', 'dairy', 'margarine', { d: 0.96 });
I('yogurt', 'Yogourt', 'Yogurt', 'dairy', 'yogourt|yogurt|yaourt|yoghurt|yogourt nature|plain yogurt|whole milk yogurt|whole milk plain yogurt', { d: 1.03 });
I('yogurt_greek', 'Yogourt grec', 'Greek yogurt', 'dairy', 'yogourt grec|greek yogurt|greek yoghurt|skyr', { d: 1.05 });
I('cheddar', 'Cheddar', 'Cheddar', 'dairy', 'cheddar|fromage cheddar|cheddar cheese|fromage rape|shredded cheese|monterey jack|colby|tex mex|fromage marbre|marble cheese', { d: 0.45, units: { tranche: 20 } });
I('cheese_curds', 'Fromage en grains', 'Cheese curds', 'dairy', 'fromage en grain|cheese curd|fromage a poutine', { d: 0.5 });
I('mozzarella', 'Mozzarella', 'Mozzarella', 'dairy', 'mozzarella|fromage mozzarella|provolone|mozzarella rapee|shredded mozzarella|whole milk mozzarella|part skim mozzarella|low moisture mozzarella|mozarella|mozzarela', { d: 0.45, units: { tranche: 20 } });
I('bocconcini', 'Bocconcini / mozzarella fraîche', 'Fresh mozzarella', 'dairy', 'bocconcini|burrata|mozzarella fraiche|fresh mozzarella|mozzarella di bufala|perle de mozzarella', { d: 0.9, u: 200 });
I('parmesan', 'Parmesan', 'Parmesan', 'dairy', 'parmesan|parmigiano|romano|pecorino|grana padano', { d: 0.42 });
I('feta', 'Feta', 'Feta', 'dairy', 'feta|fromage feta|cotija|queso fresco|queso cotija|queso blanco', { d: 0.6 });
I('cream_cheese', 'Fromage à la crème', 'Cream cheese', 'dairy', 'fromage a la creme|cream cheese|mascarpone', { d: 0.96 });
I('ricotta', 'Ricotta', 'Ricotta', 'dairy', 'ricotta|whole milk ricotta|part skim ricotta|ricotta au lait entier;cottage|fromage cottage|cottage cheese', { d: 1.03 });
I('swiss', 'Fromage suisse', 'Swiss cheese', 'dairy', 'fromage suisse|swiss cheese|emmental|fontina|comte|manchego|asiago;gruyere;gouda;havarti;jarlsberg;raclette;oka', { d: 0.45, units: { tranche: 20 } });
I('brie', 'Brie / camembert', 'Brie / camembert', 'dairy', 'brie|camembert|fromage a croute fleurie', { d: 0.9, u: 200, units: { tranche: 20 } });
I('goat_cheese', 'Fromage de chèvre', 'Goat cheese', 'dairy', 'fromage de chevre|goat cheese|chevre', { d: 0.9, units: { tranche: 20 } });
I('blue_cheese', 'Fromage bleu', 'Blue cheese', 'dairy', 'fromage bleu|blue cheese|gorgonzola|roquefort|stilton', { d: 0.55 });
I('halloumi', 'Halloumi / paneer', 'Halloumi / paneer', 'dairy', 'halloumi|paneer|fromage a griller|grilling cheese', { d: 0.9 });
I('cheese', 'Fromage', 'Cheese', 'dairy', 'fromage|cheese', { ro: 1, fb: 'cheddar', d: 0.45, units: { tranche: 20 } });
I('tofu', 'Tofu', 'Tofu', 'dairy', 'tofu|tofu ferme|firm tofu|tempeh', { u: 454, d: 0.95 });
I('soy_milk', 'Boisson végétale', 'Plant milk', 'dairy', 'boisson de soya|lait de soya|soy milk;lait amande|almond milk|boisson amande;lait avoine|oat milk|boisson avoine', { d: 1.03 });
I('coconut_milk', 'Lait de coco', 'Coconut milk', 'pantry', 'lait de coco|lait de noix de coco|coconut milk|creme de coco|coconut cream', { d: 0.97, u: 400 });
I('condensed_milk', 'Lait condensé', 'Condensed milk', 'pantry', 'lait condense|condensed milk|lait concentre sucre;lait evapore|evaporated milk|lait concentre', { d: 1.2, u: 370 });

// ---- Légumes / Vegetables
I('onion', 'Oignon', 'Onion', 'produce', 'oignon|onion|oignon jaune|yellow onion|oignon rouge|red onion|oignon blanc|oignon espagnol', { u: 150, d: 0.6 });
I('green_onion', 'Oignon vert', 'Green onion', 'produce', 'oignon vert|green onion|scallion|echalote verte|spring onion|ciboule', { su: 100, u: 15, d: 0.4, units: { branche: 15 } });
I('shallot', 'Échalote française', 'Shallot', 'produce', 'echalote francaise|echalote|shallot|eschallot|eschalot', { u: 40, d: 0.6 });
I('garlic', 'Ail', 'Garlic', 'produce', 'ail|garlic|gousse ail|garlic clove|ail hache|minced garlic|clove garlic|clove of garlic', { su: 50, u: 5, d: 0.6, units: { gousse: 5, tete: 45 }, pk: 9 });
I('ginger', 'Gingembre', 'Ginger', 'produce', 'gingembre|ginger|gingembre frais|fresh ginger', { units: { tranche: 5, len: 10 }, u: 15, d: 0.5 });
I('carrot', 'Carottes', 'Carrots', 'produce', 'carotte|carrot', { u: 70, d: 0.55 });
I('celery', 'Céleri', 'Celery', 'produce', 'celeri|celery', { u: 500, ru: 50, d: 0.45, units: { stick: 50, branche: 50 } });
I('potato', 'Pommes de terre', 'Potatoes', 'produce', 'pomme de terre|potato|patate|grelot|baby potato|pomme de terre rouge|russet|yukon gold|hash brown|hash browns|galette de pomme de terre|patate rissolee|pomme de terre rissolee', { u: 200, d: 0.65 });
I('sweet_potato', 'Patate douce', 'Sweet potato', 'produce', 'patate douce|sweet potato|yam', { u: 250, d: 0.6 });
I('tomato', 'Tomates', 'Tomatoes', 'produce', 'tomate|tomato|tomate italienne|roma tomato|tomate sur vigne', { u: 120, d: 0.75, units: { tranche: 20 } });
I('cherry_tomato', 'Tomates cerises', 'Cherry tomatoes', 'produce', 'tomate cerise|cherry tomato|tomate raisin|grape tomato|tomate cocktail|tomates cocktail|cocktail tomato|tomate raisin|grape tomato', { u: 15, d: 0.6 });
I('bell_pepper', 'Poivron', 'Bell pepper', 'produce', 'poivron|bell pepper|poivron rouge|red pepper|poivron vert|green pepper|piment doux|sweet pepper|poivron jaune|poivron orange|capsicum|red capsicum|green capsicum', { su: 180, u: 150, d: 0.55 });
I('mini_pepper', 'Mini-poivrons', 'Mini sweet peppers', 'produce', 'mini poivron|poivron miniature|mini sweet pepper|mini pepper|mini bell pepper|sweet mini pepper', { u: 25, d: 0.55, fb: 'bell_pepper' });
I('hot_pepper', 'Piment fort', 'Hot pepper', 'produce', '*piment fort|chillies|chilies|chilly|green chili|chili pepper|red chili|hot pepper|chilli|red chilli|green chilli|chili rouge|fresno|hatch chile|hatch chiles|piment frais|piment fort frais;jalapeno|jalapeño pepper;piment thai|thai chili|piment oiseau|bird eye chili;serrano;habanero', { u: 15, d: 0.5 });
I('cucumber', 'Concombre', 'Cucumber', 'produce', 'concombre|cucumber|concombre anglais|english cucumber|concombre libanais', { u: 300, d: 0.55, units: { tranche: 8 } });
I('mini_cucumber', 'Mini-concombres', 'Mini cucumbers', 'produce', 'mini concombre|mini cucumber|concombre libanais|lebanese cucumber|persian cucumber|concombre perse|cocktail cucumber', { u: 100, d: 0.55, fb: 'cucumber' });
I('zucchini', 'Courgette', 'Zucchini', 'produce', 'courgette|zucchini|courgette jaune|courge jaune|yellow squash|summer squash|yellow zucchini|zoodles|zucchini noodles|courgette en spirale|spiralized zucchini', { u: 200, d: 0.55 });
I('eggplant', 'Aubergine', 'Eggplant', 'produce', 'aubergine|eggplant', { u: 450, d: 0.35, units: { tranche: 30 } });
I('broccoli', 'Brocoli', 'Broccoli', 'produce', 'brocoli|broccoli|broccolini|brocolini|tige de brocoli|broccoli stem', { su: 350, u: 450, d: 0.3 });
I('cauliflower', 'Chou-fleur', 'Cauliflower', 'produce', 'chou fleur|cauliflower|cauliflower rice|riz de chou fleur|chou fleur en riz', { u: 800, d: 0.45 });
I('cabbage', 'Chou', 'Cabbage', 'produce', 'chou|cabbage|chou vert|green cabbage|chou rouge|red cabbage|chou de savoie|chou nappa|napa cabbage|chou chinois', { u: 1000, d: 0.3, units: { feuille: 30 } });
I('brussels', 'Choux de Bruxelles', 'Brussels sprouts', 'produce', 'chou de bruxelles|brussels sprout', { u: 20, d: 0.4 });
I('kale', 'Chou frisé (kale)', 'Kale', 'produce', 'kale|chou frise|chou kale|cavolo nero|lacinato|dinosaur kale|collard|collards|collard greens|pissenlit|dandelion greens|chou cavalier;bette a carde|swiss chard;rapini', { su: 250, u: 200, d: 0.07, units: { feuille: 20, poignee: 30 } });
I('spinach', 'Épinards', 'Spinach', 'produce', '*epinard|spinach|bebe epinard|baby spinach|jeune epinard|epinard frais|fresh spinach;roquette|arugula|rocket;cresson|watercress;microgreen|micropousse', { u: 300, d: 0.13, units: { feuille: 2, poignee: 30 } });
I('spinach_frozen', 'Épinards surgelés', 'Frozen spinach', 'frozen', 'epinard surgele|frozen spinach|epinard hache|chopped spinach|epinard congele|epinard hache surgele', { d: 0.6, u: 300 });
I('lettuce', 'Laitue', 'Lettuce', 'produce', 'laitue|lettuce|pomme de laitue|tete de laitue|laitue romaine|romaine|laitue iceberg|iceberg|laitue boston|coeur de romaine|laitue frisee|laitue en feuille|shredded lettuce', { u: 450, d: 0.2, units: { feuille: 15, poignee: 30 } });
I('salad_mix', 'Mélange de laitues', 'Salad mix', 'produce', 'mesclun|salad mix|spring mix|mixed greens|salad greens|melange printanier|melange de laitue|baby greens|jeune pousse|mixed salad greens|baby lettuce|mache|chicoree|endive|frisee|scarole|radicchio|trevise|greens|leafy greens|verdure', { d: 0.12, u: 142, units: { poignee: 25 } });
I('mushroom', 'Champignons', 'Mushrooms', 'produce', 'champignon|mushroom|champignon blanc|cremini|champignon de paris|portobello|shiitake|pleurote', { u: 18, d: 0.3 });
I('leek', 'Poireau', 'Leek', 'produce', 'poireau|leek', { u: 250, d: 0.4, pk: 3 });
I('corn', 'Maïs', 'Corn', 'produce', 'mais|corn|mais en grain|corn kernel|epi de mais|corn on the cob|mais sucre|sweet corn|sweetcorn', { u: 250, ru: 150, d: 0.65 });
I('peas', 'Petits pois', 'Peas', 'frozen', 'petit pois|pois vert|green pea|peas|pois surgele|frozen pea;pois mange tout|snow pea|pois sucre|sugar snap', { d: 0.6, ru: 3 });
I('green_beans', 'Haricots verts', 'Green beans', 'produce', 'haricot vert|green bean|haricot jaune|feve verte', { d: 0.45, u: 6 });
I('asparagus', 'Asperges', 'Asparagus', 'produce', 'asperge|asparagus', { su: 450, u: 20, d: 0.55, units: { branche: 20 } });
I('squash', 'Courge', 'Squash', 'produce', '*courge|squash|kabocha|courge kabocha|potimarron|delicata|courge delicata;courge musquee|butternut;courge spaghetti|spaghetti squash;citrouille|pumpkin;courge poivree|acorn squash', { u: 1100, d: 0.6 });
I('beet', 'Betteraves', 'Beets', 'produce', 'betterave|beet|beetroot', { u: 150, d: 0.6 });
I('turnip', 'Navet / rutabaga', 'Turnip / rutabaga', 'produce', 'navet|turnip|rutabaga|jicama|jicamas;panais|parsnip;celeri rave|celeriac', { u: 400, d: 0.6 });
I('radish', 'Radis', 'Radish', 'produce', 'radis|radish|daikon', { su: 250, u: 15, d: 0.5 });
I('fennel', 'Fenouil', 'Fennel', 'produce', 'fenouil|fennel|bulbe de fenouil', { u: 250, d: 0.4 });
I('bok_choy', 'Bok choy', 'Bok choy', 'produce', 'bok choy|pak choi|bok choi', { u: 150, d: 0.3 });
I('bean_sprouts', 'Fèves germées', 'Bean sprouts', 'produce', 'feve germee|bean sprout|germe de soya', { d: 0.4 });
I('avocado', 'Avocat', 'Avocado', 'produce', 'avocat|avocado', { u: 170, d: 0.6 });
I('frozen_veg', 'Légumes surgelés', 'Frozen vegetables', 'frozen', 'legume surgele|frozen vegetable|frozen veggie|frozen veggies|mixed veggie|mixed veggies|mixed frozen veggie|mixed frozen veggies|mixed frozen vegetable|legumes melanges surgeles|macedoine|mixed vegetable|legume congele|edamame|stir fry vegetable|stir fry vegetables|stir fry veggies|melange de legumes|melange de legumes surgeles|legumes a sauter|legumes de style italien|vegetable|vegetables|veggie|veggies|legume|legumes|legumes au choix|legumes de saison|garden vegetable|garden vegetables|root vegetable|root vegetables|seasonal vegetable|seasonal veggies|legumes racines|chopped vegetables', { d: 0.6 });

// ---- Fines herbes / Herbs
I('parsley', 'Persil', 'Parsley', 'produce', 'persil|parsley|persil frais|persil plat|persil italien|herbes fraiches|fresh herbs|herbes hachees|herbes fraiches hachees|soft herbs|chopped herbs|mixed fresh herbs|fines herbes fraiches', { u: 60, d: 0.25, units: { branche: 2, poignee: 10 } });
I('cilantro', 'Coriandre fraîche', 'Cilantro', 'produce', 'coriandre fraiche|cilantro|fresh coriander|coriandre|coriander', { su: 80, u: 60, d: 0.2, units: { branche: 2, poignee: 10, feuille: 0.3 } });
I('basil', 'Basilic', 'Basil', 'produce', 'basilic|basil|basilic frais|fresh basil', { u: 30, d: 0.1, units: { branche: 3, feuille: 0.5, poignee: 8 } });
I('dill', 'Aneth', 'Dill', 'produce', 'aneth|dill', { su: 60, u: 30, d: 0.1, units: { feuille: 0.3, branche: 2 } });
I('mint', 'Menthe', 'Mint', 'produce', 'menthe|mint|menthe fraiche', { su: 60, u: 30, d: 0.1, units: { branche: 2, feuille: 0.3, poignee: 8 } });
I('chives', 'Ciboulette', 'Chives', 'produce', 'ciboulette|chive', { u: 25, d: 0.2 });
I('thyme', 'Thym', 'Thyme', 'spices', 'thym|thyme', { d: 0.2, units: { branche: 1 } });
I('rosemary', 'Romarin', 'Rosemary', 'spices', 'romarin|rosemary', { d: 0.2, units: { branche: 2 } });

// ---- Fruits
I('lemon', 'Citron', 'Lemon', 'produce', 'citron|lemon|jus de citron|lemon juice|zeste de citron|lemon zest', { units: { tranche: 8, quartier: 13 }, u: 100, d: 1 });
I('lime', 'Lime', 'Lime', 'produce', 'lime|jus de lime|lime juice|citron vert', { units: { quartier: 8 }, u: 65, d: 1 });
I('orange', 'Orange', 'Orange', 'produce', 'orange;clementine|mandarine|mandarin|tangerine', { u: 180, d: 1 });
I('orange_juice', "Jus d'orange", 'Orange juice', 'dairy', 'jus orange|orange juice', { d: 1.04 });
I('apple', 'Pommes', 'Apples', 'produce', 'pomme|apple|pomme mcintosh|pomme cortland|pomme gala|granny smith|honeycrisp', { u: 180, d: 0.5 });
I('banana', 'Bananes', 'Bananas', 'produce', 'banane|banana', { u: 120, d: 0.9 });
I('strawberry', 'Fraises', 'Strawberries', 'produce', 'fraise|strawberry', { u: 15, d: 0.6 });
I('blueberry', 'Bleuets', 'Blueberries', 'produce', 'bleuet|blueberry|myrtille', { d: 0.62 });
I('raspberry', 'Framboises', 'Raspberries', 'produce', 'framboise|raspberry;mure|blackberry', { d: 0.52 });
I('frozen_fruit', 'Fruits surgelés', 'Frozen fruit', 'frozen', 'fruit surgele|frozen fruit|petit fruit surgele|frozen berry|fruit congele|baie surgelee|mixed berry|petit fruit|fruit|fruits|fruit frais|fruits frais|fresh fruit|fruits de saison|seasonal fruit|berries|baies|petits fruits frais|mixed fruit|fruits au choix|fruits secs au choix', { d: 0.6 });
I('cranberry', 'Canneberges', 'Cranberries', 'produce', 'canneberge sechee|dried cranberry|craisins|craisin;canneberge|cranberry|canneberge fraiche|fresh cranberry', { d: 0.45 });
I('grape', 'Raisins', 'Grapes', 'produce', 'raisin rouge|raisin vert|grape|raisin frais|raisin sans pepin', { d: 0.6, u: 5 });
I('pear', 'Poires', 'Pears', 'produce', 'poire|pear', { u: 170, d: 0.6 });
I('peach', 'Pêches', 'Peaches', 'produce', 'peche|peach;nectarine;prune|plum;abricot|apricot', { u: 140, d: 0.65 });
I('mango', 'Mangue', 'Mango', 'produce', 'mangue|mango', { u: 300, d: 0.65 });
I('pineapple', 'Ananas', 'Pineapple', 'produce', 'ananas|pineapple', { u: 1500, d: 0.65, units: { tranche: 40 } });
I('melon', 'Melon', 'Melon', 'produce', 'cantaloup|cantaloupe|melon;melon eau|watermelon|pasteque;melon miel|honeydew', { u: 1500, d: 0.65 });
I('kiwi', 'Kiwi', 'Kiwi', 'produce', 'kiwi', { u: 75, d: 0.7 });
I('grapefruit', 'Pamplemousse', 'Grapefruit', 'produce', 'pamplemousse|grapefruit|pomelo', { u: 300, d: 1 });
I('raisins', 'Raisins secs', 'Raisins', 'pantry', 'raisin sec|raisins|sultana|dried fruit|dried fruits|fruits seches|fruit seche|mixed dried fruit|fruits seches au choix;datte|medjool;figue|fig;pruneau|prune seche', { d: 0.65, u: 20 });

// ---- Pâtes, grains, boulangerie / Pasta, grains, bakery
I('pasta', 'Pâtes alimentaires', 'Pasta', 'pantry', 'pate alimentaire|pasta|spaghetti|penne|macaroni|fusilli|linguine|fettuccine|rigatoni|farfalle|orzo|lasagne|lasagna|spaghettini|rotini|tagliatelle|coquille|pasta shell|nouille aux oeufs|egg noodle|pates alimentaires|pasta noodle|pasta noodles|lasagna noodle|nouille a lasagne|bucatini|pappardelle|pappardelles|fettucine|gemelli|vermicelle|vermicelli|pates courtes|coquille geante|tagliatelles|cavatappi|ziti|conchiglie|pate seche|pates seches|linguini|capellini|cheveux d ange|angel hair|ditalini|pastina|pates fraiches|pate fraiche|fresh pasta|whole grain shells|pates de ble entier;ravioli|raviolis|tortellini|tortellinis|pates farcies|agnolotti;gnocchi|gnocchis|potato gnocchi|gnocchi de pomme de terre', { d: 0.42, ru: 20 });
I('rice_noodle', 'Nouilles de riz', 'Rice noodles', 'pantry', '*nouille|noodle|nouille chinoise|chow mein|lo mein|nouille instantanee|instant noodle;nouille de riz|rice noodle|vermicelle de riz|rice vermicelli;nouille ramen|ramen noodle|ramen;nouille soba|soba;nouille udon|udon', { d: 0.4, units: { nid: 70 } });
I('rice', 'Riz', 'Rice', 'pantry', 'riz|rice|riz blanc|white rice|riz basmati|basmati|riz jasmin|jasmine rice|riz a grain long|long grain rice|riz brun|brown rice|riz arborio|arborio', { d: 0.8 });
I('quinoa', 'Quinoa', 'Quinoa', 'pantry', 'quinoa;couscous;boulgour|bulgur;orge|barley;farro;millet', { d: 0.75 });
I('oats', "Flocons d'avoine", 'Rolled oats', 'pantry', 'flocon avoine|rolled oat|gruau|oatmeal|avoine|oats|quick oat', { d: 0.38 });
I('flour', 'Farine', 'Flour', 'pantry', 'farine|flour|farine tout usage|all purpose flour|farine de ble|farine non blanchie|bread flour|farine a pain|whole wheat flour|farine de ble entier', { d: 0.53 });
I('cornstarch', 'Fécule de maïs', 'Cornstarch', 'pantry', 'fecule de mais|cornstarch|corn starch|cornflour|fecule', { d: 0.54 });
I('cornmeal', 'Semoule de maïs', 'Cornmeal', 'pantry', 'semoule de mais|corn meal|cornmeal|polenta|semoule', { d: 0.65 });
I('bread', 'Pain', 'Bread', 'bakery', 'pain|bread|pain tranche|sliced bread|pain de ble|pain blanc|baguette|pain croute|ciabatta|pain au levain|sourdough', { u: 675, units: { tranche: 35 } });
I('buns', 'Pains à burger / hot-dog', 'Buns', 'bakery', 'pain a hamburger|pain hamburger|pain a panini|pain panini|panini bread|pain kaiser individuel|pain a sous marin|burger bun|hamburger bun|pain a hot dog|hot dog bun|pain kaiser|brioche bun|petit pain|bun|roll|pain sous marin|pain a burger|pain brioche|pain brioche a burger|kaiser|sub bun|hoagie roll|croissant|panini|dinner roll|buns', { u: 60, pk: 8 });
I('tortilla', 'Tortillas', 'Tortillas', 'bakery', 'tortilla|wrap|flour tortilla|tortilla de ble|tortilla de farine|whole wheat tortilla|tacos souples|taco souple|tacos souple|soft taco|tortilla souple;tortilla de mais|corn tortilla|tortilla au mais|taco shell|coquille a taco;pita|pita bread|pain pita|pita pocket;pain naan|naan;pain plat|flatbread|chapati', { u: 50, pk: 8 });
I('breadcrumbs', 'Chapelure', 'Breadcrumbs', 'pantry', 'chapelure|breadcrumb|bread crumb|panko', { d: 0.45 });
I('pie_crust', 'Pâte à tarte / feuilletée', 'Pie / puff pastry', 'frozen', 'pate a tarte|pie crust|pate brisee|croute a tarte|croute a tartelette|tartelette|fond de tarte|pate filo|filo|fillo|feuille de filo;pate feuilletee|puff pastry;pate a pizza|pizza dough;pate phyllo|phyllo', { units: { feuille: 225 }, u: 400 });
I('crackers', 'Craquelins', 'Crackers', 'pantry', 'craquelin|cracker|biscuit soda;graham|chapelure graham|biscuit graham', { d: 0.4, u: 5 });
I('yeast', 'Levure', 'Yeast', 'pantry', 'levure|yeast|levure instantanee|instant yeast|levure seche', { d: 0.6, u: 8 });
I('baking_powder', 'Poudre à pâte', 'Baking powder', 'pantry', 'poudre a pate|baking powder|levure chimique', { d: 0.9 });
I('baking_soda', 'Bicarbonate de soude', 'Baking soda', 'pantry', 'bicarbonate de soude|baking soda|bicarbonate', { d: 0.9 });

// ---- Légumineuses, noix / Legumes, nuts
I('chickpeas', 'Pois chiches', 'Chickpeas', 'pantry', 'pois chiche|chickpea|garbanzo', { d: 0.68, u: 400 });
I('black_beans', 'Haricots noirs', 'Black beans', 'pantry', 'haricot noir|black bean|feve noire', { d: 0.72, u: 400 });
I('kidney_beans', 'Haricots rouges', 'Kidney beans', 'pantry', 'haricot rouge|kidney bean|feve rouge|red kidney|red kidney bean;haricot pinto|pinto bean;haricot romain', { d: 0.72, u: 400 });
I('white_beans', 'Haricots blancs', 'White beans', 'pantry', 'haricot blanc|white bean|cannellini|navy bean|feve blanche|haricot bean|cannelini|canellini|cannelinni;feve au lard|baked bean;haricot de lima|lima bean|butter bean|feve de lima;legumineuse|mixed bean', { d: 0.72, u: 400 });
I('lentils', 'Lentilles', 'Lentils', 'pantry', 'lentille|lentil|lentille verte|lentille rouge|red lentil|lentille corail|urad dal|masoor dal|toor dal|chana dal|moong dal|dhal;pois casse|split pea', { d: 0.8 });
I('peanut_butter', "Beurre d'arachide", 'Peanut butter', 'pantry', '*beurre de noix|nut butter|seed butter|nutella|tartinade aux noisettes|hazelnut spread|tartinade choco noisette|tartinade au chocolat;beurre arachide|peanut butter;beurre amande|almond butter;tahini|tahini beurre de sesame', { d: 1.08 });
I('peanuts', 'Arachides', 'Peanuts', 'pantry', 'arachide|peanut|cacahuete', { d: 0.6 });
I('almonds', 'Amandes', 'Almonds', 'pantry', 'amande|almond|amande effilee|sliced almond|poudre amande|almond flour', { d: 0.55 });
I('walnuts', 'Noix', 'Walnuts / nuts', 'pantry', '*noix|nuts;noix de grenoble|walnut;pacane|pecan;noix de cajou|cashew;noisette|hazelnut;pistache|pistachio;noix de pin|pine nut', { d: 0.5 });
I('seeds', 'Graines', 'Seeds', 'pantry', 'graine de sesame|sesame seed;graine de tournesol|sunflower seed;graine de citrouille|pumpkin seed|pepitas;graine de chia|chia;graine de lin|flax|flaxseed|flaxmeal|flax meal|golden flaxmeal|lin moulu|graine de lin moulue|ground flaxseed;chanvre|hemp;graine de pavot|poppy seed|poppyseed', { d: 0.6 });
I('coconut', 'Noix de coco râpée', 'Shredded coconut', 'pantry', 'noix de coco|coconut|noix de coco rapee|shredded coconut', { d: 0.35 });

// ---- Conserves, sauces, condiments
I('canned_tomato', 'Tomates en conserve', 'Canned tomatoes', 'pantry', 'tomate en conserve|canned tomato|tomate en des|tomate en des en conserve|boite de tomate|diced tomato|can of tomato|can tomato|tinned tomato|chopped tomato|tomate broyee|crushed tomato|tomate entiere|whole tomato|tomate italienne en conserve|passata|coulis de tomate|tomato puree|puree de tomate|tomate concassee|rotel|ro tel', { d: 1.03, u: 796 });
I('tomato_paste', 'Pâte de tomates', 'Tomato paste', 'pantry', 'pate de tomate|tomato paste|concentre de tomate', { d: 1.1, u: 156 });
I('tomato_sauce', 'Sauce tomate', 'Tomato sauce', 'pantry', 'sauce tomate|tomato sauce|sauce marinara|marinara|sauce pour pate|pasta sauce|sauce a spaghetti|sauce a pizza|pizza sauce|sauce arrabbiata|sauce rosee|enchilada sauce|sauce enchilada|sauce arrabiata', { d: 1.03, u: 650 });
I('sundried_tomato', 'Tomates séchées', 'Sun-dried tomatoes', 'pantry', 'tomate sechee|sun dried tomato|sundried tomato', { d: 0.5 });
I('salsa', 'Salsa', 'Salsa', 'pantry', 'salsa|pico de gallo', { d: 1.05 });
I('broth_chicken', 'Bouillon de poulet', 'Chicken broth', 'pantry', 'bouillon de poulet|chicken broth|chicken stock|fond de volaille|bouillon de volaille', { pa: 'broth_veg', d: 1, fb: 'broth_veg' });
I('broth_beef', 'Bouillon de bœuf', 'Beef broth', 'pantry', 'bouillon de boeuf|beef broth|beef stock|fond de veau|fond de boeuf', { pa: 'broth_veg', d: 1, fb: 'broth_veg' });
I('broth_veg', 'Bouillon de légumes', 'Vegetable broth', 'pantry', 'bouillon de legume|vegetable broth|vegetable stock|bouillon|broth|stock|dashi|fumet de poisson|fumet|glace de viande|fish stock|bouillon de poisson|seafood stock|fond de veau', { d: 1 });
I('olive_oil', "Huile d'olive", 'Olive oil', 'pantry', 'huile olive|olive oil|huile olive extra vierge|extra virgin olive oil', { d: 0.92, units: { filet: 10 } });
I('veg_oil', 'Huile végétale', 'Vegetable oil', 'pantry', '*huile vegetale|vegetable oil|huile de canola|canola oil|huile de tournesol|sunflower oil|huile de pepin de raisin|huile arachide|huile neutre|neutral oil|huile de mais|huile a friture|huile de cuisson|cooking oil|huile|oil;huile avocat|avocado oil', { d: 0.92 });
I('sesame_oil', 'Huile de sésame', 'Sesame oil', 'pantry', 'huile de sesame|sesame oil|sesame seed oil|toasted sesame oil|huile de graines de sesame|huile de sesame grille', { d: 0.92 });
I('coconut_oil', 'Huile de coco', 'Coconut oil', 'pantry', 'huile de coco|huile de noix de coco|coconut oil', { d: 0.92 });
I('vinegar', 'Vinaigre', 'Vinegar', 'pantry', 'vinaigre|vinegar|vinaigre blanc|white vinegar|distilled vinegar;vinaigre de cidre|cider vinegar|apple cider vinegar|vinaigre de cidre de pomme;vinaigre de vin|wine vinegar|red wine vinegar|white wine vinegar|vinaigre de vin rouge|vinaigre de vin blanc|vinaigre de xeres|sherry vinegar;vinaigre de riz|rice vinegar|rice wine vinegar|seasoned rice vinegar;vinaigre balsamique|balsamic|balsamic vinegar', { d: 1.01 });
I('soy_sauce', 'Sauce soya', 'Soy sauce', 'pantry', 'sauce soya|soy sauce|soya sauce|coconut aminos|aminos de coco|aminos|sauce soja|tamari|sauce tamari|dark soy|light soy|dark soy sauce|ponzu|sauce ponzu', { d: 1.15 });
I('fish_sauce', 'Sauce de poisson', 'Fish sauce', 'pantry', 'sauce de poisson|fish sauce;sauce aux huitres|oyster sauce;sauce hoisin|hoisin;sauce teriyaki|teriyaki;mirin|aji mirin|mirin seasoning|sweet cooking rice wine|rice cooking wine', { d: 1.15 });
I('hot_sauce', 'Sauce piquante', 'Hot sauce', 'pantry', 'sauce piquante|hot sauce|tabasco|hot chilli sauce|buffalo sauce|sauce buffalo|red hot|piri piri|sauce piri piri|chilli sauce|chili sauce|chilli paste|chili paste|chili crisp|chilli crisp|chili crunch|chilli bean sauce|doenjang;sriracha;sambal oelek|sambal|chili garlic sauce|sauce chili ail|sauce chili a l ail;gochujang;harissa;pate de cari|curry paste;sauce chili douce|sweet chili sauce|sweet chilli sauce|sauce aigre douce|sweet and sour sauce|sweet sour sauce', { d: 1.1 });
I('worcestershire', 'Sauce Worcestershire', 'Worcestershire sauce', 'pantry', 'sauce worcestershire|worcestershire;sauce bbq|bbq sauce|barbecue sauce|sauce barbecue;fumee liquide|liquid smoke', { d: 1.1 });
I('ketchup', 'Ketchup', 'Ketchup', 'pantry', 'ketchup|sauce chili', { d: 1.15 });
I('mustard', 'Moutarde', 'Mustard', 'pantry', 'moutarde|mustard|moutarde de dijon|dijon|moutarde a l ancienne|moutarde jaune', { d: 1.05 });
I('mayo', 'Mayonnaise', 'Mayonnaise', 'pantry', 'mayonnaise|mayo|mayonaisse|mayonnaise vegane|vegan mayo', { d: 0.92 });
I('hummus', 'Houmous', 'Hummus', 'dairy', 'houmous|hummus|hoummous', { d: 1.05 });
I('kimchi', 'Kimchi / choucroute|wine sauerkraut|kraut|sauerkraut au vin', 'Kimchi / sauerkraut', 'pantry', 'kimchi;choucroute|sauerkraut', { d: 0.6 });
I('dressing', 'Vinaigrette', 'Salad dressing', 'pantry', 'vinaigrette|salad dressing|dressing|caesar dressing|vinaigrette cesar|ranch', { d: 1 });
I('croutons', 'Croûtons', 'Croutons', 'bakery', 'crouton', { d: 0.15 });
I('miso', 'Miso', 'Miso', 'pantry', 'miso|pate de miso|miso paste', { d: 1.1 });
I('pesto', 'Pesto', 'Pesto', 'pantry', 'pesto', { d: 1 });
I('olives', 'Olives', 'Olives', 'pantry', '*olive;olive noire|black olive|kalamata;olive verte|green olive', { d: 0.6, u: 4 });
I('capers', 'Câpres', 'Capers', 'pantry', 'capre|caper', { d: 0.6 });
I('pickles', 'Cornichons', 'Pickles', 'pantry', 'cornichon|pickle|dill pickle|cornichon a l aneth|pickle spear|pepperoncini|peperoncini|piment banane|banana pepper|giardiniera|marinade aux choix|legumes marines|pickled vegetables;relish;oignon marine|pickled onion|silverskin onion|cocktail onion|petit oignon marine', { d: 0.6, u: 30, units: { tranche: 5 } });
I('jam', 'Confiture', 'Jam', 'pantry', '*confiture|jam;gelee|jelly;marmelade|marmalade', { d: 1.3 });
I('wine', 'Vin', 'Wine', 'other', 'vin|wine|vin blanc|white wine|vin rouge|red wine|sake|vin de riz|rice wine|shaoxing|vin de cuisson|cooking wine;biere|beer;cidre|cider;xeres|sherry;porto|port wine', { d: 1, u: 341 });

// ---- Sucre & pâtisserie / Baking
I('sugar', 'Sucre', 'Sugar', 'pantry', 'sucre|sugar|sucre granule|granulated sugar|sucre blanc', { d: 0.85 });
I('brown_sugar', 'Cassonade', 'Brown sugar', 'pantry', 'cassonade|brown sugar|sucre brun|jaggery|sucre de canne brut|panela|sucre muscovado|muscovado|sucre de coco|coconut sugar', { d: 0.9 });
I('icing_sugar', 'Sucre à glacer', 'Icing sugar', 'pantry', 'sucre a glacer|icing sugar|powdered sugar|sucre en poudre|confectioner sugar', { d: 0.5 });
I('maple_syrup', "Sirop d'érable", 'Maple syrup', 'pantry', 'sirop erable|maple syrup|tire d erable|flocon d erable|sucre d erable|maple sugar|beurre d erable', { d: 1.32, units: { filet: 15 } });
I('honey', 'Miel', 'Honey', 'pantry', 'miel|honey;sirop de mais|corn syrup;melasse|molasses|black treacle;sirop agave|agave', { d: 1.4, units: { filet: 15 } });
I('chocolate', 'Chocolat', 'Chocolate', 'pantry', 'chocolat|chocolate|pepite de chocolat|chocolate chip|chocolat noir|dark chocolate|chocolat mi sucre|semi sweet chocolate|chocolat au lait|chocolat blanc|mini oeuf|mini egg|mini oeufs en chocolat|carre de chocolat|chocolate square', { d: 0.7, units: { carre: 10 } });
I('cocoa', 'Cacao', 'Cocoa', 'pantry', 'cacao|cocoa|poudre de cacao|cocoa powder', { d: 0.42 });
I('vanilla', 'Vanille', 'Vanilla', 'pantry', 'vanille|vanilla|extrait de vanille|vanilla extract|essence de vanille', { d: 0.9 });
I('gelatin', 'Gélatine', 'Gelatin', 'pantry', 'gelatine|gelatin|pectine|pectin', { d: 0.6, u: 7 });

// ---- Épices / Spices (flyers rarely carry them; priced only when a real price is found)
I('buttermilk', 'Babeurre', 'Buttermilk', 'dairy', 'babeurre|buttermilk|lait de beurre|kefir|kefir nature|lait fermente', { d: 1.03 });
I('whipped_cream', 'Crème fouettée', 'Whipped cream', 'dairy', 'creme fouettee|whipped cream|garniture fouettee|whipped topping', { d: 0.25 });
I('cooking_spray', 'Enduit à cuisson', 'Cooking spray', 'pantry', 'enduit a cuisson|cooking spray|baking spray|non stick spray|nonstick spray|huile en aerosol', { ro: 1 });
I('pomegranate', 'Grenade', 'Pomegranate', 'produce', 'grenade|pomegranate|pomegranate seed|pomegranate aril|arille de grenade', { u: 280, d: 0.7 });
I('cherries', 'Cerises', 'Cherries', 'produce', 'cerise|cherry|cherries|griotte|tart cherry', { u: 8, d: 0.65 });
I('plantain', 'Plantain', 'Plantain', 'produce', 'plantain|banane plantain', { u: 180, d: 0.9 });
I('lemongrass', 'Citronnelle', 'Lemongrass', 'produce', 'citronnelle|lemongrass|lemongrass paste', { u: 30, d: 0.5, units: { branche: 30 } });
I('horseradish', 'Raifort', 'Horseradish', 'pantry', 'raifort|horseradish|horseradish cream', { d: 1 });
I('guacamole', 'Guacamole', 'Guacamole', 'dairy', 'guacamole', { d: 1 });
I('refried_beans', 'Haricots frits', 'Refried beans', 'pantry', 'haricot frit|refried bean|feve frite', { d: 1, u: 400 });
I('alfredo', 'Sauce Alfredo / béchamel', 'Alfredo / béchamel sauce', 'pantry', 'sauce alfredo|alfredo sauce;sauce bechamel|bechamel', { d: 1.03 });
I('gravy', 'Sauce brune', 'Gravy', 'pantry', 'sauce brune|gravy|sauce a poutine|sauce poutine|sauce hollandaise|hollandaise|sauce bearnaise|bearnaise|sachet de sauce', { d: 1.03 });
I('granola', 'Granola / céréales', 'Granola / cereal', 'pantry', 'granola;cereale|cereal', { d: 0.45 });
I('english_muffin', 'Muffins anglais', 'English muffins', 'bakery', 'muffin anglais|english muffin;bagel', { u: 57, pk: 6 });
I('applesauce', 'Compote de pommes', 'Applesauce', 'pantry', 'compote de pomme|applesauce|apple sauce', { d: 1.05 });
I('seaweed', 'Algues', 'Seaweed', 'pantry', 'nori|algue|seaweed|dulse|wakame|kombu|algue kombu', { d: 0.1, u: 10 });
I('spirits', 'Spiritueux', 'Spirits', 'other', 'bourbon|whisky|whiskey|vodka|rhum|rum|brandy|cognac|gin|tequila|limoncello|liqueur|liqueur de cassis|creme de cassis|triple sec|amaretto|baileys|kahlua|grand marnier|cointreau|tia maria', { d: 0.95, ro: 1 });
I('coleslaw_mix', 'Mélange de salade de chou', 'Coleslaw mix', 'produce', 'melange de salade de chou|coleslaw mix|salade de chou|coleslaw|rainbow salad|broccoli slaw|salade arc en ciel', { d: 0.3, u: 400 });
I('green_chiles', 'Piments verts en conserve', 'Canned green chiles', 'pantry', 'green chile|green chiles|piment vert en conserve|chipotle|chipotle pepper|chipotle peppers|chipotles|piment chipotle|chipotle paste|chipotle in adobo|adobo sauce|sauce adobo|adobo', { ru: 10, d: 1, u: 120 });
I('chips', 'Croustilles', 'Chips', 'pantry', 'croustille|potato chip|chips|tortilla chip|corn chip|nacho chip|nachos|croustille de mais|croustille tortilla', { d: 0.1 });
I('canned_soup', 'Soupe condensée', 'Condensed soup', 'pantry', 'cream of mushroom soup|cream of chicken soup|cream of celery soup|condensed soup|soupe condensee|creme de champignons|creme de poulet|creme de celeri|soupe en conserve|canned soup|soupe a l oignon|french onion soup|soupe aux pois|creme de champignons|cream of mushroom|cream of chicken|creme de poulet', { d: 1.05, u: 284 });
I('ice_cream', 'Crème glacée', 'Ice cream', 'frozen', 'creme glacee|ice cream|gelato|glace a la vanille', { d: 0.55 });
I('salt', 'Sel', 'Salt', 'spices', 'sel|salt|sel de mer|sea salt|sel casher|kosher salt|fleur de sel|gros sel|sel a marinade|pickling salt', { d: 1.2, ro: 1 });
I('pepper', 'Poivre', 'Pepper', 'spices', 'poivre|black pepper|poivre noir|poivre moulu|ground pepper|pepper', { d: 0.45, ro: 1 });
// Added in the pricing audit: foods that recipes name but the list did not cover.
I('rhubarb', 'Rhubarbe', 'Rhubarb', 'produce', 'rhubarbe|rhubarb', { u: 100, d: 0.5 });
I('passion_fruit', 'Fruit de la passion', 'Passion fruit', 'produce', 'fruit de la passion|passion fruit|passionfruit|maracuja', { u: 35 });
I('artichoke', "Cœurs d'artichaut", 'Artichoke hearts', 'pantry', "coeur d artichaut|artichoke heart|artichaut|artichoke|artichauts marines|marinated artichoke", { d: 0.7, u: 40 });
I('crab', 'Crabe', 'Crab', 'fish', 'crabe|crab|chair de crabe|crabmeat|crab meat|crab leg|patte de crabe|goberge imitation|imitation crab|simili crabe', { d: 0.6 });
I('clams', 'Palourdes', 'Clams', 'fish', 'palourde|clam|myes|mye', { d: 0.6, u: 30 });
I('lobster', 'Homard', 'Lobster', 'fish', 'homard|lobster|chair de homard|lobster meat', { u: 600, d: 0.6 });
I('seafood_mix', 'Mélange de fruits de mer', 'Seafood mix', 'fish', 'fruits de mer|melange de fruits de mer|seafood mix|mixed seafood|frozen seafood', { d: 0.6 });
I('wonton', 'Pâtes à won-ton', 'Wonton wrappers', 'pantry', 'pate won ton|pate a won ton|pates a won ton|pate wonton|wonton wrapper|won ton wrapper|pate a dumpling|pates a dumplings|dumpling wrapper|enveloppe a gyoza|gyoza wrapper|pate a gyoza|egg roll wrapper|pate a egg roll|rice paper|papier de riz|feuille de riz|galette de riz|spring roll wrapper', { u: 8 });
I('marshmallow', 'Guimauves', 'Marshmallows', 'pantry', 'guimauve|marshmallow|mini guimauve|mini marshmallow', { u: 2, d: 0.2 });
I('sweetener', 'Édulcorant', 'Sweetener', 'pantry', 'edulcorant|sweetener|monk fruit|erythritol|erythritol sweetener|stevia|sucralose|splenda|xylitol', { d: 0.8 });
I('coffee_ground', 'Café moulu', 'Ground coffee', 'other', 'cafe moulu|ground coffee|freshly ground coffee|cafe en grain|coffee beans|cafe instantane|instant coffee', { d: 0.35 });
// Brewed coffee is priced by the grounds it takes: about 60 g per litre.
I('coffee', 'Café infusé', 'Brewed coffee', 'other', 'cafe fort|cafe infuse|cafe filtre|cafe prepare|brewed coffee|strong coffee|cold brew|prepared cold brew|espresso|expresso|cafe liquide', { d: 0.06, pa: 'coffee_ground' });
I('bok_choy', 'Bok choy', 'Bok choy', 'produce', 'bok choy|buk choy|pak choi|pak choy|bok choi|baby bok choy|chou pak choi|shanghai bok choy', { u: 150, d: 0.3 });
I('shortening', 'Graisse végétale', 'Shortening', 'pantry', 'graisse vegetale|shortening|crisco|saindoux|lard fondu|lard', { d: 0.9 });
I('baking_mix', 'Préparation pour gâteau / crêpes', 'Cake / pancake mix', 'pantry', 'melange a gateau|cake mix|melange a crepe|melange a crepes et a gaufres|pancake mix|melange a muffin|muffin mix|melange a brownie|brownie mix|pate a biscuit|biscuit dough|cookie dough', { d: 0.5 });
I('salt_pork', 'Lard salé', 'Salt pork', 'meat', 'lard sale|salt pork|lard sale entrelarde|pancetta fumee', { d: 0.6 });
I('tapioca', 'Tapioca', 'Tapioca', 'pantry', 'tapioca|perle de tapioca|tapioca minute|fecule de tapioca|tapioca starch', { d: 0.7 });
I('bran', 'Son de blé / psyllium', 'Bran / psyllium', 'pantry', 'son de ble|wheat bran|son d avoine|oat bran|psyllium|psyllium husk|gomme de xanthane|xanthan gum|xanthane', { d: 0.3 });
I('starter', 'Levain', 'Sourdough starter', 'other', 'levain|sourdough starter|sourdough discard|starter|culture mesophile|mesophilic starter|koji kin', { free: 1, ro: 1 });
I('juice', 'Jus', 'Juice', 'pantry', 'jus de legume|vegetable juice|v8|jus de fruit|fruit juice|jus de pomme|apple juice|jus de raisin|grape juice|jus d ananas|pineapple juice|jus de canneberge|cranberry juice|jus de tomate|tomato juice|jus de mangue|mango juice|jus de clamato|clamato|jus de pamplemousse|grapefruit juice|jus de grenade|pomegranate juice', { d: 1.04 });
I('soup_mix', 'Mélange à soupe', 'Soup mix', 'pantry', 'enveloppe de soupe|sachet de soupe a l oignon|melange a soupe|onion soup mix|soup mix|dry onion soup|sachet de soupe|lipton', { u: 35, d: 0.5 });
I('pumpkin_puree', 'Purée de citrouille', 'Pumpkin purée', 'pantry', 'puree de citrouille|puree de citrouille pure|pumpkin puree|pure pumpkin|canned pumpkin|citrouille en conserve|pumpkin pie filling|garniture a tarte a la citrouille', { d: 1.03 });
I('spice', 'Épices', 'Spices', 'spices', 'cumin|paprika|cannelle|cinnamon|muscade|nutmeg|curcuma|turmeric|cari|curry|poudre de cari|curry powder|garam masala|poudre de chili|chili powder|assaisonnement au chili|flocon de piment|chili flake|red pepper flake|piment de cayenne|cayenne|origan|oregano|herbe de provence|herbes italiennes|italian seasoning|assaisonnement italien|feuille de laurier|bay leaf|bay leaves|laurier|clou de girofle|ground clove|noix de muscade|coriandre moulue|ground coriander|graine de coriandre|poudre ail|garlic powder|poudre oignon|onion powder|sel ail|sel oignon|paprika fume|smoked paprika|gingembre moulu|ground ginger|cardamome|cardamom|piment de la jamaique|allspice|quatre epices|graine de moutarde|mustard seed|moutarde seche|dry mustard|graine de fenouil|fennel seed|carvi|caraway|sumac|zaatar|epice a steak|steak spice|assaisonnement|seasoning|epice|spice|sauge|sage|estragon|tarragon|marjolaine|basilic seche|dried basil|persil seche|dried parsley|thym seche|aneth seche|anis etoile|star anise|safran|saffron|gochugaru|chilli flake|chili broye|flocon de chili|chipotle powder|marjoram|juniper berry|baie de genievre|ras el hanout|black peppercorn|peppercorn|sichuan peppercorn|grain de poivre|nigella seed|fines herbes|herbes salees|mixed herb|arrowroot|peppermint extract|wasabi|piment d espelette|sel de celeri|graine de celeri|clou de girofle|ground cloves|whole cloves|cardamome|cardamom|cardamon|fenugrec|fenugreek|piment d alep|aleppo pepper|poudre de piment|chili mexicain|furikake|gomasio|herbes sechees|dried herbs|italian herb blend|herb blend|poudre cury|piment broye|piment rouge broye|epice a steak|steak spice|epices italiennes|italian seasoning|assaisonnement italien|cajun|old bay|za atar|zaatar|sumac|epices a tacos|taco seasoning|dried chiles|piment seche|piments seches|chile seche|guajillo|ancho|chile ancho', { d: 0.45, ro: 1 });
I('water', 'Eau', 'Water', 'other', 'eau|water|eau froide|eau chaude|eau tiede|eau bouillante|glacon|aquafaba|liquide de pois chiches|chickpea brine', { d: 1, free: 1, ro: 1 });

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
