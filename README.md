PandaPlanner

Task and project management with timesheets, messaging, and media support.

Changelog

### 2025-10-02

- Added email for tasks status changes

### 2025-09-20

- Todos page improvements:
  - Tasks are now clickable and open their task page.
  - Non‑completed tasks appear first; completed items are shown last under a “Completed” section.
- Task page enhancement:
  - Added a status selector (To Do / In Progress / Done) to update task status directly from the task page.
- Role-based access:
  - Added a super admin role plus per-project read/edit assignments with centralized user management.
  - Sidebar adapts when a user only has read-only projects.
- Direct messaging:
  - Replaced legacy team chat with recipient-scoped messages limited to shared projects or the super admin.
- Email styling:
  - Branded HTML templates for task assignment and direct messages with action buttons; improved text fallbacks.


v0.2.1 — 2025-09-15

- Email: Added Brevo SMTP support and task assignment notifications.
  - Config: Set `BREVO_API_KEY` and `EMAIL_FROM` in `.env` (or keep `EMAIL_SERVER`).
  - Behavior: Sends an email when a new task is assigned to a user.
    - On create (`POST /api/tasks`): notifies assignee if not the creator.
    - On update (`PATCH /api/tasks/[id]`): notifies when `assignedToId` changes to a new user (not self).
- Messages: Unread badge on mobile footer icon.
  - API: `GET /api/messages/unread` returns `{ count }` across teams you’re in.
  - UI: `components/mobile-footer-nav.tsx` polls every 20s and shows a badge.

v0.2.0 — 2025-09-15

- Team Messaging: Added team-wide quick messages UI at `/messages` with optimistic sends, editing, and read receipts.
  - API: `GET/POST /api/messages`, `PATCH /api/messages/[id]`, `POST /api/messages/read`.
- Channels: Introduced team channels with membership and per-channel messages.
  - API: `GET/POST /api/channels`, `GET/POST /api/channels/[id]/messages`.
  - Components: `components/channel-chat.tsx`, `components/channel-create-dialog.tsx`.
- Task Schedules + Todos: Schedule tasks per user (recurring or one-time) and view daily todos by user at `/todos`.
  - API: `GET/POST /api/schedules`.
  - Components: `components/team-schedule-dialog.tsx`.
- Your Tasks: New page at `/tasks/mine` listing tasks assigned to the current user.
- Tasks API: Include `createdBy` in task fetches and set `createdById` on creation.
  - Endpoints updated: `/api/tasks` and `/api/tasks/[id]` include `createdBy` in responses.
  - UI: `components/project-board.tsx` prepared to surface task author metadata.
- Projects API: Added `DELETE /api/projects/[id]` to cascade delete tasks, comments, attachments, timesheets, credentials, and best-effort removal of project media in Supabase Storage.
- Media API: Excludes internal `_meta.json` from listings and uses Node `Buffer` for metadata writes. Honors `SUPABASE_MEDIA_SIGNED` and `SUPABASE_SIGNED_URL_TTL`.
  - Endpoint: `/api/projects/[id]/media` (list/upload/delete) behavior updated.
- UI/Navigation: Added `components/mobile-footer-nav.tsx` and linked new sections in `app/layout.tsx`. Sidebar now supports expanding/collapsing long menus and improved scrolling. Adjusted timesheet grid sticky cell background for better contrast.

Database Changes

- New models: `TeamMessage`, `TeamMessageRead`, `TeamChannel`, `ChannelMember`, `ChannelMessage`, `TaskSchedule`.
- Updated models: `Task` now includes `createdById`/`createdBy` relation.
- Run migrations after pulling these changes:
  - `npx prisma migrate dev` (development)
  - `npx prisma generate` (if needed)

Environment

- Supabase storage configuration in `.env` (see `.env.example`):
  - `SUPABASE_URL`, `SUPABASE_PUBLIC_URL`, `SUPABASE_BUCKET`
  - `SUPABASE_MEDIA_SIGNED` (set `true` for private bucket)
  - `SUPABASE_SIGNED_URL_TTL` (signed URL lifetime in seconds)
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side operations)
- Workspaces: Set `WORKSPACE_FREE_LIMIT` to control how many workspaces a user can own on the free plan.
  - Use the workspace switcher in the top navigation (for signed-in users) to view, switch, or create workspaces up to the allowed limit.


For a full changelog, see the dedicated page at `/changelog` when running the app, or the CHANGELOG.md file in the repository.

## Email troubleshooting

- Ensure these env vars are set in your hosting provider (and locally):
  - `EMAIL_FROM` — verified sender address
  - `BREVO_SMTP_LOGIN`, `BREVO_SMTP_PASSWORD` — Brevo SMTP credentials
  - `BREVO_SMTP_HOST`=`smtp-relay.brevo.com`, `BREVO_SMTP_PORT`=`587`
  - Optional: `EMAIL_DEBUG=true` to enable transport logging
- Verify connectivity and config in production via: `GET /api/email/verify`.
  - Returns which transport is selected and whether `transporter.verify()` succeeds.
  - No secrets are returned; only booleans and metadata.
