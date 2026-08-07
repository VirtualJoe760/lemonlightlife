import { motion } from "framer-motion";
import { Check, X, Users, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CrewRosterRail({ project, onDeselect, onSendInvitations, sending }) {
  if (!project) return null;
  const roster = project.crewRoster || [];
  const progress = project.selectionProgress || { filled: 0, total: 0 };
  const canInvite = progress.total > 0 && progress.filled >= progress.total && project.status !== "invited";
  const alreadyInvited = project.status === "invited";

  return (
    <aside className="flex flex-col rounded-lg border border-white/5 bg-card/60 backdrop-blur p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="size-4 text-primary" />
        <h3 className="font-medium tracking-tight">Crew roster</h3>
      </div>

      {roster.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          The assistant will propose the crew composition once it has enough project detail.
        </p>
      ) : (
        <>
          {/* Progress bar */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.filled} of {progress.total} filled</span>
              <span>
                {progress.total > 0 ? Math.round((progress.filled / progress.total) * 100) : 0}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress.total > 0 ? (progress.filled / progress.total) * 100 : 0}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={cn("h-full rounded-full", canInvite || alreadyInvited ? "bg-success" : "bg-primary")}
              />
            </div>
          </div>

          {/* Slot list */}
          <ul className="space-y-3">
            {roster.map((slot) => {
              const slotFilled = Math.min(slot.filled?.length || 0, slot.count);
              const done = slotFilled >= slot.count;
              return (
                <li key={slot.role} className="rounded-md border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize">{slot.role}</span>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium",
                        done ? "text-success" : "text-muted-foreground"
                      )}
                    >
                      {done && <Check className="size-3" />}
                      {slotFilled}/{slot.count}
                    </span>
                  </div>
                  {slot.reason && (
                    <p className="text-xs text-muted-foreground mb-2">{slot.reason}</p>
                  )}
                  {slot.filled && slot.filled.length > 0 ? (
                    <ul className="space-y-1.5">
                      {slot.filled.map((crew) => (
                        <li key={crew._id} className="flex items-center gap-2 rounded-md bg-white/5 p-1.5">
                          {crew.headshotUrl ? (
                            <img
                              src={crew.headshotUrl}
                              alt=""
                              className="size-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="size-8 rounded-full bg-primary/15" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{crew.name}</div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {crew.city}
                              {crew.rating != null && <> · ★ {crew.rating.toFixed(1)}</>}
                            </div>
                          </div>
                          {!alreadyInvited && (
                            <button
                              type="button"
                              onClick={() => onDeselect?.(slot.role, crew._id)}
                              className="rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-destructive"
                              aria-label={`Remove ${crew.name}`}
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-[11px] italic text-muted-foreground">
                      {slot.count === 1 ? "1 needed" : `${slot.count} needed`}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Send invitations CTA */}
          {canInvite && (
            <Button
              onClick={onSendInvitations}
              disabled={sending}
              className="mt-4 w-full"
              size="lg"
            >
              <Send className="size-4" />
              {sending ? "Sending…" : "Send invitations"}
            </Button>
          )}
          {alreadyInvited && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-success/10 p-3 text-sm text-success">
              <Check className="size-4" />
              Invitations sent
            </div>
          )}
        </>
      )}
    </aside>
  );
}
