import { z } from 'zod'

const projectColors = [
  'blue','green','orange','purple','pink','teal','red','yellow','gray'
] as const

export const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  color: z.enum(projectColors).optional().nullable(),
})

export type ProjectColor = typeof projectColors[number]
export const PROJECT_COLOR_OPTIONS: ProjectColor[] = [...projectColors]

export const taskSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  assignedToId: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  recurring: z.boolean().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional().nullable(),
  interval: z.number().int().positive().optional().nullable(),
  byWeekday: z.number().int().min(0).max(6).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'CLIENT_REVIEW', 'DONE']).optional(),
})

export const timesheetSchema = z.object({
  taskId: z.string().cuid(),
  userId: z.string().cuid().optional(),
  hours: z.number().positive().max(999),
  notes: z.string().optional().nullable(),
  date: z.string().datetime(),
})

export type ProjectInput = z.infer<typeof projectSchema>
export type TaskInput = z.infer<typeof taskSchema>
export type TimesheetInput = z.infer<typeof timesheetSchema>

export const credentialSchema = z.object({
  label: z.string().min(1),
  username: z.string().optional().nullable(),
  password: z.string().min(1),
})

export type CredentialInput = z.infer<typeof credentialSchema>
