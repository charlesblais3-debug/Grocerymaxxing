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
        ? "Pour chaque ingrédient, on prend le meilleur prix en circulaire parmi vos épiceries; sinon le prix courant moyen au Québec publié par Statistique Canada; sinon l'ingrédient n'est pas chiffré (et c'est indiqué). Le coût est calculé au prorata de la quantité utilisée. C'est une estimation : les conversions (tasses → grammes, « 1 oignon » → grammes) et l'appariement entre ingrédients et produits de circulaire sont approximatifs. Le détail ligne par ligne est toujours affiché pour que vous puissiez vérifier."
        : 'For each ingredient we take the best flyer price among your stores; otherwise the average regular price in Québec published by Statistics Canada; otherwise the ingredient is left unpriced (and shown as such). Cost is prorated to the quantity used. It is an estimate: conversions (cups → grams, "1 onion" → grams) and the matching between ingredients and flyer products are approximate. The line-by-line detail is always shown so you can check.'}</p>
      {meta.baseline?.source && <p className="note">{meta.baseline.source} — {meta.baseline.refDate}. <a href={meta.baseline.url} target="_blank" rel="noopener noreferrer">↗</a></p>}
      <h2>{fr ? 'Le coût par repas' : 'Cost per meal'}</h2>
      <p>{fr
        ? "Une « portion » sur un site de recettes peut être une bouchée de 150 kcal. Pour les plats qui font un repas (plats principaux, soupes, salades, pâtes, sandwichs, déjeuners), le coût est donc donné par repas : la portion de la source est gardée quand elle a la taille d'un repas; sinon la recette est redivisée en repas d'environ 550 kcal (à partir des valeurs publiées) ou d'environ 450 g de nourriture. La fiche indique toujours quand ce calcul a été fait et ce que dit la source. Sauces, conserves, desserts et accompagnements restent chiffrés par portion."
        : 'A "serving" on a recipe site can be a 150-kcal bite. For dishes that make a meal (mains, soups, salads, pasta, sandwiches, breakfasts) the cost is therefore given per meal: the source\'s serving is kept when it is meal-sized; otherwise the recipe is re-divided into meals of about 550 kcal (from the published values) or about 450 g of food. The recipe page always says when this was done and what the source states. Sauces, preserves, desserts and sides stay priced per serving.'}</p>
      <h2>{fr ? 'Les valeurs nutritives' : 'Nutrition'}</h2>
      <p>{fr
        ? "Les macros affichées sont celles publiées par la source, par portion. Quand une source n'en publie pas, rien n'est affiché plutôt qu'un chiffre calculé."
        : 'Macros shown are the ones published by the source, per serving. When a source publishes none, nothing is shown rather than a computed figure.'}</p>
    </div>
  );
}
