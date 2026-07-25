import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { USER_ID_KEY, getApiBase } from "@/lib/api";

const ONBOARDING_KEY = "onboarding_complete";

type Screen = "login" | "signup" | "forgot" | "forgot_sent";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    const passTrimmed = password.trim();

    if (!emailTrimmed || !passTrimmed) {
      Alert.alert("Missing details", "Please enter your email and password.");
      return;
    }
    if (screen === "signup" && passTrimmed.length < 8) {
      Alert.alert("Password too short", "Your password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const base = getApiBase();
      const endpoint = screen === "login" ? "auth/login" : "auth/signup";
      const res = await fetch(`${base}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed, password: passTrimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert(
          screen === "login" ? "Sign in failed" : "Account error",
          data.error ?? "Something went wrong. Please try again."
        );
        return;
      }

      const userId: string = data.userId;
      await AsyncStorage.setItem(USER_ID_KEY, userId);

      const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!onboardingDone) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)");
      }
    } catch {
      Alert.alert("Connection error", "Could not reach the server. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    const emailTrimmed = resetEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      Alert.alert("Enter your email", "Please type in your email address first.");
      return;
    }
    setLoading(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}auth/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed }),
      });
      if (res.ok) {
        setScreen("forgot_sent");
      } else {
        Alert.alert("Error", "Something went wrong. Please try again.");
      }
    } catch {
      Alert.alert("Connection error", "Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Forgot password sent ── */
  if (screen === "forgot_sent") {
    return (
      <KeyboardAvoidingView style={[styles.root, { backgroundColor: Colors.background }]} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <View style={styles.orb}><Text style={styles.orbStar}>✦</Text></View>
            <Text style={styles.logoName}>Sirius</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.successIcon}>
              <Feather name="check-circle" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Check your email</Text>
            <Text style={styles.cardSub}>
              If {resetEmail} is registered, a password reset link has been sent. It expires in 1 hour.
            </Text>
            <Text style={[styles.cardSub, { marginTop: 8 }]}>
              Don't see it? Contact{" "}
              <Text style={styles.switchLink}>support@sirius-ai.live</Text>
            </Text>
            <Pressable
              onPress={() => { setScreen("login"); setResetEmail(""); }}
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.submitText}>Back to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* ── Forgot password ── */
  if (screen === "forgot") {
    return (
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: Colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <View style={styles.orb}><Text style={styles.orbStar}>✦</Text></View>
            <Text style={styles.logoName}>Sirius</Text>
            <Text style={styles.logoTagline}>Your AI thinking partner</Text>
          </View>
          <View style={styles.card}>
            <Pressable onPress={() => setScreen("login")} style={styles.backBtn} hitSlop={10}>
              <Feather name="arrow-left" size={16} color={Colors.textDim} />
              <Text style={styles.backText}>Back to sign in</Text>
            </Pressable>

            <Text style={styles.cardTitle}>Reset password</Text>
            <Text style={styles.cardSub}>
              Enter the email address on your account and we'll send a reset link.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <Feather name="mail" size={16} color={Colors.textDim} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textDim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="send"
                  onSubmitEditing={handleForgot}
                  selectionColor={Colors.primary}
                  autoFocus
                />
              </View>
            </View>

            <Pressable
              onPress={handleForgot}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                loading && { opacity: 0.7 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitText}>Send reset link</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* ── Login / Signup ── */
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: Colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo mark */}
        <View style={styles.logoWrap}>
          <View style={styles.orb}>
            <Text style={styles.orbStar}>✦</Text>
          </View>
          <Text style={styles.logoName}>Sirius</Text>
          <Text style={styles.logoTagline}>Your AI thinking partner</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {screen === "login" ? "Welcome back" : "Create your account"}
          </Text>
          <Text style={styles.cardSub}>
            {screen === "login"
              ? "Sign in to continue your conversations"
              : "Join and start your first conversation"}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Feather name="mail" size={16} color={Colors.textDim} style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                selectionColor={Colors.primary}
              />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              {screen === "login" && (
                <Pressable onPress={() => { setResetEmail(email.trim().toLowerCase()); setScreen("forgot"); }} hitSlop={8}>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.inputWrap}>
              <Feather name="lock" size={16} color={Colors.textDim} style={styles.fieldIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder={screen === "signup" ? "At least 8 characters" : "Your password"}
                placeholderTextColor={Colors.textDim}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                selectionColor={Colors.primary}
              />
              <Pressable onPress={() => setShowPass(v => !v)} hitSlop={10}>
                <Feather
                  name={showPass ? "eye-off" : "eye"}
                  size={16}
                  color={Colors.textDim}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              loading && { opacity: 0.7 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitText}>
                {screen === "login" ? "Sign in" : "Create account"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setScreen(s => (s === "login" ? "signup" : "login"));
              setPassword("");
            }}
            style={styles.switchRow}
          >
            <Text style={styles.switchText}>
              {screen === "login" ? "Don't have an account? " : "Already have an account? "}
              <Text style={styles.switchLink}>
                {screen === "login" ? "Create one" : "Sign in"}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 40,
  },
  orb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${Colors.primary}18`,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}50`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  orbStar: {
    fontSize: 32,
    color: Colors.primary,
  },
  logoName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  logoTagline: {
    fontSize: 14,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  card: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  backText: {
    fontSize: 14,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
  },
  successIcon: {
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 14,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
    lineHeight: 20,
  },
  field: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  forgotLink: {
    fontSize: 13,
    color: Colors.primary,
    fontFamily: "Inter_500Medium",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    gap: 10,
  },
  fieldIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  submitText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  switchRow: {
    alignItems: "center",
  },
  switchText: {
    fontSize: 14,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
  },
  switchLink: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
});
