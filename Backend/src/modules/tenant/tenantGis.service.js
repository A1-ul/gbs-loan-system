/**
 * GBS LOAN MANAGEMENT SYSTEM - MULTI-TENANT GIS TRACKING SERVICE
 * Live Geographical Telemetry: Tenant HQs, Branches, Field Collectors, Customer Visits & Geofences
 * Standard: Node.js CommonJS
 */

const { prisma } = require('../../config/database');

class TenantGisService {
  /**
   * Fetch all live GIS coordinates across tenants, branches, field collectors, and customer visits
   */
  async getAllTenantGisLocations() {
    const [tenants, collectors, visits] = await Promise.all([
      prisma.tenant.findMany({
        where: { code: { not: 'DEMO-SANDBOX' } },
        include: {
          branches: true,
          locations: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.collector.findMany({
        where: { isActive: true, tenant: { code: { not: 'DEMO-SANDBOX' } } },
        include: {
          tenant: { select: { id: true, code: true, name: true } },
          user: { select: { firstName: true, lastName: true, phone: true } },
        },
      }),
      prisma.customerVisit.findMany({
        where: { collector: { tenant: { code: { not: 'DEMO-SANDBOX' } } } },
        orderBy: { visitedAt: 'desc' },
        take: 40,
        include: {
          collector: {
            select: {
              employeeId: true,
              tenant: { select: { id: true, code: true, name: true } },
            },
          },
        },
      }),
    ]);

    const gisFeatures = [];

    for (const tenant of tenants) {
      if (tenant.latitude && tenant.longitude) {
        gisFeatures.push({
          type: 'TENANT_HQ',
          tenantId: tenant.id,
          tenantCode: tenant.code,
          tenantName: tenant.name,
          tenantStatus: tenant.status,
          onboardingStatus: tenant.onboardingStatus,
          id: `hq-${tenant.id}`,
          name: `${tenant.name} (HQ)`,
          region: tenant.region,
          city: tenant.city,
          daysLeft: tenant.daysLeft,
          coordinates: {
            latitude: parseFloat(tenant.latitude),
            longitude: parseFloat(tenant.longitude),
          },
          geofenceRadius: 1000,
          status: tenant.status,
        });
      }

      for (const branch of tenant.branches) {
        if (branch.latitude && branch.longitude) {
          gisFeatures.push({
            type: 'BRANCH',
            tenantId: tenant.id,
            tenantCode: tenant.code,
            tenantName: tenant.name,
            tenantStatus: tenant.status,
            id: branch.id,
            code: branch.code,
            name: branch.name,
            branchType: branch.type,
            isMain: branch.isMain,
            region: branch.region,
            city: branch.city,
            coordinates: {
              latitude: parseFloat(branch.latitude),
              longitude: parseFloat(branch.longitude),
            },
            geofenceRadius: branch.geofenceRadius || 500,
            status: branch.status,
          });
        }
      }
    }

    for (const col of collectors) {
      if (col.lastLatitude && col.lastLongitude) {
        gisFeatures.push({
          type: 'COLLECTOR',
          tenantId: col.tenantId,
          tenantCode: col.tenant?.code || 'N/A',
          tenantName: col.tenant?.name || 'GBS Field Operations',
          id: col.id,
          code: col.employeeId,
          name: `${col.user?.firstName || 'Collector'} ${col.user?.lastName || ''}`.trim(),
          phone: col.user?.phone,
          assignedZone: col.assignedZone,
          lastSpeed: col.lastSpeed || 0,
          lastLocationAt: col.lastLocationAt,
          coordinates: {
            latitude: parseFloat(col.lastLatitude),
            longitude: parseFloat(col.lastLongitude),
          },
          status: col.status,
        });
      }
    }

    for (const v of visits) {
      if (v.latitude && v.longitude) {
        gisFeatures.push({
          type: 'CUSTOMER_VISIT',
          tenantId: v.tenantId,
          tenantCode: v.collector?.tenant?.code || 'N/A',
          tenantName: v.collector?.tenant?.name || 'Customer Site',
          id: v.id,
          name: `Customer Visit: ${v.customerName} (${v.visitOutcome})`,
          purpose: v.visitOutcome,
          notes: v.notes,
          visitedAt: v.visitedAt,
          coordinates: {
            latitude: parseFloat(v.latitude),
            longitude: parseFloat(v.longitude),
          },
          status: v.visitOutcome || 'VERIFIED',
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      totalTenantsMapped: tenants.length,
      totalCollectorsMapped: collectors.filter((c) => c.lastLatitude && c.lastLongitude).length,
      totalVisitsMapped: visits.length,
      totalGisPoints: gisFeatures.length,
      features: gisFeatures,
    };
  }

  /**
   * Record or update GIS telemetry coordinates for a branch or tenant location
   */
  async recordLocation(tenantId, locationData) {
    const { branchId, name, latitude, longitude, region, city, address, isHQ = false } = locationData;

    const loc = await prisma.tenantLocation.create({
      data: {
        tenantId,
        branchId: branchId || null,
        name: name || 'Branch Coordinates',
        branchName: name || 'Branch Coordinates',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        region: region || 'Greater Accra',
        city: city || 'Accra',
        address: address || null,
        isHQ,
        status: 'ACTIVE',
      },
    });

    return loc;
  }
}

module.exports = new TenantGisService();
