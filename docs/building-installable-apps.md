# Building Installable Apps (Android APK / AAB, iOS)

How to turn this repository into an app file you can put on a real phone, without Expo Go and without
Metro running. Written for newcomers, and for an AI assistant (Claude, Cursor, Codex) that is handed this
file and asked to "build me an APK" or "get it on my iPhone".

> **For an AI assistant reading this:** follow the steps in order, run the **Verify** command after each
> step, and report every command's result. Never commit `android/`, `ios/`, a keystore, a password or a
> built app file. After `expo prebuild`, check `git status` and revert any change to `app.json` or
> `package.json` unless the person asked for it (see [After prebuild](#after-prebuild-keep-the-repository-clean)).
> If a step needs something this machine does not have (Xcode, an Apple account, a release keystore),
> stop and say so. Do not work around it.

## Contents

1. [Pick what you need](#1-pick-what-you-need)
2. [Background: why a build is different from Expo Go](#2-background-why-a-build-is-different-from-expo-go)
3. [One-time setup](#3-one-time-setup)
4. [Generate the native projects (prebuild)](#4-generate-the-native-projects-prebuild)
5. [Android: a test APK](#5-android-a-test-apk-install-on-your-own-phone)
6. [Android: an AAB](#6-android-an-aab-for-google-play)
7. [Android: signing with your own key](#7-android-signing-with-your-own-key)
8. [iOS](#8-ios)
9. [Version numbers](#9-version-numbers)
10. [Troubleshooting](#10-troubleshooting)
11. [Checklist](#11-checklist)

## 1. Pick what you need

| You want to… | Build | File | Section |
| --- | --- | --- | --- |
| Try the app on your own Android phone | Release APK, debug-signed | `.apk` | [5](#5-android-a-test-apk-install-on-your-own-phone) |
| Upload to Google Play | Release AAB, signed with your upload key | `.aab` | [6](#6-android-an-aab-for-google-play), [7](#7-android-signing-with-your-own-key) |
| Send a test build to other Android users | Release APK, signed with your own key | `.apk` | [7](#7-android-signing-with-your-own-key) |
| Run on the iOS Simulator | Release build for the simulator | `.app` | [8.2](#82-ios-simulator) |
| Run on your own iPhone | Xcode build with your Apple ID | installed directly | [8.3](#83-your-own-iphone-free-apple-id) |
| TestFlight, the App Store, or an `.ipa` for others | Archive, with the Apple Developer Program | `.ipa` | [8.4](#84-an-ipa-testflight-app-store-ad-hoc) |

Two facts that save the most confusion:

- **There is no installable "unsigned" Android app.** Android refuses to install an APK with no signature.
  A "test" APK is one signed with the **debug key** that every Android SDK creates. That is what section 5
  builds.
- **An `.aab` cannot be installed on a phone.** It is the format Google Play takes; Play turns it into APKs
  for each device. To try the app yourself, build an APK.

## 2. Background: why a build is different from Expo Go

| | Expo Go (`pnpm start`) | A build (this doc) |
| --- | --- | --- |
| JavaScript | Served live by Metro from your computer | Bundled **inside** the app file |
| Native code | Only what Expo Go ships | Everything in the app, including the local module `modules/pdf-renderer` ([ADR 056](adr/056-in-house-pdf-viewer.md)) |
| Needs your computer running? | Yes | No |
| PDF viewer | Hands the file to another app | Shows pages in the app |

`rules/04` keeps this repository on Expo Go for day-to-day work. There are no committed `ios/` or
`android/` folders, and no EAS (Expo's paid cloud builds). A build therefore happens **locally**:

1. `expo prebuild` generates `android/` and `ios/` from `app.json`. Both are gitignored (`/android`,
   `/ios` in `.gitignore`).
2. Gradle (Android) or Xcode (iOS) compiles them.

Throw the generated folders away and regenerate them whenever you like. Never edit them by hand: a change
that must survive belongs in `app.json` or a config plugin.

## 3. One-time setup

### Everyone

- Node and pnpm, with `pnpm install` done in the repository.
- The repository passes its gate. A build compiles what is there, broken or not:

  ```bash
  pnpm run lint && pnpm run typecheck && pnpm run test && pnpm exec expo install --check
  ```

### Android (macOS, Windows or Linux)

| Need | Check it | Notes |
| --- | --- | --- |
| JDK 17 | `java -version` → `17.x` | Android Studio bundles one |
| Android SDK | `echo $ANDROID_HOME` → a path, e.g. `~/Library/Android/sdk` | Install Android Studio, then SDK Manager |
| `adb` (to install over USB) | `adb version` | In `$ANDROID_HOME/platform-tools` |

If `ANDROID_HOME` is empty, add this to `~/.zshrc` (macOS) and open a new terminal:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

### iOS (macOS only)

| Need | Check it | Notes |
| --- | --- | --- |
| Xcode (the full app, not just the Command Line Tools) | `xcode-select -p` → `/Applications/Xcode.app/Contents/Developer` | From the Mac App Store. If it prints `/Library/Developer/CommandLineTools`, run `sudo xcode-select -s /Applications/Xcode.app` |
| CocoaPods | `pod --version` | `brew install cocoapods`. Prebuild runs `pod install` for you |
| An Apple ID (own iPhone) or the Apple Developer Program, US$99/year (anyone else's) | Xcode → Settings → Accounts | See [8](#8-ios) |

## 4. Generate the native projects (prebuild)

Do this once, and again after any change to `app.json`, a config plugin, a native dependency or
`modules/`.

```bash
# from the repository root
pnpm exec expo prebuild --platform android   # Android only
pnpm exec expo prebuild --platform ios       # iOS only (macOS, needs CocoaPods)
pnpm exec expo prebuild                      # both
```

- The first run asks for an **Android package name** and an **iOS bundle identifier** (reverse-DNS, e.g.
  `com.yourcompany.yourapp`). They are the app's permanent identity in the stores: pick them once. Running
  `npx expo run:android` earlier already chose the Android one; this repository's builds use
  `com.bishen.helloworld`.
- Add `--clean` to delete and regenerate the folders from scratch. Use it when a native build behaves
  strangely after an upgrade.
- `npx expo run:android` / `run:ios` also run prebuild when the folder is missing.

**Verify:**

```bash
ls android/app/build.gradle           # Android project exists
ls ios/*.xcworkspace                  # iOS project exists (after iOS prebuild)
git status --short                    # android/ and ios/ must NOT appear (they are ignored)
```

### After prebuild: keep the repository clean

Prebuild writes what it asked or inferred back into `app.json`: the `package` (and `bundleIdentifier`) and
an Android `permissions` list.

```bash
git diff app.json package.json
```

| You are… | Do this |
| --- | --- |
| Just trying a build | Revert: `git checkout -- app.json package.json`. The generated folders already contain the values |
| Shipping this app for real | Keep `android.package` and `ios.bundleIdentifier` in `app.json`, so every machine builds the same app. Commit that in a reviewed change |

## 5. Android: a test APK (install on your own phone)

A **release** build signed with the **debug key**:

- the JavaScript is bundled inside, so no Metro is needed;
- it runs at release speed, with no dev menu;
- it installs on any phone that allows "Install unknown apps".

The generated `android/app/build.gradle` signs release builds with the debug key by default
(`signingConfig signingConfigs.debug`), so no setup is needed.

```bash
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
cd ..
```

- `-PreactNativeArchitectures=arm64-v8a,armeabi-v7a` builds for phone CPUs only. That makes it faster and
  the APK smaller (about 61 MB here). Leave it out to also include `x86`/`x86_64` for emulators.
- The first build downloads Gradle dependencies and takes several minutes; later builds are faster.

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

Copy it somewhere with a clear name. `dist/` is gitignored:

```bash
mkdir -p dist && cp android/app/build/outputs/apk/release/app-release.apk dist/hello-world-1.0.0-release.apk
```

**Verify** (the build tools are in the SDK; `ls $ANDROID_HOME/build-tools` shows the versions you have):

```bash
BT="$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -1)"
"$BT/apksigner" verify --print-certs dist/hello-world-1.0.0-release.apk   # "CN=Android Debug" = debug key
"$BT/aapt2" dump badging dist/hello-world-1.0.0-release.apk | grep -E "^package|native-code"
unzip -l dist/hello-world-1.0.0-release.apk | grep index.android.bundle   # the JS is inside
```

### Install it

**Over USB** (turn on Developer options → USB debugging on the phone, then accept the prompt):

```bash
adb devices                                            # lists the phone; note its serial
adb install -r dist/hello-world-1.0.0-release.apk      # -r: replace an installed copy, keep its data
adb -s <serial> install -r dist/hello-world-1.0.0-release.apk   # when an emulator is also connected
```

**Without a cable:** send the file to the phone (Google Drive, a messaging app, email), tap it, and allow
"Install unknown apps" for the app that opened it.

**Debug build instead?** `./gradlew assembleDebug` gives `app/build/outputs/apk/debug/app-debug.apk`. It
loads its JavaScript from Metro (`pnpm start`) on the same Wi-Fi network, with the dev menu. Use it for
debugging, not for trying the app away from your desk.

## 6. Android: an AAB (for Google Play)

```bash
cd android
./gradlew bundleRelease
cd ..
```

**Output:** `android/app/build/outputs/bundle/release/app-release.aab`

- Do **not** pass `-PreactNativeArchitectures`: Play delivers the right CPU code to each phone, so the
  bundle should contain all of them.
- Out of the box this is signed with the **debug key**, and **Google Play rejects that.** For Play, set up
  your own key first (section 7), then rebuild.
- You cannot install an `.aab` by tapping it. To test one, upload it to a Play Console internal-testing
  track, or use Google's `bundletool` (`build-apks --connected-device`, then `install-apks`).

**Verify:**

```bash
ls -lh android/app/build/outputs/bundle/release/app-release.aab
```

## 7. Android: signing with your own key

Use your own key for anything other people install: Play uploads, or test APKs you send around.
Android only installs an update when it is **signed with the same key** as the installed app.

> **Keep the keystore and its passwords out of git, forever.** `.gitignore` ignores `*.jks`, but the
> safest place for the keystore is outside the repository entirely. Lose the key and you cannot update
> the app; leak it and anyone can ship "updates" as you. Store it in a password manager.
> With Play App Signing (the default for new apps), Google holds the real app key and yours is the
> *upload* key, which Google can reset if it is lost.

### 7.1 Create the keystore (once)

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore ~/keys/hello-world-upload.jks \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

`keytool` comes with the JDK. It asks for a password and your name/organisation.

### 7.2 Tell Gradle about it, outside the repository

Put the values in `~/.gradle/gradle.properties` (your user-wide Gradle file, never committed):

```properties
HELLO_WORLD_UPLOAD_STORE_FILE=/Users/you/keys/hello-world-upload.jks
HELLO_WORLD_UPLOAD_KEY_ALIAS=upload
HELLO_WORLD_UPLOAD_STORE_PASSWORD=your-store-password
HELLO_WORLD_UPLOAD_KEY_PASSWORD=your-key-password
```

### 7.3 Use it for release builds

In `android/app/build.gradle`, add a `release` entry to `signingConfigs` and point the `release` build
type at it:

```groovy
signingConfigs {
    debug { /* unchanged */ }
    release {
        if (project.hasProperty('HELLO_WORLD_UPLOAD_STORE_FILE')) {
            storeFile file(HELLO_WORLD_UPLOAD_STORE_FILE)
            storePassword HELLO_WORLD_UPLOAD_STORE_PASSWORD
            keyAlias HELLO_WORLD_UPLOAD_KEY_ALIAS
            keyPassword HELLO_WORLD_UPLOAD_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release   // was signingConfigs.debug
        // …the rest unchanged
    }
}
```

`android/` is generated, so **this edit is lost on `prebuild --clean`**. For a one-off build that is fine:
redo it. A team that signs regularly should move it into a small config plugin (a repo-local plugin under
`config-plugins/`, the way this repository adds native changes). That is a reviewed change.

Then build as in sections 5 and 6. **Verify** that the APK is no longer debug-signed:

```bash
"$BT/apksigner" verify --print-certs android/app/build/outputs/apk/release/app-release.apk
# expect your own name, NOT "CN=Android Debug"
```

## 8. iOS

### 8.1 What Apple allows

| Goal | Needs | Lasts |
| --- | --- | --- |
| iOS Simulator | Xcode | Forever |
| Your own iPhone, plugged into your Mac | Xcode + a free Apple ID | **7 days**, then rebuild |
| Other people's iPhones (TestFlight, ad hoc `.ipa`, App Store) | Apple Developer Program (US$99/year) | 90 days (TestFlight) or a year (ad hoc) |

There is no iOS equivalent of "send an APK and tap it". Every iPhone install is signed by Apple's system,
for devices or testers Apple knows about.

All of these need **macOS with the full Xcode**. The Mac this guide was written on had only the Command
Line Tools, so **the iOS steps below were not run here (NOT VERIFIED)**. They are the standard Expo and
Xcode steps.

First generate the project (section 4): `pnpm exec expo prebuild --platform ios`.

### 8.2 iOS Simulator

```bash
npx expo run:ios --configuration Release            # builds, installs and opens the simulator
npx expo run:ios --configuration Release --device   # pick a simulator from a list
```

The `.app` is under `ios/build/Build/Products/Release-iphonesimulator/`. Simulator builds do not run on a
real iPhone.

### 8.3 Your own iPhone (free Apple ID)

1. Open the workspace: `xed ios`, or open `ios/*.xcworkspace` (not `.xcodeproj`).
2. Xcode → Settings → Accounts → **+** → add your Apple ID.
3. Select the app target → **Signing & Capabilities**:
   - turn on **Automatically manage signing**;
   - set **Team** to your Apple ID ("Personal Team").
   - If the bundle identifier is "unavailable", change it to something unique, e.g.
     `com.yourname.helloworld`.
4. Plug in the iPhone, unlock it, and tap **Trust**. On iOS 16 and later also turn on Settings → Privacy &
   Security → **Developer Mode** (it restarts the phone).
5. Install a release build: `npx expo run:ios --configuration Release --device`, then pick the phone. Or,
   in Xcode, set the scheme's Run configuration to Release (Product → Scheme → Edit Scheme) and press Run.
6. The first launch says "Untrusted Developer". On the phone, go to Settings → General → VPN & Device
   Management → your Apple ID → **Trust**.

A free-account install stops opening after **7 days**; plug in and build again.

### 8.4 An `.ipa` (TestFlight, App Store, ad hoc)

This needs the Apple Developer Program. In Xcode:

1. Select the target → Signing & Capabilities → set **Team** to your paid team.
2. Set the run destination to **Any iOS Device (arm64)**.
3. **Product → Archive.** The Organizer window opens when it finishes.
4. **Distribute App**, then pick one:
   - **App Store Connect:** upload, then use TestFlight or submit for review;
   - **Ad Hoc:** an `.ipa` for devices whose UDIDs are registered in your developer account;
   - **Development:** for your team's registered devices.

The command-line equivalent, for automation:

```bash
xcodebuild -workspace ios/helloworld.xcworkspace -scheme helloworld \
  -configuration Release -archivePath build/hello-world.xcarchive archive
xcodebuild -exportArchive -archivePath build/hello-world.xcarchive \
  -exportOptionsPlist ExportOptions.plist -exportPath build/ipa
```

The workspace and scheme names come from `app.json`'s `name`; check with `ls ios`. `ExportOptions.plist`
names the method (`app-store-connect`, `ad-hoc`, …) and your team ID. Keep it, and any certificates,
**out of the repository**: `.gitignore` already ignores `*.p12`, `*.p8` and `*.mobileprovision`.

## 9. Version numbers

Each store upload needs a higher build number than the last.

| | User-visible version | Build number |
| --- | --- | --- |
| Where to set it | `app.json` → `expo.version` (now `1.0.0`) | `expo.android.versionCode` (integer) / `expo.ios.buildNumber` (string) |
| Android project | `versionName` | `versionCode` (now `1`) |

Change them in `app.json`, then run prebuild again (or edit `android/app/build.gradle` and the Xcode
target for a one-off). Two installs of the same build number are fine for testing; the stores reject them.

## 10. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` / "App not installed as package conflicts" | An installed copy was signed with a different key | Uninstall it (`adb uninstall com.bishen.helloworld`), then install. This deletes its data |
| `INSTALL_FAILED_NO_MATCHING_ABIS` | APK built for phone CPUs only, installed on an x86 emulator | Build without `-PreactNativeArchitectures`, or install on a phone |
| `adb: more than one device/emulator` | Phone and emulator both connected | `adb -s <serial> install …` (serial from `adb devices`) |
| "SDK location not found" | Gradle cannot find the Android SDK | Set `ANDROID_HOME` (section 3), or create `android/local.properties` with `sdk.dir=/path/to/sdk` |
| Gradle complains about the Java version | Wrong JDK | Use JDK 17 (`java -version`). On macOS: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` |
| A native change (new module, `app.json` plugin) is missing from the build | The generated project is stale | `pnpm exec expo prebuild --clean`, then build again |
| A build fails strangely after an Expo upgrade | Stale caches | `cd android && ./gradlew clean`, or `prebuild --clean` |
| The app opens to a red screen saying it cannot connect to Metro | You installed a **debug** APK | Build the **release** one (section 5), or run `pnpm start` |
| PDF viewer still says "open in another app" | You are in Expo Go, not the build | Open the installed app; its icon is separate from Expo Go |
| `xcode-select: error: tool 'xcodebuild' requires Xcode` | Only the Command Line Tools are installed | Install Xcode, then `sudo xcode-select -s /Applications/Xcode.app` |
| iOS: "Untrusted Developer" | Free-account signing | Settings → General → VPN & Device Management → Trust |
| iOS: the app stopped opening after a week | Free-account installs expire after 7 days | Build and install again |
| `git status` shows `app.json` changed | Prebuild wrote the package or permissions | Section 4, "After prebuild" |

## 11. Checklist

- [ ] The gate is green before building.
- [ ] `pnpm exec expo prebuild --platform <android|ios>` was run, and `git diff app.json package.json` is
      reverted (or deliberately kept and reviewed).
- [ ] Android test build: `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a`,
      and `apksigner verify` shows the expected key.
- [ ] Android Play build: `./gradlew bundleRelease`, signed with **your** upload key (not "Android
      Debug").
- [ ] iOS: release configuration; signing team set; on device, Developer Mode on and the developer trusted.
- [ ] Nothing generated or secret is staged: `git status` shows no `android/`, `ios/`, `dist/`, `*.jks`,
      `*.apk`, `*.aab`, `*.ipa`, `*.p12` or passwords.
- [ ] Tested on the device:
  - [ ] the app opens with Metro off;
  - [ ] sign-in, tabs and theme work;
  - [ ] the PDF viewer shows pages in the app.

## Verified on this repository (2026-10-29)

| Step | Result |
| --- | --- |
| `pnpm exec expo prebuild --platform android --no-install` | Generated `android/`; `app.json` change reverted |
| `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a` | `app-release.apk`, 61 MB, `com.bishen.helloworld` 1.0.0 (versionCode 1), `arm64-v8a` + `armeabi-v7a`, signed `CN=Android Debug`, JS bundle inside |
| `./gradlew bundleRelease` | `app-release.aab`, 80 MB, all four ABIs (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`), debug-signed (so not accepted by Play until section 7 is done) |
| Own-key signing (section 7) | **NOT VERIFIED**: no release keystore on this machine |
| All iOS steps (section 8) | **NOT VERIFIED**: no Xcode on this machine |
| Installing on a phone | **NOT VERIFIED** by the author; the APK was handed to the person to install |
