import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AlertModal({ open, onClose, title, message, variant = "error" }) {
  const isError = variant === "error";
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
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            role="alertdialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-5 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${isError ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                  <AlertCircle className="size-5" />
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-medium">{title || (isError ? "Something went wrong" : "Notice")}</h3>
                  {message && <p className="mt-1 text-sm text-muted-foreground">{message}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={onClose} size="sm" variant="secondary">Dismiss</Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
