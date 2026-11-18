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

const GHANA_PREFIX_REGIONS = {
  GA: { city: 'Accra Central / Ridge / Osu', region: 'Greater Accra', latitude: 5.5600, longitude: -0.2057 },
  GD: { city: 'Dansoman / Ga Central / Weija', region: 'Greater Accra', latitude: 5.5665, longitude: -0.2785 },
  GS: { city: 'Spintex / Tema West / Ashaiman', region: 'Greater Accra', latitude: 5.6352, longitude: -0.0882 },
  GT: { city: 'Tema Metropolitan', region: 'Greater Accra', latitude: 5.6698, longitude: -0.0166 },
  GW: { city: 'Weija / Kasoa East Corridor', region: 'Greater Accra', latitude: 5.5536, longitude: -0.3358 },
  GE: { city: 'East Legon / Ga East / Dome', region: 'Greater Accra', latitude: 5.6476, longitude: -0.1516 },
  GM: { city: 'Madina / Adenta', region: 'Greater Accra', latitude: 5.6833, longitude: -0.1667 },
  GK: { city: 'Kaneshie / Kokomlemle', region: 'Greater Accra', latitude: 5.5736, longitude: -0.2335 },
  GZ: { city: 'Airport Residential / Cantonments', region: 'Greater Accra', latitude: 5.6037, longitude: -0.1726 },
  AK: { city: 'Kumasi Metropolitan', region: 'Ashanti', latitude: 6.6885, longitude: -1.6244 },
  AS: { city: 'Asokwa / Ashanti South', region: 'Ashanti', latitude: 6.6632, longitude: -1.6085 },
  AT: { city: 'Obuasi / Adansi', region: 'Ashanti', latitude: 6.2022, longitude: -1.6626 },
  AW: { city: 'Ejisu / Juaben', region: 'Ashanti', latitude: 6.7171, longitude: -1.4648 },
  AE: { city: 'Offinso / Ejura', region: 'Ashanti', latitude: 7.0419, longitude: -1.6622 },
  CR: { city: 'Central Region Hub', region: 'Central', latitude: 5.2529, longitude: -1.0736 },
  CC: { city: 'Cape Coast Metropolitan', region: 'Central', latitude: 5.1053, longitude: -1.2466 },
  CK: { city: 'Kasoa / Awutu Senya East', region: 'Central', latitude: 5.5345, longitude: -0.4168 },
  CS: { city: 'Swedru / Winneba', region: 'Central', latitude: 5.5359, longitude: -0.6996 },
  WR: { city: 'Sekondi-Takoradi', region: 'Western', latitude: 4.9016, longitude: -1.7831 },
  WT: { city: 'Takoradi / Effia-Kwesimintsim', region: 'Western', latitude: 4.8965, longitude: -1.7600 },
  WN: { city: 'Tarkwa / Wassa', region: 'Western', latitude: 5.3018, longitude: -1.9886 },
  ER: { city: 'Koforidua / New Juaben', region: 'Eastern', latitude: 6.0941, longitude: -0.2591 },
  EK: { city: 'Koforidua South', region: 'Eastern', latitude: 6.0830, longitude: -0.2650 },
  EN: { city: 'Nsawam / Suhum', region: 'Eastern', latitude: 5.8087, longitude: -0.3514 },
  VR: { city: 'Ho Municipal', region: 'Volta', latitude: 6.6119, longitude: 0.4703 },
  VH: { city: 'Hohoe / Volta North', region: 'Volta', latitude: 7.1518, longitude: 0.4736 },
  NR: { city: 'Tamale Metropolitan', region: 'Northern', latitude: 9.4075, longitude: -0.8533 },
  NT: { city: 'Tamale South', region: 'Northern', latitude: 9.3890, longitude: -0.8480 },
  BA: { city: 'Sunyani Municipal', region: 'Bono', latitude: 7.3349, longitude: -2.3123 },
  BS: { city: 'Sunyani West / Berekum', region: 'Bono', latitude: 7.4534, longitude: -2.5840 },
  BE: { city: 'Techiman Municipal', region: 'Bono East', latitude: 7.5861, longitude: -1.9344 },
  UE: { city: 'Bolgatanga Municipal', region: 'Upper East', latitude: 10.7856, longitude: -0.8514 },
  UW: { city: 'Wa Municipal', region: 'Upper West', latitude: 10.0601, longitude: -2.5099 },
  SA: { city: 'Goaso Municipal', region: 'Ahafo', latitude: 6.8036, longitude: -2.5172 },
  OT: { city: 'Dambai', region: 'Oti', latitude: 8.0689, longitude: 0.1782 },
  NE: { city: 'Nalerigu', region: 'North East', latitude: 10.5269, longitude: -0.3693 },
  SV: { city: 'Damongo', region: 'Savannah', latitude: 9.0846, longitude: -1.8188 },
};

