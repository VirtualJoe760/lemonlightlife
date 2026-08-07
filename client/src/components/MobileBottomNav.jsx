import { NavLink } from "react-router-dom";
import { Home, FolderKanban, Users, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { name: "Home",     href: "/",         icon: Home },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Team",     href: "/team",     icon: Users },
  { name: "Account",  href: "/account",  icon: UserCircle },
];

export default function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 backdrop-blur-2xl lg:hidden"
      style={{ backgroundColor: "rgba(28, 25, 23, 0.8)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {ITEMS.map((item) => (
          <li key={item.name} className="flex-1">
            <NavLink
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-normal transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("size-5", isActive && "text-primary")} strokeWidth={isActive ? 2 : 1.5} />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
