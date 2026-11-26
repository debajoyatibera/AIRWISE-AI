"use client";

import { useState } from "react";
import { Loader2, MapPin, RefreshCw, Search, X } from "lucide-react";
import { formatLocationLabel, PRESET_LOCATIONS } from "@/lib/locations";
import type { LocationOption } from "@/lib/types";

interface LocationSelectorProps {
  selectedLocation: LocationOption;
  isLoading: boolean;
  onSelectLocation: (location: LocationOption) => void;
  onRefresh: () => void;
}

export function LocationSelector({
  selectedLocation,
  isLoading,
  onSelectLocation,
  onRefresh,
}: LocationSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchError("Enter at least 2 characters to search for a city.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/locations?q=${encodeURIComponent(trimmed)}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "City search failed.");
      }
      setResults(data.locations ?? []);
    } catch (error) {
      setResults([]);
      setSearchError(
        error instanceof Error
          ? error.message
          : "Unable to search cities right now."
      );
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectSearchResult(location: LocationOption) {
    onSelectLocation(location);
    setResults([]);
    setHasSearched(false);
    setQuery("");
    setSearchError(null);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setSearchError(null);
  }

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-[#0d1b36]/90 p-4 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Preset Indian cities */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-300 uppercase">
            <MapPin className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
            Cities:
          </span>
          {PRESET_LOCATIONS.map((city) => {
            const active =
              selectedLocation.id === city.id ||
              (selectedLocation.name === city.name &&
                Math.abs(selectedLocation.latitude - city.latitude) < 0.05);
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => {
                  clearSearch();
                  onSelectLocation(city);
                }}
                aria-pressed={active}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
                  active
                    ? "bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/30"
                    : "border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-teal-500/60 hover:text-white"
                }`}
              >
                {city.name}
              </button>
            );
          })}
        </div>

        {/* City Search + Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={handleSearch}
            className="relative flex flex-1 items-center sm:flex-initial"
            role="search"
            aria-label="Search supported global cities"
          >
            <label htmlFor="city-search-input" className="sr-only">
              Search city name
            </label>
            <div className="relative flex items-center">
              <Search
                className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="city-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any city (e.g. Pune, Patna)..."
                className="w-full rounded-l-xl border border-slate-700 bg-slate-950/70 py-2 pr-8 pl-9 text-sm text-slate-100 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none sm:w-64"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear city search"
                  className="absolute right-2 rounded p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="rounded-r-xl border border-l-0 border-slate-700 bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-label="Searching" />
              ) : (
                "Search"
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 px-3.5 py-2 text-sm font-medium text-teal-200 transition hover:bg-teal-500/20 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search error or results */}
      {searchError && (
        <p role="alert" className="mt-3 text-xs text-amber-300">
          {searchError}
        </p>
      )}

      {hasSearched && !isSearching && !searchError && results.length === 0 && (
        <p className="mt-3 text-xs text-slate-300">
          No matching cities found for &ldquo;{query}&rdquo;. Try another spelling.
        </p>
      )}

      {results.length > 0 && (
        <div
          className="mt-3 rounded-xl border border-slate-700/80 bg-slate-950/90 p-2"
          aria-label="City search results"
        >
          <div className="mb-1.5 flex items-center justify-between px-2">
            <span className="text-xs font-medium text-slate-400">
              Select a location ({results.length} found)
            </span>
            <button
              type="button"
              onClick={clearSearch}
              className="text-xs text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
          <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="flex w-full flex-col rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-teal-500/40 hover:bg-slate-800/80 focus-visible:outline-2 focus-visible:outline-teal-400"
                >
                  <span className="text-sm font-semibold text-white">
                    {item.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatLocationLabel(item)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
