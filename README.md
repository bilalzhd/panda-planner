PandaPlanner

Task and project management with timesheets, messaging, and media support.

Changelog

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
