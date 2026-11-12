// Deal score out of 10 for a flyer offer. It rates the price itself against what the
// ingredient normally costs (our reference price and price history), not the "regular
// price" a retailer prints next to its own discount.
//   3 = no better than usual · 5 = about 15 % under · 7 = about 30 % under · 9 = 40 %+ under
//   +1 when it is the lowest price we have seen in at least three earlier flyer weeks.
export function dealScore(offer, baseline, hist) {
  const ref = baseline?.[offer.pk || offer.ing]?.perG;
  if (!ref || !offer.perG) return null;
  const d = 1 - offer.perG / ref;
  let s = d >= 0 ? 3 + d * 15 : 3 + d * 5;
  const weeks = hist?.[offer.pk || offer.ing];
  if (weeks && offer.from) {
    const prior = Object.keys(weeks).filter((w) => w < offer.from);
    if (prior.length >= 3 && offer.perG <= Math.min(...prior.flatMap((w) => Object.values(weeks[w]))) * 1.001) s += 1;
  }
  return Math.max(1, Math.min(10, Math.round(s)));
}
