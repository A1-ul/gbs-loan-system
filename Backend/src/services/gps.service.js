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

function buildPhoneSearchVariants(rawPhone) {
  const trimmed = String(rawPhone || '').trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  const variants = new Set();
  if (trimmed) variants.add(trimmed);
  if (digits) variants.add(digits);
  if (digits.length >= 9) {
    const tail9 = digits.slice(-9);
    variants.add(tail9);
    variants.add(`0${tail9}`);
    variants.add(`233${tail9}`);
    variants.add(`+233${tail9}`);
    variants.add(`0${tail9.slice(0, 2)} ${tail9.slice(2, 5)} ${tail9.slice(5)}`);
    variants.add(`0${tail9.slice(0, 2)}-${tail9.slice(2, 5)}-${tail9.slice(5)}`);
  }
  return Array.from(variants).filter((v) => v.length >= 3);
}

function buildGoogleMapUrls(lat, lng, fallbackQuery = '') {
  if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return {
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      googleMapsEmbedUrl: `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`,
    };
  }
  const q = String(fallbackQuery || '').trim();
  if (q) {
    const enc = encodeURIComponent(q);
    return {
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${enc}`,
      googleMapsEmbedUrl: `https://maps.google.com/maps?q=${enc}&z=15&output=embed`,
    };
  }
  return { googleMapsUrl: null, googleMapsEmbedUrl: null };
}

/**
 * Allows any authenticated user (field staff, collector, member, manager, admin)
 * to publish real device GPS coordinates bound to their mobile number & account.
 */
async function shareMyLocation(userId, data) {
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  const recordedAt = new Date();

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      gpsLatitude: latitude,
      gpsLongitude: longitude,
      ...(data.gpsAddress ? { gpsAddress: String(data.gpsAddress).trim() } : {}),
    },
    include: { collectorProfile: true, tenant: { select: { id: true, name: true, code: true } }, branch: { select: { name: true } } },
  });

  if (user.collectorProfile) {
    await prisma.collector.update({
      where: { id: user.collectorProfile.id },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastSpeed: data.speed ?? user.collectorProfile.lastSpeed,
        lastLocationAt: recordedAt,
        status: data.status || 'ONLINE',
      },
    });

    await prisma.collectorLocationLog.create({
      data: {
        collectorId: user.collectorProfile.id,
        latitude,
        longitude,
        speed: data.speed ?? null,
        accuracy: data.accuracy ?? null,
        status: data.status || 'ONLINE',
        isOfflineSync: false,
        recordedAt,
      },
    });
  }

  return {
    userId: user.id,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    phone: user.phone,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenant?.name || null,
    branchName: user.branch?.name || null,
    coordinates: { latitude, longitude },
    accuracy: data.accuracy ?? null,
    source: user.collectorProfile ? 'LIVE_COLLECTOR_GPS' : 'LIVE_USER_DEVICE_GPS',
    isLiveGps: true,
    recordedAt: recordedAt.toISOString(),
    ...buildGoogleMapUrls(latitude, longitude),
  };
}

/**
 * Resolves exact real GPS coordinates (or honest branch/HQ fallback if live GPS has not been shared yet)
 * for a registered mobile number across PostgreSQL Users, Collectors, Members, and Tenants.
 */
