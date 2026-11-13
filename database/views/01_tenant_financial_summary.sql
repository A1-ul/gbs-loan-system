-- GBS LOAN MANAGEMENT SYSTEM - Tenant Financial Summary View
-- PostgreSQL Analytics View

CREATE OR REPLACE VIEW vw_tenant_financial_summary AS
SELECT 
    t."id" AS tenant_id,
    t."name" AS tenant_name,
    COUNT(DISTINCT l."id") AS total_loans,
    COALESCE(SUM(l."principalAmount"), 0) AS total_principal_disbursed,
    COALESCE(SUM(p."amount"), 0) AS total_repayments_collected,
    (COALESCE(SUM(l."principalAmount"), 0) - COALESCE(SUM(p."amount"), 0)) AS outstanding_balance
FROM "Tenant" t
LEFT JOIN "Loan" l ON t."id" = l."tenantId"
LEFT JOIN "Payment" p ON l."id" = p."loanId" AND p."status" = 'COMPLETED'
GROUP BY t."id", t."name";
