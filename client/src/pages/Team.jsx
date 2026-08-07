import { useEffect, useMemo, useState } from "react";
import { Search, Star, MapPin, X, Sparkles } from "lucide-react";
import SubcontractorCard from "@/components/SubcontractorCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ROLE_KEYS } from "../../../shared/roles.js";
import { cn } from "@/lib/utils";

const COUNTIES = ["Los Angeles", "Orange", "Riverside", "San Bernardino", "San Diego", "Imperial"];

function FilterChip({ active, onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-normal transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

export default function Team() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [county, setCounty] = useState("");
  const [availableOnly, setAvailableOnly] = useState(true);

  const [results, setResults] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch main results whenever a filter changes
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "60");
    if (role) params.set("role", role);
    if (county) params.set("county", county);
    if (!availableOnly) params.set("available", "false");
    fetch(`/api/subcontractors?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results || []);
        setTotal(data.total || 0);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [role, county, availableOnly]);

  // Recommended = top 4 available across the whole roster, fetched once
  useEffect(() => {
    fetch("/api/subcontractors?limit=4&available=true")
      .then((r) => r.json())
      .then((data) => setRecommended(data.results || []))
      .catch(() => {});
  }, []);

  // Client-side name search on the fetched batch
  const displayed = useMemo(() => {
    if (!query.trim()) return results;
    const q = query.trim().toLowerCase();
    return results.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.roles?.some((r) => r.toLowerCase().includes(q)) ||
      c.city?.toLowerCase().includes(q)
    );
  }, [results, query]);

  const activeFilterCount = [role, county, !availableOnly ? "any" : null].filter(Boolean).length;

  function clearAll() {
    setRole("");
    setCounty("");
    setAvailableOnly(true);
    setQuery("");
  }

  return (
    <div>
      {/* Sticky search + filter bar */}
      <div className="sticky top-0 lg:top-0 z-20 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
          <div className="flex flex-col gap-3">
            {/* Search row */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, role, or city…"
                  className="pl-9 h-11 bg-card/60"
                />
              </div>
              {activeFilterCount > 0 || query ? (
                <Button variant="ghost" onClick={clearAll} className="shrink-0">
                  <X className="size-4" /> Clear
                </Button>
              ) : null}
            </div>

            {/* Filter chip row */}
            <div className="flex flex-wrap items-center gap-2">
              <FilterChip active={availableOnly} onClick={() => setAvailableOnly(!availableOnly)}>
                <span className={cn("size-1.5 rounded-full", availableOnly ? "bg-success" : "bg-muted-foreground")} />
                Available only
              </FilterChip>

              <div className="mx-1 h-5 w-px bg-white/10" />

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All roles</option>
                {ROLE_KEYS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <select
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All counties</option>
                {COUNTIES.map((c) => (
                  <option key={c} value={c}>{c} County</option>
                ))}
              </select>

              <div className="ml-auto text-sm text-muted-foreground">
                {loading ? "Loading…" : (
                  <>
                    <span className="font-normal text-foreground">{displayed.length.toLocaleString()}</span> shown of{" "}
                    <span className="font-normal text-foreground">{total.toLocaleString()}</span> match{total === 1 ? "" : "es"}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Recommended section */}
        {!query && !role && !county && recommended.length > 0 && (
          <section className="mb-12">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <h2 className="text-xl font-normal tracking-tight">Recommended for you</h2>
              <span className="text-sm text-muted-foreground">
                — top-rated crew available in Southern California
              </span>
            </div>
            <ul role="list" className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {recommended.map((crew, i) => (
                <li key={crew._id}>
                  <SubcontractorCard crew={crew} index={i} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* All results */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-normal tracking-tight">
              {query || role || county ? "Search results" : "Full roster"}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/2] w-full rounded-2xl bg-muted" />
                  <div className="mt-4 h-4 w-2/3 rounded bg-muted" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="rounded-lg border border-white/5 bg-card/40 p-8 text-center">
              <MapPin className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">
                No crew matches those filters.{" "}
                <button onClick={clearAll} className="text-primary hover:underline">Clear filters</button>
              </p>
            </div>
          ) : (
            <ul role="list" className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {displayed.map((crew, i) => (
                <li key={crew._id}>
                  <SubcontractorCard crew={crew} index={i} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
