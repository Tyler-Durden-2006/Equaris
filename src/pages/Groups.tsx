/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../lib/firebase";
import { collection, getDocs, doc } from "firebase/firestore";
import { dbSetDoc } from "../lib/firestoreQuery";
import { 
  Users, 
  Plus, 
  X, 
  Tag, 
  IndianRupee, 
  HelpCircle, 
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  FolderOpen,
  Info,
  Loader2,
  Check
} from "lucide-react";

export const Groups: React.FC = () => {
  const { user, profile, groups, navigate, theme } = useApp();
  
  // Create group form state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  
  // Real friends list state
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Load verified connected friends
  const loadEligibleFriends = async () => {
    if (!profile || !showModal) return;
    setLoadingFriends(true);
    try {
      const list: any[] = [];
      const q = collection(db, "users");
      const snap = await getDocs(q);
      const friendsUids = profile.friends || [];
      
      snap.forEach((docSnap) => {
        const uData = docSnap.data();
        if (friendsUids.includes(uData.uid)) {
          list.push(uData);
        }
      });
      setFriendsList(list);
    } catch (err) {
      console.error("Error loading eligible friends for groups:", err);
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    loadEligibleFriends();
  }, [profile, showModal]);

  // Toggle friend selection helper
  const handleToggleFriend = (f: any) => {
    if (selectedFriends.some((item) => item.uid === f.uid)) {
      setSelectedFriends(selectedFriends.filter((item) => item.uid !== f.uid));
    } else {
      setSelectedFriends([...selectedFriends, f]);
    }
  };

  // Dispatch group creation
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !name.trim()) return;

    try {
      const newGroupId = `group_${Date.now()}`;
      
      // Combine current user with selected verified connections
      const memberUids = [user.uid, ...selectedFriends.map((f) => f.uid)];
      const namesRecord: Record<string, string> = {
        [user.uid]: profile.name || "Me",
      };
      
      selectedFriends.forEach((f) => {
        namesRecord[f.uid] = f.name;
      });

      // Write group node securely
      const groupData = {
        id: newGroupId,
        name: name.trim(),
        description: description.trim(),
        createdBy: user.uid,
        members: memberUids,
        memberNames: namesRecord,
        budget: Number(budget) || 25000,
        createdAt: new Date().toISOString()
      };

      await dbSetDoc("groups", newGroupId, groupData);

      // Log initialization activity
      const activityId = `act_${Date.now()}`;
      await dbSetDoc(`groups/${newGroupId}/activities`, activityId, {
        id: activityId,
        groupId: newGroupId,
        category: "group_created",
        message: `${profile.name} created the dispute group "${name.trim()}".`,
        actorId: user.uid,
        createdAt: new Date().toISOString()
      });

      // Reset Form State
      setName("");
      setDescription("");
      setBudget("");
      setSelectedFriends([]);
      setShowModal(false);
      
      navigate("/groups/[id]", { id: newGroupId });
    } catch (err) {
      console.error("Failed to commit group structure:", err);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-gray-100 dark:border-white/5 pb-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-400 font-mono tracking-widest uppercase font-bold">Ledgers</span>
          <h1 className="font-sans font-black text-3.5xl tracking-tight leading-none uppercase">My Groups</h1>
          <p className="text-sm text-gray-500">
            Keep track of roommate splits, restaurant checkouts, or travel shares.
          </p>
        </div>

        <button
          id="show-create-group-modal-btn"
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 py-3 px-5 font-bold font-mono text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-colors shrink-0 ${
            theme === "dark" ? "bg-cyan-500 text-black hover:bg-cyan-400" : "bg-black text-white hover:bg-slate-800"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>New Group</span>
        </button>
      </div>

      {/* Main card list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((g) => (
          <div
            key={g.id}
            onClick={() => navigate("/groups/[id]", { id: g.id })}
            className={`border rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between gap-6 group shadow-3xs ${
              theme === "dark" 
                ? "bg-slate-900/60 border-white/5 hover:border-cyan-500/30" 
                : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-lg uppercase ${
                  theme === "dark" ? "bg-slate-950 border border-white/5 text-cyan-400" : "bg-slate-50 border border-slate-150 text-slate-700"
                }`}>
                  {g.name[0]}
                </div>
                <span className={`text-[9px] font-mono select-none px-2 py-0.5 border rounded-full font-bold ${
                  theme === "dark" ? "border-cyan-500/20 text-cyan-400 bg-cyan-500/5 bg-opacity-20" : "border-slate-150 text-slate-500 bg-slate-50"
                }`}>ACTIVE</span>
              </div>

              <div className="flex flex-col">
                <h3 className="text-sm font-bold tracking-tight transition-colors group-hover:text-cyan-400">{g.name}</h3>
                {g.description && <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">{g.description}</p>}
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-white/5 pt-4 flex justify-between items-center text-[11px]">
              <span className="text-gray-400 flex items-center gap-1 font-mono font-medium">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                {g.members.length} MEMBERS
              </span>
              <span className="text-gray-400 font-bold flex items-center font-mono">
                ₹{g.budget?.toLocaleString("en-IN") || "0"} SPEND LIMIT
              </span>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className={`col-span-full border-2 border-dashed rounded-3xl p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3 ${
            theme === "dark" ? "border-white/5" : "border-gray-200"
          }`}>
            <FolderOpen className="w-8 h-8 text-gray-500" />
            <p className="text-xs font-mono font-bold max-w-sm">
              You don't belong to any groups yet. Tap "New Group" to start building your share pool!
            </p>
          </div>
        )}
      </div>

      {/* Create Group Modal Backdrop Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg p-6 sm:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto shadow-2xl transition-all duration-300 ${
            theme === "dark" ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200"
          }`}>
            {/* Modal title */}
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-white/5">
              <h2 className="font-sans font-black text-lg uppercase tracking-tight">Create Dispute Group</h2>
              <button
                id="close-group-modal-btn"
                onClick={() => {
                  setSelectedFriends([]);
                  setShowModal(false);
                }}
                className="text-gray-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input fields */}
            <form onSubmit={handleCreateGroup} className="flex flex-col gap-5 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono tracking-widest uppercase text-gray-400 font-bold">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Goa Trip 🌊, Flatmates 2B, Weekend Chai"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full text-xs py-3 px-4 rounded-xl border focus:outline-none transition-all ${
                    theme === "dark" 
                      ? "bg-slate-950/60 border-white/10 focus:border-cyan-500 text-white" 
                      : "bg-slate-50 border-slate-200 focus:border-black text-slate-800"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono tracking-widest uppercase text-gray-400 font-bold">What is this pool for?</label>
                <textarea
                  placeholder="e.g. Rent, food split-settlements, and scuba tickets"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full text-xs py-3 px-4 rounded-xl border focus:outline-none transition-all resize-none h-16 ${
                    theme === "dark" 
                      ? "bg-slate-950/60 border-white/10 focus:border-cyan-500 text-white" 
                      : "bg-slate-50 border-slate-200 focus:border-black text-slate-800"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono tracking-widest uppercase text-gray-400 font-bold">Aggregate spend Limit (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs leading-none">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 35000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className={`w-full text-xs py-3 pl-8 pr-3 rounded-xl border focus:outline-none transition-all h-9.5 ${
                      theme === "dark" 
                        ? "bg-slate-950/60 border-white/10 focus:border-cyan-500 text-white" 
                        : "bg-slate-50 border-slate-200 focus:border-black text-slate-800"
                    }`}
                  />
                </div>
              </div>

              {/* Members configuration block from true reciprocated follow connections */}
              <div className="border-t border-gray-150 dark:border-white/5 pt-4 flex flex-col gap-3">
                <label className="text-[10px] font-mono tracking-widest uppercase text-gray-400 font-bold flex justify-between">
                  <span>SELECT VERIFIED MEMBERS</span>
                  <span className="text-cyan-400 font-bold">[ YOU ARE AUTOMATICALLY MEMBER ]</span>
                </label>

                {loadingFriends ? (
                  <div className="flex py-4 justify-center">
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  </div>
                ) : friendsList.length === 0 ? (
                  /* REDIRECT BANNER IF NO CONNECTIONS */
                  <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
                    theme === "dark" ? "bg-amber-500/5 border-amber-500/10 text-amber-500" : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <div className="flex flex-col gap-0.5 text-xs font-medium">
                        <span className="font-bold uppercase font-mono">No Connections Verified</span>
                        <span>Dispute forces a safe network: Only mutually accepted friends are eligible to join sharing groups. Connect with members first!</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFriends([]);
                        setShowModal(false);
                        navigate("/network");
                      }}
                      className={`py-2 px-3 self-start rounded-lg text-[10px] font-mono font-bold uppercase transition-transform hover:scale-[1.01] cursor-pointer ${
                        theme === "dark" ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-amber-600 text-white"
                      }`}
                    >
                      [ GOTO CONNECTIONS CENTER ]
                    </button>
                  </div>
                ) : (
                  /* FRIEND CHECKBOX GRID */
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                    {friendsList.map((f) => {
                      const isSelected = selectedFriends.some((item) => item.uid === f.uid);
                      return (
                        <div
                          key={f.uid}
                          onClick={() => handleToggleFriend(f)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected 
                              ? theme === "dark"
                                ? "bg-cyan-500/10 border-cyan-500 text-white"
                                : "bg-indigo-50 border-black text-black font-semibold"
                              : theme === "dark"
                                ? "bg-slate-950/60 border-white/5 text-slate-300 hover:border-white/10"
                                : "bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-mono text-xs overflow-hidden shrink-0">
                              {f.photoURL ? (
                                <img src={f.photoURL} alt={f.name} referrerPolicy="no-referrer" />
                              ) : (
                                <span>{f.name[0]}</span>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold leading-tight">{f.name} {f.surname || ""}</span>
                              <span className="text-[10px] text-gray-400 font-mono leading-none mt-1">@{f.username}</span>
                            </div>
                          </div>

                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected 
                              ? "bg-cyan-500 border-cyan-500 text-black" 
                              : "border-gray-300"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action trigger button */}
              {friendsList.length > 0 && (
                <button
                  type="submit"
                  id="create-group-submit-btn"
                  className={`w-full py-4 mt-4 rounded-xl font-bold font-mono text-xs tracking-wider uppercase shadow-md transition-all cursor-pointer ${
                    theme === "dark"
                      ? "bg-cyan-500 text-black hover:bg-cyan-400"
                      : "bg-black text-white hover:bg-slate-800"
                  }`}
                >
                  Create and initialize Ledger
                </button>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
