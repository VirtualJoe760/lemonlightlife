import { useEffect, useState } from "react";
import SubcontractorCard from "@/components/SubcontractorCard";
import { ROLE_KEYS } from "../../../shared/roles.js";

// Hard-coded county list — matches shared/cities.js coverage.
const COUNTIES = ["", "Los Angeles", "Orange", "Riverside", "San Bernardino", "San Diego", "Imperial"];

export default function Team() {
  const [role, setRole] = useState("");
  const [county, setCounty] = useState("");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "30");
    if (role) params.set("role", role);
    if (county) params.set("county", county);
    fetch(`/api/subcontractors?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results || []);
        setTotal(data.total || 0);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [role, county]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="mx-auto max-w-2xl lg:mx-0">
        <h1 className="text-4xl font-light tracking-tight text-pretty sm:text-5xl">
          Our team
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Browse the full roster of subcontractors across Southern California. Filter by role or county — {total.toLocaleString()} match{total === 1 ? "" : "es"} showing top 30.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All roles</option>
          {ROLE_KEYS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {COUNTIES.map((c) => (
            <option key={c || "all"} value={c}>{c || "All counties"}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/2] w-full rounded-2xl bg-muted" />
              <div className="mt-4 h-4 w-2/3 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <ul role="list" className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((crew, i) => (
            <li key={crew._id}>
              <SubcontractorCard crew={crew} index={i} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
