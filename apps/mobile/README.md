# TScopier Mobile (Expo)

Native iOS/Android app for monitoring and controlling the TScopier copier.

## Setup

```bash
cp apps/mobile/.env.example apps/mobile/.env
# Fill EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_WORKER_URL

npm --prefix packages/shared install
npm --prefix apps/mobile install
npm run dev:mobile
```

## EAS Build (TestFlight / Play Internal)

**Always run EAS commands from `apps/mobile`** (not the repo root).

```bash
cd apps/mobile
```

1. Install EAS CLI: `npm i -g eas-cli`
2. Login as the **tartarix** Expo account: `eas login`
3. Link project (creates or connects `@tartarix/tscopier`):

   ```bash
   eas init
   ```

   If you already created the project on expo.dev but linking failed, run:

   ```bash
   eas init --id <your-project-uuid>
   ```

   EAS writes `extra.eas.projectId` into `app.config.js` automatically.

4. **EAS environment variables (required for store builds)**  
   Local `apps/mobile/.env` is gitignored and is **not** available on EAS Build.
   Without these, the production app crashes (or shows a config error) on open.

   In [expo.dev](https://expo.dev) → project **tscopier** → **Environment variables**,
   add for **preview** and **production**:

   | Name | Example |
   |------|---------|
   | `EXPO_PUBLIC_SUPABASE_URL` | `https://sso.tscopier.ai` or project URL |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon/public key |
   | `EXPO_PUBLIC_WORKER_URL` | Railway worker URL |
   | `EXPO_PUBLIC_SUPABASE_REALTIME_URL` | optional custom realtime host |
   | `EXPO_PUBLIC_APP_SCHEME` | `tscopier` |

5. Build:
   - iPhone (dev client IPA): `eas build --profile development --platform ios`
   - iOS Simulator: `eas build --profile development-simulator --platform ios`
   - Internal testing: `eas build --profile preview --platform all`
   - Store release: `eas build --profile production --platform all`

   The `development` profile is a **device** ad-hoc IPA. Register the phone with `eas device:create` before the first device build, then install from the Expo page (`.ipa`, not `.tar.gz`). Do not scan a Simulator build QR on a physical iPhone.

   After the IPA is installed, start Metro with `npx expo start --dev-client` and open the **TScopier** app (not Expo Go). On iOS 16+, enable **Settings → Privacy & Security → Developer Mode**.
6. Submit:
   - iOS: `eas submit --platform ios --profile production`
   - Android: `eas submit --platform android --profile production`

Optional in `eas.json` submit profile: `ascAppId` (App Store Connect Apple ID) and `appleTeamId`.

## Over-the-air (OTA) updates

Store builds already include `expo-updates` with:

- **Channels:** `preview` and `production` (from `eas.json` build profiles)
- **Runtime:** `appVersion` policy — OTA targets must match the binary’s `version` in `app.config.js` (e.g. `1.0.0`)
- **Client:** checks on launch + when returning to foreground, downloads in the background, then prompts to restart
- **Settings → App updates:** manual “Check for updates”

### Publish an update

JS/asset-only changes (screens, copy, bug fixes) can ship without a new binary:

```bash
cd apps/mobile

# Internal / TestFlight-style channel
npm run update:preview -- --message "Fix trades header logo"

# App Store / production channel
npm run update:production -- --message "Fix production crash on missing env"
```

Or:

```bash
eas update --channel production --environment production --message "Describe the fix"
```

Users on a matching binary restart (or tap Restart in the prompt) to load the update.

### When you still need a new store build

Bump `version` in `app.config.js` and run `eas build` when you change:

- Native modules / Expo SDK / plugins
- `app.config.js` native fields (permissions, bundle ID, splash, etc.)
- Anything that cannot be expressed as a JS bundle

After bumping the version, publish OTA against that new runtime:

```bash
eas update --channel production --environment production --message "Follow-up for 1.0.1"
```

### Bump app version

Patch bump (`1.0.0` → `1.0.1`) across `app.config.js`, `package.json`, and `package-lock.json`:

```bash
npm run version:increment
```

Also available:

```bash
npm run version:increment:minor   # 1.0.1 → 1.1.0
npm run version:increment:major   # 1.1.0 → 2.0.0
```

Because `runtimeVersion` uses the `appVersion` policy, OTA updates must target the new version after you ship a binary built with it.

## Supabase Auth redirect URLs

Add to Supabase Auth → URL Configuration:

- `tscopier://auth/callback`
- `tscopier://auth/confirmed`
- `tscopier://reset-password`
- `tscopier://billing/return`

## App Store metadata

- **Name:** TScopier
- **Category:** Finance
- **Privacy policy:** https://tscopier.ai/privacy
- **Terms:** https://tscopier.ai/terms
- **Risk disclaimer:** https://tscopier.ai/risk-disclaimer (required for trading apps)

Screenshots: Dashboard, Trades, Alerts, Settings (light/dark if supported).

## Push notifications

1. Apply migration `20260714140000_user_push_tokens.sql`
2. Deploy edge function `send-push-notification`
3. Set `EXPO_ACCESS_TOKEN` in Supabase secrets (optional, for higher Expo push rate limits)

Mobile registers tokens via `usePushNotifications` on sign-in.
