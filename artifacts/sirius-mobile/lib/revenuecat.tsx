import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

export const PRODUCT_PLUS = "live.siriusai.app.plus_monthly";
export const PRODUCT_PRO = "sirius_pro_monthly";

const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
const IS_IOS_NATIVE = Platform.OS === "ios";

export function initializeRevenueCat() {}

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

function parseCustomerInfo(info: any): { isPlus: boolean; isPro: boolean } {
  if (!info) return { isPlus: false, isPro: false };
  const active: string[] = info.activeSubscriptions ?? [];
  const entitlements = info.entitlements?.active ?? {};
  const isPlus =
    active.includes(PRODUCT_PLUS) ||
    "sirius_plus" in entitlements ||
    "plus" in entitlements;
  const isPro =
    active.includes(PRODUCT_PRO) ||
    "sirius_pro" in entitlements ||
    "pro" in entitlements;
  return { isPlus, isPro };
}

function packageFromOffering(
  offering: any,
  productId: string
): IAPPackage | undefined {
  if (!offering?.availablePackages) return undefined;
  // Try exact match first, then partial match (handles bundle-ID prefix differences)
  const keyword = productId.replace("live.siriusai.app.", "").toLowerCase();
  const pkg =
    offering.availablePackages.find(
      (p: any) => p.product?.productIdentifier === productId
    ) ??
    offering.availablePackages.find(
      (p: any) =>
        (p.product?.productIdentifier ?? "").toLowerCase().includes(keyword)
    );
  if (!pkg) return undefined;
  return {
    identifier: pkg.identifier,
    product: {
      productIdentifier: pkg.product.productIdentifier,
      priceString: pkg.product.priceString,
      title: pkg.product.title,
    },
    _raw: pkg,
  };
}

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<SubscriptionState>(stub);
  const configured = useRef(false);

  const loadOfferings = useCallback(async () => {
    if (!IS_IOS_NATIVE || !RC_IOS_KEY) return;
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const { default: Purchases } = require("react-native-purchases");
      const [offerings, info] = await Promise.all([
        Purchases.getOfferings(),
        Purchases.getCustomerInfo(),
      ]);
      const offering = offerings?.current ?? null;
      const plusPkg = packageFromOffering(offering, PRODUCT_PLUS);
      const proPackage = packageFromOffering(offering, PRODUCT_PRO);
      const { isPlus, isPro } = parseCustomerInfo(info);
      setState((s) => ({
        ...s,
        isLoading: false,
        offerings,
        currentOffering: offering,
        customerInfo: info,
        plusPackage: plusPkg,
        proPackage: proPackage,
        isPlus,
        isPro,
        isSubscribed: isPlus || isPro,
        tier: isPro ? "pro" : isPlus ? "plus" : "free",
      }));
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    if (!IS_IOS_NATIVE || !RC_IOS_KEY) return;
    if (configured.current) return;
    configured.current = true;

    try {
      const { default: Purchases, LOG_LEVEL } = require("react-native-purchases");
      Purchases.setLogLevel(LOG_LEVEL.ERROR);
      Purchases.configure({ apiKey: RC_IOS_KEY });
      loadOfferings();
    } catch {
      // RevenueCat failed to initialise — app continues normally
    }
  }, [loadOfferings]);

  const purchase = useCallback(async (pkg: IAPPackage) => {
    if (!IS_IOS_NATIVE) return;
    setState((s) => ({ ...s, isPurchasing: true }));
    try {
      const { default: Purchases } = require("react-native-purchases");
      const { customerInfo } = await Purchases.purchasePackage(pkg._raw);
      const { isPlus, isPro } = parseCustomerInfo(customerInfo);
      setState((s) => ({
        ...s,
        isPurchasing: false,
        customerInfo,
        isPlus,
        isPro,
        isSubscribed: isPlus || isPro,
        tier: isPro ? "pro" : isPlus ? "plus" : "free",
      }));
    } catch (err: any) {
      setState((s) => ({ ...s, isPurchasing: false }));
      throw err;
    }
  }, []);

  const restore = useCallback(async () => {
    if (!IS_IOS_NATIVE) return;
    setState((s) => ({ ...s, isRestoring: true }));
    try {
      const { default: Purchases } = require("react-native-purchases");
      const info = await Purchases.restorePurchases();
      const { isPlus, isPro } = parseCustomerInfo(info);
      setState((s) => ({
        ...s,
        isRestoring: false,
        customerInfo: info,
        isPlus,
        isPro,
        isSubscribed: isPlus || isPro,
        tier: isPro ? "pro" : isPlus ? "plus" : "free",
      }));
    } catch (err: any) {
      setState((s) => ({ ...s, isRestoring: false }));
      throw err;
    }
  }, []);

  const refetchCustomerInfo = useCallback(async () => {
    await loadOfferings();
  }, [loadOfferings]);

  const value: SubscriptionState = {
    ...state,
    purchase,
    restore,
    refetchCustomerInfo,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  return useContext(Context);
}
