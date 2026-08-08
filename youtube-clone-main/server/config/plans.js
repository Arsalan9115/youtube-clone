export const PLAN_CONFIG = {
  free: {
    amount: 0,
    currency: "INR",
    displayName: "Free",
    isPremium: false,
    watchLimitLabel: "5 minutes",
    watchLimitSeconds: 5 * 60,
  },
  bronze: {
    amount: 1000,
    currency: "INR",
    displayName: "Bronze",
    isPremium: true,
    watchLimitLabel: "7 minutes",
    watchLimitSeconds: 7 * 60,
  },
  silver: {
    amount: 5000,
    currency: "INR",
    displayName: "Silver",
    isPremium: true,
    watchLimitLabel: "10 minutes",
    watchLimitSeconds: 10 * 60,
  },
  gold: {
    amount: 10000,
    currency: "INR",
    displayName: "Gold",
    isPremium: true,
    watchLimitLabel: "Unlimited",
    watchLimitSeconds: null,
  },
};

export const DEFAULT_PLAN_CODE = "free";

export const getPlanByCode = (planCode = DEFAULT_PLAN_CODE) =>
  PLAN_CONFIG[planCode] || PLAN_CONFIG[DEFAULT_PLAN_CODE];
