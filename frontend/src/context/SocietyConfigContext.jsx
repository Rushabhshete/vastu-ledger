import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import * as adminService from "../services/adminService.js";
import * as societyService from "../services/societyService.js";
import { ENV } from "../config/env.js";
import { useAuth } from "./AuthContext.jsx";

const SocietyConfigContext = createContext(null);

const DEFAULT_SETTINGS = {
  MAINTENANCE_MODE: "FLAT_SQFT",
  MAINTENANCE_RATE_SQFT: "5.50",
  FIXED_1BHK: "2500",
  FIXED_2BHK: "3500",
  FIXED_3BHK: "5000",
  SINKING_FUND_PCT: "10",
  REPAIR_FUND_PCT: "5",
  NON_OCCUPANCY_CHARGE_PCT: "10",
  LATE_FEE_GRACE_DAYS: "10",
  LATE_FEE_TYPE: "SIMPLE_PERCENT",
  LATE_FEE_RATE: "18",
  MAKER_CHECKER_THRESHOLD: "15000",
  SOCIETY_UPI_VPA: "9525621552@upi",
  SOCIETY_BANK_MASK: "ICICI ****4521",
  SOCIETY_GSTIN: "27AABCV1234F1ZK",
  BILLING_CYCLE_DAY: "1",
  FEATURE_3D_TOWER_VIEW: "true",
  FEATURE_RESIDENT_UPI_SELF_REPORT: "true",
  FEATURE_PUBLIC_VENDOR_RECEIPTS: "true",
};

export function SocietyConfigProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [availableSocieties, setAvailableSocieties] = useState([]);
  const [currentSocietyId, setCurrentSocietyId] = useState(() => {
    const saved = localStorage.getItem("vl_active_society_id");
    return saved ? Number(saved) : 1;
  });
  const [currentSociety, setCurrentSociety] = useState(null);

  const isFetchingRef = useRef(false);

  // Main stable loader: runs ONLY when authentication status or selected society ID changes
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    async function loadTenantContext() {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoading(true);

      try {
        // 1. Fetch available societies list
        const socList = await societyService.listSocieties();
        if (!isMounted) return;

        if (Array.isArray(socList) && socList.length > 0) {
          setAvailableSocieties(socList);

          // If current selected ID is invalid or not in list, auto-clamp to first available
          const exists = socList.some((s) => s.id === currentSocietyId);
          if (!exists) {
            const fallbackId = socList[0].id;
            setCurrentSocietyId(fallbackId);
            localStorage.setItem("vl_active_society_id", String(fallbackId));
            isFetchingRef.current = false;
            return;
          }
        }

        // 2. Fetch current society details & system settings in parallel
        const [socData, settingsData] = await Promise.all([
          societyService.getSociety(currentSocietyId).catch(() => null),
          adminService.getSettings().catch(() => null),
        ]);

        if (!isMounted) return;

        if (socData) {
          setCurrentSociety(socData);
        }
        if (settingsData && typeof settingsData === "object") {
          setSettings((prev) => ({ ...prev, ...settingsData }));
        }
      } catch (err) {
        console.warn("[SocietyConfigContext] Failed loading active tenant data:", err.message);
      } finally {
        if (isMounted) {
          setLoading(false);
          isFetchingRef.current = false;
        }
      }
    }

    loadTenantContext();

    return () => {
      isMounted = false;
      isFetchingRef.current = false;
    };
  }, [isAuthenticated, currentSocietyId]);

  // Switch active society
  const switchSociety = useCallback(
    (societyId) => {
      const targetId = Number(societyId);
      if (!targetId || targetId === currentSocietyId) return;
      localStorage.setItem("vl_active_society_id", String(targetId));
      setCurrentSocietyId(targetId);
      window.dispatchEvent(new CustomEvent("vl_society_switched", { detail: { societyId: targetId } }));
    },
    [currentSocietyId]
  );

  // Manual reload triggers (for buttons / after updates)
  const reloadSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await adminService.getSettings();
      if (data && typeof data === "object") {
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch {
      // Retain fallback defaults
    }
  }, [isAuthenticated]);

  const reloadSocieties = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const list = await societyService.listSocieties();
      if (Array.isArray(list) && list.length > 0) {
        setAvailableSocieties(list);
      }
    } catch (err) {
      console.warn("[SocietyConfig] Could not reload societies list:", err.message);
    }
  }, [isAuthenticated]);

  const reloadCurrentSociety = useCallback(async () => {
    if (!isAuthenticated || !currentSocietyId) return;
    try {
      const soc = await societyService.getSociety(currentSocietyId);
      if (soc) setCurrentSociety(soc);
    } catch {
      // Retain previous
    }
  }, [isAuthenticated, currentSocietyId]);

  const isFeatureEnabled = useCallback(
    (featureKey) => {
      return settings[featureKey] === "true" || settings[featureKey] === true;
    },
    [settings]
  );

  const value = {
    settings,
    loading,
    reloadSettings,
    reloadSocieties,
    reloadCurrentSociety,
    isFeatureEnabled,
    availableSocieties,
    currentSocietyId,
    currentSociety,
    switchSociety,
    societyName: currentSociety?.name || ENV.SOCIETY_DEFAULTS.NAME,
    upiVpa: settings.SOCIETY_UPI_VPA || ENV.SOCIETY_DEFAULTS.UPI_VPA,
    gstin: settings.SOCIETY_GSTIN,
    bankMask: settings.SOCIETY_BANK_MASK,
    makerCheckerThreshold: Number(settings.MAKER_CHECKER_THRESHOLD || 15000),
    isSuperadmin: Boolean(user?.isSuperadmin),
  };

  return <SocietyConfigContext.Provider value={value}>{children}</SocietyConfigContext.Provider>;
}

export function useSocietyConfig() {
  const context = useContext(SocietyConfigContext);
  if (!context) {
    throw new Error("useSocietyConfig must be used within a SocietyConfigProvider");
  }
  return context;
}
