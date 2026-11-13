-- GBS LOAN MANAGEMENT SYSTEM - Process MoMo Disbursement Procedure
-- PostgreSQL Stored Procedure

CREATE OR REPLACE PROCEDURE sp_process_momo_disbursement(
    p_loan_id UUID,
    p_amount NUMERIC,
    p_phone_number VARCHAR,
    p_momo_tx_id VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update Loan Status to DISBURSED
    UPDATE "Loan"
    SET "status" = 'DISBURSED',
        "disbursedAt" = NOW()
    WHERE "id" = p_loan_id;

    -- Record Transaction Entry
    INSERT INTO "Payment" (
        "id",
        "loanId",
        "amount",
        "paymentMethod",
        "momoTransactionId",
        "status",
        "createdAt"
    ) VALUES (
        gen_random_uuid(),
        p_loan_id,
        p_amount,
        'MTN_MOMO',
        p_momo_tx_id,
        'COMPLETED',
        NOW()
    );
END;
$$;
