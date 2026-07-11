# Deploying to TestFlight

Builds happen locally on your Mac (no EAS / Expo cloud builds) and upload straight
to TestFlight via fastlane.

## Deploy

```bash
cd apps/mobile
npm run deploy:testflight
```

That's it. The lane:

1. Looks up the latest build number on TestFlight and bumps it by one
2. Archives the app in Xcode with automatic signing (team `N5L7VN2BG7`)
3. Uploads the build to App Store Connect

The build takes roughly 10-20 minutes locally, then Apple processes it for another
5-15 minutes before it shows up in TestFlight for testers.

Notes:

- The JS bundle is pinned to the production API
  (`https://sticket-b2c-production.up.railway.app`) regardless of what's in `.env`,
  so a local dev config can't leak into a TestFlight build. To change it, edit
  `PRODUCTION_API_URL` in `fastlane/Fastfile`.
- Build numbers are managed automatically from TestFlight; the `buildNumber` in
  `app.json` is no longer used.
- To bump the user-facing version (e.g. 1.0.0 → 1.1.0), update
  `CFBundleShortVersionString` in `ios/Sticket/Info.plist` (and keep `version` in
  `app.json` in sync).

## One-time setup (per machine)

1. Install fastlane: `brew install fastlane`
2. Create an App Store Connect API key:
   - Go to [App Store Connect → Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
   - Click **+**, name it (e.g. "fastlane"), role **App Manager**
   - Download the `.p8` file (you can only download it once) and note the
     **Key ID** and **Issuer ID** shown on that page
3. Save the `.p8` somewhere private, e.g. `~/keys/AuthKey_XXXXXXXXXX.p8`
4. Copy `fastlane/.env.example` to `fastlane/.env` and fill in the
   Key ID, Issuer ID, and path to the `.p8`

The same API key handles both code signing (certificates/profiles are managed
automatically by Xcode cloud signing) and the TestFlight upload — no Apple ID
login or 2FA prompts.
