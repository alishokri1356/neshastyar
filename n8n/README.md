# Modiryar n8n Workflow (Participants v2)

Import `Modiryar-workflow.json` into n8n.

## What changed vs the old workflow

1. **MeetingSummaryPrompt** — AI must put people only in `People in meetings`, topics only in `Tags`.
2. **Update rows in a table1** — removed legacy `meetings.tags` column write.
3. **Sync Meeting Data** — optional webhook after meeting update (no longer auto-approves participants or tags).

## Suggested vs approved model

| Layer | Participants | Tags |
|-------|-------------|------|
| **Suggested** | `meetings.summary` (`People in meetings`, etc.) + `meetings.people` | `meetings.summary` → `Tags` |
| **Approved** | `meeting_participants` → `participants` | `meeting_tags` → `tags` |

After AI analysis, n8n writes suggestions into `summary` and `people`. Users approve items in the Meeting Detail page (yellow chips). Approving adds a junction row and removes that name from the suggestion fields only.

The **Sync Meeting Data** webhook is kept for compatibility but does not link participants or tags anymore.

## Backend setup (required)

Add to `/root/modiryar/backend/.env`:

```env
INTERNAL_WEBHOOK_SECRET=your-long-random-secret-here
```

Restart backend:

```bash
pm2 restart modiryar-backend
```

## One-time data cleanup (existing meetings)

If meetings were processed with the old auto-approve flow, run once on the server:

```bash
cd /root/modiryar/backend
node migrations/dedupe_suggestions_from_approved.js
```

This removes already-approved participant and tag names from suggestion fields without deleting junction rows.

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

Returns success without modifying `meeting_participants` or `meeting_tags`.

## Flow after AI analysis

```
Edit Fields → Update rows in a table1 → Sync Meeting Data → Analyze1 → Update HTML → send mail
```

User approves suggested participants/tags in the app when ready.

## Analyze webhook trigger

The backend calls the n8n analyze webhook with the meeting ID in the `X-Meeting-Id` header:

```http
POST https://n8nnew.teraxr.com/webhook/add5d58a-54b1-4459-96f2-ec17590e3cfd
Header: X-Meeting-Id: <meeting-uuid>
```

Triggered via authenticated API:

```http
POST https://modiryar.online/api/meetings/{meetingId}/analyze
Authorization: Bearer <token>
```

The n8n **meeting** MySQL node filters by `id` from `x-meeting-id` header and status `ارسال درخواست پردازش`.
