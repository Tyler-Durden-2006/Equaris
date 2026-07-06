/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { dbSetDoc, dbGetDoc } from "../lib/firestoreQuery";
import { seedSampleData } from "../utils/dummyHelper";
import { 
  User, 
  Check, 
  Info, 
  CreditCard, 
  Sparkles, 
  AlertCircle,
  HelpCircle,
  Loader2,
  X,
  ChevronRight,
  Sun,
  Moon,
  LogOut
} from "lucide-react";
import { logoutUser } from "../lib/firebase";

export const Onboarding: React.FC = () => {
  const { user, profile, updateFullProfile, theme, setTheme } = useApp();
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [upiId, setUpiId] = useState("");
  
  // Validation / check states
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize fields if they came from Google auth profile
  useEffect(() => {
    if (profile) {
      if (profile.name) {
        const parts = profile.name.split(" ");
        setFirstName(parts[0] || "");
        if (parts.length > 1) {
          setSurname(parts.slice(1).join(" ") || "");
        }
      }
      if (profile.upiId) {
        setUpiId(profile.upiId);
      }
      if (profile.username) {
        setUsername(profile.username);
      }
    }
  }, [profile]);

  // Handle live / manual check of username availability
  const checkUsernameUniqueness = async (val: string) => {
    const clean = val.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!clean) {
      setUsernameAvailable(null);
      return;
    }
    if (clean.length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    setUsernameError(null);
    try {
      // Clean check using usernames index document
      const docRef = doc(db, "usernames", clean);
      const snap = await dbGetDoc("usernames", clean);
      
      if (snap && snap.exists()) {
        const ownerUid = snap.data()?.uid;
        if (ownerUid === user?.uid) {
          // It belongs to current user
          setUsernameAvailable(true);
        } else {
          setUsernameAvailable(false);
          setUsernameError("This username is already taken by another partition user.");
        }
      } else {
        // Query the users collection as a fallback double-check
        const q = query(collection(db, "users"), where("username", "==", clean));
        const qSnap = await getDocs(q);
        let existsInUsers = false;
        qSnap.forEach((docSnap) => {
          if (docSnap.id !== user?.uid) {
            existsInUsers = true;
          }
        });

        if (existsInUsers) {
          setUsernameAvailable(false);
          setUsernameError("This username is claimed in users collection.");
        } else {
          setUsernameAvailable(true);
        }
      }
    } catch (err) {
      console.error("Error check username:", err);
      setUsernameError("Error connecting to check server database.");
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Format input constraint: lowercase alphanumeric + underscores only
    const cleanVal = rawVal.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(cleanVal);
    setUsernameAvailable(null);
    setUsernameError(null);
  };

  // Run validation on submit
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);

    const fName = firstName.trim();
    const lName = surname.trim();
    const uName = username.trim().toLowerCase();
    const vpa = upiId.trim();

    if (!fName || !lName) {
      setErrorMsg("Please enter both your First Name and Surname.");
      return;
    }

    if (!uName) {
      setErrorMsg("Choose a unique system Username.");
      return;
    }

    if (usernameAvailable === false || usernameError) {
      setErrorMsg("Please select a unique username that is available.");
      return;
    }

    setSaving(true);

    try {
      // 1. Triple lock uniqueness verification
      const snap = await dbGetDoc("usernames", uName);
      if (snap && snap.exists() && snap.data()?.uid !== user.uid) {
        setUsernameAvailable(false);
        setErrorMsg("This username was captured just now. Please try another one.");
        setSaving(false);
        return;
      }

      // 2. Write the usernames reserving lock index
      await setDoc(doc(db, "usernames", uName), { uid: user.uid });

      // 3. Save profile metrics
      const cleanedProfile = {
        uid: user.uid,
        name: `${fName} ${lName}`,
        surname: lName,
        username: uName,
        upiId: vpa,
        email: user.email || "",
        photoURL: user.photoURL || "",
        isOnboarded: true,
        friends: profile?.friends || [],
        sentRequests: profile?.sentRequests || [],
        receivedRequests: profile?.receivedRequests || [],
        themePreference: theme,
        createdAt: profile?.createdAt || new Date().toISOString()
      };

      await dbSetDoc("users", user.uid, cleanedProfile);

      // 4. Seed goa-trip dummy data automatically so they have high quality sandbox items
      await seedSampleData(user.uid, `${fName} ${lName}`, user.email || "");

    } catch (err: any) {
      console.error("Onboarding setup failure:", err);
      setErrorMsg(err?.message || "Server write failed. Please try saving again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-6 ${
      theme === "dark" ? "bg-slate-950 text-white" : "bg-gray-50 text-slate-900"
    }`}>
      {/* Decorative gradients */}
      {theme === "dark" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
          <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[550px] bg-gradient-to-b from-cyan-500/10 to-transparent blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-purple-500/5 blur-[100px]" />
        </div>
      )}

      {/* Outer Floating Bar Header */}
      <div className="w-full max-w-lg mb-8 flex justify-between items-center z-10 px-2">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold ${
            theme === "dark" ? "bg-white text-black" : "bg-black text-white"
          }`}>
            D
          </div>
          <span className="font-bold uppercase tracking-widest text-xs font-mono">Dispute Systems</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Light / Dark preference during setup */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              theme === "dark" ? "border-white/10 hover:bg-white/5 text-yellow-400" : "border-slate-200 hover:bg-slate-100 text-purple-600"
            }`}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => logoutUser()}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-colors ${
              theme === "dark" 
                ? "border-white/5 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400" 
                : "border-slate-200 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600"
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Aborted</span>
          </button>
        </div>
      </div>

      {/* Main wizard Card */}
      <div className={`w-full max-w-lg p-8 md:p-10 rounded-3xl border z-10 relative overflow-hidden transition-all duration-300 ${
        theme === "dark" 
          ? "bg-slate-900/60 backdrop-blur-xl border-white/10 shadow-2xl" 
          : "bg-white border-slate-200/80 shadow-xl"
      }`}>
        <div className="flex flex-col gap-6 text-left">
          {/* Intro header */}
          <div>
            <div className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full border text-[10px] font-mono tracking-widest uppercase mb-4 ${
              theme === "dark" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 animate-pulse" : "bg-black text-white font-bold"
            }`}>
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Step 01: Set Up Profile Partition</span>
            </div>
            
            <h1 className="text-2xl font-extrabold tracking-tight uppercase leading-none">
              Complete Account Setup
            </h1>
            <p className={`text-xs mt-2 leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Welcome to Dispute! Setup your user identity credentials. Your peers will search your unique username and resolve payments directly to your assigned UPI address.
            </p>
          </div>

          <form onSubmit={handleOnboardSubmit} className="flex flex-col gap-5">
            {/* Split for First Name and Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] font-mono tracking-widest uppercase mb-1.5 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>FIRST NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parth"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`w-full text-xs py-3 px-4 rounded-xl border focus:outline-none transition-all ${
                    theme === "dark" 
                      ? "bg-slate-950/60 border-white/10 focus:border-cyan-500 text-white" 
                      : "bg-slate-50 border-slate-200 focus:border-black text-slate-900"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-mono tracking-widest uppercase mb-1.5 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>SURNAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tyagi"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className={`w-full text-xs py-3 px-4 rounded-xl border focus:outline-none transition-all ${
                    theme === "dark" 
                      ? "bg-slate-950/60 border-white/10 focus:border-cyan-500 text-white" 
                      : "bg-slate-50 border-slate-200 focus:border-black text-slate-900"
                  }`}
                />
              </div>
            </div>

            {/* Unique Username Form Check */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={`block text-[10px] font-mono tracking-widest uppercase ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>UNIQUE USERNAME RANGE</label>
                
                {username.trim().length >= 3 && (
                  <button
                    type="button"
                    onClick={() => checkUsernameUniqueness(username)}
                    disabled={checkingUsername}
                    className="text-[10px] font-bold text-cyan-500 hover:underline font-mono cursor-pointer"
                  >
                    {checkingUsername ? "CHECKING..." : "[ VERIFY AVAILABILITY ]"}
                  </button>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-gray-400">@</span>
                <input
                  type="text"
                  required
                  maxLength={18}
                  placeholder="parth_tyagi"
                  value={username}
                  onChange={handleUsernameChange}
                  className={`w-full text-xs py-3 pl-8 pr-4 rounded-xl border focus:outline-none transition-all ${
                    theme === "dark" 
                      ? "bg-slate-950/60 border-white/10 focus:border-cyan-500 text-white" 
                      : "bg-slate-50 border-slate-200 focus:border-black text-slate-900"
                  }`}
                />
              </div>

              {/* Unique validation indicators */}
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[9px] text-gray-500 font-mono">
                  Only lowercase alphabets, numbers, and underscores are allowed.
                </p>
                {usernameAvailable !== null && (
                  <div className="flex items-center space-x-1 font-mono text-[10px]">
                    {usernameAvailable ? (
                      <span className="text-emerald-500 flex items-center gap-0.5 font-bold">
                        <Check className="w-3.5 h-3.5" /> AVAILABLE
                      </span>
                    ) : (
                      <span className="text-red-500 font-bold">
                        TAKEN_ALREADY
                      </span>
                    )}
                  </div>
                )}
              </div>
              {usernameError && (
                <p className="text-[10px] text-red-500 mt-1 font-mono">{usernameError}</p>
              )}
            </div>

            {/* UPI ID (Secure peer billing string) */}
            <div>
              <label className={`block text-[10px] font-mono tracking-widest uppercase mb-1.5 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>UPI ID (VPA) ADDRESS</label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. parth@paytm or rohan@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className={`w-full text-xs py-3 pl-10 pr-4 rounded-xl border focus:outline-none transition-all ${
                    theme === "dark" 
                      ? "bg-slate-950/60 border-white/10 focus:border-cyan-500 text-white" 
                      : "bg-slate-50 border-slate-200 focus:border-black text-slate-900"
                  }`}
                />
              </div>
              <p className="text-[9px] text-gray-500 mt-1.5 font-mono">
                Mandatory for peer-to-peer settlement transaction QR code renders.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-550/10 border border-red-500/20 rounded-xl text-[11px] text-red-500 leading-relaxed font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Save Complete Action */}
            <button
              type="submit"
              disabled={saving || checkingUsername}
              className={`w-full py-4 mt-2 rounded-xl font-bold text-xs tracking-wider uppercase font-mono transition-transform duration-100 flex items-center justify-center gap-2 cursor-pointer ${
                theme === "dark"
                  ? "bg-cyan-500 text-black hover:bg-cyan-400"
                  : "bg-black text-white hover:bg-slate-900"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>COMMITTING_PARTITION_RECORDS...</span>
                </>
              ) : (
                <>
                  <span>CONFIRM & INITIALIZE LEDGER</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
