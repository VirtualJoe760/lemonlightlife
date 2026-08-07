import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import SubcontractorCard from "./SubcontractorCard";
import { cn } from "@/lib/utils";

function ParsedFiltersPanel({ filters }) {
  const [open, setOpen] = useState(false);
  if (!filters) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        Parsed as {filters._fallback && <span className="ml-1 rounded bg-warning/15 px-1 py-0.5 text-warning">(regex fallback)</span>}
      </button>
      {open && (
        <motion.pre
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs"
        >
          {JSON.stringify(filters, null, 2)}
        </motion.pre>
      )}
    </div>
  );
}

export default function SubcontractorResults({ results = [], parsedFilters }) {
  if (!results.length) {
    return (
      <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        No matches for that request. Try loosening the location or urgency, or describe a different role.
        <ParsedFiltersPanel filters={parsedFilters} />
      </div>
    );
  }
  return (
    <div className={cn("w-full")}>
      <ul
        role="list"
        className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
      >
        {results.map((crew, i) => (
          <li key={crew._id || i}>
            <SubcontractorCard crew={crew} index={i} />
          </li>
        ))}
      </ul>
      <ParsedFiltersPanel filters={parsedFilters} />
    </div>
  );
}
