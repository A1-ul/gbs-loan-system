# GBS Enterprise Development Methodology — Master Build Command (Step 6)

## Master AI Build Command Instruction
When building any GBS enterprise system (Banking, Hospital, School, Hotel, Loan Management), every coding agent MUST follow this exact Master Command:

```text
EXECUTE GBS_ENTERPRISE_BUILD:
1. LOAD GBS ENTERPRISE FRAMEWORK (Build Once):
   - Architecture: Backend/src/framework/architecture/
   - Security & Biometrics: Backend/src/framework/security/
   - Authentication & JWT: Backend/src/framework/authentication/
   - RBAC & Permissions: Backend/src/framework/rbac/
   - Notifications Engine: Backend/src/framework/notifications/
   - Audit & Compliance: Backend/src/framework/audit/
   - Monitoring & Telemetry: Backend/src/framework/monitoring/
   - DevOps & CI/CD: Backend/src/framework/devops/
   - API Gateway & Rate Limiting: Backend/src/framework/gateway/
   - AI Services & Predictive Scoring: Backend/src/framework/ai/
   - Shared Services & Cache/Exports: Backend/src/framework/shared/
   - Developer Platform & Control Center: Backend/src/framework/developer/
   - Coding Standards & Conventions: Backend/src/framework/standards/

2. CONSTRUCT BACKEND STRUCTURE:
   Create all 13 backend directories in Backend/src/:
   apis, controllers, services, repositories, middleware, jobs, queues, events, config, security, monitoring, tests, docs.

3. CONSTRUCT FRONTEND STRUCTURE:
   Create all 11 frontend directories in Frontend/src/:
   pages, dashboards, components, layouts, routes, hooks, state, services, assets, themes, tests.
   Enforce strict domain isolation: never place generic/copied loan files in other domain folders.

4. DESIGN DATABASE STRUCTURE:
   Create all 9 database layers in database/:
   erd, tables, relationships, constraints, indexes, migrations, seeders, audit-tables, history-tables.
   Ensure every folder contains complete DDL SQL files and non-empty metadata.

5. CONSTRUCT DEVELOPER PLATFORM STRUCTURE:
   Create the 12 hidden Developer Control Center pillars in Backend/src/modules/developer-platform/:
   remote-monitoring, live-diagnostics, crash-reports, system-lock, subscription-control, deployment-history, logs, performance, backup-restore, recovery, security-alerts, tenant-management.

6. BLUEPRINT REVIEW & ISOLATION:
   Extract ONLY system-specific business modules from blueprint. For Loan System:
   Members, Loans, Payments, Collectors, Guarantors, Reports, Staff, Meetings, Multi-Tenant.
   Inherit everything else directly from the Enterprise Framework.

7. VALIDATION PROTOCOL:
   Verify 100% compliance: zero empty folders, zero duplicate files, all routes connected, all tests passing, zero compilation errors.
```
