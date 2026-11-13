import React from 'react';
import { useApp } from './store.jsx';

export default function About() {
  const { lang, meta, recipes, flyers, sourceName } = useApp();
  const counts = {};
  for (const r of recipes) counts[r.source] = (counts[r.source] || 0) + 1;
  const src = (meta.sources || []).filter((s) => counts[s.id]);
  const fr = lang !== 'en';
  return (
    <div className="wrap about">
      <h1>{fr ? 'Comment ça marche' : 'How it works'}</h1>
      <h2>{fr ? 'Les recettes' : 'Recipes'}</h2>
      <p>{fr
        ? `Grocerymaxxing est un agrégateur : les ${recipes.length} recettes viennent de sites de recettes, à partir des données structurées (schema.org) que ces sites publient eux-mêmes. Rien n'est inventé ni complété : titre, ingrédients, portions, temps et valeurs nutritives sont repris tels quels, et un champ absent chez la source reste absent ici. Les étapes de préparation ne sont pas copiées : chaque fiche renvoie vers la recette originale.`
        : `Grocerymaxxing is an aggregator: its ${recipes.length} recipes come from recipe sites, read from the structured data (schema.org) those sites publish themselves. Nothing is invented or filled in: title, ingredients, servings, times and nutrition are taken as-is, and a field the source does not provide stays empty here. Preparation steps are not copied: every recipe links back to the original.`}</p>
      <ul className="srcs">{src.map((s) => <li key={s.id}><a href={s.home} target="_blank" rel="noopener noreferrer">{sourceName[s.id]}</a> — {counts[s.id]}</li>)}</ul>
      <h2>{fr ? 'Les circulaires' : 'Flyers'}</h2>
      <p>{fr
        ? `Les circulaires des épiceries du Québec sont téléchargées automatiquement chaque matin (source : ${flyers.source || 'Flipp'}). Choisissez votre région et vos épiceries : seuls leurs rabais sont utilisés pour chiffrer les recettes. La circulaire de la semaine suivante est offerte dès qu'elle est publiée.`
        : `Québec grocery flyers are downloaded automatically every morning (source: ${flyers.source || 'Flipp'}). Pick your region and stores: only their deals are used to cost recipes. Next week's flyer is offered as soon as it is published.`}</p>
      <h2>{fr ? 'Le coût' : 'Cost'}</h2>
      <p>{fr
        ? "Chaque ingrédient a un prix de référence, le même pour toutes les épiceries : le prix courant moyen au Québec publié par Statistique Canada ; sinon une estimation tirée des prix réellement vus en circulaire dans les 26 dernières semaines ; sinon le prix courant du catalogue en ligne de Walmart (une des sept épiceries). Le « prix régulier » annoncé par les épiceries n'est pas utilisé : il gonfle les rabais. La circulaire de votre épicerie ne peut que faire baisser ce prix : une épicerie avec plus de rabais coûte donc toujours moins cher, jamais plus. Un prix de circulaire plus élevé que le prix de référence n'est pas compté comme un rabais. Quand aucun prix n'est connu pour un ingrédient, il est indiqué comme non chiffré et la recette est marquée « prix incomplet » : elle est toujours classée après les recettes au prix complet et n'apparaît jamais dans les idées ni dans le plan. Les assaisonnements sans quantité (« sel au goût ») et les extras facultatifs qu'on ne peut pas chiffrer ne comptent pas. Le coût est calculé au prorata de la quantité utilisée; les conversions (tasses → grammes, « 1 oignon » → grammes) et l'appariement entre ingrédients et produits de circulaire restent approximatifs, et le détail ligne par ligne est toujours affiché."
        : 'Every ingredient has a reference price that is the same for all stores: the average regular price in Québec published by Statistics Canada; otherwise an estimate from flyer prices actually seen over the last 26 weeks; otherwise the everyday price in Walmart\'s online catalogue (one of the seven stores). The "regular price" stores advertise is not used: it inflates discounts. Your store\'s flyer can only lower that price, so a store with more deals always costs less, never more. A flyer price above the reference price is not counted as a deal. When no price is known for an ingredient it is shown as not priced and the recipe is marked "incomplete price": it is always listed after fully priced recipes and never appears in ideas or the plan. Seasonings with no quantity ("salt to taste") and optional extras we cannot price do not count. Cost is prorated to the quantity used; conversions (cups → grams, "1 onion" → grams) and the matching between ingredients and flyer products remain approximate, and the line-by-line detail is always shown.'}</p>
      {meta.baseline?.source && <p className="note">{meta.baseline.source} — {meta.baseline.refDate}. <a href={meta.baseline.url} target="_blank" rel="noopener noreferrer">↗</a></p>}
      <h2>{fr ? 'Le coût par repas' : 'Cost per meal'}</h2>
      <p>{fr
        ? "Une « portion » sur un site de recettes peut être une bouchée de 150 kcal. Pour les plats qui font un repas (plats principaux, soupes, salades, pâtes, sandwichs, déjeuners), le coût est donc donné par repas : la portion de la source est gardée quand elle a la taille d'un repas; sinon la recette est redivisée en repas d'environ 550 kcal (à partir des valeurs publiées) ou d'environ 350 g de nourriture. La fiche indique toujours quand ce calcul a été fait et ce que dit la source. Sauces, conserves, desserts et accompagnements restent chiffrés par portion."
        : 'A "serving" on a recipe site can be a 150-kcal bite. For dishes that make a meal (mains, soups, salads, pasta, sandwiches, breakfasts) the cost is therefore given per meal: the source\'s serving is kept when it is meal-sized; otherwise the recipe is re-divided into meals of about 550 kcal (from the published values) or about 350 g of food. The recipe page always says when this was done and what the source states. Sauces, preserves, desserts and sides stay priced per serving.'}</p>
      <h2>{fr ? 'Les valeurs nutritives' : 'Nutrition'}</h2>
      <p>{fr
        ? "Quand la source publie des valeurs nutritives, ce sont elles qui sont affichées. Sinon, elles sont calculées à partir des ingrédients et d'une table de valeurs de référence par 100 g, et marquées « calculé ». Ce calcul est approximatif (comparé aux recettes qui publient leurs valeurs, il tombe à ±20 % des calories environ une fois sur deux) et n'est fait que si presque tous les ingrédients sont reconnus et pesés. Les filtres sans gluten, sans produits laitiers et sans noix décrivent la liste d'ingrédients seulement : ils ne tiennent pas compte de la contamination croisée et ne doivent pas servir en cas d'allergie."
        : "When the source publishes nutrition, that is what is shown. Otherwise it is calculated from the ingredients and a table of reference values per 100 g, and marked \"calculated\". The calculation is approximate (against recipes that publish theirs, it lands within ±20 % of the calories about half the time) and is only done when nearly every ingredient is recognised and weighed. The gluten-free, dairy-free and nut-free filters describe the ingredient list only: they ignore cross-contamination and must not be relied on for an allergy."}</p>
    </div>
  );
}
