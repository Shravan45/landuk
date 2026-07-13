import neighbourhoodsData from "@/data/neighbourhoods.json";
import type { Neighbourhood } from "./neighbourhoods";

// Indicative UK-wide averages (London baseline), drawn from the ranges in
// data/sources/cost-general.md and data/sources/cost-council-tax.md.
// These are illustrative for a portfolio demo, not live figures.
const LONDON_BASELINE = {
  utilities: 215,
  broadband: 32,
  mobile: 20,
  transport: 170,
  groceriesPerAdult: 275,
};

const BAND_D_MONTHLY_UK_AVG = 170;

export type CouncilTaxBand = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

const BAND_MULTIPLIERS: Record<CouncilTaxBand, number> = {
  A: 6 / 9,
  B: 7 / 9,
  C: 8 / 9,
  D: 9 / 9,
  E: 11 / 9,
  F: 13 / 9,
  G: 15 / 9,
  H: 18 / 9,
};

export interface CostOfLivingInput {
  neighbourhoodId: string;
  bedrooms: 1 | 2 | 3;
  councilTaxBand: CouncilTaxBand;
  adultsInHousehold: number;
}

export interface CostOfLivingBreakdown {
  neighbourhood: Neighbourhood;
  rent: number;
  councilTax: number;
  utilities: number;
  broadband: number;
  mobile: number;
  transport: number;
  groceries: number;
  total: number;
  perAdult: number;
}

const BEDROOM_RENT_MULTIPLIER: Record<number, number> = {
  1: 1,
  2: 1.4,
  3: 1.75,
};

export function calculateCostOfLiving(
  input: CostOfLivingInput
): CostOfLivingBreakdown {
  const neighbourhood = (neighbourhoodsData as Neighbourhood[]).find(
    (n) => n.id === input.neighbourhoodId
  );
  if (!neighbourhood) {
    throw new Error(`Unknown neighbourhood: ${input.neighbourhoodId}`);
  }

  const adults = Math.max(1, input.adultsInHousehold);
  const indexScale = neighbourhood.costIndex / 100;

  const rent = Math.round(
    neighbourhood.avgRent1Bed * BEDROOM_RENT_MULTIPLIER[input.bedrooms]
  );

  // Single-person households get the standard 25% Council Tax discount.
  const councilTaxFull =
    BAND_D_MONTHLY_UK_AVG * BAND_MULTIPLIERS[input.councilTaxBand] * indexScale;
  const councilTax = Math.round(adults === 1 ? councilTaxFull * 0.75 : councilTaxFull);

  const utilities = Math.round(LONDON_BASELINE.utilities * indexScale);
  const broadband = Math.round(LONDON_BASELINE.broadband * indexScale);
  const mobile = Math.round(LONDON_BASELINE.mobile * indexScale * adults);
  const transport = Math.round(LONDON_BASELINE.transport * indexScale * adults);
  const groceries = Math.round(
    LONDON_BASELINE.groceriesPerAdult * indexScale * adults
  );

  const total =
    rent + councilTax + utilities + broadband + mobile + transport + groceries;

  return {
    neighbourhood,
    rent,
    councilTax,
    utilities,
    broadband,
    mobile,
    transport,
    groceries,
    total,
    perAdult: Math.round(total / adults),
  };
}
