-- GBS LOAN MANAGEMENT SYSTEM - Loan Penalty Calculation Function
-- PostgreSQL Stored Function

CREATE OR REPLACE FUNCTION fn_calculate_loan_penalty(
    p_loan_id UUID,
    p_days_overdue INT,
    p_daily_penalty_rate NUMERIC DEFAULT 0.005 -- 0.5% daily
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_principal NUMERIC;
    v_penalty NUMERIC := 0;
BEGIN
    SELECT "principalAmount" INTO v_principal
    FROM "Loan"
    WHERE "id" = p_loan_id;

    IF v_principal IS NULL THEN
        RETURN 0;
    END IF;

    IF p_days_overdue > 0 THEN
        v_penalty := v_principal * p_daily_penalty_rate * p_days_overdue;
    END IF;

    RETURN ROUND(v_penalty, 2);
END;
$$;
