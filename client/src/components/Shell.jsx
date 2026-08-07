import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";

const STORAGE_KEY = "kristelmatch:sidebar-collapsed";

export default function Shell() {
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
        <main className="min-h-dvh pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav (replaces hamburger) */}
      <MobileBottomNav />
    </div>
  );
}
