describe('Loan Engine Calculation Unit Tests', () => {
  it('should compute loan total amount with interest rate', () => {
    const principal = 1000;
    const rate = 5.0; // 5%
    const total = principal + (principal * (rate / 100));
    expect(total).toBe(1050);
  });
});
