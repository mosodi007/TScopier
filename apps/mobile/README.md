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

4. Build:
   - iOS simulator: `eas build --profile development --platform ios`
   - Internal testing: `eas build --profile preview --platform all`
   - Store release: `eas build --profile production --platform all`
5. Submit:
   - iOS: `eas submit --platform ios --profile production`
   - Android: `eas submit --platform android --profile production`

Update placeholder IDs in `eas.json` (`ascAppId`, `appleTeamId`, Google Play service account path).

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