function resolveGhanaPostGpsReference(gpsAddress) {
  const clean = String(gpsAddress || '').trim().toUpperCase();
  if (!clean) return null;
  const match = clean.match(/^([A-Z]{2})[- ]?(\d{3,4})[- ]?(\d{3,4})$/);
  if (!match) return null;
  const prefix = match[1];
  const ref = GHANA_PREFIX_REGIONS[prefix];
  if (!ref) {
    return {
      gpsAddress: `${prefix}-${match[2]}-${match[3]}`,
      prefix,
      districtCity: 'Ghana National Postal Grid',
      region: 'Ghana',
      latitude: 5.6037,
      longitude: -0.1870,
    };
  }
  return {
    gpsAddress: `${prefix}-${match[2]}-${match[3]}`,
    prefix,
    districtCity: ref.city,
    region: ref.region,
    latitude: ref.latitude,
    longitude: ref.longitude,
  };
}

function resolveMobileNetworkService(rawPhone) {
  const cleaned = String(rawPhone || '').trim();
  if (!cleaned || /[A-Za-z]/.test(cleaned)) return null;
  const digits = cleaned.replace(/[^\d]/g, '');
  if (!digits || digits.length < 7) return null;

  let local9 = digits;
  let country = 'Ghana (+233)';
  if (digits.startsWith('233') && digits.length >= 12) {
    local9 = digits.slice(3, 12);
  } else if (digits.startsWith('0') && digits.length === 10) {
    local9 = digits.slice(1);
  } else if (digits.length === 9) {
    local9 = digits;
  } else if (!digits.startsWith('233') && !digits.startsWith('0') && digits.length > 10) {
    country = `International (+${digits.slice(0, digits.length - 9)})`;
    return {
      normalizedPhone: cleaned,
      localFormat: cleaned,
      country,
      operator: 'International GSM Carrier',
      shortCode: 'INTL',
      prefix: `+${digits.slice(0, 3)}`,
      momoRail: 'International Remittance',
      networkHubName: 'International Carrier Gateway',
      networkHubCoordinates: null,
      mnpNote: 'Coordinates resolve strictly from live user device GPS or recorded branch/address.',
    };
  }

  const p2 = `0${local9.slice(0, 2)}`;
  const normalizedPhone = `+233${local9}`;
  const localFormat = `0${local9}`;

  let operator = 'Ghana NCA GSM Operator';
  let shortCode = 'GH_GSM';
  let momoRail = 'Mobile Money';
  let networkHubName = 'Accra National Telecom Exchange (NCA)';
  let networkHubCoordinates = { latitude: 5.5600, longitude: -0.2057 };

  if (['024', '054', '055', '059', '025'].includes(p2)) {
    operator = 'MTN Ghana (Scancom PLC)';
    shortCode = 'MTN';
    momoRail = 'MTN MoMo';
    networkHubName = 'MTN Ghana National Core Hub (Ridge, Accra)';
    networkHubCoordinates = { latitude: 5.5639, longitude: -0.1973 };
  } else if (['020', '050'].includes(p2)) {
    operator = 'Telecel Ghana (formerly Vodafone Ghana)';
    shortCode = 'TELECEL';
    momoRail = 'Telecel Cash';
    networkHubName = 'Telecel Ghana National Core Hub (Airport City, Accra)';
    networkHubCoordinates = { latitude: 5.6052, longitude: -0.1753 };
  } else if (['026', '027', '056', '057'].includes(p2)) {
    operator = 'AT Ghana (AirtelTigo)';
    shortCode = 'AT';
    momoRail = 'AT Money';
    networkHubName = 'AT Ghana National Core Hub (Adabraka, Accra)';
    networkHubCoordinates = { latitude: 5.5608, longitude: -0.2072 };
  } else if (p2 === '023') {
    operator = 'Glo Mobile Ghana';
    shortCode = 'GLO';
    momoRail = 'Glo Data / Voice';
    networkHubName = 'Glo Ghana Core Hub (Airport Residential, Accra)';
    networkHubCoordinates = { latitude: 5.6020, longitude: -0.1840 };
  } else if (p2 === '028') {
    operator = 'Expresso Telecom Ghana';
    shortCode = 'EXPRESSO';
    momoRail = 'Voice / Data';
    networkHubName = 'Expresso Ghana Exchange (Accra)';
    networkHubCoordinates = { latitude: 5.5580, longitude: -0.2010 };
  }

  return {
    normalizedPhone,
    localFormat,
    country,
    operator,
    shortCode,
    prefix: p2,
    momoRail,
    networkHubName,
    networkHubCoordinates,
    mnpNote: `Identified via NCA prefix ${p2} (subject to MNP portability if ported). Exact device/residence pin comes from Live Device GPS or registered GhanaPost GPS address.`,
  };
}

