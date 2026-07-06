/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  name: string;
  surname?: string;
  username?: string;
  email: string;
  photoURL?: string;
  upiId?: string;
  isOnboarded?: boolean;
  friends?: string[]; // accepted connected user uids
  sentRequests?: string[]; // pending outbound usernames or uids
  receivedRequests?: string[]; // pending inbound usernames or uids
  themePreference?: "light" | "dark";
  createdAt?: string;
}

export interface Split {
  uid: string;
  amount: number;
  percentage?: number;
  checked?: boolean; // Used for UI form state
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidBy: string; // User UID
  category: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  receiptUrl?: string;
  splitType: "equal" | "percentage" | "exact";
  splits: Split[];
  createdAt: string; // ISO or Timestamp helper
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUid: string;
  toUid: string;
  amount: number;
  status: "pending" | "settled";
  createdAt: string;
  settledAt?: string;
}

export interface Activity {
  id: string;
  groupId: string;
  category: "expense_added" | "group_created" | "settlement_marked" | "member_joined" | "budget_changed";
  message: string;
  actorId: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  members: string[]; // List of UIDs
  memberNames: Record<string, string>; // offline fast lookups
  budget?: number;
  createdAt: string;
}

export interface BudgetConfig {
  groupId: string;
  monthlyLimit: number;
  categoryLimits?: Record<string, number>;
}

export interface ReceiptScanResult {
  title: string;
  amount: number;
  category: string;
  date: string;
  items: {
    name: string;
    amount: number;
  }[];
}
