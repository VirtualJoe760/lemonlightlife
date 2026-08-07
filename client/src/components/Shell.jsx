import { useState } from "react";
import { Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

export default function Shell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col lg:hidden"
            >
              <Sidebar mobile onClose={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Static desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col">
        <Sidebar />
      </div>

      {/* Main pane */}
      <div className="lg:pl-72">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-x-4 border-b border-border bg-background/80 backdrop-blur px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-semibold">Matchmaker</span>
        </div>
        <main className="min-h-[calc(100dvh-3.5rem)] lg:min-h-dvh">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