function buildGoogleMapUrls(lat, lng, fallbackQuery = '') {
  if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return {
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      googleMapsEmbedUrl: `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`,
      googleDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    };
  }
  const q = String(fallbackQuery || '').trim();
  if (q) {
    const enc = encodeURIComponent(q);
    return {
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${enc}`,
      googleMapsEmbedUrl: `https://maps.google.com/maps?q=${enc}&z=15&output=embed`,
      googleDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${enc}`,
    };
  }
  return { googleMapsUrl: null, googleMapsEmbedUrl: null, googleDirectionsUrl: null };
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
      memberProfile: { select: { id: true, memberNumber: true, emergencyPhone: true, gpsAddress: true, gpsLatitude: true, gpsLongitude: true } },
      guarantorProfile: { select: { id: true, gpsAddress: true, gpsLatitude: true, gpsLongitude: true } },
      branch: { select: { id: true, name: true, city: true, region: true, latitude: true, longitude: true } },
      tenant: { select: { id: true, code: true, name: true, city: true, region: true, latitude: true, longitude: true, contactPhone: true } },
    },
  });

  const targetDigits = String(phone || '').replace(/[^\d]/g, '').slice(-9);
  const matches = users.map((u) => {
    const resolvedGpsAddress = u.gpsAddress || u.memberProfile?.gpsAddress || u.guarantorProfile?.gpsAddress || '';
    const districtRef = resolveGhanaPostGpsReference(resolvedGpsAddress);
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
    } else if (districtRef) {
      latitude = districtRef.latitude;
      longitude = districtRef.longitude;
      source = 'GHANAPOST_DISTRICT_REFERENCE';
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
    const networkService = resolveMobileNetworkService(u.phone);

    return {
      id: `phone-${u.id}`,
      userId: u.id,
      type: u.collectorProfile ? 'COLLECTOR' : u.memberProfile ? 'MEMBER' : 'USER_DEVICE',
      name: `${u.firstName} ${u.lastName}`.trim(),
      phone: u.phone,
      email: u.email,
      role: u.role,
      gpsAddress: resolvedGpsAddress || null,
      districtCity: districtRef?.districtCity || u.branch?.city || u.tenant?.city || 'Accra',
      memberNumber: u.memberProfile?.memberNumber || null,
      employeeId: u.collectorProfile?.employeeId || null,
      tenantId: u.tenantId,
      tenantName: u.tenant?.name || 'GBS Institution',
      tenantCode: u.tenant?.code || null,
      branchName: u.branch?.name || null,
      city: u.branch?.city || districtRef?.districtCity || u.tenant?.city || 'Accra',
      region: u.branch?.region || districtRef?.region || u.tenant?.region || 'Greater Accra',
      status: u.collectorProfile?.status || u.status || 'ACTIVE',
      source,
      isLiveGps,
      exactPhoneMatch: exactDigitsMatch,
      lastUpdatedAt,
      networkService,
      coordinates: latitude != null && longitude != null ? { latitude, longitude } : null,
      ...buildGoogleMapUrls(latitude, longitude, resolvedGpsAddress ? `${resolvedGpsAddress}, ${u.branch?.city || u.tenant?.city || 'Ghana'}` : ''),
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
    queryNetworkService: resolveMobileNetworkService(phone),
  };
}

/**
 * Emergency Locator: resolves any Customer, Guarantor, or Staff/Collector (including hidden records)
 * by mobile number OR digital GPS address OR physical address OR name, returning Google Live Map
 * coordinates plus detected mobile network service details.
 */
async function emergencyLocate({ query = '', tenantId = null, roleFilter = null, includeHidden = true, allowCrossTenant = false } = {}) {
  const q = String(query || '').trim();
  if (!q) {
    return { query: '', totalMatches: 0, primaryMatch: null, matches: [], queryNetworkService: null, queryGpsReference: null };
  }

  const phoneVariants = buildPhoneSearchVariants(q);
  const tokens = q.split(/\s+/).filter(Boolean);
  const queryGpsReference = resolveGhanaPostGpsReference(q);
  const queryNetworkService = resolveMobileNetworkService(q);

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

  const userIds = users.map((u) => u.id);
  const latestAttRows = userIds.length
    ? await prisma.staffAttendance.findMany({
        where: { userId: { in: userIds } },
        orderBy: { clockInAt: 'desc' },
        take: 50,
        select: {
          userId: true,
          clockInGpsAddress: true,
          clockInLatitude: true,
          clockInLongitude: true,
          clockInAt: true,
        },
      })
    : [];
  const latestAttByUserId = new Map();
  for (const row of latestAttRows) {
    if (!latestAttByUserId.has(row.userId)) {
      latestAttByUserId.set(row.userId, row);
    }
  }

  const targetDigits = q.replace(/[^\d]/g, '').slice(-9);
  const qUpper = q.toUpperCase();

  const matches = users.map((u) => {
    const latestAtt = latestAttByUserId.get(u.id) || null;
    const resolvedGpsAddress =
      u.gpsAddress ||
      u.memberProfile?.gpsAddress ||
      u.guarantorProfile?.gpsAddress ||
      u.staffProfile?.gpsAddress ||
      latestAtt?.clockInGpsAddress ||
      '';
    const districtRef = resolveGhanaPostGpsReference(resolvedGpsAddress);
    const networkService = resolveMobileNetworkService(u.phone);

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
    } else if (latestAtt?.clockInLatitude != null && latestAtt?.clockInLongitude != null) {
      latitude = Number(latestAtt.clockInLatitude);
      longitude = Number(latestAtt.clockInLongitude);
      source = 'LATEST_CLOCKIN_GPS';
      isLiveGps = true;
      lastUpdatedAt = latestAtt.clockInAt || u.updatedAt;
    } else if (districtRef) {
      latitude = districtRef.latitude;
      longitude = districtRef.longitude;
      source = 'GHANAPOST_DISTRICT_REFERENCE';
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
      ? `${resolvedGpsAddress}, ${districtRef?.districtCity || u.branch?.city || u.tenant?.city || 'Ghana'}`
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
      districtCity: districtRef?.districtCity || null,
      address: u.address || null,
      lastLoginIp: u.lastLoginIp || null,
      lastClockInAt: latestAtt?.clockInAt || null,
      networkService,
      isHidden: Boolean(u.isHidden || u.memberProfile?.isHidden || u.guarantorProfile?.isHidden),
      memberNumber: u.memberProfile?.memberNumber || null,
      employeeId: u.staffProfile?.employeeId || u.collectorProfile?.employeeId || null,
      tenantId: u.tenantId,
      tenantName: u.tenant?.name || 'GBS Institution',
      branchName: u.branch?.name || null,
      city: u.branch?.city || districtRef?.districtCity || u.tenant?.city || 'Accra',
      region: u.branch?.region || districtRef?.region || u.tenant?.region || 'Greater Accra',
      status: u.collectorProfile?.status || u.status || 'ACTIVE',
      source,
      isLiveGps,
      exactPhoneMatch,
      exactGpsAddressMatch,
      lastUpdatedAt,
      coordinates: latitude != null && longitude != null ? { latitude, longitude } : null,
      ...buildGoogleMapUrls(latitude, longitude, fallbackGeoQuery),
    };
  });

  matches.sort((a, b) => {
    if (a.exactPhoneMatch !== b.exactPhoneMatch) return a.exactPhoneMatch ? -1 : 1;
    if (a.exactGpsAddressMatch !== b.exactGpsAddressMatch) return a.exactGpsAddressMatch ? -1 : 1;
    if (a.isLiveGps !== b.isLiveGps) return a.isLiveGps ? -1 : 1;
    return new Date(b.lastUpdatedAt || 0) - new Date(a.lastUpdatedAt || 0);
  });

  // Also synthesize standalone reference pin when query is an unregistered GhanaPost code or phone prefix
  let standaloneReference = null;
  if (matches.length === 0) {
    if (queryGpsReference) {
      standaloneReference = {
        id: `ghanapost-${queryGpsReference.gpsAddress}`,
        type: 'GHANAPOST_AREA',
        entityType: 'GPS_ADDRESS_AREA',
        name: `GhanaPost Area ${queryGpsReference.gpsAddress} (${queryGpsReference.districtCity})`,
        gpsAddress: queryGpsReference.gpsAddress,
        city: queryGpsReference.districtCity,
        region: queryGpsReference.region,
        source: 'GHANAPOST_DISTRICT_REFERENCE',
        isLiveGps: false,
        coordinates: { latitude: queryGpsReference.latitude, longitude: queryGpsReference.longitude },
        ...buildGoogleMapUrls(queryGpsReference.latitude, queryGpsReference.longitude, `${queryGpsReference.gpsAddress}, ${queryGpsReference.districtCity}, Ghana`),
      };
    } else if (queryNetworkService?.networkHubCoordinates) {
      standaloneReference = {
        id: `carrier-${queryNetworkService.shortCode}`,
        type: 'NETWORK_SERVICE',
        entityType: 'CARRIER_SERVICE_HUB',
        name: `${queryNetworkService.operator} — ${queryNetworkService.normalizedPhone}`,
        phone: queryNetworkService.normalizedPhone,
        networkService: queryNetworkService,
        city: 'Accra',
        region: 'Greater Accra',
        source: 'MOBILE_NETWORK_CARRIER_HUB',
        isLiveGps: false,
        coordinates: queryNetworkService.networkHubCoordinates,
        ...buildGoogleMapUrls(queryNetworkService.networkHubCoordinates.latitude, queryNetworkService.networkHubCoordinates.longitude),
      };
    }
  }

  return {
    query: q,
    totalMatches: matches.length,
    primaryMatch: matches[0] || null,
    matches,
    queryNetworkService,
    queryGpsReference,
    standaloneReference,
  };
}

module.exports = {
  updateLocation, batchSync, getTrackingData,
  grantConsent, revokeConsent,
  shareMyLocation, locateByPhone, emergencyLocate,
  buildPhoneSearchVariants, buildGoogleMapUrls,
  resolveMobileNetworkService, resolveGhanaPostGpsReference,
};
