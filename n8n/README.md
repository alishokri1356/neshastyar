# Modiryar n8n Workflow (Participants v2)

Import `Modiryar-workflow.json` into n8n.

## What changed vs the old workflow

1. **MeetingSummaryPrompt** — AI must put people only in `People in meetings`, topics only in `Tags`.
2. **Update rows in a table1** — removed legacy `meetings.tags` column write.
3. **Sync Meeting Data** (new) — calls backend after meeting update to populate:
   - `participants` + `meeting_participants`
   - `tags` + `meeting_tags` (topic tags only; person names skipped)

## Backend setup (required)

Add to `/root/modiryar/backend/.env`:

```env
INTERNAL_WEBHOOK_SECRET=your-long-random-secret-here
```

Restart backend:

```bash
pm2 restart modiryar-backend
```

## n8n setup

1. Import `Modiryar-workflow.json`.
2. Open node **Sync Meeting Data**.
3. Replace `REPLACE_WITH_INTERNAL_WEBHOOK_SECRET` with the same secret from `.env`.
4. Re-attach your existing credentials (MySQL, Google Gemini) if n8n asks after import.

## Sync endpoint

```http
POST https://modiryar.online/sync-meeting-data/{meetingId}
Header: X-Internal-Secret: <your-secret>
```

## Flow after AI analysis

```
Edit Fields → Update rows in a table1 → Sync Meeting Data → Analyze1 → Update HTML → send mail
```
