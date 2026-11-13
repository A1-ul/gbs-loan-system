const crypto = require('crypto');
const QRCode = require('qrcode');
const config = require('../config');
const { prisma } = require('../config/database');
const { NotFoundError, ValidationError, AuthorizationError } = require('../utils/errors');

function normalizeStreamUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  if (!/^(https?|rtsp|rtsps|ws|wss):\/\//i.test(value)) {
    throw new ValidationError('Camera stream URL must start with http://, https://, rtsp://, or ws://');
  }
  return value;
}

function deriveMobileToken(cameraId, pairingCode) {
  const secret = config.jwt?.secret || process.env.JWT_SECRET || 'gbs-cctv-secret-key';
  return crypto.createHmac('sha256', secret).update(`${cameraId}:${pairingCode}`).digest('hex').slice(0, 32);
}

async function formatCameraWithQr(cam, branchMap = null, originUrl = '') {
  const baseOrigin = String(originUrl || '').replace(/\/$/, '') || '';
  const watchPath = cam.mobileLinkUrl || `${baseOrigin}/cctv-mobile?camera=${cam.id}&code=${encodeURIComponent(cam.pairingCode)}&token=${encodeURIComponent(deriveMobileToken(cam.id, cam.pairingCode))}`;
  const qrPayload = watchPath.startsWith('http') ? watchPath : (baseOrigin ? `${baseOrigin}${watchPath.startsWith('/') ? '' : '/'}${watchPath}` : watchPath);

  const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 240,
    color: { dark: '#1B0E12', light: '#FFFFFF' },
  }).catch(() => null);

  const branch = cam.branchId && branchMap ? branchMap.get(cam.branchId) || null : null;

  return {
    ...cam,
    locationLabel: cam.cameraLocation || 'Main Vault & Teller Hall',
    isActive: cam.status === 'ONLINE',
    mobileWatchUrl: qrPayload,
    qrCodeDataUrl,
    branch,
  };
}

class CctvService {
  async listCameras(tenantId, originUrl = '') {
    if (!tenantId) return [];
    const [cameras, branches] = await Promise.all([
      prisma.cctvCamera.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.branch.findMany({
        where: { tenantId },
        select: { id: true, name: true, city: true },
      }),
    ]);

    const branchMap = new Map(branches.map((b) => [b.id, b]));
    return Promise.all(cameras.map((cam) => formatCameraWithQr(cam, branchMap, originUrl)));
  }

