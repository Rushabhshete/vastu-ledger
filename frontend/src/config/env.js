export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "/api",
  APP_NAME: "VastuLedger",
  VERSION: "2026.1.0",
  SOCIETY_DEFAULTS: {
    NAME: "Vastu Heights Co-operative Housing Society",
    REG_NO: "MAH/PUN/RWA/2026/411045",
    CITY: "Pune, Maharashtra",
    UPI_VPA: "9525621552@upi",
  },
  DEFAULT_FEATURES: {
    FEATURE_3D_TOWER_VIEW: true,
    FEATURE_RESIDENT_UPI_SELF_REPORT: true,
    FEATURE_PUBLIC_VENDOR_RECEIPTS: true,
  },
};
