/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { Groups } from "./pages/Groups";
import { GroupDetail } from "./pages/GroupDetail";
import { Settlements } from "./pages/Settlements";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { LandingPage } from "./pages/LandingPage";
import { Onboarding } from "./components/Onboarding";
import { NetworkHub } from "./pages/NetworkHub";
import { Loader2 } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faScaleBalanced, faStar } from "@fortawesome/free-solid-svg-icons";

const MainRouter: React.FC = () => {
  const { currentRoute, isLoadingAuth, user, profile, theme } = useApp();

  if (isLoadingAuth) {
    return (
      <div className={`w-screen h-screen flex flex-col justify-center items-center gap-4 transition-colors duration-300 ${
        theme === "dark" ? "bg-slate-950 text-white" : "bg-[#F9FAFB] text-slate-800"
      }`}>
        <Loader2 className={`w-8 h-8 animate-spin ${theme === "dark" ? "text-cyan-400" : "text-black"}`} />
        <span className="text-xs font-semibold text-gray-400 font-mono tracking-widest uppercase flex items-center gap-1.5">
          Initializing Dispute...
          <FontAwesomeIcon icon={faScaleBalanced} className="text-cyan-400" />
          <FontAwesomeIcon icon={faStar} className="text-yellow-400 animate-pulse text-[10px]" />
        </span>
      </div>
    );
  }

  // Prevent accessing protected views if not logged in
  if (!user) {
    return <LandingPage />;
  }

  // Redirect to Onboarding if profile is not completed
  if (profile && profile.isOnboarded === false) {
    return <Onboarding />;
  }

  return (
    <div className={`min-h-screen font-sans flex flex-col md:flex-row transition-colors duration-300 ${
      theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-[#F9FAFB] text-slate-800"
    }`}>
      {/* SIDEBAR OR MOBILE HEADER CONTAINER */}
      <Navbar />
      
      {/* MAIN VIEWPORT PORTAL */}
      <main className="flex-1 min-h-screen md:h-screen md:overflow-y-auto pb-16 md:pb-0 px-4 md:px-8 py-6">
        {currentRoute.path === "/login" && <LandingPage />}
        {currentRoute.path === "/dashboard" && <Dashboard />}
        {currentRoute.path === "/groups" && <Groups />}
        {currentRoute.path === "/groups/[id]" && <GroupDetail />}
        {currentRoute.path === "/settlements" && <Settlements />}
        {currentRoute.path === "/network" && <NetworkHub />}
        {currentRoute.path === "/reports" && <Reports />}
        {currentRoute.path === "/settings" && <Settings />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
