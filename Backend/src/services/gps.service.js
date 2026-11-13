/**
 * GPS Tracking Service - Real-time collector tracking with offline sync
 */
const { prisma } = require('../config/database');
const { NotFoundError, AuthorizationError } = require('../utils/errors');
const config = require('../config');

async function getCollectorByUserId(userId) {
  const collector = await prisma.collector.findUnique({ where: { userId } });
  if (!collector) throw new NotFoundError('Collector profile');
  return collector;
}

async function checkConsent(userId) {
  const consent = await prisma.userConsent.findUnique({
    where: { userId_consentType: { userId, consentType: 'GPS_TRACKING' } },
  });
  if (!consent || !consent.granted) {
    throw new AuthorizationError('GPS tracking consent required');
  }
}

async function updateLocation(userId, data) {
  await checkConsent(userId);
  const collector = await getCollectorByUserId(userId);

  const log = await prisma.collectorLocationLog.create({
    data: {
      collectorId: collector.id,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
      status: data.status || collector.status,
      accuracy: data.accuracy,
      isOfflineSync: data.isOfflineSync || false,
      recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
    },
  });

  await prisma.collector.update({
    where: { id: collector.id },
    data: {
      lastLatitude: data.latitude,
      lastLongitude: data.longitude,
      lastSpeed: data.speed,
      lastLocationAt: new Date(),
      status: data.status || collector.status,
    },
  });

  return log;
}

async function batchSync(userId, locations) {
  if (!config.gps.offlineSyncEnabled) {
    throw new AuthorizationError('Offline sync is disabled');
  }

  await checkConsent(userId);
  const collector = await getCollectorByUserId(userId);

  const logs = await prisma.collectorLocationLog.createMany({
    data: locations.map((loc) => ({
      collectorId: collector.id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      speed: loc.speed,
      status: loc.status || 'ONLINE',
      isOfflineSync: true,
      recordedAt: new Date(loc.recordedAt),
    })),
  });

  const latest = locations[locations.length - 1];
  await prisma.collector.update({
    where: { id: collector.id },
    data: {
      lastLatitude: latest.latitude,
      lastLongitude: latest.longitude,
      lastSpeed: latest.speed,
      lastLocationAt: new Date(latest.recordedAt),
    },
  });

  return { synced: logs.count };
}

async function getTrackingData(collectorId) {
  const collector = await getById(collectorId);
  const recentLogs = await prisma.collectorLocationLog.findMany({
    where: { collectorId },
    orderBy: { recordedAt: 'desc' },
    take: 100,
  });

  return { collector, recentLogs };
}

async function getById(id) {
  const collector = await prisma.collector.findUnique({ where: { id } });
  if (!collector) throw new NotFoundError('Collector');
  return collector;
}

async function grantConsent(userId, ipAddress) {
  return prisma.userConsent.upsert({
    where: { userId_consentType: { userId, consentType: 'GPS_TRACKING' } },
    update: { granted: true, grantedAt: new Date(), revokedAt: null, ipAddress },
    create: { userId, consentType: 'GPS_TRACKING', granted: true, grantedAt: new Date(), ipAddress },
  });
}

async function revokeConsent(userId) {
  return prisma.userConsent.update({
    where: { userId_consentType: { userId, consentType: 'GPS_TRACKING' } },
    data: { granted: false, revokedAt: new Date() },
  });
}

module.exports = {
  updateLocation, batchSync, getTrackingData,
  grantConsent, revokeConsent,
};
