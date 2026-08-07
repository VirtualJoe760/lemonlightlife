import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import SubcontractorCard from "./SubcontractorCard";
import { Button } from "@/components/ui/button";

/**
 * A SubcontractorCard with a Select/Selected toggle button beneath it.
 * `role` is the roster slot this card is a candidate for.
 * `selected` reflects whether this crew member is currently in that slot.
 */
export default function SelectableSubcontractorCard({
  crew,
  index = 0,
  role,
  selected = false,
  disabled = false,
  onSelect,
  onDeselect,
}) {
  const handle = async () => {
    if (disabled) return;
    if (selected) await onDeselect?.(role, crew._id);
    else await onSelect?.(role, crew._id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: "easeOut" }}
      className="flex flex-col"
    >
      <SubcontractorCard crew={crew} index={index} />
      <Button
        onClick={handle}
        disabled={disabled}
        variant={selected ? "secondary" : "default"}
        className="mt-4"
        size="sm"
      >
        {selected ? (
          <><Check className="size-4" /> Selected</>
        ) : (
          <><Plus className="size-4" /> Select for {role}</>
        )}
      </Button>
    </motion.div>
  );
}
