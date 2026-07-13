import neighbourhoodsData from "@/data/neighbourhoods.json";

export interface Neighbourhood {
  id: string;
  name: string;
  city: string;
  region: string;
  avgRent1Bed: number;
  costIndex: number;
  commuteToCentreMins: number;
  tags: string[];
  description: string;
}

export interface NeighbourhoodMatchInput {
  maxBudget?: number;
  maxCommuteMins?: number;
  city?: string;
  priorities: string[];
}

export interface NeighbourhoodMatch extends Neighbourhood {
  score: number;
  matchedTags: string[];
}

export const ALL_TAGS = Array.from(
  new Set((neighbourhoodsData as Neighbourhood[]).flatMap((n) => n.tags))
).sort();

export const ALL_CITIES = Array.from(
  new Set((neighbourhoodsData as Neighbourhood[]).map((n) => n.city))
).sort();

export function matchNeighbourhoods(
  input: NeighbourhoodMatchInput
): NeighbourhoodMatch[] {
  const neighbourhoods = neighbourhoodsData as Neighbourhood[];
  const priorities = new Set(input.priorities.map((t) => t.toLowerCase()));

  const scored = neighbourhoods
    .filter((n) => !input.city || input.city === "any" || n.city === input.city)
    .map((n) => {
      const matchedTags = n.tags.filter((t) => priorities.has(t.toLowerCase()));

      // Tag overlap is the primary signal (0-60 points).
      const tagScore =
        priorities.size > 0
          ? (matchedTags.length / priorities.size) * 60
          : 30;

      // Budget fit (0-25 points): full marks under budget, tapering off above it.
      let budgetScore = 25;
      if (input.maxBudget) {
        if (n.avgRent1Bed <= input.maxBudget) {
          budgetScore = 25;
        } else {
          const overBy = (n.avgRent1Bed - input.maxBudget) / input.maxBudget;
          budgetScore = Math.max(0, 25 - overBy * 100);
        }
      }

      // Commute fit (0-15 points).
      let commuteScore = 15;
      if (input.maxCommuteMins) {
        if (n.commuteToCentreMins <= input.maxCommuteMins) {
          commuteScore = 15;
        } else {
          const overBy = n.commuteToCentreMins - input.maxCommuteMins;
          commuteScore = Math.max(0, 15 - overBy * 0.5);
        }
      }

      const score = Math.round(tagScore + budgetScore + commuteScore);

      return { ...n, score, matchedTags };
    })
    .sort((a, b) => b.score - a.score);

  return scored;
}
