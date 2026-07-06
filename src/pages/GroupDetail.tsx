/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { dbSetDoc, dbAddDoc, dbDeleteDoc, dbUpdateDoc } from "../lib/firestoreQuery";
import { calculateBalances, generateSettlementSuggestions } from "../lib/settleEngine";
import QRCode from "qrcode";
import { 
  Users, 
  Plus, 
  UploadCloud, 
  ArrowRight, 
  CheckCircle,
  FileText, 
  Activity as ActivityIcon,
  X,
  CreditCard,
  QrCode,
  Sparkles,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Clock,
  Trash2,
  Lock
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faFileLines,
  faScaleBalanced,
  faLightbulb,
  faCamera,
  faClock
} from "@fortawesome/free-solid-svg-icons";

export const GroupDetail: React.FC = () => {
  const { 
    user, 
    profile, 
    activeGroup, 
    activeGroupExpenses, 
    activeGroupSettlements, 
    activeGroupActivities, 
    navigate,
    refetchActiveGroupData
  } = useApp();

  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "suggest" | "receipts" | "timeline">("expenses");

  // QR Code payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedRepayment, setSelectedRepayment] = useState<any>(null);
  const [customUpiId, setCustomUpiId] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // New expense form inline state
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPaidBy, setExpPaidBy] = useState("");
  const [expCategory, setExpCategory] = useState("food");
  const [expDate, setExpDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [expNotes, setExpNotes] = useState("");
  const [expSplitType, setExpSplitType] = useState<"equal" | "percentage" | "exact">("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({}); // uid -> custom amount

  // OCR Receipt scan state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // PDF statement generator trigger
  const handlePrintStatement = () => {
    window.print();
  };

  // Synchronize dynamic upi state and select first recipient
  useEffect(() => {
    if (activeGroup && !expPaidBy) {
      setExpPaidBy(user?.uid || "");
    }
  }, [activeGroup, user]);

  // Compute live local balances
  const liveBalances = activeGroup ? calculateBalances(activeGroup.members, activeGroupExpenses) : {};
  const liveSuggestions = activeGroup ? generateSettlementSuggestions(activeGroup.id, liveBalances) : [];

  // UPI url helper generator
  const getUpiUrl = (recipientUid: string, amount: number) => {
    const defaultUpi = "paytm@upi";
    // Check if recipient is Parth or Rohan or user profile has a upiId
    let upiId = defaultUpi;
    if (recipientUid === "mock_parth_uid") upiId = "parth@paytm";
    else if (recipientUid === "mock_rohan_uid") upiId = "rohan@okhdfc";
    else if (recipientUid === user?.uid && profile?.upiId) upiId = profile.upiId;
    
    if (customUpiId) {
      upiId = customUpiId;
    }

    const name = activeGroup?.memberNames[recipientUid] || "GroupRepay";
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Settle on Dispute - ${activeGroup?.name || ""}`)}`;
  };

  // Draw QR code whenever pay modal is opened
  useEffect(() => {
    if (showPayModal && selectedRepayment && canvasRef.current) {
      const recipientUid = selectedRepayment.toUid;
      const amount = selectedRepayment.amount;
      const url = getUpiUrl(recipientUid, amount);

      QRCode.toCanvas(
        canvasRef.current,
        url,
        {
          width: 220,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("Error drawing QR code to canvas:", error);
        }
      );
    }
  }, [showPayModal, selectedRepayment, customUpiId]);

  // Handle marking settlement as closed/settled
  const handleMarkSettled = async (repay: any) => {
    if (!user || !activeGroup) return;

    try {
      // 1. Add settlement object to subcollection
      const setRefId = `set_${Date.now()}`;
      await dbSetDoc(`groups/${activeGroup.id}/settlements`, setRefId, {
        id: setRefId,
        groupId: activeGroup.id,
        fromUid: repay.fromUid,
        toUid: repay.toUid,
        amount: repay.amount,
        status: "settled",
        createdAt: new Date().toISOString(),
        settledAt: new Date().toISOString()
      });

      // 2. Log activity
      const senderName = activeGroup.memberNames[repay.fromUid] || "Someone";
      const receiverName = activeGroup.memberNames[repay.toUid] || "Someone";
      const actId = `act_${Date.now()}`;
      await dbSetDoc(`groups/${activeGroup.id}/activities`, actId, {
        id: actId,
        groupId: activeGroup.id,
        category: "settlement_marked",
        message: `${senderName} settled ₹${repay.amount.toLocaleString("en-IN")} with ${receiverName}.`,
        actorId: user.uid,
        createdAt: new Date().toISOString()
      });

      // 3. Subtract balances by dynamically adding a counter-balancing expense
      // We can model a "Settlement transaction" as a special category "settlement" expense to offset
      const expRefId = `exp_settle_${Date.now()}`;
      await dbSetDoc(`groups/${activeGroup.id}/expenses`, expRefId, {
        id: expRefId,
        groupId: activeGroup.id,
        title: `Settlement: ${senderName} ➜ ${receiverName}`,
        amount: repay.amount,
        paidBy: repay.fromUid,
        category: "settlement",
        date: new Date().toISOString().substring(0, 10),
        splitType: "exact",
        splits: [
          { uid: repay.toUid, amount: repay.amount }
        ],
        createdAt: new Date().toISOString()
      });

      setShowPayModal(false);
      setSelectedRepayment(null);
      refetchActiveGroupData();
    } catch (err) {
      console.error("Failed to mark settled in Firestore:", err);
    }
  };

  // Submit standard / manual expense creation
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !user || !expTitle.trim() || !expAmount) return;

    try {
      const expenseId = `exp_${Date.now()}`;
      const amountVal = Number(expAmount);

      // Construct splits list according to chosen splitType
      let splitsList: any[] = [];
      const numMembers = activeGroup.members.length;

      if (expSplitType === "equal") {
        const share = Math.round((amountVal / numMembers) * 100) / 100;
        splitsList = activeGroup.members.map((m) => ({
          uid: m,
          amount: share
        }));
      } else {
        // Fallback for custom entries
        splitsList = activeGroup.members.map((m) => ({
          uid: m,
          amount: Number(customSplits[m]) || 0
        }));
      }

      const expensePayload = {
        id: expenseId,
        groupId: activeGroup.id,
        title: expTitle,
        amount: amountVal,
        paidBy: expPaidBy,
        category: expCategory,
        date: expDate,
        notes: expNotes,
        splitType: expSplitType,
        splits: splitsList,
        createdAt: new Date().toISOString()
      };

      await dbSetDoc(`groups/${activeGroup.id}/expenses`, expenseId, expensePayload);

      // Log activity
      const payerName = activeGroup.memberNames[expPaidBy] || "Someone";
      const actId = `act_${Date.now()}`;
      await dbSetDoc(`groups/${activeGroup.id}/activities`, actId, {
        id: actId,
        groupId: activeGroup.id,
        category: "expense_added",
        message: `${payerName} added "${expTitle}" (₹${amountVal.toLocaleString("en-IN")}).`,
        actorId: user.uid,
        createdAt: new Date().toISOString()
      });

      // Clear form
      setExpTitle("");
      setExpAmount("");
      setExpNotes("");
      setShowAddExpense(false);
      setScanResult(null);
      refetchActiveGroupData();
    } catch (err) {
      console.error("Failed to save expense:", err);
    }
  };

  // Receipt File drop scanner
  const handleReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setOcrError(null);
    setScanResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const resultSrc = reader.result as string;
        // Trim standard base64 data URL metadata prefix like "data:image/png;base64,"
        const base64Clean = resultSrc.split(",")[1];
        const mimeType = file.type;

        // Fetch our Express API OCR scanning endpoint
        const response = await fetch("/api/receipt/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imgBase64: base64Clean, mimeType })
        });

        if (response.ok) {
          const data = await response.json();
          setScanResult(data);
          
          // Pre-fill manual form values
          setExpTitle(data.title || "Scanned Bill");
          setExpAmount(data.amount?.toString() || "");
          setExpCategory(data.category || "food");
          if (data.date) {
            setExpDate(data.date);
          }
          
          // Prompt inline form opening
          setShowAddExpense(true);
        } else {
          setOcrError("Gemini could not analyze the receipt clearly. Please check the image or enter details manually.");
        }
      } catch (err: any) {
        setOcrError(err?.message || "Internal receipt scanning error occurred.");
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteExpense = async (expId: string) => {
    if (!activeGroup) return;
    try {
      await dbDeleteDoc(`groups/${activeGroup.id}/expenses`, expId);
      refetchActiveGroupData();
    } catch (err) {
      console.error("Deletion error:", err);
    }
  };

  if (!activeGroup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-gray-500 font-mono">Loading Dispute Pool details...</span>
      </div>
    );
  }

  // Compute stats: Total Spent sum inside activeGroupExpenses (filtering out settlements)
  const expensesOnly = activeGroupExpenses.filter((e) => e.category !== "settlement");
  const overallActiveSpent = expensesOnly.reduce((sum, e) => sum + e.amount, 0);
  const budgetRatio = activeGroup.budget ? (overallActiveSpent / activeGroup.budget) * 100 : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 flex flex-col gap-10">
      
      {/* Editorial Group Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-100 pb-8">
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => navigate("/groups")}
            className="text-xs font-mono font-bold tracking-widest text-[#9CA3AF] uppercase hover:text-black hover:underline cursor-pointer flex items-center gap-0.5"
          >
            ❮ All Groups
          </button>
          <h1 className="font-sans font-black text-3.5xl tracking-tight text-gray-900 leading-tight flex items-center gap-3">
            {activeGroup.name}
          </h1>
          <p className="text-sm text-gray-500 max-w-md">
            {activeGroup.description || "Track shared group bills and peer settled accounts cleanly."}
          </p>
        </div>

        {/* Members avatars bar & budget remaining */}
        <div className="flex flex-col gap-3 min-w-[200px] w-full md:w-auto">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 font-semibold uppercase font-mono mr-1">Members:</span>
            <div className="flex -space-x-2.5 overflow-hidden">
              {activeGroup.members.map((memberId) => (
                <div 
                  key={memberId} 
                  title={activeGroup.memberNames[memberId]}
                  className="w-7.5 h-7.5 rounded-full border border-white bg-gray-150 flex items-center justify-center text-[10px] font-bold text-gray-700"
                >
                  {activeGroup.memberNames[memberId]?.[0] || "M"}
                </div>
              ))}
            </div>
          </div>

          {activeGroup.budget && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono text-gray-500 font-semibold uppercase">
                <span>Budget Spent: {Math.round(budgetRatio)}%</span>
                <span>₹{overallActiveSpent.toLocaleString("en-IN")} / ₹{activeGroup.budget.toLocaleString("en-IN")}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${budgetRatio > 90 ? "bg-red-500" : budgetRatio > 70 ? "bg-amber-400" : "bg-black"}`} 
                  style={{ width: `${Math.min(100, budgetRatio)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic page subtabs */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-px overflow-x-auto whitespace-nowrap">
        {[
          { key: "expenses", label: "Group Expenses Logs", count: expensesOnly.length, faIcon: faFileLines },
          { key: "balances", label: "Peers Balances", count: null, faIcon: faScaleBalanced },
          { key: "suggest", label: "Smart Settlement Recommendations", count: liveSuggestions.length, faIcon: faLightbulb },
          { key: "receipts", label: "Scan Bills (AI Vision OCR)", count: null, faIcon: faCamera },
          { key: "timeline", label: "Activity Audit Log", count: activeGroupActivities.length, faIcon: faClock }
        ].map((tab) => (
          <button
            key={tab.key}
            id={`tab-link-${tab.key}`}
            className={`py-3 px-4.5 text-xs font-semibold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "border-black text-black font-bold"
                : "border-transparent text-gray-400 hover:text-black"
            }`}
            onClick={() => setActiveTab(tab.key as any)}
          >
            <FontAwesomeIcon icon={tab.faIcon} className={`text-[10px] ${activeTab === tab.key ? "text-black" : "text-gray-400"}`} />
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 font-mono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main tab content screen router */}
      <div className="min-h-[40vh]">
        
        {/* TAB 1: Expenses Log list */}
        {activeTab === "expenses" && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="font-sans font-bold text-gray-900 text-lg">Logged Transactions</h3>
              <div className="flex items-center gap-2">
                <button
                  id="print-statement-btn"
                  onClick={handlePrintStatement}
                  className="flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 border border-gray-200 hover:border-gray-300 text-gray-600 rounded-lg cursor-pointer bg-white"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Print Statement
                </button>
                <button
                  id="toggle-add-expense-btn"
                  onClick={() => setShowAddExpense(!showAddExpense)}
                  className="flex items-center gap-1.5 text-xs font-bold py-2 px-4 bg-black text-white hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Bill
                </button>
              </div>
            </div>

            {/* Slide-down add manual expense container form */}
            {showAddExpense && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-3xs flex flex-col gap-5 md:max-w-2xl">
                <h4 className="text-sm font-black text-gray-900 flex items-center justify-between">
                  <span>Logged Expense Information</span>
                  <button 
                    onClick={() => { setShowAddExpense(false); setScanResult(null); }}
                    className="p-1 rounded-md text-gray-400 hover:text-black cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </h4>
                
                {scanResult && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-lg p-3 flex gap-2 items-center">
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <span><strong>AI scanner auto-filled standard values!</strong> Please verify items & edit below.</span>
                  </div>
                )}

                <form onSubmit={handleAddExpenseSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-gray-500">Bill Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Scuba tickets, Thalassa Dinner, Fuel"
                      value={expTitle}
                      onChange={(e) => setExpTitle(e.target.value)}
                      className="py-2 px-3 border border-gray-200 rounded-lg focus:border-black outline-hidden text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-gray-500">Total Bill Amount (INR)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        required
                        placeholder="0.00"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        className="w-full py-2 pl-7 pr-3 border border-gray-200 rounded-lg focus:border-black outline-hidden text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-gray-500">Paid By</label>
                    <select
                      value={expPaidBy}
                      onChange={(e) => setExpPaidBy(e.target.value)}
                      className="py-2 px-2.5 border border-gray-200 rounded-lg focus:border-black outline-hidden bg-white text-xs h-9"
                    >
                      {activeGroup.members.map((m) => (
                        <option key={m} value={m}>{activeGroup.memberNames[m] || "Member"}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-gray-500">Expense Category</label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value)}
                      className="py-2 px-2.5 border border-gray-200 rounded-lg focus:border-black outline-hidden bg-white text-xs h-9"
                    >
                      <option value="food">Food & Dining 🍛</option>
                      <option value="rent">Rent / Accommodations 🏠</option>
                      <option value="travel">Transport & Fuel ⛽</option>
                      <option value="entertainment">Activities / Tickets 🎟️</option>
                      <option value="others">Others / Sundry bills 💼</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-gray-500">Transaction Date</label>
                    <input
                      type="date"
                      required
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="py-1.5 px-3 border border-gray-200 rounded-lg focus:border-black outline-hidden text-xs h-9"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-gray-500">Optional Notes</label>
                    <input
                      type="text"
                      placeholder="Extra trip remarks"
                      value={expNotes}
                      onChange={(e) => setExpNotes(e.target.value)}
                      className="py-2 px-3 border border-gray-200 rounded-lg focus:border-black outline-hidden text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2 border-t border-gray-100 pt-3 flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-600">Splitting Configuration:</span>
                    <span className="font-mono text-[10px] text-[#9CA3AF] uppercase">Defaulting to Equal Division</span>
                  </div>

                  <button
                    type="submit"
                    className="sm:col-span-2 py-2.5 bg-black text-white hover:bg-gray-800 font-semibold rounded-lg text-xs cursor-pointer shadow-3xs"
                  >
                    Commit Bill to Ledger
                  </button>
                </form>
              </div>
            )}

            {/* Expenses Grid List */}
            <div className="flex flex-col gap-4">
              {expensesOnly.map((exp) => {
                const payerName = activeGroup.memberNames[exp.paidBy] || "Someone";
                return (
                  <div
                    key={exp.id}
                    className="bg-white border border-gray-150 rounded-xl p-5 flex items-center justify-between group shadow-3xs hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar initials category mapping */}
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-base">
                        {exp.category === "food" && "🍛"}
                        {exp.category === "rent" && "🏠"}
                        {exp.category === "travel" && "⛽"}
                        {exp.category === "entertainment" && "🎟️"}
                        {exp.category === "others" && "💼"}
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <h4 className="text-sm font-bold text-gray-900">{exp.title}</h4>
                        <p className="text-[11px] text-gray-500 font-medium">
                          Paid by <strong className="text-gray-700">{payerName}</strong> • {exp.date}
                        </p>
                        {exp.notes && (
                          <p className="text-[10px] text-[#A3A3A3] font-mono leading-none mt-0.5">
                            "{exp.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-gray-900 font-mono">₹{exp.amount.toLocaleString("en-IN")}</span>
                        <span className="text-[10px] text-gray-400">Total bill</span>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-all cursor-pointer"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {expensesOnly.length === 0 && (
                <div className="border border-dashed border-gray-150 rounded-xl p-10 text-center text-gray-400 text-xs">
                  No purchase records logged to this pool yet. Let's record peer expenses or try our Vision scan!
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Balances ledger */}
        {activeTab === "balances" && (
          <div className="flex flex-col gap-6 max-w-xl">
            <div className="flex flex-col gap-1">
              <h3 className="font-sans font-bold text-gray-900 text-lg">Balances ledger</h3>
              <p className="text-xs text-gray-500">Each member's aggregate paid offset minus their expected split owes.</p>
            </div>

            <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-2xs divide-y divide-gray-100">
              {activeGroup.members.map((memberId) => {
                const bal = liveBalances[memberId] || 0;
                const isCredited = bal > 0.01;
                const isDebited = bal < -0.01;
                return (
                  <div key={memberId} className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8.5 h-8.5 rounded-full bg-gray-50 border border-gray-150 flex items-center justify-center font-bold text-xs text-gray-800">
                        {activeGroup.memberNames[memberId]?.[0] || "U"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900">{activeGroup.memberNames[memberId]}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {memberId === user?.uid ? "You (active user)" : "Participant"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={`text-xs font-black font-mono ${isCredited ? "text-emerald-600" : isDebited ? "text-red-500" : "text-gray-400"}`}>
                        {isCredited ? `Gets back ₹${bal.toLocaleString("en-IN")}` : isDebited ? `Owes ₹${Math.abs(bal).toLocaleString("en-IN")}` : "Fully Settled"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Smart Settlement Suggestions */}
        {activeTab === "suggest" && (
          <div className="flex flex-col gap-6 max-w-2xl">
            <div className="flex flex-col gap-1 bg-gray-50/50 border border-gray-100 rounded-xl p-5 mb-1">
              <h4 className="text-xs font-mono font-bold tracking-widest text-[#9CA3AF] uppercase flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Dispute Settle Algorithm
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Our smart net balance optimizer computes the exact peer-to-peer combinations to completely zero out everyone's group debt in the **mathematically minimum transactions possible**. Settle up instantly using our India-ready deep UPI codes.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {liveSuggestions.map((repay, idx) => {
                const senderName = activeGroup.memberNames[repay.fromUid] || "Someone";
                const receiverName = activeGroup.memberNames[repay.toUid] || "Someone";
                const isMyDebt = repay.fromUid === user?.uid;

                return (
                  <div
                    key={idx}
                    className={`bg-white border rounded-xl p-5 flex sm:flex-row flex-col sm:items-center justify-between gap-4 shadow-3xs hover:border-gray-300 transition-colors ${isMyDebt ? "border-amber-200 bg-amber-50/10" : "border-gray-150"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-gray-800">
                        ⚡
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          {senderName}
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          {receiverName}
                        </span>
                        <p className="text-[10px] text-gray-400 leading-none">
                          {isMyDebt ? "Your recommended payment" : "Suggested peer reimbursement"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-start">
                      <span className="text-sm font-black text-gray-900 font-mono">₹{repay.amount.toLocaleString("en-IN")}</span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          id={`pay-modal-trigger-${idx}`}
                          onClick={() => {
                            setSelectedRepayment(repay);
                            setShowPayModal(true);
                          }}
                          className="text-[11px] font-bold py-1.5 px-3 bg-white border border-gray-200.90 hover:border-black text-gray-800 rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          View QR
                        </button>

                        <button
                          id={`settle-direct-${idx}`}
                          onClick={() => handleMarkSettled(repay)}
                          className="text-[11px] font-semibold py-1.5 px-3 bg-black hover:bg-gray-800 text-white rounded-lg cursor-pointer transition-colors"
                        >
                          Mark Settled
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {liveSuggestions.length === 0 && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-6 text-center text-emerald-800 text-xs flex flex-col gap-1.5 items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold">No outstanding group debts!</span>
                  <span>Everyone is fully settled up! Ready to travel more.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Receipt Scanning (AI Vision OCR) */}
        {activeTab === "receipts" && (
          <div className="flex flex-col gap-6 max-w-xl">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-400 font-mono tracking-widest uppercase">Smart Scanning</span>
              <h3 className="font-sans font-black text-gray-900 text-lg">AI-powered Receipt Processing</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Drop your restaurant bills, Airbnb receipts, or fuel invoices below. Our server-side Gemini 3.5 Multimodal OCR scans and converts them instantly into typed splits.
              </p>
            </div>

            {/* Drag drop dropzone */}
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 bg-white text-center flex flex-col items-center justify-center gap-4 relative">
              <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-400">
                <UploadCloud className="w-6 h-6 text-inherit" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-gray-700">Choose custom bill picture</p>
                <p className="text-[11px] text-gray-400 font-mono">JPG, PNG, up to 10MB sizes allowed</p>
              </div>

              <input
                type="file"
                accept="image/*"
                id="receipt-file-input"
                onChange={handleReceiptFile}
                disabled={scanning}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />

              {scanning && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-3 rounded-2xl">
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span>Gemini 3.5 Vision OCR running...</span>
                  </div>
                </div>
              )}
            </div>

            {ocrError && (
              <p className="text-xs text-red-500 text-center bg-red-50 border border-red-100 rounded-lg p-2.5">
                {ocrError}
              </p>
            )}

            <div className="bg-gray-50 border border-gray-150 rounded-xl p-5 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Zero-weight secure server translation
              </h4>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Images are sent securely to our back-end proxy where they are analyzed using advanced Gemini 3.5 models. We never store copyable personal invoice information permanently.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: Activity Feed timeline */}
        {activeTab === "timeline" && (
          <div className="flex flex-col gap-6 max-w-xl">
            <div className="flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-gray-800" />
              <h3 className="font-sans font-bold text-gray-900 text-lg">Group Transaction Timeline</h3>
            </div>

            <div className="relative border-l border-gray-100 ml-4.5 pl-6 flex flex-col gap-6 text-xs">
              {activeGroupActivities.map((act) => (
                <div key={act.id} className="relative">
                  {/* Dot symbol */}
                  <div className="absolute -left-10 top-1.5 w-8 h-8 rounded-full bg-white border border-gray-150 flex items-center justify-center font-bold text-base shadow-3xs">
                    {act.category === "group_created" && "🌊"}
                    {act.category === "expense_added" && "🍛"}
                    {act.category === "settlement_marked" && "⚡"}
                  </div>
                  <div className="flex flex-col gap-1 pl-1">
                    <p className="text-gray-800 font-medium leading-relaxed">{act.message}</p>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(act.createdAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}

              {activeGroupActivities.length === 0 && (
                <div className="text-gray-400 italic py-6">No audits captured yet. Log a transaction to see changes!</div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Dynamic QR Code Repay popup modal */}
      {showPayModal && selectedRepayment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5 shadow-xl">
            
            <div className="w-full flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-xs font-bold text-gray-800">Scan BHIM UPI repricement</span>
              <button
                id="close-pay-modal"
                onClick={() => {
                  setShowPayModal(false);
                  setSelectedRepayment(null);
                  setCustomUpiId("");
                }}
                className="text-gray-500 hover:text-black hover:bg-gray-50 p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Display names */}
            <div className="text-center flex flex-col gap-0.5">
              <span className="text-[11px] font-mono tracking-widest text-[#9CA3AF] uppercase">repay instantly</span>
              <h4 className="text-sm font-black text-gray-900 flex items-center justify-center gap-1">
                {activeGroup.memberNames[selectedRepayment.fromUid]}
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                {activeGroup.memberNames[selectedRepayment.toUid]}
              </h4>
              <h2 className="text-2xl font-black text-gray-900 font-mono mt-1">
                ₹{selectedRepayment.amount.toLocaleString("en-IN")}
              </h2>
            </div>

            {/* The dynamic Canvas QR drawer */}
            <div className="p-3.5 bg-[#fafafa] border border-gray-150 rounded-xl max-w-[240px] max-h-[240px]">
              <canvas ref={canvasRef} className="rounded-lg shadow-3xs"></canvas>
            </div>

            <p className="text-[10px] text-gray-400 leading-normal text-center max-w-[250px]">
              Scan with GPay, PhonePe, Paytm, or any banking app. Once completed, tap below to balance the accounting ledger.
            </p>

            {/* Customize UPI VPA fields */}
            <div className="w-full flex flex-col gap-1">
              <label className="text-[10px] font-mono text-gray-550">Change Recipient UPI Id (debug/demo):</label>
              <input
                type="text"
                placeholder={selectedRepayment.toUid === "mock_parth_uid" ? "parth@paytm" : "friend@upi"}
                value={customUpiId}
                onChange={(e) => setCustomUpiId(e.target.value)}
                className="w-full text-xs py-1.5 px-2 border border-gray-200 focus:border-black outline-hidden rounded-md font-mono"
              />
            </div>

            <div className="w-full grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const url = getUpiUrl(selectedRepayment.toUid, selectedRepayment.amount);
                  window.location.href = url;
                }}
                className="py-2.5 bg-white border border-gray-200.90 hover:border-black text-gray-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Launch UPI app
              </button>
              <button
                type="button"
                onClick={() => handleMarkSettled(selectedRepayment)}
                className="py-2.5 bg-black hover:bg-gray-850 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Mark as Settled
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
