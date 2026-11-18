const {
  resolveMobileNetworkService,
  resolveGhanaPostGpsReference,
  buildPhoneSearchVariants,
  buildGoogleMapUrls,
} = require('../../services/gps.service');

describe('GPS Tracking, GhanaPost Reference & Mobile Network Service Unit Tests', () => {
  it('resolves Ghana Mobile Network Service Providers and core exchange coordinates accurately', () => {
    const mtn = resolveMobileNetworkService('0244123456');
    expect(mtn).toBeDefined();
    expect(mtn.shortCode).toBe('MTN');
    expect(mtn.operator).toContain('MTN Ghana');
    expect(mtn.momoRail).toBe('MTN MoMo');
    expect(mtn.normalizedPhone).toBe('+233244123456');
    expect(mtn.networkHubCoordinates.latitude).toBeGreaterThan(5);

    const telecel = resolveMobileNetworkService('+233501234567');
    expect(telecel.shortCode).toBe('TELECEL');
    expect(telecel.operator).toContain('Telecel');
    expect(telecel.momoRail).toBe('Telecel Cash');

    const at = resolveMobileNetworkService('0269876543');
    expect(at.shortCode).toBe('AT');
    expect(at.momoRail).toBe('AT Money');

    expect(resolveMobileNetworkService('AK-448-9012')).toBeNull();
    expect(resolveMobileNetworkService('GA-183-8164')).toBeNull();
  });

  it('resolves GhanaPost Digital GPS Address district coordinates cleanly', () => {
    const accra = resolveGhanaPostGpsReference('GA-183-8164');
    expect(accra).toBeDefined();
    expect(accra.gpsAddress).toBe('GA-183-8164');
    expect(accra.region).toBe('Greater Accra');
    expect(accra.latitude).toBeCloseTo(5.56, 2);

    const kumasi = resolveGhanaPostGpsReference('ak-448-9012');
    expect(kumasi).toBeDefined();
    expect(kumasi.gpsAddress).toBe('AK-448-9012');
    expect(kumasi.region).toBe('Ashanti');
    expect(kumasi.city || kumasi.districtCity).toContain('Kumasi');

    expect(resolveGhanaPostGpsReference('invalid-code')).toBeNull();
  });

  it('builds phone search variants and valid Google Maps embed + directions URLs', () => {
    const variants = buildPhoneSearchVariants('0244123456');
    expect(variants).toContain('+233244123456');
    expect(variants).toContain('244123456');

    const urls = buildGoogleMapUrls(5.6037, -0.1870);
    expect(urls.googleMapsUrl).toContain('5.6037,-0.187');
    expect(urls.googleMapsEmbedUrl).toContain('output=embed');
    expect(urls.googleDirectionsUrl).toContain('destination=5.6037,-0.187');
  });
});