  async registerCamera(tenantId, ownerUser, { name, branchId = null, locationLabel = '', cameraLocation = '', streamUrl = '', originUrl = '' } = {}) {
    if (!tenantId) throw new ValidationError('Tenant context required to register CCTV camera');
    if (!name || String(name).trim().length < 2) {
      throw new ValidationError('Camera name is required (at least 2 characters)');
    }

    const cleanUrl = normalizeStreamUrl(streamUrl);
    if (!cleanUrl) {
      throw new ValidationError('Camera stream or NVR/IP feed URL is required');
    }

    const pairingCode = `GBS-CAM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const created = await prisma.cctvCamera.create({
      data: {
        tenantId,
        branchId: branchId || null,
        name: String(name).trim(),
        cameraLocation: String(locationLabel || cameraLocation || 'Main Vault & Teller Hall').trim(),
        streamUrl: cleanUrl,
        pairingCode,
        status: 'ONLINE',
        addedById: ownerUser?.id || null,
      },
    });

    const token = deriveMobileToken(created.id, pairingCode);
    const baseOrigin = String(originUrl || '').replace(/\/$/, '') || '';
    const mobileWatchUrl = `${baseOrigin}/cctv-mobile?camera=${created.id}&code=${encodeURIComponent(pairingCode)}&token=${encodeURIComponent(token)}`;

    const updated = await prisma.cctvCamera.update({
      where: { id: created.id },
      data: { mobileLinkUrl: mobileWatchUrl },
    });

    const branches = created.branchId
      ? await prisma.branch.findMany({ where: { id: created.branchId }, select: { id: true, name: true, city: true } })
      : [];
    const branchMap = new Map(branches.map((b) => [b.id, b]));

    return formatCameraWithQr(updated, branchMap, originUrl);
  }

  async toggleCameraStatus(id, tenantId, isActive) {
    const cam = await prisma.cctvCamera.findUnique({ where: { id } });
    if (!cam) throw new NotFoundError('CCTV Camera');
    if (tenantId && cam.tenantId !== tenantId) throw new AuthorizationError('Cross-tenant camera access denied');

    const updated = await prisma.cctvCamera.update({
      where: { id },
      data: { status: Boolean(isActive) ? 'ONLINE' : 'OFFLINE' },
    });

    return formatCameraWithQr(updated);
  }

  async regenerateMobileLink(id, tenantId, originUrl = '') {
    const cam = await prisma.cctvCamera.findUnique({ where: { id } });
    if (!cam) throw new NotFoundError('CCTV Camera');
    if (tenantId && cam.tenantId !== tenantId) throw new AuthorizationError('Cross-tenant camera access denied');

    const pairingCode = `GBS-CAM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const token = deriveMobileToken(cam.id, pairingCode);
    const baseOrigin = String(originUrl || '').replace(/\/$/, '') || '';
    const mobileWatchUrl = `${baseOrigin}/cctv-mobile?camera=${cam.id}&code=${encodeURIComponent(pairingCode)}&token=${encodeURIComponent(token)}`;

    const updated = await prisma.cctvCamera.update({
      where: { id },
      data: { pairingCode, mobileLinkUrl: mobileWatchUrl },
    });

    return formatCameraWithQr(updated, null, originUrl);
  }

  async deleteCamera(id, tenantId) {
    const cam = await prisma.cctvCamera.findUnique({ where: { id } });
    if (!cam) throw new NotFoundError('CCTV Camera');
    if (tenantId && cam.tenantId !== tenantId) throw new AuthorizationError('Cross-tenant camera access denied');

    await prisma.cctvCamera.delete({ where: { id } });
    return { deleted: true, id };
  }

  async verifyMobileAccess({ cameraId, code, token }) {
    const cleanCode = code ? String(code).trim().toUpperCase() : null;
    const cam = await prisma.cctvCamera.findFirst({
      where: {
        OR: [
          ...(cameraId ? [{ id: cameraId }] : []),
          ...(cleanCode ? [{ pairingCode: cleanCode }] : []),
        ],
      },
      include: {
        tenant: { select: { id: true, name: true, logoUrl: true } },
      },
    });
    if (!cam) throw new NotFoundError('CCTV Camera');
    if (cam.status !== 'ONLINE') {
      throw new AuthorizationError('This CCTV camera feed is currently disabled by Company Owner.');
    }

    const expectedToken = deriveMobileToken(cam.id, cam.pairingCode);
    const tokenMatches = Boolean(token && token === expectedToken);
    const codeMatches = Boolean(cleanCode && cam.pairingCode === cleanCode);
    if (!tokenMatches && !codeMatches) {
      throw new AuthorizationError('Invalid CCTV mobile pairing code or token.');
    }

    const branch = cam.branchId
      ? await prisma.branch.findUnique({ where: { id: cam.branchId }, select: { id: true, name: true, city: true } })
      : null;

    return {
      id: cam.id,
      name: cam.name,
      locationLabel: cam.cameraLocation,
      cameraLocation: cam.cameraLocation,
      streamUrl: cam.streamUrl,
      pairingCode: cam.pairingCode,
      isActive: cam.status === 'ONLINE',
      status: cam.status,
      tenant: cam.tenant,
      branch,
      lastLinkedAt: new Date(),
    };
  }
}

module.exports = new CctvService();
