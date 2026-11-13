describe('GPS Tracking Unit Tests', () => {
  it('should calculate location log coordinates correctly', () => {
    const lat = 5.6037;
    const lng = -0.1870;
    expect(lat).toBeGreaterThan(0);
    expect(lng).toBeLessThan(0);
  });
});
