/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { loginWithGoogle } from "../lib/firebase";

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err?.message || "Sign-in was interrupted. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center bg-[#fafafa] px-6 py-12">
      <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl shadow-sm p-10 flex flex-col gap-8 transition-transform hover:scale-[1.01] duration-300">
        
        {/* Editorial Brand Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center text-white font-serif font-black text-3xl shadow-sm border border-black mb-1">
            D
          </div>
          <h1 className="font-sans font-black text-3xl tracking-tight text-gray-900">
            Dispute
          </h1>
          <p className="text-sm font-medium text-gray-400 mt-1 max-w-xs font-mono select-none">
            Track clearly. Split fairly. Settle instantly.
          </p>
        </div>

        {/* Highlight Banner Card */}
        <div className="bg-[#fafafa] border border-gray-100 rounded-xl p-5 flex flex-col gap-1.5 justify-center items-start">
          <span className="text-[10px] font-mono tracking-widest text-[#9CA3AF] uppercase">Platform Tagline</span>
          <p className="text-sm font-bold text-gray-800 tracking-tight leading-snug">
            "Split less. Travel more."
          </p>
          <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
            The premium expense sharing manager optimized for India's Gen Z, roommates, and travel groups.
          </p>
        </div>

        {/* Authenticate Trigger */}
        <div className="flex flex-col gap-4">
          <button
            id="google-signin-btn"
            disabled={loading}
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-5 border border-gray-200/90 rounded-xl bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 disabled:opacity-70 transition-all cursor-pointer shadow-xs"
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
            {loading ? "Authenticating securely..." : "Sign in with Google"}
          </button>

          {error && (
            <p className="text-xs text-red-500 font-medium text-center bg-red-50 border border-red-100 rounded-lg p-2.5">
              {error}
            </p>
          )}
        </div>

        {/* Footer info text */}
        <div className="text-center">
          <p className="text-[10px] text-gray-400 font-mono tracking-tight">
            Protected by Google Firebase Authentication.
          </p>
        </div>
      </div>
    </div>
  );
};
