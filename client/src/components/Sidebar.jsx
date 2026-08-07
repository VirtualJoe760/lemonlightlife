import { NavLink } from "react-router-dom";
import { Home, Users, FolderKanban, UserCircle, X, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { name: "Home",     href: "/",         icon: Home },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Team",     href: "/team",     icon: Users },
  { name: "Account",  href: "/account",  icon: UserCircle },
];

function NavItem({ item, onNavigate, collapsed }) {
  return (
    <NavLink
      to={item.href}
      end={item.href === "/"}
      onClick={onNavigate}
      title={collapsed ? item.name : undefined}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-x-3 rounded-md p-2 text-sm font-normal transition-colors",
          collapsed && "justify-center",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={cn(
              "size-5 shrink-0",
              isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )}
          />
          {!collapsed && <span>{item.name}</span>}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ mobile = false, onClose, collapsed = false, onToggleCollapse }) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-white/5 bg-card/70 backdrop-blur-xl px-3 pb-4">
      <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "justify-between px-2")}>
        <div className={cn("flex items-center gap-2", collapsed && "gap-0")}>
          <img
            src="/logo.png"
            alt="Kristel Match"
            className="size-9 shrink-0 select-none"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          {!collapsed && (
            <span className="font-normal tracking-tight text-base">Kristel Match</span>
          )}
        </div>
        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
        )}
        {!mobile && onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Collapse toggle in collapsed state (below logo, since header can't fit both) */}
      {!mobile && onToggleCollapse && collapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mx-auto -mt-3 rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          aria-label="Expand sidebar"
        >
          <ChevronsRight className="size-4" />
        </button>
      )}

      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="space-y-1">
              {NAV.map((item) => (
                <li key={item.name}>
                  <NavItem
                    item={item}
                    onNavigate={mobile ? onClose : undefined}
                    collapsed={collapsed}
                  />
                </li>
              ))}
            </ul>
          </li>

          <li className="mt-auto">
            <div
              className={cn(
                "flex items-center gap-3 rounded-md p-2 text-sm",
                collapsed && "justify-center gap-0"
              )}
              title={collapsed ? "Joseph Sardella" : undefined}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-normal">
                JS
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="truncate font-normal">Joseph Sardella</div>
                  <div className="truncate text-xs text-muted-foreground">General Contractor</div>
                </div>
              )}
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
}
