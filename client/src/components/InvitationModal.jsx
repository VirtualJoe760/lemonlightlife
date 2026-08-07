import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, CalendarCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function InvitationModal({ open, onClose, projectName, summary }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", damping: 15, stiffness: 250 }}
                className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/15"
              >
                <CheckCircle2 className="size-9 text-success" strokeWidth={1.5} />
              </motion.div>

              <h2 className="text-center text-2xl font-light tracking-tight">
                Invitations sent
              </h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {summary?.total || 0} crew invited to <span className="text-foreground">{projectName || "the project"}</span>.
              </p>

              <div className="mt-5 rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <ul className="space-y-2">
                  {(summary?.crew || []).map((c, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="font-normal">{c.name}</span>
                      <span className="text-muted-foreground capitalize">{c.role}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <CalendarCheck className="size-3.5" />
                Calendars have been updated
              </div>

              <div className="mt-6 flex gap-2">
                <Button variant="ghost" onClick={onClose} className="flex-1">
                  Close
                </Button>
                <Button asChild className="flex-1">
                  <Link to="/projects">
                    All projects <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
