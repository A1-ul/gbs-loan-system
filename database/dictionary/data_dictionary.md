# GBS Loan Management System - Database Data Dictionary

## 1. Core Business Entities
| Table Name | Description | Primary Key | Foreign Keys |
| :--- | :--- | :--- | :--- |
| **users** | System user accounts, credentials, and roles | `id` (UUID) | `tenantId` |
| **members** | Registered loan borrowers, KYC, biometric & contact data | `id` (UUID) | `userId`, `tenantId` |
| **loans** | Loan applications, approved amounts, interest, terms, status | `id` (UUID) | `memberId`, `officerId`, `tenantId` |
| **repayments** | Scheduled and completed repayment installments | `id` (UUID) | `loanId`, `tenantId` |
| **payments** | Inbound payment transactions (MoMo, Bank, Cash) | `id` (UUID) | `loanId`, `memberId`, `recordedById` |
| **guarantors** | Loan guarantors, agreements, collateral details | `id` (UUID) | `loanId`, `memberId`, `tenantId` |
| **staff** | Internal staff directory, department, compensation | `id` (UUID) | `userId`, `branchId`, `tenantId` |
| **notifications** | SMS, Email, and Push notifications dispatched | `id` (UUID) | `recipientId`, `tenantId` |
| **audit_logs** | Immutable audit trail for all operational and security actions | `id` (UUID) | `userId`, `tenantId` |
| **tenants** | Multi-tenant organization accounts, custom branding, and settings | `id` (UUID) | None |

## 2. Integrity Constraints & Foreign Keys
- All monetary amounts use high-precision decimals (`DECIMAL(14, 2)`).
- Status changes are logged with user ID and timestamp in audit tables.
- Hard delete is strictly forbidden for loans, payments, and members (use soft-delete with `deletedAt`).
