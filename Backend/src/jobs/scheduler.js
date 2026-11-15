const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');
const backupService = require('../services/backup.service');
const loanEngine = require('../services/loanEngine.service');
const notificationService = require('../services/notification.service');
const { prisma } = require('../config/database');
const systemService = require('../services/system.service');
const countdownEngine = require('../modules/tenant/countdownEngine.service');

function scheduleJobs() {
  if (config.backup.enabled) {
    cron.schedule(config.backup.schedule, async () => {
      logger.info('Running scheduled backup...');
      try {
        await backupService.runBackup();
      } catch (err) {
        logger.error('Scheduled backup failed:', err);
      }
    });
  }

  cron.schedule('0 8 * * *', async () => {
    logger.info('Running payment due reminders...');
    await sendDueReminders('due_today');
  });

  cron.schedule('0 8 * * 1', async () => {
    logger.info('Running weekly payment reminders...');
    await sendDueReminders('due_week');
  });

  cron.schedule('0 0 * * *', async () => {
    logger.info('Checking overdue loans...');
    await processOverdueLoans();
  });

  cron.schedule('*/5 * * * *', async () => {
    try {
      const status = await systemService.getSystemStatus();
      if (!status.database.connected) {
        logger.warn('Skipping health log write: database is currently disconnected');
        return;
      }
      await prisma.systemHealthLog.create({
        data: {
          serverStatus: status.server.status,
          databaseStatus: status.database.status,
          redisStatus: status.redis.status,
          uptimeSeconds: BigInt(status.server.uptimeSeconds),
          memoryUsageMb: status.server.memoryUsageMb,
          cpuUsagePercent: status.server.cpuUsagePercent,
          lastBackupAt: status.backup.lastBackupAt,
          backupStatus: status.backup.status,
        },
      });
    } catch (err) {
      logger.error('Health log failed:', err);
    }
  });

  cron.schedule('0 * * * *', async () => {
    logger.info('Sweeping 90-day tenant countdowns...');
    try {
      await countdownEngine.sweepAllTenants();
    } catch (err) {
      logger.error('Countdown sweep failed:', err);
    }
  });

  logger.info('All cron jobs scheduled');
}

async function sendDueReminders(type) {
  const today = new Date();
  const endDate = new Date();
  if (type === 'due_week') endDate.setDate(endDate.getDate() + 7);

  const schedules = await prisma.repaymentSchedule.findMany({
    where: {
      isPaid: false,
      dueDate: { gte: today, lte: endDate },
    },
    include: { loan: { include: { member: { include: { user: true } } } } },
  });

  for (const schedule of schedules) {
    await notificationService.sendPaymentReminder({
      loanId: schedule.loanId,
      type,
    });
  }
}

async function processOverdueLoans() {
  const overdueSchedules = await prisma.repaymentSchedule.findMany({
    where: { isPaid: false, dueDate: { lt: new Date() } },
    include: { loan: true },
  });

  for (const schedule of overdueSchedules) {
    if (schedule.loan.status === 'ONGOING') {
      const daysOverdue = Math.floor((Date.now() - schedule.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const penalty = loanEngine.calculatePenalty(
        Number(schedule.loan.outstandingAmount),
        daysOverdue,
        Number(schedule.loan.penaltyRate)
      );

      if (penalty > 0) {
        await prisma.loanPenalty.create({
          data: {
            loanId: schedule.loanId,
            amount: penalty,
            reason: `${daysOverdue} days overdue on installment #${schedule.installmentNo}`,
          },
        });
      }

      await prisma.loan.update({
        where: { id: schedule.loanId },
        data: { status: 'OVERDUE' },
      });
    }
  }
}

module.exports = { scheduleJobs };
