import { motion } from "framer-motion";
import { Star, MapPin, HardHat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LEVEL_LABEL = { 5: "Expert", 4: "Strong", 3: "Proficient", 2: "Familiar", 1: "Novice" };
const LEVEL_VARIANT = { 5: "default", 4: "secondary", 3: "outline", 2: "outline", 1: "outline" };

function AvailabilityChip({ status }) {
  const color = status === "available" ? "bg-success/15 text-success"
    : status === "booked" ? "bg-warning/15 text-warning"
    : "bg-destructive/15 text-destructive";
  const label = status === "available" ? "Available"
    : status === "booked" ? "Booked"
    : "Unavailable";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold", color)}>
      <span className={cn("size-1.5 rounded-full", status === "available" ? "bg-success" : status === "booked" ? "bg-warning" : "bg-destructive")} />
      {label}
    </span>
  );
}

export default function SubcontractorCard({ crew, index = 0 }) {
  const topSpecs = [...(crew.specializations || [])]
    .sort((a, b) => b.level - a.level)
    .slice(0, 3);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
      className="flex flex-col"
    >
      {crew.headshotUrl ? (
        <img
          src={crew.headshotUrl}
          alt={`${crew.name} — ${crew.roles?.[0] || "subcontractor"}`}
          className="aspect-[3/2] w-full rounded-2xl object-cover ring-1 ring-white/10"
          loading="lazy"
        />
      ) : (
        <div className="aspect-[3/2] w-full rounded-2xl bg-muted flex items-center justify-center ring-1 ring-white/10">
          <HardHat className="size-10 text-muted-foreground/50" />
        </div>
      )}

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium tracking-tight text-base">{crew.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {crew.roles?.join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-sm">
          <Star className="size-4 fill-primary text-primary" />
          <span className="font-medium">{crew.rating?.toFixed(1)}</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" />
          {crew.city}
          {crew.county && crew.county !== crew.city ? `, ${crew.county}` : ""}
        </span>
        {crew.distanceMi != null && (
          <span>· {crew.distanceMi} mi</span>
        )}
        <span>· {crew.yearsExperience} yrs</span>
        {crew.hourlyRate && <span>· ${crew.hourlyRate}/hr</span>}
      </div>

      <div className="mt-3">
        <AvailabilityChip status={crew.bookingStatus} />
      </div>

      {topSpecs.length > 0 && (
        <div className="mt-3 space-y-1">
          {topSpecs.map((s) => (
            <div key={s.skill} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{s.skill}</span>
              <Badge variant={LEVEL_VARIANT[s.level]} className="shrink-0">
                {LEVEL_LABEL[s.level]} · {s.yearsInSpecialty}y
              </Badge>
            </div>
          ))}
        </div>
      )}

      {crew.rationale && (
        <p className="mt-3 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
          {crew.rationale}
        </p>
      )}
    </motion.article>
  );
}
