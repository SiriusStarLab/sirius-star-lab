import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import Colors from "@/constants/colors";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";
import { USER_ID_KEY } from "@/lib/api";

SplashScreen.preventAutoHideAsync();

try {
  initializeRevenueCat();
} catch {
  // RevenueCat API keys not set — fail silently, IAP not used on iOS
}

const queryClient = new QueryClient();
const ONBOARDING_KEY = "onboarding_complete";

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: "fade_from_bottom",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
          animation: "fade",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: false,
          animation: "fade",
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const navigationReady = useRef(false);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (navigationReady.current) return;
    navigationReady.current = true;

    (async () => {
      try {
        const userId = await AsyncStorage.getItem(USER_ID_KEY);
        if (!userId) {
          router.replace("/login");
          return;
        }
        const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!onboardingDone) {
          router.replace("/onboarding");
        }
        // userId exists and onboarding done — stay on (tabs) (default route)
      } catch {
        // AsyncStorage unavailable — proceed normally
      } finally {
        SplashScreen.hideAsync();
      }
    })();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SubscriptionProvider>
            <AppProvider>
              <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </AppProvider>
          </SubscriptionProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
