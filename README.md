# Ceylon Gems

A listing marketplace for Sri Lankan gemstones and lapidary equipment
(Zepla Labs). Sellers post verified, certificate-backed listings; buyers
browse and contact them directly — no buyer/seller payments in Phase 1, no
commission, ever.

The project is being built **mobile app + backend first, entirely against a
local Docker stack** — no cloud account needed to get it running. The web
app and any staging/production deployment are deliberately deferred until
then.

## Repo layout

```
apps/
  mobile/       Expo (React Native) app — primary client for Phase 0/1
  api/          NestJS backend
  web/          Next.js web app — not scaffolded yet
packages/
  ui-tokens/    Shared design tokens (color, type, spacing)
  api-client/   Typed API client generated from the NestJS OpenAPI spec
  i18n/         Shared English / Sinhala / Tamil translation dictionaries
  config/       Shared config (eslint, tsconfig, etc.)
```

## Prerequisites

These apply on **both macOS and Windows** unless noted otherwise.

| Tool                                        | Why                                     | Notes                                                                                                                                                                                                                                                                                         |
| ------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Git](https://git-scm.com/downloads)        | clone the repo                          | —                                                                                                                                                                                                                                                                                             |
| [Node.js 20+](https://nodejs.org/)          | everything runs on it                   | repo pins `>=20` via `.nvmrc`/`engines`; `nvm use` after cloning if you use nvm                                                                                                                                                                                                               |
| [pnpm 10.8.1](https://pnpm.io/installation) | package manager for the whole monorepo  | install via Corepack — see step 2                                                                                                                                                                                                                                                             |
| Docker                                      | local Postgres, Redis, Typesense, MinIO | **macOS:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) or [Colima](https://github.com/abiosoft/colima) (`brew install colima docker docker-compose`). **Windows:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) with the **WSL 2** backend enabled |
| A [Clerk](https://clerk.com) account        | authentication                          | free; create a **Development** instance for local work                                                                                                                                                                                                                                        |

Mobile-specific, only needed for the platform(s) you intend to build for:

| Tool                                                          | Platform                       | Notes                                                                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Xcode (latest stable, via the App Store) + Command Line Tools | iOS — **macOS only**           | iOS builds cannot be done on Windows at all; Xcode doesn't exist there                                                                                                            |
| [CocoaPods](https://cocoapods.org/)                           | iOS — macOS only               | `sudo gem install cocoapods`, or `brew install cocoapods`                                                                                                                         |
| Android SDK + an emulator                                     | Android — **macOS or Windows** | The full Android Studio GUI works, but isn't required — see "Setting up the Android emulator headlessly" below for the faster, scriptable path this project's setup actually used |
| JDK 17                                                        | Android — macOS or Windows     | `brew install openjdk@17` (macOS) or the Windows installer / `winget install EclipseAdoptium.Temurin.17.JDK`                                                                      |

This repo left Expo Go for good (see `CLAUDE.md`'s "Current sequencing") —
`react-native-skia` is a native module Expo Go can't load, so you always
need a real build (`expo run:ios` / `expo run:android`), never the Expo Go
app / QR-code flow.

## 1. Clone the repo

```bash
git clone https://github.com/zeplalabs/Ceylon-Gem-Exchange.git
cd Ceylon-Gem-Exchange
```

(If you're working from a fork or a differently-named remote, swap in that
URL instead.)

## 2. Install dependencies

```bash
corepack enable
corepack prepare pnpm@10.8.1 --activate
pnpm install
```

pnpm 10 blocks dependency postinstall scripts by default. If `pnpm install`
ends with an "Ignored build scripts" warning, that's expected for most
packages — the one that actually needs its script (`esbuild`) is already
allow-listed in `pnpm-workspace.yaml`. If you ever see a _different_
package's install silently not take effect, re-run `pnpm rebuild <pkg>`.

## 3. Configure environment variables

Two env files, both git-ignored on purpose (secrets never get committed):

```bash
cp .env.example .env
cp apps/mobile/.env.example apps/mobile/.env
```

Then fill in:

- **Root `.env`** — the Postgres/Redis/Typesense/MinIO values can stay as
  the defaults in `.env.example` (they only configure the local Docker
  containers). You do need to fill in:
  - `CLERK_SECRET_KEY` — from your Clerk dashboard → **API Keys** (Development instance)
  - `CLERK_WEBHOOK_SIGNING_SECRET` — from the webhook endpoint you create in the Clerk dashboard (the Svix signing secret)
  - `DATABASE_URL` — **optional.** Leave it blank to use your own local
    Docker Postgres (fully isolated — migrations/seeds only give you the
    same taxonomy structure, not anyone else's actual data). Set it to
    point at the shared **Supabase** dev database instead if you want
    everyone on the team (devs and BAs) looking at the same live data —
    project `ceylon-gem-exchange`, region `ap-south-1`, already migrated
    and seeded, so you don't need to run those yourself, just connect.
    **The connection string isn't in `.env.example` and never will be — it
    contains the database password, which doesn't belong in git even
    though the repo itself is private.** Ask a teammate who already has it
    to send it to you directly (password manager, not Slack/email/a
    commit). Supabase doesn't expose an already-set database password
    again through the dashboard, so if nobody on the team has it anymore,
    the only option is **Settings** → **Database** → **Reset database
    password** — but that invalidates it for everyone who already has the
    old one, so treat it as a last resort and tell the team immediately
    after, not something to do just because you personally can't find it.
    The connection string itself is under **Settings** → **Database** →
    **Connection string** → **Session pooler** tab (not Transaction pooler
    or the direct host — see `.env.example`'s comment for why those two
    don't work here).
- **`apps/mobile/.env`**:
  - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — same Clerk dashboard page as above, the publishable key (safe to expose client-side)
  - `EXPO_PUBLIC_API_URL` — leave this as `http://localhost:3000`; `lib/apiUrl.ts` automatically rewrites it to `10.0.2.2` on Android, since the Android emulator can't resolve `localhost` as the host machine (works for both simulator/emulator with no manual switching between platforms). A **physical device** needs your machine's LAN IP or a tunnel (e.g. `ngrok`) instead — set that directly and it passes through unchanged

If you're moving this project between people/machines, the actual secret
values should be handed over out-of-band (password manager, not Slack/email)
— they can't travel with the git history since both `.env` files are
git-ignored.

## 4. Start the local backing services

```bash
# macOS with Colima only — skip this if using Docker Desktop
colima start

pnpm docker:up
```

This starts Postgres, Redis, Typesense, and MinIO via the root
`docker-compose.yml`. Postgres is published on host port **55432, not
5432** — many Macs already have a native Postgres bound to 5432, and
connecting to the wrong one fails silently rather than erroring, so this
avoids that collision entirely. Confirm everything's healthy:

```bash
docker compose ps
```

All four services should show `Up`/`healthy`.

## 5. Run database migrations and seed reference data

```bash
cd apps/api
pnpm db:migrate
pnpm db:seed:filters
pnpm db:seed:languages
pnpm db:seed:currencies
cd ../..
```

These seed the DB-backed taxonomies the app fetches at runtime: the home
screen's filter sheet (Stone/Shape/District/Origin/Certificate), the
language picker (English/Sinhala/Tamil), and the currency picker.

## 6. Start the API

From the repo root:

```bash
pnpm dev
```

This runs `apps/api` in watch mode on `http://localhost:3000` (it's the
only package with a `dev` script, so this is equivalent to
`pnpm --filter @ceylon-gems/api dev`). Verify it's up:

```bash
curl http://localhost:3000/healthz
curl http://localhost:3000/filters   # should return the seeded taxonomy as JSON
```

Leave this running in its own terminal for everything below.

## 7. Run the mobile app

```bash
cd apps/mobile
```

### iOS (macOS only)

```bash
npx pod-install
npx expo run:ios   # or: npx expo run:ios --device "iPhone 17 Pro"
```

If `pod install` complains that Skia's prebuilt binaries are missing:

```bash
npx install-skia
```

Once the dev client is installed on the simulator, you can skip the full
rebuild for everyday JS-only changes and just run `npx expo start` for
fast-refresh.

### Setting up the Android emulator headlessly (one-time)

Skips the full Android Studio GUI — same end result (an SDK + a working
emulator), just scriptable. This is the exact path this project's own setup
used.

**macOS:**

```bash
brew install --cask android-commandlinetools
```

Add to `~/.zshrc` (or `~/.bashrc`), then open a new terminal (or
`source ~/.zshrc`) so it takes effect:

```bash
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"  # Intel Mac: /usr/local/share/...
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

```bash
yes | sdkmanager --licenses
sdkmanager "platform-tools" "emulator" "platforms;android-34" "build-tools;34.0.0" \
  "system-images;android-34;google_apis;arm64-v8a"   # Intel Mac: arm64-v8a → x86_64
echo no | avdmanager create avd -n Pixel_7_API_34 -k "system-images;android-34;google_apis;arm64-v8a"
```

(Don't pass `avdmanager -d <device>` — a specific device profile triggers a
`devices.xml` lookup bug in current cmdline-tools that produces a broken
AVD config. Omitting it entirely, as above, works fine; the emulator picks
a sensible generic phone profile.)

**Windows (PowerShell):**

1. Download the **"Command line tools only"** zip for Windows from
   [developer.android.com/studio#command-tools](https://developer.android.com/studio#command-tools)
2. Extract it so the path ends up as `C:\Android\cmdline-tools\latest\...`
   — the zip extracts to a plain `cmdline-tools` folder, which you need to
   rename/nest into `latest` yourself (`sdkmanager` won't find itself
   otherwise — a common gotcha)
3. Set environment variables (System Properties → Environment Variables, or
   PowerShell as Administrator):
   ```powershell
   setx ANDROID_HOME "C:\Android"
   setx PATH "$($env:PATH);C:\Android\cmdline-tools\latest\bin;C:\Android\platform-tools;C:\Android\emulator"
   ```
4. Open a new terminal, then the Windows equivalent of the macOS commands
   above (same tool names — `sdkmanager`/`avdmanager` work identically once
   on `PATH`, just using the `x86_64` system image instead of `arm64-v8a`
   since Windows dev machines are x86):
   ```powershell
   sdkmanager --licenses
   sdkmanager "platform-tools" "emulator" "platforms;android-34" "build-tools;34.0.0" "system-images;android-34;google_apis;x86_64"
   avdmanager create avd -n Pixel_7_API_34 -k "system-images;android-34;google_apis;x86_64"
   ```
5. **Windows-only extra requirement:** hardware-accelerated emulation needs
   the **Windows Hypervisor Platform** feature turned on — "Turn Windows
   features on or off" → check it → restart. Without this the emulator
   either refuses to start or runs unusably slowly. (macOS has no
   equivalent step; Apple Silicon/Intel Macs virtualize natively.)

Device/API-level names above (`Pixel_7_API_34`, `android-34`) are just what
this setup used — any reasonably recent API level and device profile works
the same way.

### Android (run the app)

```bash
emulator -avd Pixel_7_API_34
```

opens the emulator window (do this every time, not just once — the SDK
setup above only needs to happen once). With it running (or a real device
connected with USB debugging on):

```bash
npx expo run:android
```

Same as iOS: once the dev client is installed, `npx expo start` gives you
fast-refresh without a full rebuild — press `a` to launch/reload on the
emulator.

## Verifying everything works

- API health check and `/filters` (step 6) both return data
- The app's sign-up/sign-in screen loads and Clerk accepts a test sign-up
- The home screen shows listings, and the filter sheet (filter icon next to
  search) is populated with real groups/options — if it's empty, the API
  or Docker stack most likely isn't running (see step 4/6 above)

## Known gotchas

A few non-obvious things that have already cost real debugging time on this
project — see `CLAUDE.md` for the full list, these are the ones most likely
to bite a fresh setup:

- **Postgres port is 55432, not 5432** (see step 4). Connecting to 5432
  will silently hit a different, unrelated Postgres instance if one happens
  to be installed on your machine, rather than erroring.
- **`expo start` rewrites two tracked files** (`apps/mobile/tsconfig.json`
  and deletes `apps/mobile/expo-env.d.ts`) as a side effect of regenerating
  typed routes. Run `git checkout -- apps/mobile/tsconfig.json
apps/mobile/expo-env.d.ts` before committing if you've used the dev
  server since your last commit.
- **TypeScript in `apps/mobile` is deliberately pinned to 5.9.3.**
  `expo-doctor` will suggest `~6.0.3` for the installed Expo SDK — that
  version never shipped as a real stable release. Don't "fix" this warning.
- **Windows can build Android but never iOS** — there's no way around that
  without a Mac (or, later, a hosted build service like EAS Build).

## Docs

- [Authentication](docs/authentication.md) — Clerk + our `users` table: sign-in, webhook sync, API auth guards, locale detection
- [Design tokens](docs/design-tokens.md) — gem-tone color palettes, typography, spacing, radii (`packages/ui-tokens`)
- [Component kit](docs/component-kit.md) — the mobile app's shared UI components (`apps/mobile/components`)
- [Theme guide](docs/theme-guide.md) — the pixel-perfect workflow for implementing a screen from a Claude Design mockup
