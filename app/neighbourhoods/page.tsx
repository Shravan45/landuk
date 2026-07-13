"use client";

import { useEffect, useState } from "react";
import type { NeighbourhoodMatch } from "@/lib/neighbourhoods";

export default function NeighbourhoodsPage() {
  const [tags, setTags] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [city, setCity] = useState("any");
  const [maxBudget, setMaxBudget] = useState(1500);
  const [maxCommuteMins, setMaxCommuteMins] = useState(30);
  const [matches, setMatches] = useState<NeighbourhoodMatch[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/neighbourhoods")
      .then((r) => r.json())
      .then((data) => {
        setTags(data.tags ?? []);
        setCities(data.cities ?? []);
      });
  }, []);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/neighbourhoods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priorities: selectedTags,
          city,
          maxBudget,
          maxCommuteMins,
        }),
      });
      const data = await res.json();
      setMatches(data.matches ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold">Neighbourhood matcher</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Set your priorities and we&rsquo;ll rank UK areas from our curated dataset
        that fit best.
      </p>

      <div className="mt-6 grid gap-6 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">
            Max monthly rent (1-bed equivalent): £{maxBudget}
          </label>
          <input
            type="range"
            min={400}
            max={2500}
            step={50}
            value={maxBudget}
            onChange={(e) => setMaxBudget(Number(e.target.value))}
            className="mt-2 w-full accent-indigo-600"
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Max commute to centre: {maxCommuteMins} mins
          </label>
          <input
            type="range"
            min={5}
            max={45}
            step={5}
            value={maxCommuteMins}
            onChange={(e) => setMaxCommuteMins(Number(e.target.value))}
            className="mt-2 w-full accent-indigo-600"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium">City</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          >
            <option value="any">Any city</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium">What matters to you?</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-300 dark:border-slate-700 hover:border-indigo-400"
                }`}
              >
                {tag.replace(/-/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Matching…" : "Find neighbourhoods"}
          </button>
        </div>
      </div>

      {matches && (
        <div className="mt-8 space-y-4">
          {matches.length === 0 && (
            <p className="text-sm text-slate-500">No matches found — try relaxing your filters.</p>
          )}
          {matches.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {m.name}
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      {m.city}
                    </span>
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {m.description}
                  </p>
                </div>
                <div className="shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-950 px-3 py-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {m.score}% match
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>~£{m.avgRent1Bed}/mo (1-bed)</span>
                <span>·</span>
                <span>{m.commuteToCentreMins} min commute</span>
                <span>·</span>
                <span>
                  {m.matchedTags.length > 0
                    ? `Matched: ${m.matchedTags.join(", ").replace(/-/g, " ")}`
                    : "No tag matches"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
