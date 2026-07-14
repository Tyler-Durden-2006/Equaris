/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { logoutUser } from "../lib/firebase";
import { cn } from "@/lib/utils";
import {
  User,
  LogOut,
  LayoutGrid,
  Users,
  Settings as SettingsIcon,
  PieChart,
  CreditCard,
  Layers,
  Menu,
} from "lucide-react";
import { EquarisLogo } from "./EquarisLogo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LINKS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutGrid },
  { label: "Groups", path: "/groups", icon: Layers },
  { label: "Network", path: "/network", icon: Users },
  { label: "Settlements", path: "/settlements", icon: CreditCard },
  { label: "Reports", path: "/reports", icon: PieChart },
  { label: "Profile", path: "/profile", icon: User },
  { label: "Settings", path: "/settings", icon: SettingsIcon },
];

export const Navbar: React.FC = () => {
  const { user, profile, currentRoute, navigate } = useApp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const displayName = profile?.nickname || profile?.name || user?.displayName || "Equaris User";
  const displayEmail = profile?.email || user?.email || "";
  const displayPhoto = profile?.photoURL || user?.photoURL || "";
  const avatarInitial = (displayName || "E").charAt(0).toUpperCase();

  if (currentRoute.path === "/login") return null;

  const isActive = (path: string) =>
    currentRoute.path === path || (path === "/groups" && currentRoute.path === "/groups/[id]");

  const go = (path: string) => {
    navigate(path);
    setSheetOpen(false);
  };

  const doLogout = async () => {
    setShowLogoutConfirm(false);
    if (localStorage.getItem("dispute_mock_auth") === "true") {
      localStorage.removeItem("dispute_mock_auth");
      localStorage.removeItem("dispute_mock_user");
      window.location.reload();
    } else {
      await logoutUser();
    }
  };

  const Brand = ({ onClick, className }: { onClick?: () => void; className?: string }) => (
    <button
      onClick={onClick}
      className={cn("group flex cursor-pointer select-none items-center gap-2.5 outline-none", className)}
    >
      <EquarisLogo className="h-7 w-auto shrink-0 transition-transform group-hover:scale-105" />
      <span className="font-heading text-xl font-bold tracking-tight">Equaris</span>
    </button>
  );

  const NavLinks = () => (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const Icon = link.icon;
        const active = isActive(link.path);
        return (
          <button
            key={link.path}
            id={`nav-${link.label.toLowerCase()}`}
            onClick={() => go(link.path)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {link.label}
          </button>
        );
      })}
    </nav>
  );

  const UserFooter = () => (
    <div className="flex items-center justify-between gap-2 border-t border-sidebar-border pt-4">
      <button
        onClick={() => go("/profile")}
        className="-m-1 flex min-w-0 cursor-pointer items-center gap-3 rounded-lg p-1 outline-none transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <Avatar className="size-9 shrink-0">
          {displayPhoto && <AvatarImage src={displayPhoto} alt={displayName} referrerPolicy="no-referrer" />}
          <AvatarFallback className="bg-sidebar-accent text-xs font-semibold uppercase text-sidebar-accent-foreground">
            {avatarInitial}
          </AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-col text-left">
          <span className="truncate text-xs font-semibold leading-tight text-sidebar-foreground">{displayName}</span>
          <span className="truncate font-mono text-[10px] leading-tight text-sidebar-foreground/55">{displayEmail}</span>
        </span>
      </button>
      <Button
        id="sidebar-logout-btn"
        variant="ghost"
        size="icon-sm"
        onClick={() => setShowLogoutConfirm(true)}
        aria-label="Sign out"
        className="shrink-0 cursor-pointer text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
      >
        <LogOut />
      </Button>
    </div>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="sticky top-0 hidden min-h-screen w-64 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar p-6 text-sidebar-foreground md:flex">
        <div className="flex flex-col gap-8">
          <Brand onClick={() => navigate("/dashboard")} />

          <NavLinks />

          <div className="flex flex-col gap-1.5 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/60">
              Equaris
            </p>
            <p className="text-xs leading-relaxed text-sidebar-foreground/80">
              Split clearly. Settle up on the screen in seconds. No awkward reminders.
            </p>
          </div>
        </div>

        {user && <UserFooter />}
      </aside>

      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background px-6 md:hidden">
        <Brand onClick={() => navigate("/dashboard")} className="text-primary" />

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button variant="outline" size="icon-sm" aria-label="Open menu" className="cursor-pointer">
                <Menu />
              </Button>
            }
          />
          <SheetContent
            side="left"
            className="w-72 border-sidebar-border bg-sidebar p-6 text-sidebar-foreground"
          >
            <SheetHeader className="p-0">
              <SheetTitle className="text-sidebar-foreground">
                <Brand onClick={() => go("/dashboard")} />
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-1 flex-col justify-between">
              <NavLinks />
              {user && <UserFooter />}
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* LOGOUT CONFIRMATION — destructive action → alert-dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of Equaris?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign back in to view your groups and settle up. Your data stays exactly where it is.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" size="default" className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={doLogout}
              className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
