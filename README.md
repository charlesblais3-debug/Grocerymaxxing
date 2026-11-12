# Grocerymaxxing 🛒

Recettes et meal prep **chiffrés selon les circulaires de la semaine au Québec**.
Recipes and meal prep **costed against this week's Québec grocery flyers**.

- Choose your region and the grocery stores you actually shop at (1, 2, 3… any mix).
- Every recipe shows an estimated **cost per serving** using the best flyer price among
  *your* stores, plus the **macros** published by the recipe's source.
- Sort by best deals, cost per serving or protein per dollar; filter by dish type
  (soups, sandwiches, sides, preserves & ferments…), cuisine, protein, diet, time, cost.
- **Idées de la semaine**: bundles of different recipes that reuse the same deals.
- Week planner with days, household size and a budget (it can propose a week of dinners),
  one grocery list by aisle or store that keeps its ticks, shares and prints.
- "What I already have": pantry items are removed from costs; cook-with-what-I-have search.
- Macro filters; macros are calculated (and labelled) when the source publishes none.
- Favourite ingredients to watch, "lowest price in N weeks" and "new this week" badges.
- Flyers refresh automatically every morning; next week's flyer can be previewed as soon
  as the banners publish it.

## How it works

```
GitHub Actions (scheduled)                     Static site (GitHub Pages)
┌───────────────────────────┐   data/*.json    ┌─────────────────────────────┐
│ fetch-flyers.mjs   daily  │ ───────────────▶ │ build-index.mjs             │
│ fetch-baseline.mjs weekly │   committed      │  · match ingredient lines   │
│ fetch-recipes.mjs  weekly │                  │  · normalise prices to $/g  │
└───────────────────────────┘                  │ React app (Vite)            │
                                               │  · costs per selected store │
                                               └─────────────────────────────┘
```

No server and no database: the gatherers commit JSON to `data/`, the site is rebuilt and
published, and all costing happens in the browser for the stores the visitor selected.

| Data | Source | Refresh |
|---|---|---|
| Flyers (8 Québec regions; Super C, Maxi, IGA, Metro, Provigo, Walmart, Adonis) | Flipp's public flyer endpoints | daily |
| Regular prices (fallback + "savings") | Statistics Canada, table 18-10-0245-01, Québec | weekly |
| Recipes | schema.org/Recipe data published by the sites in `scripts/sources.mjs` | weekly, incremental |

### Recipes are gathered, never invented

`scripts/fetch-recipes.mjs` only copies fields that the publisher exposes in its own
structured data: title, ingredient lines, yield, times, categories, rating and nutrition.
A field the source does not publish stays empty — nutrition is **never computed**.
The scraper honours `robots.txt`, rate-limits itself, and skips sites that refuse crawlers
(HTTP 402/403). Preparation steps are **not** copied: each recipe links to the original
page for the method.

### How the cost is estimated

1. Each ingredient line is matched to a canonical ingredient (`shared/ingredients.js`,
   French + English) and its quantity is converted to grams.
2. Each flyer item is matched the same way and its price is normalised to $/g from the
   printed unit (`/lb`, `/kg`, `/100 g`), the package size, or a typical unit weight.
3. Every ingredient has one **reference price**, identical for all stores: StatCan's Québec
   average → otherwise the regular price flyers state themselves → otherwise an estimate
   from the flyer prices seen in the last 26 weeks (`data/price-history.json`).
4. A line costs `min(store's flyer price, reference price)`. A flyer can therefore only
   lower a recipe's cost, and the same lines are priced whatever the store.
   `scripts/verify-prices.mjs` checks these rules for every recipe × store × date and
   runs in CI before each deploy.
5. No substitutions: ingredient groups are split into members (peach ≠ plum, walnut ≠ pecan)
   and a flyer product only prices the member it actually is.
6. A recipe missing the price of a protein or of a large part of the dish is marked
   "incomplete" and left out of cost rankings.

It is an **estimate**: weight conversions and product matching are approximations, which
is why the app always shows how many ingredients were priced and with what.

## Development

```bash
npm install
npm run dev          # builds public/data from data/ and starts Vite
npm test             # parser / matcher / costing tests
npm run build        # production build in dist/

npm run fetch:flyers     # needs internet access to Flipp
npm run fetch:baseline   # StatCan
npm run fetch:recipes    # SOURCES=ricardo,budgetbytes TARGET_SCALE=0.2 to limit
```

`data/last-run.md` is rewritten by every gather run and says what each source returned.

## Automation

- `.github/workflows/update-data.yml` — flyers daily, recipes + baseline every Monday.
  Run it by hand from the Actions tab, or push an edit to `.github/gather.env`.
- `.github/workflows/deploy.yml` — tests, builds and publishes to GitHub Pages.
  **One-time setup:** repo *Settings → Pages → Source: GitHub Actions*.

## Adding a recipe source

Add an entry to `scripts/sources.mjs` (`wp(...)` covers most WordPress recipe blogs) and
run the workflow. If the site exposes schema.org/Recipe JSON-LD and allows crawling, its
recipes appear on the next run.
