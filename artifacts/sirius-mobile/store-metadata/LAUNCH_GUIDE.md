# Sirius Star Lab — App Store Launch Guide

## Before You Start

You need two developer accounts:
- **Apple Developer Program** — $99/year at developer.apple.com
- **Google Play Console** — $25 one-time at play.google.com/console

---

## Step 1 — Complete the App Store Connect Setup (iOS)

1. Sign in to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click **My Apps → +** to create a new app
3. Fill in:
   - **Platform**: iOS
   - **Name**: Sirius Star Lab — Think Together
   - **Primary Language**: English (UK)
   - **Bundle ID**: `com.siriusai.app`
   - **SKU**: `com.siriusai.app`
4. Once created, copy the **numeric App ID** from the URL bar (it looks like `1234567890`)
5. Open `eas.json` and replace `"ascAppId": "YOUR_NUMERIC_APP_ID"` with that number

---

## Step 2 — Fix the Apple Team ID

The `appleTeamId` in `eas.json` (`a4f395dd-7030-4104-90f6-889eeeab4640`) needs to be verified:
1. Sign in to [developer.apple.com](https://developer.apple.com)
2. Go to **Account → Membership**
3. Copy your **Team ID** (10-character alphanumeric, e.g. `ABCD1234EF`)
4. Update `eas.json` with the correct value

---

## Step 3 — Build for iOS

Install EAS CLI if you haven't already:
```
npm install -g eas-cli
eas login
```

Build the production iOS binary:
```
cd artifacts/sirius-mobile
eas build --platform ios --profile production
```

This uses EAS cloud build servers (Apple silicon M-medium). The build takes ~15-20 minutes and produces a signed `.ipa` file.

---

## Step 4 — Submit to App Store

After the build completes:
```
eas submit --platform ios --profile production
```

This uploads the build to App Store Connect and pushes the metadata from `store-metadata/ios/store.config.json`.

**Screenshots required in App Store Connect** (upload manually):
- iPhone 6.7" (1290×2796): minimum 3 screenshots
- iPhone 6.5" (1242×2688): minimum 3 screenshots
- iPad 12.9" (2048×2732): minimum 3 screenshots (if supportsTablet is ever enabled)

Recommended screenshot subjects:
1. Chat screen with a flowing conversation
2. Explore / Daily Wisdom screen
3. Mood check-in or topic hub
4. History screen

---

## Step 5 — Google Play Setup

### Create a Service Account Key

1. Open [Google Play Console](https://play.google.com/console)
2. Go to **Setup → API access**
3. Link to a Google Cloud project
4. Create a service account with the **Release Manager** role
5. Download the JSON key file
6. Save it as `store-metadata/google-play-service-account.json`

### Create the App in Play Console

1. Click **Create app**
2. Fill in app details matching `store-metadata/store-listing.json`
3. Complete the **Content rating questionnaire** (select: No violence, No mature content)
4. Set **Target audience**: 16+
5. Set **Category**: Productivity

---

## Step 6 — Build and Submit for Android

Build the production Android App Bundle:
```
eas build --platform android --profile production
```

Submit to internal test track:
```
eas submit --platform android --profile production
```

The first submission to Google Play must be done **manually** (upload the `.aab` file in Play Console). After that, EAS Submit can handle subsequent releases automatically.

---

## Step 7 — App Store Connect Review Information

When submitting for review, provide these notes:
- **Review notes**: "This is an AI chat application. Open the app and start a conversation. No login required. Voice input uses the microphone. No special test account is needed."
- **Sign-in required**: No
- **Demo account**: Not required

---

## Step 8 — Privacy Nutrition Labels (iOS)

In App Store Connect under **App Privacy**, declare:

| Data type | Collected | Linked to user | Used for tracking |
|-----------|-----------|----------------|-------------------|
| Identifiers (User ID) | Yes | Yes | No |
| Usage Data (messages sent) | Yes | Yes | No |
| Audio (voice input) | No | — | — |

---

## Current `eas.json` — Values to Confirm

```
appleId: garryboy@icloud.com          ✅ Confirm this is your Apple ID
ascAppId: [REPLACE WITH NUMERIC ID]   ⚠️  Get from App Store Connect
appleTeamId: [VERIFY]                 ⚠️  Verify in developer.apple.com/account
```

---

## Checklist Before Submitting

- [ ] Apple Developer Program membership active
- [ ] `ascAppId` updated with correct numeric ID from App Store Connect
- [ ] `appleTeamId` verified
- [ ] App Store Connect app record created
- [ ] Screenshots prepared (min 3 × iPhone 6.7")
- [ ] Privacy policy live at sirius-ai.live/privacy
- [ ] Terms of service live at sirius-ai.live/terms
- [ ] Google Play service account JSON in place
- [ ] Google Play app record created
- [ ] Content rating questionnaire completed
- [ ] `eas build --platform all --profile production` completed successfully
- [ ] `eas submit` run for both platforms

---

## API Server

The mobile app connects to your API server. Make sure `sirius-ai.live` is pointing to your deployed Replit app and the API is live before submitting for review.

Set `EXPO_PUBLIC_DOMAIN` to your production domain in the EAS project secrets:
```
eas secret:create --name EXPO_PUBLIC_DOMAIN --value sirius-ai.live --scope project
```
