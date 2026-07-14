/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { calculateBalances } from "../lib/settleEngine";
import {
  IndianRupee,
  Sparkles,
  ArrowRight,
  Users,
  Layers,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Zap,
  Home,
  UtensilsCrossed,
  Car,
  Ticket,
  HeartPulse,
  Receipt,
  AlertTriangle,
  Wallet,
  Lightbulb,
  Palmtree,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// Human-friendly labels + lucide icons for the raw category keys on expenses.
const CATEGORY_META: Record<string, { label: string; icon: React.ElementType }> = {
  rent: { label: "Accommodation & Rent", icon: Home },
  food: { label: "Dining & Food", icon: UtensilsCrossed },
  travel: { label: "Travel & Transport", icon: Car },
  entertainment: { label: "Activities & Entertainment", icon: Ticket },
  healthcare: { label: "Healthcare", icon: HeartPulse },
  others: { label: "Others", icon: Receipt },
};

const catMeta = (key: string) =>
  CATEGORY_META[key] || { label: key.charAt(0).toUpperCase() + key.slice(1), icon: Receipt };

// Icon per AI insight type (replaces the old emoji prefixes).
const INSIGHT_ICON: Record<string, React.ElementType> = {
  warning: AlertTriangle,
  budget: Wallet,
  tip: Lightbulb,
  chill: Palmtree,
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const Dashboard: React.FC = () => {
  const { user, profile, groups, allExpenses, navigate } = useApp();

  const [aiInsights, setAiInsights] = useState<{ type: string; title: string; message: string }[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // --- Real, computed metrics (settlement offset entries excluded from "spend") ---
  const spendExpenses = useMemo(
    () => allExpenses.filter((e) => e.category !== "settlement"),
    [allExpenses]
  );

  const totalSpent = useMemo(
    () => spendExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [spendExpenses]
  );

  // Net balance of the current user across all groups (includes settlement offsets).
  const { youOwe, youAreOwed } = useMemo(() => {
    let owe = 0;
    let owed = 0;
    if (user) {
      groups.forEach((g) => {
        const groupExpenses = allExpenses.filter((e) => e.groupId === g.id);
        if (groupExpenses.length === 0) return;
        const balances = calculateBalances(g.members, groupExpenses);
        const net = balances[user.uid] || 0;
        if (net < -0.01) owe += Math.abs(net);
        else if (net > 0.01) owed += net;
      });
    }
    return {
      youOwe: Math.round(owe * 100) / 100,
      youAreOwed: Math.round(owed * 100) / 100,
    };
  }, [user, groups, allExpenses]);

  // Category distribution across all real spend.
  const categoryList = useMemo(() => {
    const totals: Record<string, number> = {};
    spendExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + (e.amount || 0);
    });
    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [spendExpenses]);

  // Fetch server-side Gemini insights from REAL expenses only.
  const loadAInsights = async () => {
    if (spendExpenses.length === 0) return;
    setLoadingInsights(true);
    try {
      const mergedNames: Record<string, string> = {};
      groups.forEach((g) => Object.assign(mergedNames, g.memberNames || {}));
      const res = await fetch("/api/gemini/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses: spendExpenses.map((e) => ({ title: e.title, amount: e.amount, category: e.category })),
          budget: groups.reduce((sum, g) => sum + (g.budget || 0), 0),
          memberNames: mergedNames,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsights(data);
      }
    } catch (err) {
      console.error("Failed to fetch Gemini insights:", err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (spendExpenses.length > 0) loadAInsights();
    else setAiInsights([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spendExpenses.length]);

  const eyebrow = "text-xs font-mono uppercase tracking-widest text-muted-foreground";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">

      {/* Header */}
      <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1.5">
          <span className={eyebrow}>Overview</span>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Hi, {profile?.nickname || profile?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            Track clearly, split fairly, and settle up in seconds. No awkward reminders — only good times.
          </p>
        </div>

        <Button
          id="explore-network-banner-btn"
          variant="outline"
          onClick={() => navigate("/network")}
          className="shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Users />
          Manage network
        </Button>
      </div>

      {/* Empty state — no fake data, real CTA */}
      {groups.length === 0 && (
        <div className="flex flex-col items-center gap-5 rounded-xl border-2 border-dashed border-border bg-card/40 p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border bg-muted text-muted-foreground">
            <Layers className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold">No active balance groups</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create your first group to start tracking shared expenses. Everything on your dashboard is built from the
              spends you and your members log — nothing is pre-filled.
            </p>
          </div>
          <Button id="create-first-group-btn" onClick={() => navigate("/groups")} className="cursor-pointer">
            <Plus />
            Create a group
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          label="Total group spend"
          value={inr(totalSpent)}
          hint="Aggregated across active pools"
          icon={IndianRupee}
        />
        <StatCard
          label="You owe"
          value={inr(youOwe)}
          hint="Total outstanding bills"
          icon={TrendingDown}
          tone="destructive"
        />
        <StatCard
          label="You are owed"
          value={inr(youAreOwed)}
          hint="Reimbursement suggestions"
          icon={TrendingUp}
        />
      </div>

      {groups.length > 0 && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Active groups + category analytics */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className={eyebrow}>Active groups</h3>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate("/groups")}
                className="h-auto cursor-pointer p-0 text-muted-foreground hover:text-foreground"
              >
                All groups
                <ArrowRight />
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  size="sm"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate("/groups/[id]", { id: group.id })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate("/groups/[id]", { id: group.id });
                    }
                  }}
                  className="group cursor-pointer outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CardContent className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex size-11 items-center justify-center rounded-lg bg-muted font-heading text-lg font-semibold uppercase">
                        {group.name[0]}
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-semibold leading-tight transition-colors group-hover:text-primary">
                          {group.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="size-3.5" />
                            {group.members.length} members
                          </span>
                          <span aria-hidden>·</span>
                          <span className="font-mono">
                            Limit: {group.budget ? inr(group.budget) : "Unlimited"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Category distribution */}
            <Card>
              <CardHeader>
                <span className={eyebrow}>Category analytics</span>
                <CardTitle>Overall expense distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryList.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No expenses logged yet. Add spends inside a group to see the breakdown here.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {categoryList.map((item) => {
                      const meta = catMeta(item.category);
                      const Icon = meta.icon;
                      const pct = totalSpent > 0 ? Math.round((item.amount / totalSpent) * 100) : 0;
                      return (
                        <div key={item.category} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 font-medium">
                              <Icon className="size-4 shrink-0 text-muted-foreground" />
                              {meta.label}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground tabular-nums">
                              {inr(item.amount)} · {pct}%
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease-standard)]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI insights + settlement prompt */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="size-4 text-primary" />
                  AI insights
                </CardTitle>
                <CardAction>
                  <Badge variant="secondary" className="font-mono">Live</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                {loadingInsights ? (
                  <div className="flex flex-col gap-4" aria-label="Loading insights">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex flex-col gap-2">
                        <Skeleton className="h-3.5 w-1/2" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </div>
                ) : aiInsights.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {aiInsights.map((insight, idx) => {
                      const Icon = INSIGHT_ICON[insight.type] || Sparkles;
                      return (
                        <div key={idx} className="flex gap-3 border-s-2 border-border ps-3">
                          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div className="flex flex-col gap-0.5">
                            <h4 className="text-sm font-medium leading-tight">{insight.title}</h4>
                            <p className="text-sm leading-relaxed text-muted-foreground">{insight.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-3 py-2">
                    <p className="text-sm text-muted-foreground">
                      {spendExpenses.length === 0
                        ? "Log some group expenses and the assistant will audit your spending patterns here."
                        : "No insights yet. Recalculate to run an audit on your logged spends."}
                    </p>
                    {spendExpenses.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadAInsights}
                        disabled={loadingInsights}
                        className="cursor-pointer"
                      >
                        <RefreshCw className={loadingInsights ? "animate-spin" : ""} />
                        Recalculate
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Alert>
              <Zap />
              <AlertTitle>Peer repayments simplified</AlertTitle>
              <AlertDescription>
                <p>
                  Connect your UPI address in settings. Friends repay you by scanning real-time BHIM QR codes inside
                  active group sheets.
                </p>
                <Button
                  id="view-payments-hero-btn"
                  variant="link"
                  size="sm"
                  onClick={() => navigate("/settlements")}
                  className="h-auto cursor-pointer p-0"
                >
                  Go to settlement center
                  <ArrowRight />
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}
    </div>
  );
};

/** Metric tile — one card primitive, one layout, used for all three stats. */
const StatCard: React.FC<{
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  tone?: "default" | "destructive";
}> = ({ label, value, hint, icon: Icon, tone = "default" }) => (
  <Card>
    <CardHeader>
      <CardDescription className="font-mono text-xs uppercase tracking-widest">{label}</CardDescription>
      <CardAction>
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      </CardAction>
    </CardHeader>
    <CardContent className="flex flex-col gap-1">
      <div
        className={`text-3xl font-semibold tracking-tight tabular-nums ${
          tone === "destructive" ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </CardContent>
  </Card>
);
