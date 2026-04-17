"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";

import {
  LayoutDashboard,
  PiggyBank,
  TrendingUp,
  Briefcase,
  BarChart3,
  ChartCandlestick,
  Upload,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function DashboardSideBar() {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "IPO Stocks", url: "/dashboard/ipo", icon: PiggyBank },
    {
      title: "Secondary Market",
      url: "/dashboard/secondary",
      icon: TrendingUp,
    },
    { title: "Portfolios", url: "/dashboard/portfolios", icon: Briefcase },
    { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    { title: "Market Price", url: "/dashboard/market-price", icon: BarChart3 },
    {
      title: "Individual Stocks",
      url: "/dashboard/individual-stocks",
      icon: ChartCandlestick,
    },
    { title: "Import CSV", url: "/dashboard/import", icon: Upload },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const activeItem = menuItems.find((item) => isActive(item.url));

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen
          bg-background border-r border-border
          transition-all duration-300
          ${collapsed ? "w-16" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <span className="text-lg font-semibold text-foreground">
              NEPSE Journal
            </span>
          )}

            <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex lg:hidden p-2 rounded-md hover:bg-muted transition"
            >
            <Menu size={18} className="text-foreground" />
          </button>

        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-3 mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.url);

            return (
              <Link
                key={item.url}
                href={item.url}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors duration-200
                  ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Top Navbar */}
      <header
        className={`
          flex h-14 items-center gap-3 border-b bg-background px-4
          transition-all duration-300
          ${collapsed ? "lg:ml-16" : "lg:ml-64"}
        `}
      >
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Separator orientation="vertical" className="h-4 lg:hidden" />

        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {activeItem && activeItem.url !== "/dashboard" && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{activeItem.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </header>
    </>
  );
}
