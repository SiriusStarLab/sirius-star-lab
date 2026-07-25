import React, { createContext, useContext } from "react";

export const PRODUCT_PLUS = "live.siriusai.app.plus_monthly";
export const PRODUCT_PRO = "sirius_pro_monthly";

export interface IAPPackage {
  identifier: string;
  product: {
    productIdentifier: string;
    priceString: string;
    title: string;
  };
  _raw: unknown;
}

interface SubscriptionState {
  isLoading: boolean;
  plusPackage: IAPPackage | undefined;
  proPackage: IAPPackage | undefined;
  isPlus: boolean;
  isPro: boolean;
  isSubscribed: boolean;
  tier: "free" | "plus" | "pro";
  isPurchasing: boolean;
  isRestoring: boolean;
  purchase: (pkg: IAPPackage) => Promise<void>;
  restore: () => Promise<void>;
  refetchCustomerInfo: () => Promise<void>;
  customerInfo: unknown;
  offerings: unknown;
  currentOffering: unknown;
}

const stub: SubscriptionState = {
  isLoading: false,
  plusPackage: undefined,
  proPackage: undefined,
  isPlus: false,
  isPro: false,
  isSubscribed: false,
  tier: "free",
  isPurchasing: false,
  isRestoring: false,
  customerInfo: null,
  offerings: null,
  currentOffering: undefined,
  purchase: async () => {},
  restore: async () => {},
  refetchCustomerInfo: async () => {},
};

const Context = createContext<SubscriptionState>(stub);

export function initializeRevenueCat() {}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  return <Context.Provider value={stub}>{children}</Context.Provider>;
}

export function useSubscription() {
  return useContext(Context);
}
