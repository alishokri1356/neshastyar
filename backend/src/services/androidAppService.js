const fs = require('fs');
const path = require('path');

const APK_NAME_RE = /^neshastyar_(\d+)\.(\d+)\.(\d+)\.apk$/i;
const SKIP_DIRS = new Set(['.git', '.gradle', 'node_modules', 'captures', 'intermediates']);

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const ANDROID_APP_DIR = path.join(PROJECT_ROOT, 'android-app');
const PUBLIC_APK_DIR =
  process.env.ANDROID_APK_PUBLIC_DIR || '/var/www/neshastyar.com/download/apk';

function parseApkFilename(filename) {
  const match = filename.match(APK_NAME_RE);
  if (!match) return null;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const build = match[3];

  return {
    filename,
    version: `${major}.${minor}.${build}`,
    major,
    minor,
    build,
    sortKey: major * 1_000_000 + minor * 1_000 + Number(build),
  };
}

function collectApkFiles(dir, results = []) {
  if (!dir || !fs.existsSync(dir)) {
    return results;
  }

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectApkFiles(fullPath, results);
    } else if (entry.isFile() && APK_NAME_RE.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

function sourceRank(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('/download/apk/')) return 3;
  if (normalized.includes('/android-app/apk/')) return 2;
  if (normalized.includes('/outputs/apk/')) return 1;
  return 0;
}

function publicBaseUrl() {
  return (process.env.FRONTEND_URL || 'https://neshastyar.com').replace(/\/$/, '');
}

function toDownloadInfo(filePath) {
  const parsed = parseApkFilename(path.basename(filePath));
  if (!parsed) return null;

  const stats = fs.statSync(filePath);
  const downloadPath = `/api/android/latest/download/${parsed.filename}`;

  return {
    ...parsed,
    filePath,
    size: stats.size,
    downloadPath,
    downloadUrl: `${publicBaseUrl()}${downloadPath}`,
  };
}

function findLatestApk() {
  const byFilename = new Map();
  const searchDirs = [
    path.join(ANDROID_APP_DIR, 'apk'),
    path.join(ANDROID_APP_DIR, 'app', 'build', 'outputs', 'apk'),
    PUBLIC_APK_DIR,
  ];

  for (const dir of searchDirs) {
    for (const filePath of collectApkFiles(dir)) {
      const info = toDownloadInfo(filePath);
      if (!info) continue;

      const existing = byFilename.get(info.filename);
      if (!existing || sourceRank(filePath) > sourceRank(existing.filePath)) {
        byFilename.set(info.filename, info);
      }
    }
  }

  const all = Array.from(byFilename.values()).sort((a, b) => b.sortKey - a.sortKey);
  return all[0] || null;
}

function findApkByFilename(filename) {
  const parsed = parseApkFilename(filename);
  if (!parsed) return null;

  const latest = findLatestApk();
  if (latest && latest.filename.toLowerCase() === parsed.filename.toLowerCase()) {
    return latest;
  }

  const searchDirs = [
    path.join(ANDROID_APP_DIR, 'apk'),
    path.join(ANDROID_APP_DIR, 'app', 'build', 'outputs', 'apk'),
    PUBLIC_APK_DIR,
  ];

  let match = null;
  for (const dir of searchDirs) {
    for (const filePath of collectApkFiles(dir)) {
      if (path.basename(filePath).toLowerCase() !== parsed.filename.toLowerCase()) continue;
      const info = toDownloadInfo(filePath);
      if (!info) continue;
      if (!match || sourceRank(filePath) > sourceRank(match.filePath)) {
        match = info;
      }
    }
  }

  return match;
}

module.exports = {
  findLatestApk,
  findApkByFilename,
  ANDROID_APP_DIR,
  PUBLIC_APK_DIR,
};
