// Single source of truth for plan pricing and features. Amounts are in
// paise (INR's smallest unit) since that's what Razorpay's API expects --
// e.g. 9900 = ₹99.00. Adjust these to your actual pricing before going live.
// Daily download limits per plan. -1 means unlimited.
export const DOWNLOAD_LIMITS = {
  Free: 1,
  Bronze: 5,
  Silver: 20,
  Gold: -1,
};

export const PLANS = {
  Free: {
    label: "Free",
    prices: { monthly: 0, quarterly: 0, yearly: 0 },
    downloadLimit: 1,
    features: [
      "Limited access to premium videos",
      "Standard streaming quality",
      "1 download per day",
      "Ads shown between videos",
    ],
  },
  Bronze: {
    label: "Bronze",
    prices: { monthly: 9900, quarterly: 26900, yearly: 99900 },
    downloadLimit: 5,
    features: [
      "Unlimited video access",
      "HD streaming quality",
      "5 downloads per day",
      "Fewer ads",
    ],
  },
  Silver: {
    label: "Silver",
    prices: { monthly: 19900, quarterly: 54900, yearly: 199900 },
    downloadLimit: 20,
    features: [
      "Everything in Bronze",
      "Full HD streaming",
      "20 downloads per day",
      "Ad-free viewing",
      "Offline downloads",
    ],
  },
  Gold: {
    label: "Gold",
    prices: { monthly: 29900, quarterly: 79900, yearly: 299900 },
    downloadLimit: 999999,
    features: [
      "Everything in Silver",
      "4K streaming where available",
      "Unlimited downloads",
      "Priority access to new content",
      "Exclusive premium courses",
    ],
  },
};

export const BILLING_DAYS = { monthly: 30, quarterly: 90, yearly: 365 };
