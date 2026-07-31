import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="dreamlab" />
      <Tabs.Screen name="starlab" />
      <Tabs.Screen name="guide" />
      <Tabs.Screen name="projects" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="pricing" />
    </Tabs>
  );
}
