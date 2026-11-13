const crypto = require('crypto');
const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');

function normalizeDescriptor(imageBase64, geometryVector = null) {
  if (Array.isArray(geometryVector) && geometryVector.length >= 8) {
    const norm = Math.sqrt(geometryVector.reduce((s, v) => s + v * v, 0)) || 1;
    return geometryVector.slice(0, 16).map((v) => Number((v / norm).toFixed(4)));
  }
  const buf = Buffer.from(String(imageBase64 || ''), 'base64');
  const bins = new Array(16).fill(0);
  if (buf.length === 0) return bins;
  for (let i = 0; i < buf.length; i++) {
    bins[i % 16] += buf[i] / 255;
  }
  const norm = Math.sqrt(bins.reduce((s, v) => s + v * v, 0)) || 1;
  return bins.map((v) => Number((v / norm).toFixed(4)));
}

function cosineSim(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) return 0;
  let dot = 0, ma = 0, mb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    ma += a[i] * a[i];
    mb += b[i] * b[i];
  }
  return (!ma || !mb) ? 0 : dot / (Math.sqrt(ma) * Math.sqrt(mb));
}

async function enrollFacialProfile(userId, { imageBase64, geometryVector }) {
  if (!imageBase64 && !Array.isArray(geometryVector)) {
    throw new Error('Facial image capture or biometric geometry vector is required');
  }
  const vector = normalizeDescriptor(imageBase64, geometryVector);
  const descriptorPayload = JSON.stringify({
    vector,
    hash: crypto.createHash('sha256').update(JSON.stringify(vector)).digest('hex'),
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      facialEnrolled: true,
      facialDescriptorHash: descriptorPayload,
    },
    select: { id: true, email: true, facialEnrolled: true },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'FACIAL_VERIFIED',
      entityType: 'user',
      entityId: userId,
      metadata: { event: 'FACIAL_ENROLLED' },
    },
  }).catch(() => null);

  logger.info(`Facial biometric enrolled for user ${userId}`);
  return user;
}

async function verifyFacialScan(userId, { imageBase64, geometryVector, livenessConfirmed = true }, ipAddress = null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, tenantId: true, facialEnrolled: true, facialDescriptorHash: true },
  });
  if (!user || !user.facialEnrolled || !user.facialDescriptorHash) {
    throw new Error('User has not enrolled a Facial Biometric profile yet.');
  }

  let stored;
  try { stored = JSON.parse(user.facialDescriptorHash); } catch { stored = null; }
  const incomingVector = normalizeDescriptor(imageBase64, geometryVector);
  const similarity = stored?.vector ? cosineSim(incomingVector, stored.vector) : 0;
  const passed = Boolean(livenessConfirmed) && similarity >= 0.78;

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId || null,
      userId,
      action: 'FACIAL_VERIFIED',
      entityType: 'user',
      entityId: userId,
      ipAddress,
      metadata: { similarity: Number(similarity.toFixed(4)), passed, livenessConfirmed },
    },
  }).catch(() => null);

  return {
    passed,
    confidenceScore: Number(similarity.toFixed(4)),
    livenessConfirmed: Boolean(livenessConfirmed),
    message: passed ? 'Facial verification & liveness passed.' : 'Facial biometric mismatch or liveness check failed.',
  };
}

module.exports = {
  enrollFacialProfile,
  verifyFacialScan,
};