async function locateByPhone({ phone, tenantId = null, allowCrossTenant = false } = {}) {
  const variants = buildPhoneSearchVariants(phone);
  if (variants.length === 0) {
    return { query: phone || '', totalMatches: 0, primaryMatch: null, matches: [] };
  }

  const phoneOrClauses = variants.flatMap((v) => ([
    { phone: { contains: v, mode: 'insensitive' } },
    { memberProfile: { is: { emergencyPhone: { contains: v, mode: 'insensitive' } } } },
  ]));
  const userWhere = {
    OR: phoneOrClauses,
    ...(allowCrossTenant || !tenantId ? {} : { tenantId }),
  };

  const users = await prisma.user.findMany({
    where: userWhere,
    take: 15,
    orderBy: { updatedAt: 'desc' },
    include: {
      collectorProfile: true,
      memberProfile: { select: { id: true, memberNumber: true, emergencyPhone: true } },
      branch: { select: { id: true, name: true, city: true, region: true, latitude: true, longitude: true } },
      tenant: { select: { id: true, code: true, name: true, city: true, region: true, latitude: true, longitude: true, contactPhone: true } },
    },
  });

  const targetDigits = String(phone || '').replace(/[^\d]/g, '').slice(-9);
  const matches = users.map((u) => {
    let latitude = null;
    let longitude = null;
    let source = 'NO_COORDINATES_RECORDED';
    let isLiveGps = false;
    let lastUpdatedAt = u.updatedAt;

    if (u.collectorProfile?.lastLatitude != null && u.collectorProfile?.lastLongitude != null) {
      latitude = Number(u.collectorProfile.lastLatitude);
      longitude = Number(u.collectorProfile.lastLongitude);
      source = 'LIVE_COLLECTOR_GPS';
      isLiveGps = true;
      lastUpdatedAt = u.collectorProfile.lastLocationAt || u.updatedAt;
    } else if (u.gpsLatitude != null && u.gpsLongitude != null) {
      latitude = Number(u.gpsLatitude);
      longitude = Number(u.gpsLongitude);
      source = 'LIVE_USER_DEVICE_GPS';
      isLiveGps = true;
      lastUpdatedAt = u.updatedAt;
    } else if (u.branch?.latitude != null && u.branch?.longitude != null) {
      latitude = Number(u.branch.latitude);
      longitude = Number(u.branch.longitude);
      source = 'ASSIGNED_BRANCH_FALLBACK';
    } else if (u.tenant?.latitude != null && u.tenant?.longitude != null) {
      latitude = Number(u.tenant.latitude);
      longitude = Number(u.tenant.longitude);
      source = 'TENANT_HQ_FALLBACK';
    }

    const userDigits = String(u.phone || '').replace(/[^\d]/g, '').slice(-9);
    const exactDigitsMatch = Boolean(targetDigits && userDigits === targetDigits);

    return {
      id: `phone-${u.id}`,
      userId: u.id,
      type: u.collectorProfile ? 'COLLECTOR' : u.memberProfile ? 'MEMBER' : 'USER_DEVICE',
      name: `${u.firstName} ${u.lastName}`.trim(),
      phone: u.phone,
      email: u.email,
      role: u.role,
      memberNumber: u.memberProfile?.memberNumber || null,
      employeeId: u.collectorProfile?.employeeId || null,
      tenantId: u.tenantId,
      tenantName: u.tenant?.name || 'GBS Institution',
      tenantCode: u.tenant?.code || null,
      branchName: u.branch?.name || null,
      city: u.branch?.city || u.tenant?.city || 'Accra',
      region: u.branch?.region || u.tenant?.region || 'Greater Accra',
      status: u.collectorProfile?.status || u.status || 'ACTIVE',
      source,
      isLiveGps,
      exactPhoneMatch: exactDigitsMatch,
      lastUpdatedAt,
      coordinates: latitude != null && longitude != null ? { latitude, longitude } : null,
      ...buildGoogleMapUrls(latitude, longitude),
    };
  });

  matches.sort((a, b) => {
    if (a.exactPhoneMatch !== b.exactPhoneMatch) return a.exactPhoneMatch ? -1 : 1;
    if (a.isLiveGps !== b.isLiveGps) return a.isLiveGps ? -1 : 1;
    return new Date(b.lastUpdatedAt || 0) - new Date(a.lastUpdatedAt || 0);
  });

  return {
    query: phone,
    totalMatches: matches.length,
    primaryMatch: matches[0] || null,
    matches,
  };
}

/**
 * Emergency Locator: resolves any Customer, Guarantor, or Staff/Collector (including hidden records)
 * by mobile number OR digital GPS address OR physical address OR name, returning Google Live Map coordinates.
 */
