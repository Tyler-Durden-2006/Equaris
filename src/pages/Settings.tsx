/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { ShieldAlert, CheckCircle, Smartphone, User, ArrowRight, Settings as SettingsIcon } from "lucide-react";

export const Settings: React.FC = () => {
  const { profile, updateProfileUpi } = useApp();
  const [upiId, setUpiId] = useState(profile?.upiId || "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      await updateProfileUpi(upiId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 flex flex-col gap-8">
      
      {/* Header section */}
      <div className="flex flex-col gap-1.5 border-b border-gray-100 pb-6">
        <span className="text-xs font-semibold text-gray-400 font-mono tracking-widest uppercase">Configuration</span>
        <h1 className="font-sans font-black text-3xl tracking-tight text-gray-900 leading-tight">Settings Workspace</h1>
        <p className="text-sm text-gray-500">
          Personalize your peer identifier and connect your active UPI format links for instant settling.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* UPI Setup Workspace form */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-3xs">
          <form onSubmit={handleUpdate} className="flex flex-col gap-5 text-sm">
            <h3 className="text-base font-bold text-gray-900">Configure Instant Repayments</h3>

            <div className="flex flex-col gap-2 max-w-md">
              <label className="text-xs font-semibold text-gray-500">Your UPI VPA (Virtual Payment Address)</label>
              <input
                type="text"
                required
                placeholder="e.g. parth@upi, or paytm@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-200 rounded-xl focus:border-black outline-hidden font-mono"
              />
              <p className="text-[10px] text-gray-400 font-mono leading-normal">
                Important: Ensure the UPI ID is correct. This is encoded directly into GPay & Paytm QR Codes for roommates to repay you.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-48 py-2.5 bg-black hover:bg-gray-800 text-white font-bold rounded-xl transition-all h-9.5 text-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? "Persisting changes..." : saved ? "UPI Linked! ✓" : "Link UPI Address"}
            </button>
          </form>
        </div>

        {/* Informative card */}
        <div className="flex flex-col gap-5">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <ShieldAlert className="w-4.5 h-4.5 text-amber-500" />
            Accounting Safety guidelines
          </h3>

          <div className="bg-[#fafafa] border border-gray-150 rounded-xl p-5 flex flex-col gap-3">
            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1">
              ⚡ Secure peer accounting
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Dispute is an offline accounting platform. We do not store or process payment card numbers or bank credentials. All paybacks are routed safely through your trusted UPI client on your smartphone.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
