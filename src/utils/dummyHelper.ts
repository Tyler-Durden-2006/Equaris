/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, Group, Expense, Settlement, Activity } from "../types";
import { dbSetDoc, dbAddDoc } from "../lib/firestoreQuery";

export async function seedSampleData(currentUserUid: string, currentUserName: string, currentUserEmail: string) {
  const currentTimestamp = new Date().toISOString();

  // 1. Create peer mock profiles
  const parth: UserProfile = {
    uid: "mock_parth_uid",
    name: "Parth Tyagi",
    email: "parth@dispute.in",
    photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
    upiId: "parth@paytm",
    createdAt: currentTimestamp
  };

  const rohan: UserProfile = {
    uid: "mock_rohan_uid",
    name: "Rohan Khanna",
    email: "rohan@dispute.in",
    photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
    upiId: "rohan@okhdfc",
    createdAt: currentTimestamp
  };

  const current: UserProfile = {
    uid: currentUserUid,
    name: currentUserName || "Me (You)",
    email: currentUserEmail,
    photoURL: "",
    upiId: "myupi@paytm",
    createdAt: currentTimestamp
  };

  // Set user profile nodes in Firestore
  await dbSetDoc("users", parth.uid, parth);
  await dbSetDoc("users", rohan.uid, rohan);
  await dbSetDoc("users", current.uid, current);

  // 2. Create the mock Group "Goa Trip 🌊"
  const groupId = "goa_trip_2026";
  const group: Group = {
    id: groupId,
    name: "Goa Trip 🌊",
    description: "Sun, sand, seafood, and splitting fairly.",
    createdBy: current.uid,
    members: [current.uid, parth.uid, rohan.uid],
    memberNames: {
      [current.uid]: current.name,
      [parth.uid]: parth.name,
      [rohan.uid]: rohan.name
    },
    budget: 35000,
    createdAt: currentTimestamp
  };
  await dbSetDoc("groups", groupId, group);

  // 3. Add expenses
  const expenses: Omit<Expense, "id">[] = [
    {
      groupId,
      title: "Vagator Villa Stay",
      amount: 15000,
      paidBy: parth.uid,
      category: "rent",
      date: "2026-05-24",
      notes: "Villa with private pool",
      splitType: "equal",
      splits: [
        { uid: current.uid, amount: 5000 },
        { uid: parth.uid, amount: 5000 },
        { uid: rohan.uid, amount: 5000 }
      ],
      createdAt: currentTimestamp
    },
    {
      groupId,
      title: "Thalassa Dinner",
      amount: 4500,
      paidBy: current.uid,
      category: "food",
      date: "2026-05-25",
      notes: "Greek vibes & delicious chicken souvlaki",
      splitType: "equal",
      splits: [
        { uid: current.uid, amount: 1500 },
        { uid: parth.uid, amount: 1500 },
        { uid: rohan.uid, amount: 1500 }
      ],
      createdAt: currentTimestamp
    },
    {
      groupId,
      title: "Scuba Diving tickets",
      amount: 6000,
      paidBy: current.uid,
      category: "entertainment",
      date: "2026-05-26",
      notes: "Grand Island packages",
      splitType: "equal",
      splits: [
        { uid: current.uid, amount: 2000 },
        { uid: parth.uid, amount: 2000 },
        { uid: rohan.uid, amount: 2000 }
      ],
      createdAt: currentTimestamp
    },
    {
      groupId,
      title: "Fuel & Thar Rent",
      amount: 3200,
      paidBy: rohan.uid,
      category: "travel",
      date: "2026-05-27",
      notes: "Diesel refills for 4 days",
      splitType: "equal",
      splits: [
        { uid: current.uid, amount: 1066.66 },
        { uid: parth.uid, amount: 1066.67 },
        { uid: rohan.uid, amount: 1066.67 }
      ],
      createdAt: currentTimestamp
    }
  ];

  for (let i = 0; i < expenses.length; i++) {
    const expId = `exp_goa_${i + 1}`;
    await dbSetDoc(`groups/${groupId}/expenses`, expId, {
      ...expenses[i],
      id: expId
    });
  }

  // 4. Log baseline activity feeds
  const activities: Omit<Activity, "id">[] = [
    {
      groupId,
      category: "group_created",
      message: `${current.name} created Goa Trip 🌊 group.`,
      actorId: current.uid,
      createdAt: currentTimestamp
    },
    {
      groupId,
      category: "expense_added",
      message: `Parth Tyagi added Vagator Villa Stay (₹15,000).`,
      actorId: parth.uid,
      createdAt: currentTimestamp
    },
    {
      groupId,
      category: "expense_added",
      message: `${current.name} added Thalassa Dinner (₹4,500).`,
      actorId: current.uid,
      createdAt: currentTimestamp
    },
    {
      groupId,
      category: "expense_added",
      message: `Rohan Khanna added Fuel & Thar Rent (₹3,200).`,
      actorId: rohan.uid,
      createdAt: currentTimestamp
    }
  ];

  for (let i = 0; i < activities.length; i++) {
    const actId = `act_goa_${i + 1}`;
    await dbSetDoc(`groups/${groupId}/activities`, actId, {
      ...activities[i],
      id: actId
    });
  }

  // 5. Build pre-calculated active settlements suggestions using server engine logic mock
  // Balances calculation details:
  // Parth paid 15000, owed (5000 + 1500 + 2000 + 1066.67) = 9566.67 => Net is +5433.33 (gets back)
  // Current paid (4500 + 6000) = 10500, owed (1500 + 2000 + 5000 + 1066.66) = 9566.66 => Net is +933.34 (gets back)
  // Rohan paid 3200, owed (1500 + 2000 + 5000 + 1066.67) = 9566.67 => Net is -6366.67 (owes back)
  const settlements: Settlement[] = [
    {
      id: "set_goa_1",
      groupId,
      fromUid: rohan.uid,
      toUid: parth.uid,
      amount: 5433,
      status: "pending",
      createdAt: currentTimestamp
    },
    {
      id: "set_goa_2",
      groupId,
      fromUid: rohan.uid,
      toUid: current.uid,
      amount: 933,
      status: "pending",
      createdAt: currentTimestamp
    }
  ];

  for (const setObj of settlements) {
    await dbSetDoc(`groups/${groupId}/settlements`, setObj.id, setObj);
  }
}