async function emergencyLocate({ query = '', tenantId = null, roleFilter = null, includeHidden = true, allowCrossTenant = false } = {}) {
  const q = String(query || '').trim();
  if (!q) {
    return { query: '', totalMatches: 0, primaryMatch: null, matches: [] };
  }

  const phoneVariants = buildPhoneSearchVariants(q);
  const tokens = q.split(/\s+/).filter(Boolean);

  const searchOr = [
    { gpsAddress: { contains: q, mode: 'insensitive' } },
    { address: { contains: q, mode: 'insensitive' } },
    { firstName: { contains: q, mode: 'insensitive' } },
    { lastName: { contains: q, mode: 'insensitive' } },
    { memberProfile: { is: { gpsAddress: { contains: q, mode: 'insensitive' } } } },
    { memberProfile: { is: { memberNumber: { contains: q, mode: 'insensitive' } } } },
    { guarantorProfile: { is: { gpsAddress: { contains: q, mode: 'insensitive' } } } },
    { staffProfile: { is: { gpsAddress: { contains: q, mode: 'insensitive' } } } },
    { staffProfile: { is: { employeeId: { contains: q, mode: 'insensitive' } } } },
    ...phoneVariants.flatMap((pv) => ([
      { phone: { contains: pv, mode: 'insensitive' } },
      { memberProfile: { is: { emergencyPhone: { contains: pv, mode: 'insensitive' } } } },
    ])),
  ];

  if (tokens.length > 1) {
    searchOr.push({
      AND: tokens.map((tok) => ({
        OR: [
          { firstName: { contains: tok, mode: 'insensitive' } },
          { lastName: { contains: tok, mode: 'insensitive' } },
        ],
      })),
    });
  }

  const andClauses = [{ OR: searchOr }];
  if (!allowCrossTenant && tenantId) andClauses.push({ tenantId });
  if (!includeHidden) andClauses.push({ isHidden: false });
  if (roleFilter === 'CUSTOMER') {
    andClauses.push({ OR: [{ role: { in: ['MEMBER', 'MEMBER_PORTAL'] } }, { memberProfile: { isNot: null } }] });
  } else if (roleFilter === 'GUARANTOR') {
    andClauses.push({ OR: [{ role: { in: ['GUARANTOR', 'GUARANTOR_PORTAL'] } }, { guarantorProfile: { isNot: null } }] });
  } else if (roleFilter === 'STAFF') {
    andClauses.push({ role: { notIn: ['MEMBER', 'MEMBER_PORTAL', 'GUARANTOR', 'GUARANTOR_PORTAL'] } });
  }

  const users = await prisma.user.findMany({
    where: { AND: andClauses },
    take: 25,
    orderBy: { updatedAt: 'desc' },
    include: {
      collectorProfile: true,
      memberProfile: { select: { id: true, memberNumber: true, gpsAddress: true, gpsLatitude: true, gpsLongitude: true, isHidden: true } },
      guarantorProfile: { select: { id: true, relationship: true, gpsAddress: true, gpsLatitude: true, gpsLongitude: true, isHidden: true } },
      staffProfile: { select: { id: true, employeeId: true, department: true, position: true, gpsAddress: true, gpsLatitude: true, gpsLongitude: true } },
      branch: { select: { id: true, name: true, city: true, region: true, latitude: true, longitude: true } },
      tenant: { select: { id: true, code: true, name: true, city: true, region: true, latitude: true, longitude: true } },
    },
  });

  const targetDigits = q.replace(/[^\d]/g, '').slice(-9);
  const qUpper = q.toUpperCase();

  const matches = users.map((u) => {
    const resolvedGpsAddress =
      u.gpsAddress ||
      u.memberProfile?.gpsAddress ||
      u.guarantorProfile?.gpsAddress ||
      u.staffProfile?.gpsAddress ||
      '';

    let latitude = null;
    let longitude = null;
    let source = 'NO_COORDINATES_RECORDED';
    let isLiveGps = false;
    let lastUpdatedAt = u.updatedAt;

    if (u.collectorProfile?.lastLatitude != null && u.collectorProfile?.lastLongitude != null) {
      latitude = Number(u.collectorProfile.lastLatitude);
      longitude = Number(u.collectorProfile.lastLongitude);
      source = 'LIVE_COLLECTOR_GPS';
      isLiveGps = true;
      lastUpdatedAt = u.collectorProfile.lastLocationAt || u.updatedAt;
    } else if (u.gpsLatitude != null && u.gpsLongitude != null) {
      latitude = Number(u.gpsLatitude);
      longitude = Number(u.gpsLongitude);
      source = 'LIVE_USER_DEVICE_GPS';
      isLiveGps = true;
    } else if (u.memberProfile?.gpsLatitude != null && u.memberProfile?.gpsLongitude != null) {
      latitude = Number(u.memberProfile.gpsLatitude);
      longitude = Number(u.memberProfile.gpsLongitude);
      source = 'RECORDED_MEMBER_GPS';
      isLiveGps = true;
    } else if (u.guarantorProfile?.gpsLatitude != null && u.guarantorProfile?.gpsLongitude != null) {
      latitude = Number(u.guarantorProfile.gpsLatitude);
      longitude = Number(u.guarantorProfile.gpsLongitude);
      source = 'RECORDED_GUARANTOR_GPS';
      isLiveGps = true;
    } else if (u.staffProfile?.gpsLatitude != null && u.staffProfile?.gpsLongitude != null) {
      latitude = Number(u.staffProfile.gpsLatitude);
      longitude = Number(u.staffProfile.gpsLongitude);
      source = 'RECORDED_STAFF_GPS';
      isLiveGps = true;
    } else if (resolvedGpsAddress) {
      source = 'GPS_DIGITAL_ADDRESS_LOOKUP';
      if (u.branch?.latitude != null && u.branch?.longitude != null) {
        latitude = Number(u.branch.latitude);
        longitude = Number(u.branch.longitude);
      } else if (u.tenant?.latitude != null && u.tenant?.longitude != null) {
        latitude = Number(u.tenant.latitude);
        longitude = Number(u.tenant.longitude);
      }
    } else if (u.branch?.latitude != null && u.branch?.longitude != null) {
      latitude = Number(u.branch.latitude);
      longitude = Number(u.branch.longitude);
      source = 'ASSIGNED_BRANCH_FALLBACK';
    } else if (u.tenant?.latitude != null && u.tenant?.longitude != null) {
      latitude = Number(u.tenant.latitude);
      longitude = Number(u.tenant.longitude);
      source = 'TENANT_HQ_FALLBACK';
    }

    const userDigits = String(u.phone || '').replace(/[^\d]/g, '').slice(-9);
    const exactPhoneMatch = Boolean(targetDigits && userDigits === targetDigits);
    const exactGpsAddressMatch = Boolean(resolvedGpsAddress && resolvedGpsAddress.toUpperCase() === qUpper);

    const entityType = u.guarantorProfile
      ? 'GUARANTOR'
      : u.memberProfile
        ? 'CUSTOMER'
        : u.collectorProfile
          ? 'COLLECTOR'
          : 'STAFF';

    const fallbackGeoQuery = resolvedGpsAddress
      ? `${resolvedGpsAddress}, ${u.branch?.city || u.tenant?.city || 'Ghana'}`
      : (u.address || '');

    return {
      id: `locate-${u.id}`,
      userId: u.id,
      entityType,
      type: entityType,
      name: `${u.firstName} ${u.lastName}`.trim(),
      phone: u.phone,
      email: u.email,
      role: u.role,
      gpsAddress: resolvedGpsAddress,
      address: u.address || null,
      isHidden: Boolean(u.isHidden || u.memberProfile?.isHidden || u.guarantorProfile?.isHidden),
      memberNumber: u.memberProfile?.memberNumber || null,
      employeeId: u.staffProfile?.employeeId || u.collectorProfile?.employeeId || null,
      tenantId: u.tenantId,
      tenantName: u.tenant?.name || 'GBS Institution',
      branchName: u.branch?.name || null,
      city: u.branch?.city || u.tenant?.city || 'Accra',
      region: u.branch?.region || u.tenant?.region || 'Greater Accra',
      status: u.collectorProfile?.status || u.status || 'ACTIVE',
      source,
      isLiveGps,
      exactPhoneMatch,
      exactGpsAddressMatch,
      lastUpdatedAt,
      coordinates: latitude != null && longitude != null ? { latitude, longitude } : null,
      ...buildGoogleMapUrls(
        isLiveGps || !resolvedGpsAddress ? latitude : null,
        isLiveGps || !resolvedGpsAddress ? longitude : null,
        fallbackGeoQuery
      ),
    };
  });

  matches.sort((a, b) => {
    if (a.exactPhoneMatch !== b.exactPhoneMatch) return a.exactPhoneMatch ? -1 : 1;
    if (a.exactGpsAddressMatch !== b.exactGpsAddressMatch) return a.exactGpsAddressMatch ? -1 : 1;
    if (a.isLiveGps !== b.isLiveGps) return a.isLiveGps ? -1 : 1;
    return new Date(b.lastUpdatedAt || 0) - new Date(a.lastUpdatedAt || 0);
  });

  return {
    query: q,
    totalMatches: matches.length,
    primaryMatch: matches[0] || null,
    matches,
  };
}

module.exports = {
  updateLocation, batchSync, getTrackingData,
  grantConsent, revokeConsent,
  shareMyLocation, locateByPhone, emergencyLocate,
  buildPhoneSearchVariants, buildGoogleMapUrls,
};
