/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { calculateBalances, generateSettlementSuggestions } from "../lib/settleEngine";
import { dbSetDoc } from "../lib/firestoreQuery";
import QRCode from "qrcode";
import { ArrowRight, QrCode, CheckCircle, Gift, X, CheckSquare, Sparkles } from "lucide-react";

export const Settlements: React.FC = () => {
  const { user, profile, groups, refetchActiveGroupData } = useApp();
  
  // Consolidated suggested settlements across all loops
  const [allRepayments, setAllRepayments] = useState<any[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeRepay, setActiveRepay] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (groups.length === 0) return;

    let list: any[] = [];
    groups.forEach((g) => {
      // We can fetch or simply consolidate
      // Since context handles listeners, we can evaluate on-screen
      // In first load/seed context, let's look at goa trip
      if (g.id === "goa_trip_2026") {
        // Compute goa trip suggs
        const balances = {
          "mock_parth_uid": 5433,
          "mock_rohan_uid": -6366,
          [user?.uid || ""]: 933
        };
        const suggs = generateSettlementSuggestions(g.id, balances);
        suggs.forEach((s) => {
          list.push({
            groupName: g.name,
            ...s
          });
        });
      } else {
        // Construct standard placeholders or computed metrics dynamically based on that active group profile
      }
    });

    setAllRepayments(list);
  }, [groups, user]);

  // UPI url helper generator
  const getUpiUrl = (recipientUid: string, amount: number) => {
    let upiId = "paytm@upi";
    if (recipientUid === "mock_parth_uid") upiId = "parth@paytm";
    else if (recipientUid === "mock_rohan_uid") upiId = "rohan@okhdfc";
    else if (recipientUid === user?.uid && profile?.upiId) upiId = profile.upiId;

    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent("Friend")}&am=${amount}&cu=INR&tn=DisputeSettle`;
  };

  useEffect(() => {
    if (showQrModal && activeRepay && canvasRef.current) {
      const url = getUpiUrl(activeRepay.toUid, activeRepay.amount);
      QRCode.toCanvas(
        canvasRef.current,
        url,
        {
          width: 200,
          margin: 1,
        },
        (error) => {
          if (error) console.error("Error drawing QR code:", error);
        }
      );
    }
  }, [showQrModal, activeRepay]);

  const handleSettle = async (repay: any) => {
    if (!user || !groups) return;

    try {
      // Model settlement action
      const setRefId = `set_con_${Date.now()}`;
      await dbSetDoc(`groups/${repay.groupId}/settlements`, setRefId, {
        id: setRefId,
        groupId: repay.groupId,
        fromUid: repay.fromUid,
        toUid: repay.toUid,
        amount: repay.amount,
        status: "settled",
        createdAt: new Date().toISOString(),
        settledAt: new Date().toISOString()
      });

      // Offset transaction in ledger
      const expRefId = `exp_set_${Date.now()}`;
      await dbSetDoc(`groups/${repay.groupId}/expenses`, expRefId, {
        id: expRefId,
        groupId: repay.groupId,
        title: `Settlement: Settle Repay`,
        amount: repay.amount,
        paidBy: repay.fromUid,
        category: "settlement",
        date: new Date().toISOString().substring(0, 10),
        splitType: "exact",
        splits: [{ uid: repay.toUid, amount: repay.amount }],
        createdAt: new Date().toISOString()
      });

      setShowQrModal(false);
      setActiveRepay(null);
      
      // Dynamic refresh triggers
      refetchActiveGroupData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 flex flex-col gap-8">
      
      {/* Header element */}
      <div className="flex flex-col gap-1.5 border-b border-gray-100 pb-6">
        <span className="text-xs font-semibold text-gray-400 font-mono tracking-widest uppercase">Repayments</span>
        <h1 className="font-sans font-black text-3xl tracking-tight text-gray-900 leading-tight">Settlement Center</h1>
        <p className="text-sm text-gray-500">
          Consolidated peers debt records and instant UPI repayments across all active groups.
        </p>
      </div>

      {allRepayments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allRepayments.map((repay, index) => {
            const isMyDebt = repay.fromUid === user?.uid;
            
            // Name mappings
            let fromName = "Rohan Khanna";
            let toName = "Parth Tyagi";
            if (repay.groupId === "goa_trip_2026") {
              if (repay.fromUid === user?.uid) fromName = "Me (You)";
              if (repay.toUid === user?.uid) toName = "Me (You)";
            }

            return (
              <div
                key={index}
                className={`bg-white border rounded-2xl p-6 flex flex-col justify-between gap-5 shadow-3xs hover:border-gray-300 transition-all ${isMyDebt ? "border-amber-200/90" : "border-gray-200/80"}`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-400 font-mono tracking-wider uppercase">{repay.groupName}</span>
                    {isMyDebt && (
                      <span className="font-mono text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full select-none">
                        YOU OWE THIS
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-gray-700">
                      ₹
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-gray-800 text-sm flex items-center gap-1.5 leading-none">
                        {fromName}
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        {toName}
                      </span>
                      <p className="text-xs text-gray-500">
                        Peer payment suggestion
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-lg font-black text-gray-900 font-mono">₹{repay.amount.toLocaleString("en-IN")}</span>
                    <span className="text-[10px] text-gray-400">Repayment amount</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id={`consolidate-view-qr-${index}`}
                      onClick={() => {
                        setActiveRepay(repay);
                        setShowQrModal(true);
                      }}
                      className="text-xs font-bold py-1.5 px-3 border border-gray-200.90 rounded-lg cursor-pointer bg-white text-gray-700 hover:border-black flex items-center gap-1 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Show QR
                    </button>
                    
                    <button
                      id={`consolidate-mark-settled-${index}`}
                      onClick={() => handleSettle(repay)}
                      className="text-xs font-semibold py-1.5 px-3.5 bg-black hover:bg-gray-800 text-white rounded-lg cursor-pointer transition-colors"
                    >
                      Mark Settle
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-gray-150 rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <Gift className="w-10 h-10 text-gray-300" />
          <h3 className="font-bold text-gray-800 text-sm">Perfect Balance!</h3>
          <p className="text-xs max-w-sm">No outstanding settlements mapped. Once you seed sample Goa data or log group spends, paybacks will surface here!</p>
        </div>
      )}

      {/* QR MODAL BACKDROP */}
      {showQrModal && activeRepay && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5 shadow-xl">
            
            <div className="w-full flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-xs font-bold text-gray-800">Scan BHIM QR</span>
              <button
                id="close-qr-settlement-modal"
                onClick={() => {
                  setShowQrModal(false);
                  setActiveRepay(null);
                }}
                className="text-gray-500 hover:text-black hover:bg-gray-50 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center flex flex-col gap-1.5">
              <span className="text-[10px] font-mono tracking-widest text-[#9CA3AF] uppercase">Repay instant GPay / Paytm</span>
              <h2 className="text-2xl font-black text-gray-900 font-mono leading-none">
                ₹{activeRepay.amount}
              </h2>
            </div>

            <div className="p-3.5 bg-[#fafafa] border border-gray-150 rounded-xl">
              <canvas ref={canvasRef} className="rounded-lg"></canvas>
            </div>

            <p className="text-[10px] text-gray-400 text-center max-w-[250px]">
              Complete the payment on your mobile UPI client and tap below to finalize the transaction.
            </p>

            <button
              id="confirm-settlement-btn"
              onClick={() => handleSettle(activeRepay)}
              className="w-full py-2.5 bg-black hover:bg-gray-800 text-white font-semibold text-xs rounded-xl cursor-pointer"
            >
              Verify & Complete Settle
            </button>

          </div>
        </div>
      )}

    </div>
  );
};
