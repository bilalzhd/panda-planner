/*
  Example seed script to create a sample project and a recurring task.
  Assumes DATABASE_URL is set and prisma client is generated.
*/
import { PrismaClient, RecurrenceFrequency, TaskPriority, TaskStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create or find a demo user to assign tasks to
  const user = await prisma.user.upsert({
    where: { email: 'demo@agency.local' },
    update: {},
    create: {
      email: 'demo@agency.local',
      name: 'Demo User',
    },
  })

  const project = await prisma.project.upsert({
    where: { id: "cmezqamha003c8zruhkg1lw8g", name: 'Edvardson' },
    update: {},
    create: {
      name: 'Edvardson',
      description: 'Client: Edvardson — Digital Marketing engagement',
      color: 'orange',
      // team will be set below after we ensure it exists
      team: {
        create: {
          name: 'Demo Team',
          ownerId: user.id,
          members: {
            create: { userId: user.id, role: 'OWNER' },
          },
        },
      },
    },
  })

  // Monday weekly task
  await prisma.task.create({
    data: {
      projectId: project.id,
      title: 'Check Google Ads every Monday',
      description: 'Review campaigns, adjust bids, and report anomalies.',
      assignedToId: user.id,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      recurring: true,
      frequency: RecurrenceFrequency.WEEKLY,
      interval: 1,
      byWeekday: 1, // Monday
    },
  })

  console.log('Seeded: user, team, project Edvardson, recurring task')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
