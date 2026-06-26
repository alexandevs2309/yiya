import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { Search, Bell, Menu, ChevronDown } from "lucide-react";

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-bg-surface px-4 shadow-topbar shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo (mobile) */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
          <span className="text-sm font-bold text-white">DY</span>
        </div>
        <div>
          <div className="text-sm font-bold text-text-primary">D' Yiya</div>
          <div className="text-[10px] font-medium text-text-muted">Restaurante</div>
        </div>
      </div>

      {/* Search - Centered */}
      <div className="relative flex-1 max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Buscar productos, categorías..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-full rounded-lg bg-bg-elevated pl-9 pr-14 text-sm text-text-primary placeholder:text-text-muted border border-border focus:border-accent outline-none transition-all focus:ring-1 focus:ring-accent"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 rounded bg-bg-surface px-1.5 py-0.5 text-[9px] font-bold text-text-muted border border-border">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {/* Notifications with badge '3' */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-extrabold text-white">
            3
          </span>
        </button>

        {/* User with avatar and chevron dropdown */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-border cursor-pointer group">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white overflow-hidden bg-accent shrink-0 border border-border"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face"
              alt="Avatar"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-text-primary group-hover:text-white transition-colors flex items-center gap-1">
              <span>{user?.first_name ? `${user.first_name} ${user.last_name || ""}` : user?.username || "Carlos García"}</span>
            </div>
            <div className="text-[10px] font-medium text-text-muted capitalize">
              {user?.role === "admin" ? "Admin" : user?.role === "cook" ? "Cocinero" : "Mesero"}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-text-muted group-hover:text-text-secondary transition-colors shrink-0" />
        </div>
      </div>
    </header>
  );
}
