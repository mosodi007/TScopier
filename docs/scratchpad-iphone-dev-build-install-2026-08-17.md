# Scratchpad — iPhone cannot install development build (2026-08-17)

## Report
When building the app on development, cannot install it on iPhone. User presumes the device is not registered.

## Questions
1. How is the iOS development build produced (EAS vs local Xcode)?
2. What is the actual install error (device not registered vs signing vs iOS version vs ad-hoc vs Expo Go)?
3. Is this Apple Developer device UDID registration, or something else?
4. What do local Expo/EAS logs show?

## Hypotheses
- H1: Device UDID is not registered on the Apple Developer / EAS ad-hoc provisioning profile.
- H2: Build is simulator-only / wrong architecture (no device IPA).
- H3: Signing: wrong team, expired cert, bundle ID mismatch.
- H4: iOS version too new/old for the build.
- H5: Trying to install via Expo Go instead of a development client.
- H6: Internal distribution vs ad-hoc; TestFlight vs USB.
- H7: Developer Mode not enabled on iPhone (iOS 16+).

## Evidence
- `apps/mobile/eas.json` **development** profile: `"developmentClient": true`, `"distribution": "internal"`, **`"ios.simulator": true`**.
- README documents development as **iOS simulator** build; **preview** is internal testing (`simulator: false`).
- Latest successful development EAS build `b651e606` (2026-08-12): artifact is **`.tar.gz`**, not `.ipa`. Expo page: “No internal distribution build exists at this URL.”
- Production build `b0c3e125` artifact is `.ipa` (store / TestFlight), not a device development client.
- `eas device:list --apple-team-id QPS3RCAU26`: **Could not find devices** — no UDIDs registered with EAS for Tartarix Inc.
- Expo Go logs also show SDK 57 incompatibility, but that is a separate path (QR in Expo Go), not the EAS development IPA.

## Conclusion (CONFIDENT)
**H2 is the reason the current development build cannot go on an iPhone.**  
`simulator: true` produces a Mac Simulator `.app` archive. A physical iPhone cannot install that, registered or not.

**H1 is true but secondary.** After a *device* development/preview build (`simulator: false`), ad-hoc install still needs `eas device:create` because EAS currently has **zero** registered devices.

## What to do
1. Do not use the existing development `.tar.gz` on an iPhone.
2. Add a device profile (`simulator: false`) or use `preview` for installable IPA.
3. Register the iPhone: `eas device:create`, then rebuild so the UDID is in the provisioning profile.

## 2026-08-17 — Device registered
- UDID `00008150-000624463E68C01C` registered on EAS account `tartarix`, Apple team `QPS3RCAU26`.
- Confirmed via `eas device:list`: Class iPhone.

## 2026-08-17 — Device IPA built
- EAS build `d22b4197-6923-4d56-a899-a282497256cd` **FINISHED**
- Profile `development`, distribution internal, artifact **`.ipa`**
- Provisioning profile `U92T2NLWF5` includes UDID `00008150-000624463E68C01C`
- Install: https://expo.dev/accounts/tartarix/projects/tscopier/builds/d22b4197-6923-4d56-a899-a282497256cd
- Do not reuse old Simulator QR (`b651e606` `.tar.gz`)
