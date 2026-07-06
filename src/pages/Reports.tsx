/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useApp } from "../context/AppContext";
import { PieChart, TrendingUp, AlertTriangle, CheckSquare, Sparkles, Layout } from "lucide-react";

export const Reports: React.FC = () => {
  const { groups } = useApp();

  const mockOverviewData = [
    { category: "Accommodations & Rent 🏠", amount: 15000, color: "bg-gray-900" },
    { category: "Activities & Diving tickets 🎟️", amount: 6000, color: "bg-gray-600" },
    { category: "Dining Out & Dining room 🍛", amount: 4500, color: "bg-neutral-400" },
    { category: "Fuel & Taxi Refills ⛽", amount: 3200, color: "bg-gray-300" }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 flex flex-col gap-8">
      
      {/* Header section */}
      <div className="flex flex-col gap-1.5 border-b border-gray-100 pb-6">
        <span className="text-xs font-semibold text-gray-400 font-mono tracking-widest uppercase">Analytics</span>
        <h1 className="font-sans font-black text-3xl tracking-tight text-gray-900 leading-tight">Insight Reports</h1>
        <p className="text-sm text-gray-500">
          Analyze trip budgets, category spending patterns, and witty budget health parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Category summary */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-6 shadow-3xs">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono tracking-widest text-[#9CA3AF] uppercase">Group Category Spends</span>
            <h3 className="text-sm font-bold text-gray-900">Total Bill Distribution Breakdown</h3>
          </div>

          <div className="flex flex-col gap-4 mt-2">
            {mockOverviewData.map((item, idx) => {
              const maxAmt = 15000;
              const ratio = (item.amount / maxAmt) * 100;
              return (
                <div key={idx} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
                    <span className="flex items-center gap-1.5">{item.category}</span>
                    <span className="font-mono text-gray-500">₹{item.amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-55/70 border border-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${ratio}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI budget metrics card */}
        <div className="flex flex-col gap-6">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
            Budget Health Score
          </h3>

          <div className="bg-black text-[#fafafa] border border-black rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
            
            <div className="flex justify-between items-center text-xs text-neutral-400 font-mono">
              <span>SCORE</span>
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/10 rounded-full text-[10px]">HEALTHY</span>
            </div>

            <div className="flex flex-col gap-0.5">
              <h2 className="text-4xl font-black font-serif leading-none text-white">82%</h2>
              <span className="text-[11px] text-[#A3A3A3] font-mono leading-none mt-1">Excellent Spend Discipline</span>
            </div>

            <p className="text-xs text-[#A3A3A3] leading-relaxed mt-2.5 border-t border-white/10 pt-4 font-medium">
              "Your Goa Villa expenses represent 52% of overall budget resources. Chai and food spends have remained highly balanced and sustainable."
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
