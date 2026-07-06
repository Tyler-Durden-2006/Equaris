/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { logoutUser } from "../lib/firebase";
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
  X,
  Sun,
  Moon
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faScaleBalanced,
  faChartSimple,
  faUsers,
  faGlobe,
  faMoneyBillWave,
  faChartPie,
  faGear,
  faBolt,
  faHandshake,
  faSmile
} from "@fortawesome/free-solid-svg-icons";

export const Navbar: React.FC = () => {
  const { profile, currentRoute, navigate, theme, setTheme } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Link layout items with Font Awesome Icons
  const links = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutGrid, faIcon: faChartSimple },
    { label: "Groups", path: "/groups", icon: Layers, faIcon: faUsers },
    { label: "Network", path: "/network", icon: Users, faIcon: faGlobe },
    { label: "Settlements", path: "/settlements", icon: CreditCard, faIcon: faMoneyBillWave },
    { label: "Reports", path: "/reports", icon: PieChart, faIcon: faChartPie },
    { label: "Settings", path: "/settings", icon: SettingsIcon, faIcon: faGear },
  ];

  if (currentRoute.path === "/login") return null;

  const renderNavLinks = (isMobile: boolean) => {
    return links.map((link) => {
      const IconComponent = link.icon;
      const isActive = currentRoute.path === link.path || (link.path === "/groups" && currentRoute.path === "/groups/[id]");
      
      return (
        <button
          key={link.path}
          id={`${isMobile ? "mobile-" : ""}nav-${link.label.toLowerCase()}`}
          className={`flex items-between justify-between w-full px-3 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-all cursor-pointer ${
            isActive
              ? theme === "dark"
                ? "text-black bg-white shadow-sm"
                : "text-white bg-black shadow-sm"
              : theme === "dark"
                ? "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                : "text-slate-500 hover:bg-slate-55 hover:text-black"
          }`}
          onClick={() => {
            navigate(link.path);
            if (isMobile) setMobileMenuOpen(false);
          }}
        >
          <div className="flex items-center space-x-3">
            <IconComponent className="w-4 h-4" />
            <span>{link.label}</span>
          </div>
          <FontAwesomeIcon icon={link.faIcon} className={`text-xs ${isActive ? "text-black dark:text-black" : "text-slate-400"}`} />
        </button>
      );
    });
  };

  return (
    <>
      {/* SIDEBAR FOR DESKTOP */}
      <aside className={`hidden md:flex w-64 border-r flex-col p-6 space-y-8 min-h-screen sticky top-0 shrink-0 justify-between transition-colors duration-300 ${
        theme === "dark" 
          ? "bg-slate-900 border-white/5" 
          : "bg-white border-slate-100"
      }`}>
        <div className="flex flex-col space-y-8">
          {/* Brand Logo Header & Switcher */}
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center space-x-2 cursor-pointer select-none group"
              onClick={() => navigate("/dashboard")}
            >
              <div className={`w-8 h-8 rounded flex items-center justify-center font-black text-lg transition-transform group-hover:scale-105 ${
                theme === "dark" ? "bg-white text-black" : "bg-black text-white"
              }`}>
                D
              </div>
              <span className={`text-xl font-extrabold tracking-tight flex items-center gap-1.5 ${
                theme === "dark" ? "text-white" : "text-black"
              }`}>
                Dispute
                <FontAwesomeIcon icon={faScaleBalanced} className="text-sm text-gray-500 dark:text-cyan-400" />
              </span>
            </div>

            {/* Desktop Theme Switcher */}
            <button
              id="desktop-theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`p-2 rounded-lg border cursor-pointer transition-all ${
                theme === "dark" 
                  ? "border-white/10 hover:bg-slate-800 text-yellow-400 hover:border-yellow-400/30" 
                  : "border-slate-200 hover:bg-slate-100 text-purple-600 hover:border-purple-600/30"
              }`}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {renderNavLinks(false)}
          </nav>

          {/* Prompt card matching "Gemini Insight" in layout style */}
          <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
            theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-gray-50 border-gray-100"
          }`}>
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest leading-none flex items-center gap-1.5">
              Dispute System
              <FontAwesomeIcon icon={faBolt} className="text-yellow-400 text-[10px]" />
            </p>
            <p className={`text-[11px] leading-relaxed italic mt-1 ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}>
              "Split clearly. Settle up on the screen in seconds. No awkward reminders."
              <FontAwesomeIcon icon={faHandshake} className="ml-1 text-emerald-400 text-[10px]" />
            </p>
          </div>
        </div>

        {/* User Account / Profile Details Bottom Bar */}
        <div className={`border-t pt-4 flex items-center justify-between ${
          theme === "dark" ? "border-white/5" : "border-gray-100"
        }`}>
          {profile ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3 overflow-hidden">
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border border-gray-150 shrink-0"
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border uppercase font-black text-xs ${
                    theme === "dark" ? "bg-slate-800 border-white/5 text-white" : "bg-gray-100 border-gray-250 text-slate-800"
                  }`}>
                    {profile.name[0]}
                  </div>
                )}
                <div className="flex flex-col overflow-hidden">
                  <span className={`text-xs font-black truncate leading-none mb-1 ${
                    theme === "dark" ? "text-white" : "text-slate-800"
                  }`}>
                    {profile.name}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono truncate leading-none">
                    {profile.email}
                  </span>
                </div>
              </div>

              <button
                id="sidebar-logout-btn"
                onClick={() => setShowLogoutConfirm(true)}
                title="Log Out"
                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-500 text-gray-400 shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="w-full text-xs py-2 px-3 border border-black bg-black text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
            >
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* HORIZONTAL HEADER FOR MOBILE */}
      <header className={`md:hidden w-full h-16 flex items-center justify-between px-6 sticky top-0 z-40 transition-colors duration-300 ${
        theme === "dark" ? "bg-slate-900 border-b border-white/5" : "bg-white border-b border-gray-100"
      }`}>
        <div 
          className="flex items-center space-x-2 cursor-pointer select-none"
          onClick={() => navigate("/dashboard")}
        >
          <div className={`w-8 h-8 rounded flex items-center justify-center font-black text-lg ${
            theme === "dark" ? "bg-white text-black" : "bg-black text-white"
          }`}>
            D
          </div>
          <span className={`text-lg font-extrabold tracking-tight flex items-center gap-1 ${theme === "dark" ? "text-white" : "text-black"}`}>
            Dispute
            <FontAwesomeIcon icon={faScaleBalanced} className="text-xs text-gray-500 dark:text-cyan-400" />
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mobile Theme Toggle */}
          <button
            id="mobile-theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`p-2 rounded-lg border cursor-pointer ${
              theme === "dark" ? "border-white/10 text-yellow-400 bg-slate-950" : "border-slate-200 text-purple-600 bg-slate-50"
            }`}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {profile && (
            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-100 shrink-0">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-150 text-slate-800 flex items-center justify-center text-xs font-black uppercase">
                  {profile.name[0]}
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-1.5 rounded-lg border cursor-pointer ${
              theme === "dark" ? "border-white/10 text-slate-300" : "border-slate-200 text-gray-700"
            }`}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE NAV OVERLAY */}
      {mobileMenuOpen && (
        <div className={`md:hidden fixed inset-x-0 top-16 p-6 z-30 shadow-xl flex flex-col space-y-4 border-b ${
          theme === "dark" 
            ? "bg-slate-900 border-white/10 text-white shadow-black/80" 
            : "bg-white border-gray-150 text-slate-800 shadow-slate-100"
        }`}>
          <nav className="space-y-1.5">
            {renderNavLinks(true)}
          </nav>
          
          {profile && (
            <div className={`border-t pt-4 flex items-center justify-between ${theme === "dark" ? "border-white/5" : "border-gray-100"}`}>
              <span className="text-xs text-slate-400 font-mono truncate max-w-[180px]">
                UPI: {profile.upiId || "No UPI set"}
              </span>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sleek Dark Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className={`border rounded-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5 shadow-2xl transition-all duration-300 transform scale-100 ${
            theme === "dark" ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <LogOut className="w-6 h-6 animate-pulse" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold tracking-tight">Confirm Sign Out</h3>
              <p className={`text-xs mt-1.5 leading-relaxed ${theme === "dark" ? "text-zinc-400" : "text-slate-500"}`}>
                Are you sure you want to log out of your session? Quick access and system metrics will be here when you return!
                <FontAwesomeIcon icon={faSmile} className="ml-1 text-yellow-400 text-xs" />
              </p>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer text-center ${
                  theme === "dark"
                    ? "bg-transparent border-zinc-800 hover:bg-zinc-900 text-zinc-300"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  if (localStorage.getItem("dispute_mock_auth") === "true") {
                    localStorage.removeItem("dispute_mock_auth");
                    localStorage.removeItem("dispute_mock_user");
                    window.location.reload();
                  } else {
                    await logoutUser();
                  }
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors text-center"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
