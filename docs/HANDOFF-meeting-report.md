# Handoff: shareable meeting report (صورتجلسه)

Written 2026-11-09 so work can continue from another machine. Pull `main` first. Latest commit for this feature: `c838b32` ("Add a shareable meeting minutes report for the web app").

Do not edit `.cursor/plans/shareable_meeting_report_*.plan.md`. The plan is done in code; what remains is deploy and verification.

## Goal

After a meeting is analyzed, the web app gives a public link. Anyone with the link sees an HTML صورتجلسه that matches `صورتجلسه سازمانی.docx` (the file lives only on the Windows machine at `C:\Users\a.shokri\Downloads\`, not in git). From that page the user can print or save PDF (`window.print`) and download Word. The same link is in the analysis email.

Android is out of scope. Do not compile the Android app until the user says "update version".

## Product decisions already made

- Fields the analysis does not produce stay **blank** (مدت زمان، محل، دبیر، شماره جلسه، کد سند، ویرایش، مسئول پیگیری، مهلت زمانی، signature boxes). Do not add an editor and do not change the n8n prompt for these.
- Branding is **per user**: organization name and logo, set on the account page. There is no Neshastyar logo in the report header.
- An extra «خلاصه جلسه» block is shown under the template table. The Word file has no summary paragraph; keep this block.

## What is already implemented (on `main`, not live)

### Database (SQL written, not applied)

`backend/migrations/add_share_token_and_org_fields.sql` and idempotent runner `backend/migrations/run_share_token_and_org_fields_migration.js`:

- `meetings.share_token` VARCHAR(64) NULL, unique index `idx_meetings_share_token`
- `meetings.share_enabled` TINYINT(1) NOT NULL DEFAULT 1
- `users.org_name` VARCHAR(255) NULL
- `users.org_logo_path` VARCHAR(255) NULL

`deploy.sh` does **not** run this migration. It only prints a reminder about an older phpMyAdmin migration.

### Backend

- `POST /api/meetings/:id/share` and `DELETE /api/meetings/:id/share` (auth + email verified). Disable sets `share_enabled = 0` and keeps the token; the next POST mints a new token.
- Public, rate-limited (120 / 15 min): `GET /api/public/reports/:token` and `GET /api/public/logos/:userId`. Mounted in `backend/src/server.js` at `/api/public` with no JWT. 404 when the token is missing or disabled.
- Report payload is built in `backend/src/services/reportService.js` and `buildReportContent` in `backend/src/utils/summaryUtils.js`: title, Jalali-ready `meeting_date`, approved participants (fallback: summary "People in meetings"), decisions from `Bolet Points` (a `مسئول`-like object key goes into assignee), summary text, `org_name`, logo URL. Transcription and user email are not returned.
- Profile: `org_name` is an allowed update field. `POST /api/auth/profile/logo` (multer, png/jpeg/webp/svg, 2 MB) stores `uploads/logos/<userId>.<ext>`.
- Analysis email (`emailController.sendMailWebhook` → `emailService.sendMeetingSummaryEmail`) creates the token if needed and adds a «مشاهده و اشتراک‌گذاری صورتجلسه» button. Link base is `FRONTEND_URL` (fallback `https://www.neshastyar.com`) + `/report/<token>`.

### Frontend

- Public route `/report/:token` in `src/App.tsx` (no login). Page: `src/pages/MeetingReport.tsx`.
- Layout: `src/components/report/MeetingMinutesReport.tsx` (A4, RTL, grey `#D9D9D9` headers, Vazirmatn instead of B Nazanin / B Titr). Toolbar is `print:hidden`.
- Word: `docx` ^9.15.3, `src/lib/exportMeetingDocx.ts`. Client-side Blob download. Structure matches the template; font fidelity is approximate.
- Meeting page: «صورتجلسه» button when status is «پردازش شده», dialog with copy / open / disable. Helpers in `src/lib/mysql-client.ts` (`shareMeeting`, `disableMeetingShare`).
- Account page: organization name + logo upload/preview.

Nginx already proxies `/api/` and SPA-falls back to `index.html`, so `/report/:token` needs no nginx change.

## What to do next

1. Pull `main` on the home machine.
2. On the VPS (`ssh -o BatchMode=yes myserver`, key auth, do not ask for a password), from the backend directory after the new code is there:

   ```bash
   node migrations/run_share_token_and_org_fields_migration.js
   ```

   Run this **before** restarting the API. The public report and share endpoints query the new columns and will 500 until the migration succeeds.
3. Deploy web + backend the usual way (`deploy.sh` on the server: PM2 app `neshastyar-backend` from `/root/neshastyar/backend`, frontend build copied to `/var/www/neshastyar.com`). Production API is `https://www.neshastyar.com/api`. Confirm `FRONTEND_URL` in the backend env so email links use `https://neshastyar.com` or `https://www.neshastyar.com`, matching the host the user actually opens.
4. Verify in the browser, not just by reading code:
   - Account: save an organization name and upload a logo.
   - Open a processed meeting, click صورتجلسه, copy the link, open it in a private window (no login).
   - Check title, Jalali date, participants, decisions, summary, logo.
   - Print preview is A4 and the toolbar is hidden. Word download opens in Word and keeps the table.
   - Disable the link and confirm the public URL 404s; create it again and confirm a new token works.
   - Trigger or inspect one analysis email and confirm the report button URL loads.
5. Only after that, tell the user it is live.

## Known limits (leave them unless the user asks)

- Blank template fields are intentional.
- Word/PDF fonts are Vazirmatn / Calibri-class substitutes, not embedded B Nazanin or B Titr.
- Logo on the public page is fetched from `/api/public/logos/:userId` with no auth. That is required for the shared page. Do not put other user data on that route.
- Re-enabling a disabled link rotates the token, so old links stay dead.
- n8n was not changed. The email is sent by the existing `GET /sendmail/:meetingId` webhook after n8n writes the summary.
