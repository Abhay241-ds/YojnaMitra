"use client";

import Link from "next/link";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const navItems = [
  {
    icon: "fa-solid fa-table-columns",
    label: "Dashboard",
    href: "/admin",
  },
  {
    icon: "fa-solid fa-layer-group",
    label: "Scheme Management",
    children: [
      { label: "All Schemes", href: "/admin/schemes" },
      { label: "Add New Scheme", href: "/admin/schemes/new" },
      { label: "Categories", href: "/admin/categories" },
    ],
  },
  {
    icon: "fa-solid fa-file-lines",
    label: "Content Management",
    children: [
      { label: "Translations", href: "/admin/translations" },
      { label: "Official Sources", href: "/admin/sources" },
    ],
  },
  {
    icon: "fa-solid fa-circle-check",
    label: "Verification",
    children: [
      { label: "Pending Verification", href: "/admin/verification" },
      { label: "Inactive Schemes", href: "/admin/verification/inactive" },
    ],
  },
  {
    icon: "fa-solid fa-users",
    label: "User Management",
    href: "/admin/users",
  },
  {
    icon: "fa-solid fa-chart-line",
    label: "Analytics",
    href: "/admin/analytics",
  },
  {
    icon: "fa-solid fa-gear",
    label: "Settings",
    href: "/admin/settings",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50" aria-label="Loading admin panel" />
      }
    >
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-[#102544] text-white transition-all duration-200 ${mobileOpen
          ? "translate-x-0 w-72"
          : "-translate-x-full lg:translate-x-0"
          } ${sidebarOpen ? "lg:w-72" : "lg:w-20"}`}
      >
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 px-4">
          {sidebarOpen && (
            <Link href="/admin" className="min-w-0">
              <span className="block text-lg font-extrabold tracking-wide">
                Yojna<span className="text-amber-400">Mitra</span>
              </span>
              <span className="mt-0.5 block text-xs text-slate-400">
                Administration
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white lg:flex"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? "←" : "→"}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 lg:hidden"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {sidebarOpen && (
          <div className="px-4 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </div>
        )}

        <nav
          aria-label="Admin navigation"
          className="flex-1 space-y-1 overflow-y-auto px-3 pb-5 pt-3"
        >
          {navItems.map((item) => {
            if (item.children) {
              return (
                <NavItemGroup
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  sidebarOpen={sidebarOpen}
                />
              );
            }

            if (!item.href) {
              console.error(
                `Admin navigation item "${item.label}" is missing href.`
              );
              return null;
            }

            return (
              <NavItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                href={item.href}
                active={
                  pathname === item.href ||
                  (item.href !== "/admin" &&
                    pathname.startsWith(`${item.href}/`))
                }
                sidebarOpen={sidebarOpen}
              />
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <Link
            href="/"
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white ${!sidebarOpen ? "lg:justify-center lg:px-0" : ""
              }`}
            title="Back to website"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">
              ↗
            </span>
            <span className={!sidebarOpen ? "lg:hidden" : ""}>
              Back to website
            </span>
          </Link>

          {sidebarOpen && (
            <p className="px-3 pb-1 pt-3 text-[10px] text-slate-500">
              YojnaMitra ADMIN PANEL
            </p>
          )}
        </div>
      </aside>

      <div
        className={`min-h-screen transition-[padding] duration-200 ${sidebarOpen ? "lg:pl-72" : "lg:pl-20"
          }`}
      >
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label="Open navigation menu"
            >
              ☰
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                Admin workspace
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                Manage schemes and public information
              </p>
            </div>
          </div>

          <Link
            href="/admin"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
              A
            </span>
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </header>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  href,
  active,
  sidebarOpen,
}: {
  icon: string;
  label: string;
  href: string;
  active: boolean;
  sidebarOpen: boolean;
}) {
  return (
    <Link
      href={href}
      title={!sidebarOpen ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${active
        ? "bg-amber-400 text-slate-950 shadow-sm"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
        } ${!sidebarOpen ? "lg:justify-center lg:px-0" : ""}`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-base">
        <i className={icon} aria-hidden="true" />
      </span>
      <span className={!sidebarOpen ? "lg:hidden" : ""}>{label}</span>
    </Link>
  );
}

function NavItemGroup({
  item,
  pathname,
  sidebarOpen,
}: {
  item: {
    icon: string;
    label: string;
    children: { label: string; href: string }[];
  };
  pathname: string;
  sidebarOpen: boolean;
}) {
  const isActive = item.children.some(
    (child) =>
      pathname === child.href || pathname.startsWith(`${child.href}/`)
  );

  const [expanded, setExpanded] = useState(isActive);

  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (!sidebarOpen) return;
          setExpanded((value) => !value);
        }}
        title={!sidebarOpen ? item.label : undefined}
        aria-expanded={sidebarOpen ? expanded : undefined}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-sm font-medium transition ${isActive
          ? "bg-white/10 text-white"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
          } ${!sidebarOpen ? "lg:justify-center lg:px-0" : ""}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-base">
            <span className={item.icon} aria-hidden="true" />
          </span>
          <span className={!sidebarOpen ? "lg:hidden" : ""}>{item.label}</span>
        </span>

        {sidebarOpen && (
          <span
            aria-hidden="true"
            className={`text-xs transition-transform ${expanded ? "rotate-90" : ""
              }`}
          >
            ▶
          </span>
        )}
      </button>

      {expanded && sidebarOpen && (
        <div className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-3">
          {item.children.map((child) => {
            const active =
              pathname === child.href ||
              pathname.startsWith(`${child.href}/`);

            return (
              <Link
                key={child.href}
                href={child.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm transition ${active
                  ? "bg-white/10 font-semibold text-amber-300"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

