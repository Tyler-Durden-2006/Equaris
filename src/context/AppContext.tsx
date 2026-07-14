/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Group, Expense, Settlement, Activity, UserProfile } from "../types";
import { dbSetDoc, dbGetDoc } from "../lib/firestoreQuery";

interface RouteConfig {
  path: string;
  params?: Record<string, string>;
}

interface AppContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isLoadingAuth: boolean;
  currentRoute: RouteConfig;
  navigate: (path: string, params?: Record<string, any>) => void;
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  /** Real expenses aggregated across every group the user belongs to. */
  allExpenses: Expense[];
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  activeGroup: Group | null;
  activeGroupExpenses: Expense[];
  activeGroupSettlements: Settlement[];
  activeGroupActivities: Activity[];
  refreshUserData: () => Promise<void>;
  updateProfileUpi: (upi: string) => Promise<void>;
  refetchActiveGroupData: () => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  updateFullProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Map the browser's current URL to an in-app route on first load, and stash any
 * `?connect=<handle>` QR deep-link so it survives login/onboarding.
 */
const deriveInitialRoute = (): RouteConfig => {
  if (typeof window === "undefined") return { path: "/dashboard" };
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const connect = params.get("connect");
  if (connect) {
    try {
      localStorage.setItem("dispute_pending_connect", connect);
    } catch {
      /* storage unavailable — deep link still works while on this page */
    }
    return { path: "/network" };
  }
  if (path.startsWith("/groups/")) {
    return { path: "/groups/[id]", params: { id: path.split("/")[2] } };
  }
  const known = ["/dashboard", "/groups", "/settlements", "/network", "/reports", "/profile", "/settings"];
  return known.includes(path) ? { path } : { path: "/dashboard" };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const initialRoute = deriveInitialRoute();
  const [currentRoute, setCurrentRoute] = useState<RouteConfig>(initialRoute);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    initialRoute.path === "/groups/[id]" ? initialRoute.params?.id ?? null : null
  );
  
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [activeGroupExpenses, setActiveGroupExpenses] = useState<Expense[]>([]);
  const [activeGroupSettlements, setActiveGroupSettlements] = useState<Settlement[]>([]);
  const [activeGroupActivities, setActiveGroupActivities] = useState<Activity[]>([]);

  // Single brand theme — the light/dark toggle was removed. `theme` is fixed to
  // "light" and setTheme is a no-op so any legacy callers stay harmless.
  const theme = "light" as const;
  const setTheme = (_t: "light" | "dark") => {};

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // Simple state routing history handling
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith("/groups/")) {
        const id = path.split("/")[2];
        setCurrentRoute({ path: "/groups/[id]", params: { id } });
        setActiveGroupId(id);
      } else {
        setCurrentRoute({ path, params: {} });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: string, params?: Record<string, any>) => {
    let url = path;
    if (path === "/groups/[id]" && params?.id) {
      url = `/groups/${params.id}`;
      setActiveGroupId(params.id);
    }
    window.history.pushState(null, "", url);
    setCurrentRoute({ path, params });
  };

  const updateFullProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    try {
      const updated = { ...profile, ...updates };
      await dbSetDoc("users", user.uid, updated);
      setProfile(updated);
    } catch (err) {
      console.error("Failed to update full profile info:", err);
    }
  };

  const updateProfileUpi = async (upi: string) => {
    await updateFullProfile({ upiId: upi });
  };

  const refreshUserData = async () => {
    if (!user) return;
    try {
      const snap = await dbGetDoc("users", user.uid);
      if (snap && snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
    } catch (err) {
      console.error("Failed refreshing user profile data:", err);
    }
  };

  // Real Firebase auth state listener
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        if (unsubProfile) unsubProfile();

        // Listen to User Profile node in real-time
        unsubProfile = onSnapshot(
          doc(db, "users", currentUser.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              setProfile(data);
            } else {
              // Brand-new account: create an empty profile with isOnboarded = false
              // so Onboarding is triggered. NO fake/seeded data.
              const placeholder: UserProfile = {
                uid: currentUser.uid,
                // Name must be non-empty to satisfy Firestore validation rules.
                name:
                  currentUser.displayName ||
                  currentUser.email?.split("@")[0] ||
                  "New User",
                email: currentUser.email || "",
                photoURL: currentUser.photoURL || "",
                upiId: "",
                isOnboarded: false,
                createdAt: new Date().toISOString(),
              };
              dbSetDoc("users", currentUser.uid, placeholder)
                .then(() => setProfile(placeholder))
                .catch((err) =>
                  console.error(
                    "Failed to create initial user profile (check Firestore security rules for 'users'):",
                    err
                  )
                );
            }
          },
          (err) => {
            // Without this handler the profile snapshot fails silently, leaving
            // `profile` null forever — which strands the user on a half-loaded
            // dashboard. Surface it so the rules/permissions issue is visible.
            console.error(
              "User profile snapshot failed (likely Firestore security rules denying read on 'users'):",
              err
            );
          }
        );

        if (currentRoute.path === "/login") {
          setCurrentRoute({ path: "/dashboard" });
        }
      } else {
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        setProfile(null);
        setCurrentRoute({ path: "/login" });
      }

      setIsLoadingAuth(false);
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, [currentRoute.path]);

  // After sign-in + onboarding, honour a pending QR connect deep-link by routing
  // the user to the network page (where the connection is confirmed & written).
  useEffect(() => {
    if (!user || !profile || profile.isOnboarded === false) return;
    let pending: string | null = null;
    try {
      pending = localStorage.getItem("dispute_pending_connect");
    } catch {
      pending = null;
    }
    if (pending && currentRoute.path !== "/network") {
      navigate("/network");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?.isOnboarded]);

  // Listen to GROUPS list for authenticated user
  useEffect(() => {
    if (!user) {
      setGroups([]);
      return;
    }

    const q = query(collection(db, "groups"), where("members", "array-contains", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedGroups: Group[] = [];
        snapshot.forEach((docSnap) => {
          loadedGroups.push({ id: docSnap.id, ...docSnap.data() } as Group);
        });
        setGroups(loadedGroups);
      },
      (error) => {
        console.error("Groups snap listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Aggregate expenses across ALL of the user's groups so global views
  // (Dashboard, Reports, Settlements) render from real data instead of mocks.
  const groupIdsKey = groups.map((g) => g.id).sort().join(",");
  useEffect(() => {
    if (!user || groups.length === 0) {
      setAllExpenses([]);
      return;
    }

    const byGroup: Record<string, Expense[]> = {};
    const unsubs = groups.map((g) =>
      onSnapshot(
        collection(db, `groups/${g.id}/expenses`),
        (snapshot) => {
          const list: Expense[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Expense);
          });
          byGroup[g.id] = list;
          setAllExpenses(Object.values(byGroup).flat());
        },
        (error) => console.error("Aggregate expenses listener error:", error)
      )
    );

    return () => unsubs.forEach((u) => u());
    // groupIdsKey changes only when the SET of groups changes, avoiding churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, groupIdsKey]);

  // Subscribe to details of SELECTED ACTIVE GROUP
  useEffect(() => {
    if (!user || !activeGroupId) {
      setActiveGroup(null);
      setActiveGroupExpenses([]);
      setActiveGroupSettlements([]);
      setActiveGroupActivities([]);
      return;
    }

    // 1. Group info snapshot
    const docRef = doc(db, "groups", activeGroupId);
    const unsubGroup = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setActiveGroup({ id: docSnap.id, ...docSnap.data() } as Group);
      }
    });

    // 2. Expenses subcollection snapshot
    const expensesRef = collection(db, `groups/${activeGroupId}/expenses`);
    const unsubExpenses = onSnapshot(expensesRef, (snapshot) => {
      const list: Expense[] = [];
      snapshot.forEach((subDoc) => {
        list.push({ id: subDoc.id, ...subDoc.data() } as Expense);
      });
      // Sort expenses by date descending
      list.sort((a, b) => b.date.localeCompare(a.date));
      setActiveGroupExpenses(list);
    });

    // 3. Settlements subcollection snapshot
    const settlementsRef = collection(db, `groups/${activeGroupId}/settlements`);
    const unsubSettlements = onSnapshot(settlementsRef, (snapshot) => {
      const list: Settlement[] = [];
      snapshot.forEach((subDoc) => {
        list.push({ id: subDoc.id, ...subDoc.data() } as Settlement);
      });
      setActiveGroupSettlements(list);
    });

    // 4. Activities subcollection snapshot
    const activitiesRef = collection(db, `groups/${activeGroupId}/activities`);
    const unsubActivities = onSnapshot(activitiesRef, (snapshot) => {
      const list: Activity[] = [];
      snapshot.forEach((subDoc) => {
        list.push({ id: subDoc.id, ...subDoc.data() } as Activity);
      });
      // Sort activities by creation time descending
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setActiveGroupActivities(list);
    });

    return () => {
      unsubGroup();
      unsubExpenses();
      unsubSettlements();
      unsubActivities();
    };
  }, [user, activeGroupId]);

  const refetchActiveGroupData = () => {
    const backupId = activeGroupId;
    setActiveGroupId(null);
    setTimeout(() => setActiveGroupId(backupId), 10);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        isLoadingAuth,
        currentRoute,
        navigate,
        groups,
        setGroups,
        allExpenses,
        activeGroupId,
        setActiveGroupId,
        activeGroup,
        activeGroupExpenses,
        activeGroupSettlements,
        activeGroupActivities,
        refreshUserData,
        updateProfileUpi,
        refetchActiveGroupData,
        theme,
        setTheme,
        updateFullProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider context");
  }
  return context;
};
