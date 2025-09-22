## Changelog

### 2025-09-20

- Todos page improvements:
  - Tasks are now clickable and open their task page.
  - Non‑completed tasks appear first; completed items are shown last under a “Completed” section.
- Task page enhancement:
  - Added a status selector (To Do / In Progress / Done) to update task status directly from the task page.
- Client access feature groundwork:
  - Added project‑level client access and invite flow guarded by a feature flag `NEXT_PUBLIC_FEATURE_PROJECT_CLIENTS`.
  - Sidebar and header adapt for client‑only users.
- Invite UX:
  - Added a dedicated accept page with a loading indicator during redirect.
- Email styling:
  - Branded HTML templates for invite and task assignment emails with action buttons; improved text fallbacks.

