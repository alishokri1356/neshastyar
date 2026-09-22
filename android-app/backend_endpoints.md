# Backend Endpoints Structure

This document outlines the API endpoints exposed by the Neshastyar backend that the Android app consumes.

## Base URL
- Production: `https://neshastyar.com/api`
- Local/Dev: `http://<host>:3001/api`

## Authentication (`/api/auth`)

All routes under `/api/auth` (except `/verify`, `/profile`) do not require authentication, but they are subject to a strict rate limit.

| Method | Endpoint | Request Body | Description |
|---|---|---|---|
| `POST` | `/auth/login` | `{ "email", "password" }` | Login with email/password. Returns `{ data: { user, session } }` |
| `POST` | `/auth/signup` | `{ "email", "password", "name" (optional) }` | Register a new user. Returns `{ data: { user, message } }` |
| `POST` | `/auth/google` | `{ "id_token" }` | Login/Register using Google ID Token. Returns `{ data: { user, session } }` |
| `POST` | `/auth/logout` | None | Logout the user. |
| `POST` | `/auth/verify` | None (Bearer token in header) | Verify current session token. |
| `GET`  | `/auth/profile` | None (Bearer token in header) | Get current user's profile. |
| `PUT`  | `/auth/profile` | `{ "name", "baleID" }` | Update user profile. |
| `POST` | `/auth/request-password-reset` | `{ "email" }` | Request a password reset link to be sent. |
| `POST` | `/auth/resend-verification` | `{ "email" }` | Resend email verification link. |
| `POST` | `/auth/reset-password` | `{ "token", "newPassword" }` | Reset password using token from email. |

## Meetings (`/api/meetings`)

Requires Bearer token in the `Authorization` header.

| Method | Endpoint | Request / Query Params | Description |
|---|---|---|---|
| `GET` | `/meetings` | Query: `limit`, `orderBy`, `orderDirection`, `status` | List meetings for the user. |
| `GET` | `/meetings/untagged` | None | List untagged meetings. |
| `GET` | `/meetings/:id` | None | Get a specific meeting. |
| `POST` | `/meetings` | `{ "title", "meeting_date", "status", "summary", "CommentText" }` | Create a new meeting. |
| `PUT` | `/meetings/:id` | `{ "title", "meeting_date", "status", "summary", "CommentText" }` | Update an existing meeting. |
| `POST` | `/meetings/:id/analyze` | None | Trigger AI processing for the meeting. |
| `DELETE` | `/meetings/:id` | None | Delete a meeting. |

## Audio Files / Uploads (`/api`)

Requires Bearer token.

| Method | Endpoint | Request Body / Params | Description |
|---|---|---|---|
| `POST` | `/upload/audio` | `multipart/form-data` with field `audio` | Upload an audio file. Returns server path. |
| `POST` | `/audio-files` | `{ "meeting_id", "file_name", "file_path", "file_size", "duration", "format", "upload_order" }` | Save audio file metadata to DB. |
| `GET` | `/meetings/:meetingId/audio-files` | None | Get all audio files for a meeting. |
| `GET` | `/files/audio/:userId/:filename` | None | Stream the audio file. |

## Tags (`/api/tags`)

Requires Bearer token.

| Method | Endpoint | Request / Query Params | Description |
|---|---|---|---|
| `GET` | `/tags` | Query: `withCount` (bool), `orderBy`, `orderDirection` | List user tags. |
| `POST` | `/tags` | `{ "name", "color" }` | Create a new tag. |
| `GET` | `/tags/management` | None | Get tags with stats for management screen. |
| `PUT` | `/tags/:id` | `{ "name", "color" }` | Update a tag. |
| `DELETE`| `/tags/:id` | None | Delete a tag. |
| `POST` | `/tags/merge` | `{ "sourceTagNames": [], "targetTagName" }` | Merge multiple tags into one. |

## Meeting-Tags (`/api/meeting-tags`)

Requires Bearer token.

| Method | Endpoint | Request / Query Params | Description |
|---|---|---|---|
| `GET` | `/meeting-tags` | Query: `meeting_id`, `tag_id` | Get tag associations. |
| `POST` | `/meeting-tags` | `{ "meeting_id", "tag_id" }` | Associate a tag with a meeting. |
| `DELETE`| `/meeting-tags` | Query: `meeting_id`, `tag_id` | Remove a tag from a meeting. |

## Participants (`/api/participants` & `/api/meeting-participants`)

Requires Bearer token.

| Method | Endpoint | Request Body | Description |
|---|---|---|---|
| `GET` | `/participants` | None | List participants. |
| `POST` | `/participants` | `{ "name" }` | Create a participant. |
| `PUT` | `/participants/:id` | `{ "name" }` | Update participant name. |
| `POST` | `/participants/merge` | `{ "sourceIds": [], "targetName" }` | Merge participants. |
| `POST` | `/meeting-participants` | `{ "meeting_id", "participant_id", "name" }` | Add participant to a meeting. |

## Android app (`/api/android`)

Public. No authentication required.

| Method | Endpoint | Request / Query Params | Description |
|---|---|---|---|
| `GET` | `/android/latest` | None | Latest APK (`neshastyar_major.minor.build.apk`). Returns `{ data: { version, filename, downloadUrl } }` where `downloadUrl` is `https://neshastyar.com/api/android/latest/download/neshastyar_1.1.MMdd.apk` |
| `GET` | `/android/latest/download/:filename` | `filename` e.g. `neshastyar_1.1.0922.apk` | Streams that APK. Landing page uses this URL from `/android/latest`. |

## Email / Summary (`/api/email`)

| Method | Endpoint | Request Body | Description |
|---|---|---|---|
| `POST` | `/email/send-summary` | `{ "meetingId", "meetingTitle", "summary", "userEmail", "userName" }` | Send meeting summary via email. |
| `GET` | `https://neshastyar.com/sendmail/:meetingId`| None | Legacy route for sending emails (called externally). |

---

*Note: The Google Authentication uses the `/api/auth/google` endpoint requiring `{ id_token: String }`. The Android app fetches this `id_token` using Google Credential Manager before sending it to the backend.*
