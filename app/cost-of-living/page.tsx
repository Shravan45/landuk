"use client";

import { useState } from "react";
import neighbourhoods from "@/data/neighbourhoods.json";
import type { CostOfLivingBreakdown, CouncilTaxBand } from "@/lib/cost-of-living";

const BANDS: CouncilTaxBand[] = ["A", "B", "C", "D", "E", "F", "G", "H"];

const ROWS: Array<{ key: keyof CostOfLivingBreakdown; label: string }> = [
  { key: "rent", label: "Rent" },
  { key: "councilTax", label: "Council Tax" },
  { key: "utilities", label: "Utilities (gas/electric/water)" },
  { key: "broadband", label: "Broadband" },
  { key: "mobile", label: "Mobile" },
  { key: "transport", label: "Public transport" },
  { key: "groceries", label: "Groceries" },
];

export default function CostOfLivingPage() {
  const [neighbourhoodId, setNeighbourhoodId] = useState(neighbourhoods[0].id);
  const [bedrooms, setBedrooms] = useState<1 | 2 | 3>(1);
  const [councilTaxBand, setCouncilTaxBand] = useState<CouncilTaxBand>("D");
  const [adultsInHousehold, setAdultsInHousehold] = useState(1);
  const [breakdown, setBreakdown] = useState<CostOfLivingBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/cost-of-living", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neighbourhoodId,
          bedrooms,
          councilTaxBand,
          adultsInHousehold,
        }),
      });
      const data = await res.json();
      setBreakdown(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold">Cost of living calculator</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Estimate a monthly budget using indicative figures scaled to each
        area&rsquo;s relative cost index.
      </p>

      <div className="mt-6 grid gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Neighbourhood</label>
          <select
            value={neighbourhoodId}
            onChange={(e) => setNeighbourhoodId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          >
            {neighbourhoods.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}, {n.city}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Bedrooms</label>
          <select
            value={bedrooms}
            onChange={(e) => setBedrooms(Number(e.target.value) as 1 | 2 | 3)}
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          >
            <option value={1}>1 bedroom</option>
            <option value={2}>2 bedrooms</option>
            <option value={3}>3 bedrooms</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Council Tax band</label>
          <select
            value={councilTaxBand}
            onChange={(e) => setCouncilTaxBand(e.target.value as CouncilTaxBand)}
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          >
            {BANDS.map((b) => (
              <option key={b} value={b}>
                Band {b}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium">
            Adults sharing the household: {adultsInHousehold}
          </label>
          <input
            type="range"
            min={1}
            max={4}
            step={1}
            value={adultsInHousehold}
            onChange={(e) => setAdultsInHousehold(Number(e.target.value))}
            className="mt-2 w-full accent-indigo-600"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Calculating…" : "Calculate"}
          </button>
        </div>
      </div>

      {breakdown && (
        <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="font-semibold text-lg">
            {breakdown.neighbourhood.name}, {breakdown.neighbourhood.city}
          </h2>
          <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {ROWS.map((row) => (
              <div key={row.key} className="flex justify-between py-2 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  {row.label}
                </span>
                <span className="font-medium">
                  £{breakdown[row.key] as number}/mo
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-300 dark:border-slate-700 pt-3">
            <span className="font-semibold">Total household</span>
            <span className="font-bold text-lg">£{breakdown.total}/mo</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>Per adult</span>
            <span>£{breakdown.perAdult}/mo</span>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Figures are indicative estimates for planning purposes — verify
            current rates against ONS and gov.uk before budgeting precisely.
          </p>
        </div>
      )}
    </div>
  );
}
