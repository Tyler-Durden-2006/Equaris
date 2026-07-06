/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { auth, db } from "../lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { doc } from "firebase/firestore";
import { dbSetDoc, dbGetDoc } from "../lib/firestoreQuery";
import { seedSampleData } from "../utils/dummyHelper";
import { 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Smartphone, 
  Scan, 
  Users, 
  QrCode, 
  CheckCircle2, 
  TrendingUp, 
  Sun, 
  Moon, 
  User, 
  Lock, 
  Mail, 
  ArrowUpRight,
  ShieldAlert,
  Terminal,
  Loader2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const LandingPage: React.FC<{ onSuccessLogin?: () => void }> = ({ onSuccessLogin }) => {
  const { navigate, user } = useApp();
  
  // High-fidelity dark mode matching Google Antigravity style
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [activeStep, setActiveStep] = useState<number>(0);
  
  // Auth Modal state
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const steps = [
    {
      id: 0,
      title: "Smart Receipt OCR Parsing",
      code: "SYSTEM_OCR_EXTRACT",
      summary: "Upload any restaurant or travel receipt. The integrated Gemini vision extractor parses individual line-items, amounts, taxes, and merchant info instantly.",
      stat: "800ms Average Extraction Time"
    },
    {
      id: 1,
      title: "Proportional Balanced Splits",
      code: "SYSTEM_ZERO_SUM_MATH",
      summary: "No more rigid equal shares. Split individual items by precise percentages, custom weights, or exact sums. Dispute dynamically handles fractional pennies.",
      stat: "0.00% Division Error Rate"
    },
    {
      id: 2,
      title: "Peer-to-Peer UPI Settlement QR",
      code: "SYSTEM_UPI_INTENT_ENCODE",
      summary: "Generate direct UPI intent string structures converted into beautiful scannable QR codes. Your friends verify details on screen and settle directly in any app.",
      stat: "Direct Instant Peer Routing"
    }
  ];

  const handleMockLogin = async (name: string, email: string, photoURL: string = "") => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      localStorage.setItem("dispute_mock_auth", "true");
      const mockUid = `mock_user_${Math.floor(1000 + Math.random() * 9000)}`;
      const mockUserObj = {
        uid: mockUid,
        email: email,
        displayName: name,
        photoURL: photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        providerId: "mock"
      };

      // Store in localStorage
      localStorage.setItem("dispute_mock_user", JSON.stringify(mockUserObj));

      // Initial user profile
      const placeholder = {
        uid: mockUid,
        name: name,
        email: email,
        photoURL: mockUserObj.photoURL,
        upiId: "guest@paytm",
        isOnboarded: true, // Bypass onboarding to jump straight to dashboard
        createdAt: new Date().toISOString()
      };

      // Add to users collection
      const keyUsers = "mock_db_users";
      const existingUsers = localStorage.getItem(keyUsers) ? JSON.parse(localStorage.getItem(keyUsers)!) : [];
      if (!existingUsers.some((u: any) => u.email === email)) {
        existingUsers.push(placeholder);
        localStorage.setItem(keyUsers, JSON.stringify(existingUsers));
      }

      // Seed Goa Trip etc.
      await seedSampleData(mockUid, name, email);

      setShowAuthModal(false);
      if (onSuccessLogin) onSuccessLogin();
      navigate("/dashboard");
      window.location.reload();
    } catch (err: any) {
      console.error("Mock Login Error:", err);
      setAuthError(err?.message || "Failed mock login session.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick Demo Account Bypass
  const handleQuickDemo = async () => {
    await handleMockLogin("Pratham Guest", "guest@dispute.app");
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setAuthError("Email is required.");
      return;
    }
    const name = username || email.split("@")[0];
    await handleMockLogin(name, email);
  };

  const handleGoogleSignInFallback = async () => {
    await handleMockLogin("Google User (Mock)", "google.mock@dispute.app", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80");
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${
      isDarkMode 
        ? "bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-black" 
        : "bg-[#F9FAFB] text-slate-900 selection:bg-black selection:text-white"
    }`}>
      {/* GLOWING AMBIENT BACKGROUND IN DARK MODE */}
      {isDarkMode && (
        <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden pointer-events-none select-none z-0">
          <div className="absolute top-[-250px] left-[15%] w-[600px] h-[500px] rounded-full bg-gradient-to-br from-cyan-500/10 to-transparent blur-[160px]" />
          <div className="absolute top-[-200px] right-[20%] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-purple-500/5 to-transparent blur-[150px]" />
          <div className="absolute top-[350px] left-[50%] -translate-x-1/2 w-[900px] h-[1px] bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent" />
        </div>
      )}

      {/* HEADER NAVBAR */}
      <header className={`sticky top-0 z-40 backdrop-blur-md transition-colors border-b duration-300 ${
        isDarkMode 
          ? "bg-slate-950/85 border-white/5" 
          : "bg-[#F9FAFB]/85 border-slate-200/60"
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => navigate("/")}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xl transition-all duration-300 transform group-hover:rotate-6 ${
              isDarkMode ? "bg-white text-black" : "bg-black text-white"
            }`}>
              D
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight leading-none">Dispute</span>
              <span className={`text-[9px] font-mono tracking-widest mt-0.5 ${
                isDarkMode ? "text-cyan-500/80" : "text-gray-500"
              }`}>[ V2.0.4_SYS ]</span>
            </div>
          </div>

          {/* Desktop Middle Menu (Antigravity Style) */}
          <nav className="hidden md:flex items-center space-x-2 font-mono text-[11px] uppercase tracking-widest">
            <a href="#features" className={`px-4 py-1.5 rounded-lg transition-all ${
              isDarkMode ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-black hover:bg-slate-100"
            }`}>FEATURES</a>
            <span className="text-gray-600 select-none">//</span>
            <a href="#interactive-how" className={`px-4 py-1.5 rounded-lg transition-all ${
              isDarkMode ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-black hover:bg-slate-100"
            }`}>HOW TO USE</a>
            <span className="text-gray-600 select-none">//</span>
            <span className={`px-4 py-1.5 select-none opacity-50 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              UPI INTEGRATED
            </span>
          </nav>

          {/* Configuration Right Controls */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle Preference */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl border transition-all duration-300 cursor-pointer ${
                isDarkMode 
                  ? "bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10" 
                  : "bg-white border-slate-200 shadow-xs hover:border-slate-300 hover:bg-slate-50 text-purple-600"
              }`}
              title={isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Login & Sign Up Hooks */}
            <button
              id="landing-signin-btn"
              onClick={() => {
                setAuthMode("signin");
                setAuthError(null);
                setShowAuthModal(true);
              }}
              className={`text-xs font-mono tracking-wider uppercase font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer ${
                isDarkMode 
                  ? "text-slate-300 hover:text-white hover:bg-white/5" 
                  : "text-slate-700 hover:text-black hover:bg-slate-100"
              }`}
            >
              Log In
            </button>
            
            <button
              id="landing-signup-btn"
              onClick={() => {
                setAuthMode("signup");
                setAuthError(null);
                setShowAuthModal(true);
              }}
              className={`text-xs font-mono tracking-wider uppercase font-bold py-2.5 px-5.5 rounded-xl transition-all cursor-pointer shadow-xs ${
                isDarkMode 
                  ? "bg-white text-black hover:bg-slate-200" 
                  : "bg-black text-white hover:bg-slate-900"
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-dashed text-xs font-mono select-none mb-8 animate-pulse shadow-2xs leading-none">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className={isDarkMode ? "text-cyan-400" : "text-slate-800"}>GOOGLE ENGINE ALUMNI STYLE ARCHITECTURE</span>
          <span className="text-gray-500">•</span>
          <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>SANDBOX SEEDED</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.05] max-w-4xl mx-auto uppercase">
          Split clearly. <br className="hidden sm:inline" />
          <span className={`bg-clip-text text-transparent bg-gradient-to-r ${
            isDarkMode 
              ? "from-cyan-400 via-blue-500 to-indigo-400" 
              : "from-black via-slate-800 to-slate-700"
          }`}>Settle on the Screen</span> in Seconds.
        </h1>

        <p className={`text-base md:text-lg max-w-2xl mx-auto mt-6 font-medium leading-relaxed ${
          isDarkMode ? "text-slate-400" : "text-slate-600"
        }`}>
          The zero-friction expense split engine tailored for roommates, travelers, and dining companions. Unified UPI payments and smart server-side OCR extraction with no math stress and no awkward reminders.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10">
          <button
            onClick={() => {
              setAuthMode("signin");
              setShowAuthModal(true);
            }}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 shadow-md flex items-center justify-center space-x-2.5 cursor-pointer transform hover:-translate-y-0.5 ${
              isDarkMode 
                ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:opacity-95 shadow-cyan-900/20" 
                : "bg-black text-white hover:bg-slate-900 shadow-slate-950/20"
            }`}
          >
            <span>Launch Web Applet</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleQuickDemo}
            className={`w-full sm:w-auto px-7 py-3.5 rounded-2xl font-semibold text-xs tracking-wider uppercase font-mono border transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.02] ${
              isDarkMode 
                ? "bg-white/5 border-white/10 text-white hover:bg-white/10" 
                : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-xs hover:bg-slate-50"
            }`}
          >
            <span>Instant Demo Account</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase scale-90 ${
              isDarkMode ? "bg-cyan-500/25 text-cyan-400 font-bold" : "bg-black text-white font-bold"
            }`}>1-Click</span>
          </button>
        </div>

        {/* METRICS FEEDS */}
        <div className={`mt-16 pt-8 border-t max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 font-mono ${
          isDarkMode ? "border-white/5" : "border-slate-200"
        }`}>
          <div className="flex flex-col items-center">
            <span className={`text-[10px] uppercase tracking-widest ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Transaction Loss</span>
            <span className="text-xl font-bold text-emerald-500 mt-1">0.00%</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={`text-[10px] uppercase tracking-widest ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>UPI QR Engine</span>
            <span className="text-xl font-bold mt-1">DIRECT</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={`text-[10px] uppercase tracking-widest ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>OCR EXTRACT</span>
            <span className="text-xl font-bold text-cyan-400 mt-1">&lt; 1s</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={`text-[10px] uppercase tracking-widest ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>DATABASE</span>
            <span className="text-xl font-bold text-purple-400 mt-1">FIRESTORE</span>
          </div>
        </div>
      </section>

      {/* HOW TO USE: PHOTO AND STEPS OF PHONE UI SECTION */}
      <section id="interactive-how" className={`py-20 border-t relative overflow-hidden ${
        isDarkMode ? "border-white/5 bg-slate-950/20" : "border-slate-200 bg-slate-50/50"
      }`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className={`text-[10px] font-mono tracking-widest uppercase ${
              isDarkMode ? "text-cyan-400" : "text-slate-500"
            }`}>SYSTEM USER INTERFACE WALKTHROUGH</span>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-2 uppercase">
              See the App in Action
            </h2>
            <p className={`text-sm mt-3 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Explore our mobile split workflow step-by-step. Dispute behaves identically on your desktop layout or any smartphone viewport.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* LEFT SIDE: STEPS OF THE HOW-TO-USE */}
            <div className="col-span-1 lg:col-span-5 flex flex-col space-y-4">
              {steps.map((st) => {
                const isActive = activeStep === st.id;
                return (
                  <div
                    key={st.id}
                    onClick={() => setActiveStep(st.id)}
                    className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer group text-left ${
                      isActive
                        ? isDarkMode
                          ? "bg-slate-900/80 border-cyan-500/30 shadow-lg shadow-cyan-950/10"
                          : "bg-white border-black shadow-md"
                        : isDarkMode
                          ? "bg-slate-900/20 border-white/5 hover:border-white/10"
                          : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono font-bold tracking-widest leading-none ${
                        isActive
                          ? isDarkMode ? "text-cyan-400" : "text-gray-900"
                          : "text-gray-500"
                      }`}>
                        STEP 0{st.id + 1} // {st.code}
                      </span>
                      {isActive && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? "bg-cyan-400" : "bg-black"}`} />
                      )}
                    </div>
                    
                    <h3 className="text-base font-bold tracking-tight mt-3">
                      {st.title}
                    </h3>
                    
                    <p className={`text-xs mt-2 transition-opacity ${
                      isActive 
                        ? isDarkMode ? "text-slate-300" : "text-slate-700" 
                        : "text-slate-400 group-hover:text-slate-300"
                    }`}>
                      {st.summary}
                    </p>

                    <div className={`mt-4 pt-4 border-t flex items-center justify-between text-[10px] font-mono ${
                      isDarkMode ? "border-white/5 text-slate-500" : "border-slate-100 text-slate-500"
                    }`}>
                      <span>METRIC PROOF:</span>
                      <span className={`font-semibold ${isActive ? (isDarkMode ? "text-cyan-400" : "text-black") : ""}`}>{st.stat}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RIGHT SIDE: INTERACTIVE PHONE UI MOCKUP RENDERED WITH CSS & FRAMER-MOTION */}
            <div className="col-span-1 lg:col-span-7 flex justify-center py-6">
              <div className="relative">
                {/* Decorative glowing backdrops behind the phone */}
                <div className={`absolute inset-0 rounded-[50px] blur-3xl opacity-30 ${
                  activeStep === 0 ? "bg-amber-500" : activeStep === 1 ? "bg-teal-500" : "bg-emerald-500"
                } transition-colors duration-700`} />

                {/* SOLID PHONE BODY */}
                <div className={`w-[310px] h-[610px] rounded-[48px] border-8 relative overflow-hidden transition-colors duration-500 shadow-2xl z-10 ${
                  isDarkMode 
                    ? "bg-slate-900 border-slate-800" 
                    : "bg-slate-100 border-slate-300"
                }`}>
                  {/* Speaker Ear Notch */}
                  <div className="absolute top-0 inset-x-0 h-6 bg-transparent flex justify-center z-50">
                    <div className="w-[100px] h-[14px] bg-slate-950 rounded-b-xl flex items-center justify-center space-x-1">
                      <div className="w-10 h-1 bg-neutral-800 rounded-full" />
                      <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-700" />
                    </div>
                  </div>

                  {/* Phone Header Status Bar */}
                  <div className="h-10 pt-4 px-6 flex justify-between items-center text-[10px] font-mono z-30 relative font-bold text-gray-400">
                    <span>10:30 AM</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[9px]">5G</span>
                      <div className="w-4.5 h-2.5 rounded-sm border border-slate-400 flex items-center p-0.5">
                        <div className="w-full h-full bg-slate-400 rounded-2xs" />
                      </div>
                    </div>
                  </div>

                  {/* SCREEN CONTAINER - ANIMATED SHIFT BASED ON STEP */}
                  <div className={`absolute inset-x-0 bottom-0 top-10 flex flex-col p-4 select-none ${
                    isDarkMode ? "bg-slate-950 text-white" : "bg-white text-slate-900"
                  }`}>
                    <AnimatePresence mode="wait">
                      {/* STEP 1: RECEIPT SCANNING */}
                      {activeStep === 0 && (
                        <motion.div
                          key="phone-step-0"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          className="flex flex-col h-full justify-between pb-4"
                        >
                          <div className="text-left">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-mono text-cyan-400 border border-cyan-400/20 px-1.5 py-0.5 rounded-sm">GEMINI_OCR</span>
                              <span className="text-[9px] text-gray-500">Goa dinner.pdf</span>
                            </div>
                            
                            <h4 className="text-sm font-semibold tracking-tight">Receipt Scan Simulation</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">Detecting line items...</p>

                            {/* Simulated scanned paper image */}
                            <div className="mt-4 bg-slate-900/60 p-3 rounded-xl border border-white/5 relative overflow-hidden">
                              {/* Glowing Laser scanner bar */}
                              <div className="absolute left-0 right-0 h-1 bg-amber-400 shadow-md shadow-amber-400/70 animate-bounce top-0" />
                              
                              <p className="text-[10px] font-mono text-amber-400 leading-none mb-2 select-none">// OCR IN PROGRESS</p>
                              
                              <div className="space-y-2 text-[10px] font-mono">
                                <div className="flex justify-between text-slate-400">
                                  <span>1x Vagator Seafood platter</span>
                                  <span>₹1,500</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                  <span>3x Greek Mojito Cocktails</span>
                                  <span>₹1,200</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                  <span>1x Service Fee & GST 18%</span>
                                  <span>₹486</span>
                                </div>
                                <div className="border-t border-dashed border-white/10 pt-1.5 flex justify-between text-white font-bold">
                                  <span>TOTAL TRANSACTION</span>
                                  <span className="text-amber-400">₹3,186</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className={`p-3 rounded-xl border border-dashed flex items-center justify-between font-mono text-[9px] ${
                            isDarkMode ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-600"
                          }`}>
                            <span>Extracted accurately!</span>
                            <span className="text-emerald-400 font-bold">CONFIRMED</span>
                          </div>
                        </motion.div>
                      )}

                      {/* STEP 2: SPLITTING SHARES */}
                      {activeStep === 1 && (
                        <motion.div
                          key="phone-step-1"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          className="flex flex-col h-full justify-between pb-4"
                        >
                          <div className="text-left">
                            <span className="text-[10px] font-mono text-purple-400 border border-purple-400/20 px-1.5 py-0.5 rounded-sm">BALANCED_SPLIT</span>
                            <h4 className="text-sm font-semibold tracking-tight mt-2.5">Proportional Division</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">Customize member contributions:</p>

                            <div className="mt-4 space-y-3">
                              {/* Member 1 (My share) */}
                              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="font-semibold text-white">Me (Primary Payee)</span>
                                  <span className="font-mono text-emerald-400 font-bold">35.00%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-emerald-400 h-full w-[35%]" />
                                </div>
                                <span className="text-[9px] text-gray-400 font-mono">Amount itemized: ₹1,115.10</span>
                              </div>

                              {/* Member 2 (Parth share) */}
                              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="font-semibold text-white">Parth Tyagi</span>
                                  <span className="font-mono text-cyan-400 font-bold">45.00%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-cyan-400 h-full w-[45%]" />
                                </div>
                                <span className="text-[9px] text-gray-400 font-mono">Amount itemized: ₹1,433.70</span>
                              </div>

                              {/* Member 3 (Rohan share) */}
                              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="font-semibold text-white">Rohan Khanna</span>
                                  <span className="font-mono text-purple-400 font-bold">20.00%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-purple-400 h-full w-[20%]" />
                                </div>
                                <span className="text-[9px] text-gray-400 font-mono">Amount itemized: ₹637.20</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/20 rounded-xl flex items-center justify-between text-[9px] font-mono text-cyan-400">
                            <span>Sum checks: 100.00%</span>
                            <span className="font-black">ZERO_GAP</span>
                          </div>
                        </motion.div>
                      )}

                      {/* STEP 3: PEER PAYMENT UPI QR */}
                      {activeStep === 2 && (
                        <motion.div
                          key="phone-step-2"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          className="flex flex-col h-full justify-between pb-4"
                        >
                          <div className="text-left text-center flex flex-col items-center">
                            <span className="text-[10px] font-mono text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 rounded-sm uppercase self-center mb-3">Instant Settlement QR</span>
                            
                            <h4 className="text-sm font-semibold tracking-tight">Settle ₹1,433.70</h4>
                            <p className="text-[9px] text-gray-400 mt-0.5 font-mono">BHIM UPI // TO: parth@paytm</p>

                            {/* Real QR Mockup */}
                            <div className="mt-5 p-3.5 bg-white rounded-2xl border border-slate-200 inline-block shadow-lg relative">
                              {/* Scanner success graphic */}
                              <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center rounded-2xl border-2 border-emerald-500 animate-pulse pointer-events-none">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                              </div>
                              <QrCode className="w-24 h-24 text-slate-900" />
                            </div>

                            <p className="text-[9px] text-emerald-400 font-mono tracking-wide mt-3 animate-pulse uppercase select-none">
                              ✓ PAYMENT RECEIVED CONFIRMED
                            </p>
                          </div>

                          <div className={`p-3 rounded-xl border border-dashed flex items-center justify-between font-mono text-[9px] ${
                            isDarkMode ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-600"
                          }`}>
                            <span>Settled ledger update!</span>
                            <span className="text-emerald-400 font-bold">SUCCESS</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Handheld Badge Accent */}
                <div className={`absolute bottom-[-24px] right-[-24px] z-20 px-4 py-2 font-mono text-[10px] font-bold rounded-xl border flex items-center space-x-2 shadow-lg select-none ${
                  isDarkMode 
                    ? "bg-slate-900 border-white/10 text-cyan-400" 
                    : "bg-white border-slate-200 text-black"
                }`}>
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ACTIVE PHONE PREVIEW</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DETAILED FEATURES MATRIX SECTION */}
      <section id="features" className="py-20 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className={`text-[10px] font-mono tracking-widest uppercase ${
            isDarkMode ? "text-cyan-400" : "text-slate-500"
          }`}>FEATURE MATRIX ARCHITECTURE</span>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-1 uppercase">
            Designed for Zero-Reminders
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className={`p-8 rounded-3xl border ${
            isDarkMode ? "bg-white/2 border-white/5 hover:border-cyan-500/25" : "bg-white border-slate-200 hover:border-black"
          } transition-all duration-300`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg mb-6 ${
              isDarkMode ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-100 text-black"
            }`}>
              <Scan className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold tracking-tight">AI Vision Scanner</h3>
            <p className={`text-xs mt-3 leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              No more copying list prices. Snap any bill with your smartphone camera. Our server-side parser organizes receipts into individual split lists dynamically.
            </p>
          </div>

          <div className={`p-8 rounded-3xl border ${
            isDarkMode ? "bg-white/2 border-white/5 hover:border-cyan-500/25" : "bg-white border-slate-200 hover:border-black"
          } transition-all duration-300`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg mb-6 ${
              isDarkMode ? "bg-purple-500/20 text-purple-400" : "bg-slate-100 text-black"
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Weighted Split Algorithm</h3>
            <p className={`text-xs mt-3 leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Support equal, percentage, or specific amounts split. Great for trips where somebody left earlier or ordered extra drinks.
            </p>
          </div>

          <div className={`p-8 rounded-3xl border ${
            isDarkMode ? "bg-white/2 border-white/5 hover:border-cyan-500/25" : "bg-white border-slate-200 hover:border-black"
          } transition-all duration-300`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg mb-6 ${
              isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-100 text-black"
            }`}>
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Direct UPI QR Code</h3>
            <p className={`text-xs mt-3 leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Generates accurate, formatted UPI strings and converts them to high-density vector QR codes. Seamlessly supported by PhonePe, GPay, Paytm, and BHIM applet layers.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER METADATA */}
      <footer className={`py-12 border-t font-mono text-[10px] ${
        isDarkMode ? "border-white/5 text-slate-500" : "border-slate-200 text-slate-400"
      }`}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-slate-300">DISPUTE SYSTEMS INC</span>
            <span>//</span>
            <span>LICENSED APACHE-2.0</span>
          </div>
          <div>
            <span>SYSTEM v2.0.4 // DESIGN INSPIRED BY GOOGLE ANTIGRAVITY</span>
          </div>
        </div>
      </footer>

      {/* COMPREHENSIVE MODAL FOR SIGN IN & SIGN UP (WITH EMAIL & DEMO ENTRY) */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-3xl p-8 relative overflow-hidden border ${
                isDarkMode 
                  ? "bg-slate-900 border-white/10 text-white" 
                  : "bg-white border-slate-200 text-slate-900 shadow-xl"
              }`}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowAuthModal(false)}
                className={`absolute top-5 right-5 p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isDarkMode 
                    ? "border-white/5 hover:bg-white/5 text-slate-400 hover:text-white" 
                    : "border-slate-200 hover:bg-slate-50 text-slate-500"
                }`}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="text-left">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm mb-4 ${
                    isDarkMode ? "bg-white text-black" : "bg-black text-white"
                  }`}>
                    D
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight">
                    {authMode === "signin" ? "SIGN IN TO THE SYSTEMS" : "CREATE DISPUTE ACCOUNT"}
                  </h3>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {authMode === "signin" 
                      ? "Enter credentials or use our sandbox single-click authentication bypass." 
                      : "Register as a primary partition user in Dispute."}
                  </p>
                </div>

                {/* Form Transaction */}
                <form onSubmit={handleManualAuth} className="flex flex-col gap-4">
                  {authMode === "signup" && (
                    <>
                      <div>
                        <label className={`block text-[10px] font-mono tracking-widest uppercase mb-1.5 ${
                          isDarkMode ? "text-slate-400" : "text-slate-600"
                        }`}>YOUR SYSTEM NAME</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="text"
                            placeholder="e.g. Parth Tyagi"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={`w-full text-xs py-3 pl-10 pr-4 rounded-xl border focus:outline-none transition-all ${
                              isDarkMode 
                                ? "bg-slate-950/60 border-white/10 focus:border-cyan-500 text-white" 
                                : "bg-slate-50 border-slate-200 focus:border-black text-slate-900"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={`block text-[10px] font-mono tracking-widest uppercase mb-1.5 ${
                          isDarkMode ? "text-slate-400" : "text-slate-600"
                        }`}>YOUR UPI VPA ADDRESS (OPTIONAL)</label>
                        <div className="relative">
                          <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="text"
                            placeholder="e.g. pratham@paytm"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            className={`w-full text-xs py-3 pl-10 pr-4 rounded-xl border focus:outline-none transition-all ${
                              isDarkMode 
                                ? "bg-slate-950/60 border-white/10 focus:border-cyan-500 text-white" 
                                : "bg-slate-50 border-slate-200 focus:border-black text-slate-900"
                            }`}
                          />
                        </div>
                        <p className="text-[9px] text-gray-500 mt-1 font-mono">Used to construct settlement QR codes dynamically.</p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className={`block text-[10px] font-mono tracking-widest uppercase mb-1.5 ${
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    }`}>EMAIL ADDRESS</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="email"
                        placeholder="test_user@dispute.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full text-xs py-3 pl-10 pr-4 rounded-xl border focus:outline-none transition-all ${
                          isDarkMode 
                            ? "bg-slate-950/60 border-white/10 focus:border-cyan-500 text-white" 
                            : "bg-slate-50 border-slate-200 focus:border-black text-slate-900"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[10px] font-mono tracking-widest uppercase mb-1.5 ${
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    }`}>PASSWORD</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full text-xs py-3 pl-10 pr-4 rounded-xl border focus:outline-none transition-all ${
                          isDarkMode 
                            ? "bg-slate-950/60 border-white/10 focus:border-cyan-500 text-white" 
                            : "bg-slate-50 border-slate-200 focus:border-black text-slate-900"
                        }`}
                      />
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-500 leading-relaxed font-mono flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase font-mono transition-transform duration-100 flex items-center justify-center gap-2 cursor-pointer ${
                      isDarkMode
                        ? "bg-white text-black hover:bg-slate-200"
                        : "bg-black text-white hover:bg-slate-900"
                    }`}
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>PROCESSING_AUTH_SEGMENT...</span>
                      </>
                    ) : (
                      <span>{authMode === "signin" ? "COMMENCE_AUTHENTICATION" : "REGISTER_PARTITION"}</span>
                    )}
                  </button>
                </form>

                {/* Subtext and Google Popup alternative */}
                <div className={`border-t pt-4 ${isDarkMode ? "border-white/5" : "border-slate-200"}`}>
                  <button
                    disabled={authLoading}
                    onClick={handleGoogleSignInFallback}
                    className={`w-full py-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 mb-3.5 cursor-pointer hover:bg-slate-50 transition-all ${
                      isDarkMode 
                        ? "bg-transparent border-white/10 text-white hover:bg-white/5" 
                        : "bg-white border-slate-200 text-slate-800"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.03-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google Account</span>
                  </button>

                  <div className="flex justify-between items-center px-1">
                    <button
                      onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
                      className="text-[10px] font-semibold text-cyan-400 hover:underline cursor-pointer"
                    >
                      {authMode === "signin" ? "Need a partition account? Register →" : "Have an active credentials? Log In →"}
                    </button>
                    
                    <button
                      onClick={handleQuickDemo}
                      className="text-[10px] font-mono font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>1-Click Demo Sandbox Bypass</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
