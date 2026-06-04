import React, { createContext, useContext } from "react";

export const ENTITLEMENT_PLUS = "sirius_plus";
export const ENTITLEMENT_PRO = "sirius_pro";
export const PACKAGE_PLUS = "$rc_monthly";
export const PACKAGE_PRO = "pro_monthly";

export function initializeRevenueCat() {}

interface IAPPackage {
  identifier: string;
  product: {
    priceString: string;
    title: string;
  };
}

interface SubscriptionState {
  customerInfo: null;
  offerings: null;
  currentOffering: undefined;
  plusPackage: IAPPackage | undefined;
  proPackage: IAPPackage | undefined;
  isSubscribed: boolean;
  isPlus: boolean;
  isPro: boolean;
  tier: "free" | "plus" | "pro";
  isLoading: boolean;
  purchase: (pkg: IAPPackage) => Promise<void>;
  restore: () => Promise<void>;
  isPurchasing: boolean;
  isRestoring: boolean;
  refetchCustomerInfo: () => void;
}

const stubValue: SubscriptionState = {
  customerInfo: null,
  offerings: null,
  currentOffering: undefined,
  plusPackage: undefined,
  proPackage: undefined,
  isSubscribed: false,
  isPlus: false,
  isPro: false,
  tier: "free",
  isLoading: false,
  purchase: async () => { throw new Error("IAP not configured"); },
  restore: async () => { throw new Error("IAP not configured"); },
  isPurchasing: false,
  isRestoring: false,
  refetchCustomerInfo: () => {},
};

const Context = createContext<SubscriptionState>(stubValue);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  return <Context.Provider value={stubValue}>{children}</Context.Provider>;
}

export function useSubscription() {
  return useContext(Context);
}
