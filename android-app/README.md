# Neshastyar Android App

Native Kotlin + Jetpack Compose client for Neshastyar.

- **Do not** change the web app (`../src`) or backend from this module’s workflow.
- Product/API contract: [`androidtarget.md`](androidtarget.md)
- Application id: `com.neshastyar.app`
- API (prod): `https://neshastyar.com/api`

## Open in Android Studio

1. File → Open → select this `android-app` folder
2. SDK path should match `local.properties` (e.g. `%LOCALAPPDATA%\Android\Sdk`)
3. Sync Gradle, Run on the connected S24 FE

## Build from CLI

```powershell
cd c:\temp\neshastyar\android-app
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

## Implementation phases

See §11 in `androidtarget.md`. Current: **Phase 1 — Scaffold**.
