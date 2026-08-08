export const PLAN_CONFIG = {
  free: {
    amountLabel: "Free",
    description: "Watch up to 5 minutes per video.",
    displayName: "Free",
    watchLimitLabel: "5 minutes",
  },
  bronze: {
    amount: 1000,
    amountLabel: "Rs 10",
    description: "Watch up to 7 minutes per video.",
    displayName: "Bronze",
    watchLimitLabel: "7 minutes",
  },
  silver: {
    amount: 5000,
    amountLabel: "Rs 50",
    description: "Watch up to 10 minutes per video.",
    displayName: "Silver",
    watchLimitLabel: "10 minutes",
  },
  gold: {
    amount: 10000,
    amountLabel: "Rs 100",
    description: "Unlimited watch time and full premium access.",
    displayName: "Gold",
    watchLimitLabel: "Unlimited",
  },
} as const;

export type PlanCode = keyof typeof PLAN_CONFIG;

export const PLAN_ORDER: PlanCode[] = ["free", "bronze", "silver", "gold"];
