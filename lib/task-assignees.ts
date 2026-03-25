type TaskAssigneeInput = {
  assignedToId?: string | null
  assignedToIds?: string[] | null
}

type TaskWithAssignees = {
  assignedTo?: { id: string }[] | null
}

export function normalizeAssignedUserIds(
  input: TaskAssigneeInput,
  options?: { fallbackUserId?: string; treatMissingAsFallback?: boolean },
) {
  const hasAssignedToIds = Array.isArray(input.assignedToIds) || input.assignedToIds === null
  const hasAssignedToId = typeof input.assignedToId !== 'undefined'

  let ids: string[] = []
  if (hasAssignedToIds) {
    ids = input.assignedToIds || []
  } else if (hasAssignedToId) {
    ids = input.assignedToId ? [input.assignedToId] : []
  } else if (options?.treatMissingAsFallback && options.fallbackUserId) {
    ids = [options.fallbackUserId]
  }

  return {
    ids: Array.from(new Set(ids.filter(Boolean))),
    provided: hasAssignedToIds || hasAssignedToId,
  }
}

export function getAssignedUserIds(task: TaskWithAssignees) {
  return task.assignedTo?.map((user) => user.id) || []
}

export function isAssignedToUser(task: TaskWithAssignees, userId?: string | null) {
  if (!userId) return false
  return getAssignedUserIds(task).includes(userId)
}

export function assignmentRank(task: TaskWithAssignees, userId?: string | null) {
  if (isAssignedToUser(task, userId)) return 0
  if (getAssignedUserIds(task).length === 0) return 1
  return 2
}
