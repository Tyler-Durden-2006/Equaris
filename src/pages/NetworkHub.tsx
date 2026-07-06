/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove 
} from "firebase/firestore";
import { dbGetDoc, dbSetDoc } from "../lib/firestoreQuery";
import { 
  Search, 
  UserPlus, 
  Check, 
  Clock, 
  Users, 
  UserMinus,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  QrCode, 
  Copy, 
  Share2, 
  UserPlus2, 
  HelpCircle, 
  UserCheck, 
  X, 
  AlertCircle,
  TrendingUp,
  MessageSquareCode,
  ArrowRight
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

export const NetworkHub: React.FC = () => {
  const { user, profile, theme } = useApp();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchedUser, setSearchedUser] = useState<any | null>(null);
  const [searchStatus, setSearchStatus] = useState<"idle" | "found" | "not_found">("idle");
  const [lastCheckedUsername, setLastCheckedUsername] = useState("");
  
  // Lists state
  const [friendsProfiles, setFriendsProfiles] = useState<any[]>([]);
  const [incomingProfiles, setIncomingProfiles] = useState<any[]>([]);
  const [outgoingProfiles, setOutgoingProfiles] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  
  // UI messages
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Load friends, incoming requests, and outgoing requests profiles on change of profile data
  const loadNetworkDetails = async () => {
    if (!profile) return;
    setLoadingLists(true);
    try {
      const friendsList = profile.friends || [];
      const receivedList = profile.receivedRequests || [];
      const sentList = profile.sentRequests || [];

      // Batch query users in segments or fetch singly for simplicity in Firestore
      const usersColRef = collection(db, "users");
      const friendsTemp: any[] = [];
      const incomingTemp: any[] = [];
      const outgoingTemp: any[] = [];

      // We can query inside the collection
      const qSnap = await getDocs(usersColRef);
      qSnap.forEach((docSnap) => {
        const uData = docSnap.data();
        if (friendsList.includes(uData.uid)) {
          friendsTemp.push(uData);
        } else if (receivedList.includes(uData.uid)) {
          incomingTemp.push(uData);
        } else if (sentList.includes(uData.uid)) {
          outgoingTemp.push(uData);
        }
      });

      setFriendsProfiles(friendsTemp);
      setIncomingProfiles(incomingTemp);
      setOutgoingProfiles(outgoingTemp);
    } catch (err) {
      console.error("Failed to load friend network details:", err);
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    loadNetworkDetails();
  }, [profile]);

  // Perform search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = searchQuery.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!formatted) return;

    setSearching(true);
    setSearchStatus("idle");
    setSearchedUser(null);
    setLastCheckedUsername(formatted);
    setFeedbackMsg(null);

    try {
      // 1. Resolve from central usernames index collection
      const usernameSnap = await dbGetDoc("usernames", formatted);
      if (usernameSnap && usernameSnap.exists()) {
        const ownerUid = usernameSnap.data()?.uid;
        
        // 2. Fetch target user's full profile info
        const userSnap = await dbGetDoc("users", ownerUid);
        if (userSnap && userSnap.exists()) {
          setSearchedUser(userSnap.data());
          setSearchStatus("found");
        } else {
          setSearchStatus("not_found");
        }
      } else {
        setSearchStatus("not_found");
      }
    } catch (err) {
      console.error("Error searching usernames:", err);
      setFeedbackMsg({ text: "Error searching databases. Try searching again.", error: true });
    } finally {
      setSearching(false);
    }
  };

  // Trigger follow / connection request
  const sendConnectionRequest = async (targetUid: string) => {
    if (!user || !profile) return;
    try {
      setFeedbackMsg(null);
      
      const userRef = doc(db, "users", user.uid);
      const targetRef = doc(db, "users", targetUid);

      // Add to current user's sentRequests
      await updateDoc(userRef, {
        sentRequests: arrayUnion(targetUid)
      });

      // Add to target user's receivedRequests
      await updateDoc(targetRef, {
        receivedRequests: arrayUnion(user.uid)
      });

      setFeedbackMsg({ text: `Connection request sent successfully to @${searchedUser?.username}!`, error: false });
      
      // Update local visual states immediately
      setSearchedUser((prev: any) => prev ? {
        ...prev,
        receivedRequests: [...(prev.receivedRequests || []), user.uid]
      } : null);

    } catch (err) {
      console.error("Request dispatch failed:", err);
      setFeedbackMsg({ text: "Could not send connection request. Try again.", error: true });
    }
  };

  // Accept Connection request
  const acceptConnectionRequest = async (senderUid: string) => {
    if (!user || !profile) return;
    try {
      setFeedbackMsg(null);
      const userRef = doc(db, "users", user.uid);
      const senderRef = doc(db, "users", senderUid);

      // Update current user: remove from receivedRequests, add to friends
      await updateDoc(userRef, {
        receivedRequests: arrayRemove(senderUid),
        friends: arrayUnion(senderUid)
      });

      // Update sender user: remove from sentRequests, add to friends
      await updateDoc(senderRef, {
        sentRequests: arrayRemove(user.uid),
        friends: arrayUnion(user.uid)
      });

      setFeedbackMsg({ text: "Great! You are now connected. You can now add each other to splitting groups!", error: false });
      
      // Reload instantly
      loadNetworkDetails();
    } catch (err) {
      console.error("Accept failed:", err);
      setFeedbackMsg({ text: "Failed to accept requested follower connection.", error: true });
    }
  };

  // Decline Connection request
  const declineConnectionRequest = async (senderUid: string) => {
    if (!user || !profile) return;
    try {
      setFeedbackMsg(null);
      const userRef = doc(db, "users", user.uid);
      const senderRef = doc(db, "users", senderUid);

      // Remove inbounds
      await updateDoc(userRef, {
        receivedRequests: arrayRemove(senderUid)
      });

      // Remove outbounds
      await updateDoc(senderRef, {
        sentRequests: arrayRemove(user.uid)
      });

      setFeedbackMsg({ text: "Connection request declined.", error: false });
      
      // Reload instantly
      loadNetworkDetails();
    } catch (err) {
      console.error("Decline failure:", err);
    }
  };

  // Copier trigger for invite template
  const copyInviteToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(text);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  // Generic invite strings
  const textInvite = `Hey! Join me on Dispute, a premium expense dividing platform for roommates and trips! Sign up using username @${profile?.username || "ledger"} and let's settle expenses easily. Get it here: ${window.location.origin}`;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-8">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-400 font-mono tracking-widest uppercase">Connection Core</span>
          <h1 className="font-sans font-black text-3.5xl tracking-tight leading-none uppercase flex items-center gap-2">
            Friends & Network
            <FontAwesomeIcon icon={faGlobe} className="text-cyan-400 text-2xl" />
          </h1>
          <p className="text-sm text-gray-500 leading-normal max-w-xl">
            Search unique handles, send follow requests, and accept connections. Only mutually connected users are eligible to join sharing groups.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT TWO COLUMNS: SEARCH & REQUESTS */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* SEARCH PROFILES FORUM CARD */}
          <div className={`p-6 rounded-2xl border transition-colors ${
            theme === "dark" ? "bg-slate-900/45 border-white/10" : "bg-white border-slate-200"
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono mb-4 text-gray-400 flex items-center gap-1.5">
              Search Accounts By handle
              <FontAwesomeIcon icon={faMagnifyingGlass} className="text-gray-400 text-xs" />
            </h3>
            
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-gray-400">@</span>
                <input
                  type="text"
                  required
                  placeholder="enter username (e.g. rohan_00)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className={`w-full text-xs py-3 pl-8 pr-4 rounded-xl border focus:outline-none transition-all ${
                    theme === "dark" 
                      ? "bg-slate-950/60 border-white/10 focus:border-cyan-500 text-white" 
                      : "bg-slate-50 border-slate-200 focus:border-black text-slate-800"
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className={`px-5 py-3 rounded-xl font-bold font-mono text-xs tracking-wider uppercase flex items-center gap-1.5 cursor-pointer ${
                  theme === "dark" 
                    ? "bg-cyan-500 text-black hover:bg-cyan-400" 
                    : "bg-black text-white hover:bg-slate-800"
                }`}
              >
                <Search className="w-4 h-4" />
                <span>{searching ? "SEARCHING..." : "FIND"}</span>
              </button>
            </form>

            {/* SEARCH RESULTS PORTAL */}
            <div className="mt-6">
              {searchStatus === "found" && searchedUser && (
                <div className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  theme === "dark" ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-gray-150"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center font-bold font-mono">
                      {searchedUser.photoURL ? (
                        <img src={searchedUser.photoURL} alt={searchedUser.name} referrerPolicy="no-referrer" />
                      ) : (
                        <span>{searchedUser.name?.[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold leading-non font-sans">{searchedUser.name} {searchedUser.surname || ""}</span>
                      <span className="text-xs text-cyan-500 font-mono mt-0.5">@{searchedUser.username}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{searchedUser.upiId || "No UPI linked"}</span>
                    </div>
                  </div>

                  {/* Actions based on relationship */}
                  <div>
                    {profile?.friends?.includes(searchedUser.uid) ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/10 text-emerald-400 font-mono font-semibold">
                        <Check className="w-3.5 h-3.5" /> VERIFIED CONNECTION
                      </span>
                    ) : profile?.sentRequests?.includes(searchedUser.uid) ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-yellow-500/10 text-yellow-500 font-mono">
                        <Clock className="w-3.5 h-3.5" /> OUTBOUND REQUEST SENT
                      </span>
                    ) : profile?.receivedRequests?.includes(searchedUser.uid) ? (
                      <button
                        onClick={() => acceptConnectionRequest(searchedUser.uid)}
                        className={`px-4 py-2 rounded-lg text-xs font-mono font-bold cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform ${
                          theme === "dark" ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-emerald-600 text-white hover:bg-emerald-500"
                        }`}
                      >
                        [ ACCEPT INBOUND CONNECTION ]
                      </button>
                    ) : searchedUser.uid === user?.uid ? (
                      <span className="text-xs text-gray-400 font-mono font-bold">[ INDIVISIBLE SYSTEM USER ]</span>
                    ) : (
                      <button
                        onClick={() => sendConnectionRequest(searchedUser.uid)}
                        className={`flex items-center gap-1.5 px-4 py-2 border rounded-lg text-xs font-mono font-bold cursor-pointer ${
                          theme === "dark" 
                            ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/15" 
                            : "border-black bg-black text-white hover:bg-slate-800"
                        }`}
                      >
                        <UserPlus2 className="w-3.5 h-3.5" />
                        <span>FOLLOW & CONNECT</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {searchStatus === "not_found" && (
                <div className={`p-6 rounded-xl border ${
                  theme === "dark" ? "bg-red-500/5 border-red-500/10" : "bg-red-50 border-red-100"
                }`}>
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold font-mono uppercase text-red-500">No account linked to @{lastCheckedUsername}</p>
                      <p className={`text-xs mt-1 leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                        This user is currently not on the platform. Send them an invite so they can set up their UPI address and coordinate split-settlements!
                      </p>
                      
                      {/* Copy Invitation Template */}
                      <div className="mt-4 flex flex-col gap-2">
                        <span className="text-[10px] font-mono uppercase text-gray-400">Invite SMS/WhatsApp Template:</span>
                        <div className={`p-3 rounded-lg border text-xs font-sans leading-relaxed break-all font-medium ${
                          theme === "dark" ? "bg-slate-950/60 border-white/5 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                        }`}>
                          {textInvite}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyInviteToClipboard(textInvite)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-500/10 hover:bg-gray-500/20 text-xs font-mono self-start cursor-pointer transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedIndex === textInvite ? "COPIED!" : "COPY CONNECTION INVITE"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {feedbackMsg && (
              <div className={`mt-4 p-4 rounded-xl border text-xs font-mono flex items-start gap-2 ${
                feedbackMsg.error 
                  ? "bg-red-500/5 border-red-500/10 text-red-400" 
                  : "bg-emerald-500/1s border-emerald-500/10 text-emerald-400 bg-emerald-550/5"
              }`}>
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{feedbackMsg.text}</span>
              </div>
            )}
          </div>

          {/* INCOMING REQUESTS BOARD */}
          <div className={`p-6 rounded-2xl border transition-colors ${
            theme === "dark" ? "bg-slate-900/45 border-white/10" : "bg-white border-slate-200"
          }`}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-gray-400">Incoming Connection Requests</h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                incomingProfiles.length > 0 ? "bg-yellow-500/10 text-yellow-500 animate-pulse" : "bg-gray-500/10 text-gray-400"
              }`}>
                {incomingProfiles.length} REQUESTS
              </span>
            </div>

            {incomingProfiles.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 font-mono text-center">No pending inbound network follow requests.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {incomingProfiles.map((reqUser) => (
                  <div
                    key={reqUser.uid}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                      theme === "dark" ? "bg-slate-950/60 border-white/5" : "bg-slate-50 border-slate-150"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full font-mono text-xs bg-gray-50 border border-gray-100 flex items-center justify-center">
                        {reqUser.photoURL ? (
                          <img src={reqUser.photoURL} alt={reqUser.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span>{reqUser.name?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{reqUser.name} {reqUser.surname || ""}</span>
                        <span className="text-[10px] text-cyan-400 font-mono">@{reqUser.username}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => acceptConnectionRequest(reqUser.uid)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                          theme === "dark" ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-emerald-600 text-white hover:bg-emerald-500"
                        }`}
                      >
                        ACCEPT
                      </button>
                      <button
                        onClick={() => declineConnectionRequest(reqUser.uid)}
                        className="px-3 py-1.5 border border-red-500/20 hover:bg-red-500/10 text-red-400 rounded-lg text-xs font-mono cursor-pointer"
                      >
                        DECLINE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: VERIFIED DIRECTORY */}
        <div className="flex flex-col gap-6">
          
          {/* VERIFIED CONNECTIONS GRAPH DIRECTORY */}
          <div className={`p-6 rounded-2xl border transition-colors ${
            theme === "dark" ? "bg-slate-900/45 border-white/10" : "bg-white border-slate-200"
          }`}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-gray-400">My Connections</h3>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                {friendsProfiles.length} VERIFIED
              </span>
            </div>

            {loadingLists ? (
              <div className="flex py-8 items-center justify-center">
                <Clock className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : friendsProfiles.length === 0 ? (
              <div className="text-center py-8 flex flex-col gap-3 justify-center items-center">
                <Users className="w-8 h-8 text-slate-500" />
                <p className="text-xs text-gray-400 max-w-sm px-4 leading-relaxed font-mono">
                  You do not have any verified network connections yet. Search usernames to follow your friends, and have them accept!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 max-h-[350px] overflow-y-auto pr-1">
                {friendsProfiles.map((fUser) => (
                  <div
                    key={fUser.uid}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      theme === "dark" ? "bg-slate-950/60 border-white/5" : "bg-slate-50 border-slate-150"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center font-mono text-xs overflow-hidden shrink-0">
                        {fUser.photoURL ? (
                          <img src={fUser.photoURL} alt={fUser.name} referrerPolicy="no-referrer" />
                        ) : (
                          <span>{fUser.name?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate leading-tight">{fUser.name} {fUser.surname || ""}</span>
                        <span className="text-[10px] text-cyan-400 font-mono leading-none mt-1">@{fUser.username}</span>
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono truncate mt-0.5">UPI: {fUser.upiId || "not linked"}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Verified Connected" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MY UNIQUE QR CODE & METADATA PROFILE BLOCK */}
          <div className={`p-6 rounded-2xl border transition-colors ${
            theme === "dark" ? "bg-slate-900/45 border-white/10 text-white" : "bg-stone-50 border-slate-200"
          }`}>
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/5 pb-3 mb-4">
              <QrCode className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold font-mono tracking-widest uppercase">My Active QR Profile</h4>
            </div>

            <div className="flex flex-col items-center justify-center text-center p-3">
              <div className={`p-3 rounded-2xl border mb-3 ${
                theme === "dark" ? "bg-white border-white" : "bg-white border-slate-200"
              }`}>
                {/* Visual clean aesthetic SVG QR Code representing pay-UPI string */}
                <svg className="w-24 h-24 text-slate-900" viewBox="0 0 100 100">
                  <path d="M5 5h30v30H5zm5 5v20h20V10zm5 5h10v10H15zm50-10h30v30H65zm5 5v20h20V10zm5 5h10v10H75ZM5 65h30v30H5zm5 5v20h20V70zm5 5h10v10H15zm50 0h15v5H65zm15 5h5v15h-5zm0-10v5h10v-5zm10 15h5v5h-5zm-20 5v5h10v-5zm10-5h5v10h-5zm-5 5h5v5h-5zm-15-10h5v10h-5z" fill="currentColor"/>
                </svg>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold uppercase">{profile?.name}</span>
                <span className="text-xs text-cyan-400 font-mono font-bold">@{profile?.username}</span>
                <span className="text-[10px] text-gray-500 font-mono mt-1 select-all">{profile?.upiId || "No UPI linked"}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
