## Changelog

### 2025-09-20

- Todos page improvements:
  - Tasks are now clickable and open their task page.
  - Non‑completed tasks appear first; completed items are shown last under a “Completed” section.
- Task page enhancement:
  - Added a status selector (To Do / In Progress / Done) to update task status directly from the task page.
- Role-based access:
  - Added a super admin role plus per-project read/edit assignments with centralized user management.
  - Sidebar and navigation adapt when a user has read-only access.
- Direct messaging:
  - Replaced legacy team chat with recipient-scoped messaging limited to shared projects or the super admin.
- Email styling:
  - Branded HTML templates for task assignment and direct message emails with action buttons; improved text fallbacks.
- Workspaces:
  - Each user can own up to `WORKSPACE_FREE_LIMIT` workspaces (default 2) and becomes the super admin for those spaces.
  - Workspace owners can create additional spaces via the API or the new header switcher, and new members receive invite emails when added.
