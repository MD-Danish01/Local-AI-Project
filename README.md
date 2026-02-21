# LocalAI Chat

A fully on-device AI chat application built with React Native & Expo. Run the **Qwen2.5 0.5B** large language model locally on your Android device — no internet connection, no API keys, no cloud.

---

## Features

- **100% On-Device Inference** — powered by [`@runanywhere/llamacpp`](https://www.npmjs.com/package/@runanywhere/llamacpp)
- **Qwen2.5 0.5B Q4** model (~397 MB, downloaded once to device storage)
- **Persistent Chat History** via SQLite (`expo-sqlite`)
- **Debug & Logs Tabs** for real-time inference diagnostics
- **Dark / Light theme** support with automatic system detection
- **New Architecture enabled** (React Native 0.81 + Expo SDK 54)

---

## Installation

Install the latest build directly on any Android device — no Play Store required.

### Latest Build

| Build                    | Date       | Profile   | Download / QR                                                                                                       |
| ------------------------ | ---------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| v1.0.0 — Initial Release | 2026-02-21 | `preview` | [EAS Build Link](https://expo.dev/accounts/danish-expo/projects/my-app/builds/711b0644-3d65-4a6f-9c73-e138b4b2cbf9) |

**Scan to install on Android:**

![EAS Build QR Code](assets/images/qr-code-of-expo-eas-build.png)

> Point your Android camera (or any QR scanner) at the code above.  
> The link opens the Expo build page where you can download and install the APK directly.

---

## Tech Stack

| Layer       | Library                             |
| ----------- | ----------------------------------- |
| Framework   | Expo SDK 54 / React Native 0.81     |
| Navigation  | Expo Router v6 (file-based)         |
| LLM Runtime | `@runanywhere/llamacpp` 0.18        |
| Database    | `expo-sqlite` 16                    |
| UI          | React Native + `@expo/vector-icons` |
| Build       | EAS Build                           |

---

## Prerequisites

Make sure the following are installed on your machine before proceeding.

| Tool           | Version         | Notes                                             |
| -------------- | --------------- | ------------------------------------------------- |
| Node.js        | 18 LTS or later | [nodejs.org](https://nodejs.org)                  |
| npm            | 9+              | Bundled with Node                                 |
| Java JDK       | 17              | Required for Android builds                       |
| Android Studio | Latest          | Install **Android SDK 35** and set `ANDROID_HOME` |
| Expo CLI       | Latest          | `npm install -g expo-cli`                         |
| EAS CLI        | 18+             | `npm install -g eas-cli`                          |

### Environment Variables

Add to your shell profile (`.bashrc`, `.zshrc`, or Windows System Variables):

```bash
# Android SDK
ANDROID_HOME=$HOME/Android/Sdk          # macOS/Linux
# ANDROID_HOME=C:\Users\<you>\AppData\Local\Android\Sdk   # Windows

PATH=$PATH:$ANDROID_HOME/emulator
PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## 1. Clone & Install

```bash
git clone https://github.com/MD-Danish01/Local-AI-Project.git

npm install
```

---

## 2. Local Development — `expo run:android`

This builds a **native debug APK** directly on your machine and installs it to a connected device or running emulator.

### Step 1 — Start a device

- **Physical device:** Enable _Developer Options_ → _USB Debugging_, then connect via USB.
- **Emulator:** Open Android Studio → _Device Manager_ → start an AVD (arm64-v8a recommended).

### Step 2 — Run the native build

```bash
npx expo run:android
```

> The first run compiles all native modules (including the llama.cpp bindings) and may take **5–15 minutes**. Subsequent runs are much faster thanks to Gradle's build cache.

### Step 3 — Start the Metro bundler (if not auto-started)

```bash
npx expo start --dev-client
```

Open the app on your device — it will connect to Metro automatically.

### Useful flags

```bash
# Build for a specific device
npx expo run:android --device

# Release variant (optimised, no dev menu)
npx expo run:android --variant release

# Clean build
npx expo run:android --clean
```

---

## 3. EAS Setup

EAS (Expo Application Services) lets you build, sign, and distribute your app in the cloud.

### Step 1 — Log in to your Expo account

```bash
eas login
```

> Don't have an account? Create one free at [expo.dev](https://expo.dev).

### Step 2 — Link the project

```bash
eas init
```

This writes your `projectId` into `app.json` under `extra.eas`. Commit the change.

### Step 3 — Configure (already done)

The `eas.json` in this repo is pre-configured with three build profiles:

| Profile       | Output              | Use case                    |
| ------------- | ------------------- | --------------------------- |
| `development` | Dev-client APK      | Local testing with dev menu |
| `preview`     | Release APK (arm64) | Internal sharing / QA       |
| `production`  | Release AAB (arm64) | Google Play Store           |

---

## 4. EAS Build

### Development build (dev-client)

```bash
eas build --platform android --profile development
```

### Preview APK (internal testing)

Produces a standalone `.apk` you can share directly.

```bash
eas build --platform android --profile preview
```

### Production AAB (Play Store)

```bash
eas build --platform android --profile production
```

> **First-time build:** EAS will prompt you to create or provide a keystore. Choose _Generate new keystore_ — EAS stores it securely in your account.

### Download the build

After the build finishes, EAS prints a download link. You can also view and download all builds at:

```
https://expo.dev/accounts/<your-username>/projects/my-app/builds
```

### Local EAS build (no cloud)

If you prefer to build on your own machine using EAS config:

```bash
eas build --platform android --profile preview --local
```

---

## Project Structure

```
app/                    # File-based routes (Expo Router)
  (tabs)/
    index.tsx           # Chat screen
    debug.tsx           # LLM debug info
    logs.tsx            # Runtime logs
    explore.tsx         # Model info
components/
  chat/                 # ChatBubble, InputBar, MessageList
  ui/                   # LoadingScreen, ModelDownloadScreen
services/
  llm/                  # LLMService, ModelDownloadService, config
  database/             # SQLite schema & DatabaseService
  logging/              # LoggingService
contexts/
  LLMContext.tsx        # Global LLM state provider
assets/
  models/               # Downloaded .gguf model stored here at runtime
```

---

## Model Info

| Property | Value                                                                 |
| -------- | --------------------------------------------------------------------- |
| Model    | Qwen2.5 0.5B Instruct                                                 |
| Format   | GGUF Q4_0                                                             |
| Size     | ~397 MB                                                               |
| Context  | 1024 tokens                                                           |
| Source   | [HuggingFace](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF) |

The model is **not bundled** with the app. On first launch the app downloads it automatically to device storage.

---

## Troubleshooting

| Problem                         | Fix                                                                     |
| ------------------------------- | ----------------------------------------------------------------------- |
| `SDK location not found`        | Set `ANDROID_HOME` and add `local.properties` with `sdk.dir=...`        |
| Gradle build fails on llama.cpp | Ensure NDK 27 is installed via Android Studio → SDK Manager → SDK Tools |
| Metro can't connect             | Run `npx expo start --dev-client --clear`                               |
| EAS build errors (422)          | Run `eas login` again and verify `projectId` in `app.json`              |
| Model download stuck            | Check device storage (needs ~400 MB free) and internet connection       |

---

## License

MIT — see [LICENSE](LICENSE) for details.
