/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where, documentId, doc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Group, Expense, Settlement, Activity, UserProfile } from "../types";
import { 
  dbSetDoc, 
  dbGetDoc, 
  subscribeToMockStore, 
  isMockMode, 
  getLocalCollection 
} from "../lib/firestoreQuery";

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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [currentRoute, setCurrentRoute] = useState<RouteConfig>({ path: "/dashboard" });
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [activeGroupExpenses, setActiveGroupExpenses] = useState<Expense[]>([]);
  const [activeGroupSettlements, setActiveGroupSettlements] = useState<Settlement[]>([]);
  const [activeGroupActivities, setActiveGroupActivities] = useState<Activity[]>([]);

  // Theme Sync LocalStorage + HTML classes
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("dispute_theme");
    return (saved === "light" || saved === "dark") ? (saved as "light" | "dark") : "light";
  });

  useEffect(() => {
    localStorage.setItem("dispute_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

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

  // Auth state listener (supports both Firebase and Mock)
  useEffect(() => {
    if (isMockMode()) {
      const storedUser = localStorage.getItem("dispute_mock_user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        const syncProfile = () => {
          const allUsers = getLocalCollection("users");
          const foundProfile = allUsers.find((u) => u.uid === parsedUser.uid);
          if (foundProfile) {
            setProfile(foundProfile);
            if (foundProfile.themePreference) {
              setTheme(foundProfile.themePreference);
            }
          } else {
            const placeholder: UserProfile = {
              uid: parsedUser.uid,
              name: parsedUser.displayName || "Mock Guest",
              email: parsedUser.email || "mock@dispute.app",
              photoURL: parsedUser.photoURL || "",
              upiId: "myupi@paytm",
              isOnboarded: false,
              createdAt: new Date().toISOString()
            };
            const list = getLocalCollection("users");
            list.push(placeholder);
            localStorage.setItem("mock_db_users", JSON.stringify(list));
            setProfile(placeholder);
          }
        };

        syncProfile();
        const unsubMock = subscribeToMockStore(syncProfile);

        if (currentRoute.path === "/login") {
          setCurrentRoute({ path: "/dashboard" });
        }

        setIsLoadingAuth(false);
        return () => unsubMock();
      } else {
        setUser(null);
        setProfile(null);
        setCurrentRoute({ path: "/login" });
        setIsLoadingAuth(false);
      }
      return;
    }

    let unsubProfile: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (unsubProfile) unsubProfile();
        
        // Listen to User Profile node dynamically in real-time
        unsubProfile = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            if (data.themePreference) {
              setTheme(data.themePreference);
            }
          } else {
            // First time initializer placeholder for auth synced profiles
            const placeholder: UserProfile = {
              uid: currentUser.uid,
              name: currentUser.displayName || "",
              email: currentUser.email || "",
              photoURL: currentUser.photoURL || "",
              upiId: "",
              isOnboarded: false,
              createdAt: new Date().toISOString()
            };
            dbSetDoc("users", currentUser.uid, placeholder).then(() => {
              setProfile(placeholder);
            });
          }
        });

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

  // Listen to GROUPS list for authenticated user
  useEffect(() => {
    if (!user) {
      setGroups([]);
      return;
    }

    if (isMockMode()) {
      const syncGroups = () => {
        const allGroups = getLocalCollection("groups") as Group[];
        const myGroups = allGroups.filter((g) => g.members.includes(user.uid));
        setGroups(myGroups);
      };
      syncGroups();
      return subscribeToMockStore(syncGroups);
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

  // Subscribe to details of SELECTED ACTIVE GROUP
  useEffect(() => {
    if (!user || !activeGroupId) {
      setActiveGroup(null);
      setActiveGroupExpenses([]);
      setActiveGroupSettlements([]);
      setActiveGroupActivities([]);
      return;
    }

    if (isMockMode()) {
      const syncActiveGroup = () => {
        const allGroups = getLocalCollection("groups") as Group[];
        const ag = allGroups.find((g) => g.id === activeGroupId) || null;
        setActiveGroup(ag);

        const exp = getLocalCollection(`groups/${activeGroupId}/expenses`) as Expense[];
        exp.sort((a, b) => b.date.localeCompare(a.date));
        setActiveGroupExpenses(exp);

        const setls = getLocalCollection(`groups/${activeGroupId}/settlements`) as Settlement[];
        setActiveGroupSettlements(setls);

        const acts = getLocalCollection(`groups/${activeGroupId}/activities`) as Activity[];
        acts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setActiveGroupActivities(acts);
      };
      syncActiveGroup();
      return subscribeToMockStore(syncActiveGroup);
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
