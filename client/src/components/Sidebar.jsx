import { NavLink } from "react-router-dom";
import { Home, MessageSquare, Users, FolderKanban, UserCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { name: "Home",     href: "/",         icon: Home },
  { name: "Chat",     href: "/chat",     icon: MessageSquare },
  { name: "Team",     href: "/team",     icon: Users },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Account",  href: "/account",  icon: UserCircle },
];

function NavItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.href}
      end={item.href === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-x-3 rounded-md p-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
          {item.name}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ mobile = false, onClose }) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-card px-6 pb-4">
      <div className="flex h-16 shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="size-7 rounded" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <span className="font-medium tracking-tight text-base">Kristel Match</span>
        </div>
        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {NAV.map((item) => (
                <li key={item.name}>
                  <NavItem item={item} onNavigate={mobile ? onClose : undefined} />
                </li>
              ))}
            </ul>
          </li>

          <li className="mt-auto -mx-2">
            <div className="flex items-center gap-3 rounded-md p-2 text-sm">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold">
                JS
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold">Joseph Sardella</div>
                <div className="truncate text-xs text-muted-foreground">General Contractor</div>
              </div>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
}
