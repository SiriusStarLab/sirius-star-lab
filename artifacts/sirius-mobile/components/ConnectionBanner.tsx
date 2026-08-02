/**
 * ConnectionBanner — Mobile Tier 1 UX
 * Shows a subtle top bar when the device is offline or Sirius is recovering.
 *
 * "Offline — message saved"     amber, shown immediately on network loss
 * "Reconnecting to Sirius..."   amber pulse, while server is being retried
 * "Back online ✓"               green, auto-dismisses after 3s
 * Hidden when fully connected.
 */

import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConnectionStatus, subscribeToStatus } from "@/lib/resilient-fetch";

export function ConnectionBanner() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<ConnectionStatus>("connected");
  const opacity = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const unsub = subscribeToStatus(setStatus);
    return unsub;
  }, []);

  useEffect(() => {
    if (status === "connected") {
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }

    if (status === "reconnecting") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.35, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [status]);

  if (status === "connected") return null;

  const isReconnecting = status === "reconnecting";
  const bgColor = isReconnecting ? "#f59e0b" : "#22c55e"; // amber / green
  const textColor = isReconnecting ? "#78350f" : "#14532d";

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: bgColor, paddingTop: insets.top + 6, opacity },
      ]}
    >
      <View style={styles.row}>
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: isReconnecting ? "#d97706" : "#16a34a", opacity: isReconnecting ? pulseAnim : 1 },
          ]}
        />
        <Text style={[styles.text, { color: textColor }]}>
          {isReconnecting ? "Reconnecting to Sirius…" : "Back online ✓"}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingBottom: 7,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});
