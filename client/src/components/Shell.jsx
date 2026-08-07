import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

const STORAGE_KEY = "kristelmatch:sidebar-collapsed";

export default function Shell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch { /* ignore */ }
  }, [collapsed]);

  const desktopWidth = collapsed ? "lg:w-16" : "lg:w-72";
  const mainOffset = collapsed ? "lg:pl-16" : "lg:pl-72";

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
      <div
        className={`hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col transition-[width] duration-200 ease-out ${desktopWidth}`}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
      </div>

      {/* Main pane */}
      <div className={`transition-[padding] duration-200 ease-out ${mainOffset}`}>
        <div className="sticky top-0 z-30 flex h-14 items-center gap-x-4 border-b border-white/5 bg-background/70 backdrop-blur px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-normal">Kristel Match</span>
        </div>
        <main className="min-h-[calc(100dvh-3.5rem)] lg:min-h-dvh">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
