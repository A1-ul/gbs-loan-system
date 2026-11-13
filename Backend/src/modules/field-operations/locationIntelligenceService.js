/**
 * GBS LOAN MANAGEMENT SYSTEM - Location Intelligence & GPS Tracking Service
 * CommonJS Production Field Operations Location Engine
 */

const logger = require('../../utils/logger');

class LocationIntelligenceService {
  /**
   * Log collector GPS position update
   * @param {Object} locationData 
   */
  static logCollectorGPS({ collectorId, latitude, longitude, speed, batteryLevel }) {
    if (!collectorId || latitude === undefined || longitude === undefined) {
      throw new Error('Collector ID, latitude and longitude are required');
    }

    const logEntry = {
      collectorId,
      coordinates: { latitude, longitude },
      speed: speed || 0,
      batteryLevel: batteryLevel || 100,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Collector GPS updated: ${collectorId} Lat: ${latitude} Lng: ${longitude}`);
    return logEntry;
  }

  /**
   * Check if collector coordinates breach designated safe zone / geofence
   * @param {Object} coords 
   * @param {Object} geofence 
   */
  static checkGeofenceBreach(coords, geofence = { centerLat: 5.6037, centerLng: -0.187, radiusKm: 15 }) {
    // Haversine distance calculation
    const R = 6371; // Earth radius in km
    const dLat = (coords.latitude - geofence.centerLat) * (Math.PI / 180);
    const dLng = (coords.longitude - geofence.centerLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(geofence.centerLat * (Math.PI / 180)) *
        Math.cos(coords.latitude * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    const breached = distanceKm > geofence.radiusKm;

    if (breached) {
      logger.warn(`GEOFENCE ALERT: Collector outside safe zone. Distance: ${distanceKm.toFixed(2)} km`);
    }

    return {
      breached,
      distanceFromCenterKm: parseFloat(distanceKm.toFixed(2)),
      allowedRadiusKm: geofence.radiusKm,
    };
  }
}

module.exports = LocationIntelligenceService;
