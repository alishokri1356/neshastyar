#!/usr/bin/env node
/**
 * Unattended analyze-model QA on the VPS.
 *
 * Usage:
 *   node scripts/cloud-agent/test-all-models.js [meetingId]
 *   node scripts/cloud-agent/test-all-models.js fcfd83cb-a8a1-47be-9915-c0b6fcc65f93
 *
 * Runs on the VPS (has DB + webhook access). Cloud Agent can invoke via:
 *   ssh -o BatchMode=yes neshastyar-vps 'cd /root/neshastyar/backend && node ../scripts/cloud-agent/test-all-models.js <id>'
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');

const BACKEND_DIR = '/root/neshastyar/backend';
const backendNodeModules = path.join(BACKEND_DIR, 'node_modules');
Module.globalPaths.unshift(backendNodeModules);
module.paths.unshift(backendNodeModules);

const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const {
  ANALYZE_MODELS,
  AUTO_KEY,
  getModelLabel,
} = require(path.join(BACKEND_DIR, 'src/config/analyzeModels'));

const DEFAULT_MEETING_ID = 'fcfd83cb-a8a1-47be-9915-c0b6fcc65f93';
const meetingId = process.argv[2] || DEFAULT_MEETING_ID;
const ONLY = (process.env.ONLY_MODELS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const POLL_MS = Number(process.env.MODEL_QA_POLL_MS || 8000);
const TIMEOUT_MS = Number(process.env.MODEL_QA_TIMEOUT_MS || 20 * 60 * 1000);
const REPORT_PATH =
  process.env.MODEL_QA_REPORT ||
  path.join('/root/neshastyar/scripts/cloud-agent', `model-qa-${meetingId.slice(0, 8)}.json`);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWebhookUrl() {
  const main =
    process.env.ANALYZE_WEBHOOK_URL ||
    'https://n8nnew.teraxr.com/webhook/7df546f1-321a-40d7-a5c1-3084ad0ce697';
  return main;
}

async function triggerAnalyze(meetingId, modelKey) {
  const webhookUrl = await getWebhookUrl();
  const headers = {
    'Content-Type': 'application/json',
    'X-Meeting-Id': meetingId,
    'X-Analyze-Model': modelKey,
  };
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Webhook failed ${response.status}: ${text.slice(0, 200)}`);
  }
  return true;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'modiryar',
  });

  const models = [
    { key: AUTO_KEY, label: getModelLabel(AUTO_KEY) },
    ...ANALYZE_MODELS.map((m) => ({ key: m.key, label: m.label })),
  ].filter((m) => (ONLY.length ? ONLY.includes(m.key) : true));

  const report = {
    meetingId,
    startedAt: new Date().toISOString(),
    webhook: await getWebhookUrl(),
    results: [],
  };

  console.log(`Model QA for meeting ${meetingId}`);
  console.log(`Models: ${models.map((m) => m.key).join(', ')}`);
  console.log(`Webhook: ${report.webhook}`);

  for (const model of models) {
    const entry = {
      model: model.key,
      label: model.label,
      startedAt: new Date().toISOString(),
      ok: false,
      primaryOk: false,
      status: null,
      analyzed_by: null,
      analyzing_model: null,
      error: null,
      elapsedMs: 0,
    };
    const t0 = Date.now();
    console.log(`\n=== Testing ${model.key} (${model.label}) ===`);

    try {
      await connection.execute(
        `UPDATE meetings
         SET analyze_model = ?,
             analyzing_model = NULL,
             analyzed_by = NULL,
             status = 'آماده پردازش',
             updated_at = NOW()
         WHERE id = ?`,
        [model.key, meetingId]
      );

      await triggerAnalyze(meetingId, model.key);
      console.log('Webhook accepted');

      let done = false;
      while (Date.now() - t0 < TIMEOUT_MS) {
        await sleep(POLL_MS);
        const [rows] = await connection.execute(
          `SELECT status, analyze_model, analyzing_model, analyzed_by, updated_at
           FROM meetings WHERE id = ? LIMIT 1`,
          [meetingId]
        );
        const row = rows[0];
        if (!row) throw new Error('Meeting not found');

        entry.status = row.status;
        entry.analyzing_model = row.analyzing_model;
        entry.analyzed_by = row.analyzed_by;
        console.log(
          `  status=${row.status} analyzing=${row.analyzing_model || '-'} analyzed_by=${row.analyzed_by || '-'}`
        );

        if (row.status === 'پردازش شده') {
          entry.ok = true;
          entry.primaryOk =
            model.key === AUTO_KEY
              ? Boolean(row.analyzed_by)
              : row.analyzed_by === model.key;
          done = true;
          break;
        }
        if (typeof row.status === 'string' && row.status.startsWith('Error:')) {
          entry.error = row.status;
          done = true;
          break;
        }
      }

      if (!done) {
        entry.error = `Timeout after ${TIMEOUT_MS}ms`;
      }
    } catch (error) {
      entry.error = error.message || String(error);
      console.error('  FAILED:', entry.error);
    }

    entry.elapsedMs = Date.now() - t0;
    entry.finishedAt = new Date().toISOString();
    report.results.push(entry);
    console.log(
      `  RESULT ${model.key}: ok=${entry.ok} primaryOk=${entry.primaryOk} analyzed_by=${entry.analyzed_by} error=${entry.error || '-'}`
    );
  }

  report.finishedAt = new Date().toISOString();
  report.summary = {
    total: report.results.length,
    ok: report.results.filter((r) => r.ok).length,
    primaryOk: report.results.filter((r) => r.primaryOk).length,
    failed: report.results.filter((r) => !r.ok).map((r) => r.model),
    fallbackOnly: report.results
      .filter((r) => r.ok && !r.primaryOk)
      .map((r) => ({ model: r.model, analyzed_by: r.analyzed_by })),
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${REPORT_PATH}`);
  console.log(JSON.stringify(report.summary, null, 2));

  await connection.end();
  process.exit(report.summary.failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
