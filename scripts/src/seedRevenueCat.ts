import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listProjects, createProject,
  listApps, createApp,
  listAppPublicApiKeys,
  listProducts, createProduct,
  listEntitlements, createEntitlement, attachProductsToEntitlement,
  listOfferings, createOffering, updateOffering,
  listPackages, createPackages, attachProductsToPackage,
  type App, type Product, type Project, type Entitlement, type Offering, type Package, type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "Sirius Star Lab";

const APP_STORE_BUNDLE_ID = "live.siriusai.app";
const PLAY_STORE_PACKAGE_NAME = "live.siriusai.app";
const APP_STORE_APP_NAME = "Sirius Star Lab — iOS";
const PLAY_STORE_APP_NAME = "Sirius Star Lab — Android";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

type TestStorePricesResponse = { object: string; prices: { amount_micros: number; currency: string }[] };

const TIERS = [
  {
    label: "Plus",
    testStoreId: "sirius_plus_monthly",
    appStoreId: "sirius_plus_monthly",
    playStoreId: "sirius_plus_monthly:monthly",
    displayName: "Sirius Plus",
    userFacingTitle: "Sirius Plus — Monthly",
    duration: "P1M" as const,
    entitlementId: "sirius_plus",
    entitlementDisplayName: "Sirius Plus Access",
    packageId: "$rc_monthly",
    packageDisplayName: "Plus Monthly",
    prices: [
      { amount_micros: 4990000, currency: "GBP" },
      { amount_micros: 5990000, currency: "USD" },
      { amount_micros: 5490000, currency: "EUR" },
    ],
  },
  {
    label: "Pro",
    testStoreId: "sirius_pro_monthly",
    appStoreId: "sirius_pro_monthly",
    playStoreId: "sirius_pro_monthly:monthly",
    displayName: "Sirius Pro",
    userFacingTitle: "Sirius Pro — Monthly",
    duration: "P1M" as const,
    entitlementId: "sirius_pro",
    entitlementDisplayName: "Sirius Pro Access",
    packageId: "pro_monthly",
    packageDisplayName: "Pro Monthly",
    prices: [
      { amount_micros: 11990000, currency: "GBP" },
      { amount_micros: 14990000, currency: "USD" },
      { amount_micros: 12990000, currency: "EUR" },
    ],
  },
];

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Project ──────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({ client, query: { limit: 20 } });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find(p => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ── Apps ─────────────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({ client, path: { project_id: project.id }, query: { limit: 20 } });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("No apps found — RevenueCat creates a test store app automatically");

  let testStoreApp: App | undefined = apps.items.find(a => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find(a => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find(a => a.type === "play_store");

  if (!testStoreApp) throw new Error("No test store app found");
  console.log("Test Store app:", testStoreApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({ client, path: { project_id: project.id }, body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } } });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({ client, path: { project_id: project.id }, body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } } });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  const { data: existingProducts, error: listProductsError } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (targetApp: App, storeId: string, label: string, isTestStore: boolean, tier: typeof TIERS[0]): Promise<Product> => {
    const existing = existingProducts.items?.find(p => p.store_identifier === storeId && p.app_id === targetApp.id);
    if (existing) { console.log(`${label} product already exists:`, existing.id); return existing; }

    const body: CreateProductData["body"] = {
      store_identifier: storeId,
      app_id: targetApp.id,
      type: "subscription",
      display_name: tier.displayName,
    };
    if (isTestStore) {
      body.subscription = { duration: tier.duration };
      body.title = tier.userFacingTitle;
    }
    const { data, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error(`Failed to create ${label} product`);
    console.log(`Created ${label} product:`, data.id);
    return data;
  };

  // ── Offering ──────────────────────────────────────────────────────────
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({ client, path: { project_id: project.id }, query: { limit: 20 } });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  let offering: Offering;
  const existingOffering = existingOfferings.items?.find(o => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data, error } = await createOffering({ client, path: { project_id: project.id }, body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME } });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", data.id);
    offering = data;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({ client, path: { project_id: project.id, offering_id: offering.id }, body: { is_current: true } });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  const { data: existingPackages, error: listPackagesError } = await listPackages({ client, path: { project_id: project.id, offering_id: offering.id }, query: { limit: 20 } });
  if (listPackagesError) throw new Error("Failed to list packages");

  // ── Per-tier: products, entitlements, packages ────────────────────────
  for (const tier of TIERS) {
    console.log(`\n── Setting up ${tier.label} tier ──`);

    const testProduct = await ensureProduct(testStoreApp, tier.testStoreId, `Test Store ${tier.label}`, true, tier);
    const appProduct = await ensureProduct(appStoreApp, tier.appStoreId, `App Store ${tier.label}`, false, tier);
    const playProduct = await ensureProduct(playStoreApp, tier.playStoreId, `Play Store ${tier.label}`, false, tier);

    // Set test store prices
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: testProduct.id },
      body: { prices: tier.prices },
    });
    if (priceError && (priceError as any)?.type !== "resource_already_exists") {
      throw new Error(`Failed to set test store prices for ${tier.label}`);
    } else {
      console.log(`Test store prices set for ${tier.label}`);
    }

    // Entitlement
    const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({ client, path: { project_id: project.id }, query: { limit: 20 } });
    if (listEntitlementsError) throw new Error("Failed to list entitlements");

    let entitlement: Entitlement;
    const existingEntitlement = existingEntitlements.items?.find(e => e.lookup_key === tier.entitlementId);
    if (existingEntitlement) {
      console.log(`${tier.label} entitlement already exists:`, existingEntitlement.id);
      entitlement = existingEntitlement;
    } else {
      const { data, error } = await createEntitlement({ client, path: { project_id: project.id }, body: { lookup_key: tier.entitlementId, display_name: tier.entitlementDisplayName } });
      if (error) throw new Error(`Failed to create ${tier.label} entitlement`);
      console.log(`Created ${tier.label} entitlement:`, data.id);
      entitlement = data;
    }

    const { error: attachEntErr } = await attachProductsToEntitlement({
      client,
      path: { project_id: project.id, entitlement_id: entitlement.id },
      body: { product_ids: [testProduct.id, appProduct.id, playProduct.id] },
    });
    if (attachEntErr && (attachEntErr as any)?.type !== "unprocessable_entity_error") {
      throw new Error(`Failed to attach ${tier.label} products to entitlement`);
    }
    console.log(`${tier.label} products attached to entitlement`);

    // Package
    let pkg: Package;
    const existingPkg = existingPackages.items?.find(p => p.lookup_key === tier.packageId);
    if (existingPkg) {
      console.log(`${tier.label} package already exists:`, existingPkg.id);
      pkg = existingPkg;
    } else {
      const { data, error } = await createPackages({ client, path: { project_id: project.id, offering_id: offering.id }, body: { lookup_key: tier.packageId, display_name: tier.packageDisplayName } });
      if (error) throw new Error(`Failed to create ${tier.label} package`);
      console.log(`Created ${tier.label} package:`, data.id);
      pkg = data;
    }

    const { error: attachPkgErr } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: { products: [
        { product_id: testProduct.id, eligibility_criteria: "all" },
        { product_id: appProduct.id, eligibility_criteria: "all" },
        { product_id: playProduct.id, eligibility_criteria: "all" },
      ]},
    });
    if (attachPkgErr && (attachPkgErr as any)?.type !== "unprocessable_entity_error") {
      throw new Error(`Failed to attach ${tier.label} products to package`);
    }
    console.log(`${tier.label} products attached to package`);
  }

  // ── API Keys ─────────────────────────────────────────────────────────
  const getKey = async (app: App, label: string) => {
    const { data, error } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: app.id } });
    if (error) { console.warn(`Failed to get ${label} API keys`); return "N/A"; }
    return data?.items.map(k => k.key).join(", ") ?? "N/A";
  };

  const testKey = await getKey(testStoreApp, "Test Store");
  const iosKey = await getKey(appStoreApp!, "App Store");
  const androidKey = await getKey(playStoreApp!, "Play Store");

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", testStoreApp.id);
  console.log("App Store App ID:", appStoreApp!.id);
  console.log("Play Store App ID:", playStoreApp!.id);
  console.log("\nStore these in environment variables:");
  console.log("REVENUECAT_PROJECT_ID =", project.id);
  console.log("REVENUECAT_TEST_STORE_APP_ID =", testStoreApp.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID =", appStoreApp!.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID =", playStoreApp!.id);
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY =", testKey);
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY =", iosKey);
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY =", androidKey);
  console.log("====================\n");
}

seedRevenueCat().catch(console.error);
