# Android version update

Say **update version** to run this whole procedure. Building the APK is only the first part. The new file is not public until it is on the server and the website download link points at it.

Version format in `android-app/versioning.txt` is `major.minor.MMdd` (for example `1.2.1110` for 11 November). `versionCode` is those three numbers joined, so `1.2.1110` becomes `121110`.

## 1. Bump the version

Set `android-app/versioning.txt` to today's `major.minor.MMdd`. Keep the same major.minor unless a breaking package change is intended. The published package id is `com.neshastyar.app.debug`.

## 2. Build the debug APK

Use JDK 21. Android Studio's current JBR (Java 25) cannot configure this Gradle project.

```text
JAVA_HOME=C:\Users\Ali 2\.jdks\jbr-21.0.11
android-app\gradlew.bat :app:assembleDebug
```

Output:

```text
android-app/app/build/outputs/apk/debug/neshastyar_<version>.apk
```

Confirm `versionName` and `versionCode` with `aapt dump badging` before uploading.

## 3. Upload the APK

Copy the file to the public download directory on the VPS (`root@155.117.234.253`, port `9011`):

```text
/var/www/neshastyar.com/download/apk/neshastyar_<version>.apk
```

Leave older APKs in that directory so existing links keep working. The backend picks the newest `neshastyar_major.minor.build.apk` by version.

Make the file readable (`chmod 644`).

## 4. Point the website download link at it

The landing page button **دانلود اپلیکیشن اندروید** does not hardcode a filename. It calls `GET /api/android/latest` and uses `data.downloadUrl`. After the upload, that URL must be the new file, for example:

```text
https://neshastyar.com/api/android/latest/download/neshastyar_1.2.1110.apk
```

Check:

```text
curl https://www.neshastyar.com/api/android/latest
```

`data.version` and `data.filename` must match the APK just uploaded. Open the landing page and confirm the Android download button shows that version and its href is `data.downloadUrl`.

If the landing button or the `/api/android/latest` response is missing, fix that before finishing. Uploading the file alone does not publish a link the site does not render.

Rebuild and publish the frontend only when the landing page or the version string baked into the web app changed. `src/pages/AccountManagement.tsx` reads `android-app/versioning.txt` at build time.
