import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Key, Zap, CreditCard, BookOpen, LogOut } from "lucide-react";
import clsx from "clsx";

const NAV = [
  { to: "/overview", label: "Overview",   icon: LayoutDashboard },
  { to: "/keys",     label: "API Keys",   icon: Key },
  { to: "/aliases",  label: "Aliases",    icon: Zap },
  { to: "/billing",  label: "Billing",    icon: CreditCard },
  { to: "/docs",     label: "Docs",       icon: BookOpen },
];

export function Layout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("router_token");
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-[#2a2a35] bg-[#0c0c10] flex flex-col">
        <div className="px-5 py-6 border-b border-[#2a2a35]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">Sirius Router</p>
              <p className="text-[10px] text-slate-500">AI Gateway</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-indigo-500/15 text-indigo-300 font-medium"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-[#2a2a35]">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
