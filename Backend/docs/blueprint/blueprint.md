# GBS Loan Management System — Master Architecture & Specification

## System Overview
- **Product Name**: GBS Loan Management System
- **Tagline**: Smart Loans. Secure Future.
- **Architecture**: Universal GBS Enterprise Architecture (PostgreSQL + Express CommonJS + React/Vite)

## System Layers
1. **Client Layer**: Mobile Staff App, Member Portal, Desktop Administration.
2. **API Gateway**: Security, Rate Limiting, Load Balancing Routing.
3. **Application Layer**: Microservices, Business Logic, Routing, Processing.
4. **Services Layer**: Auth, Email, SMS, Voice, AWS Cloud Services.
5. **Data Layer**: PostgreSQL Database, Redis Caching, File Storage, Analytics Engine.
6. **Integration Layer**: Banks, MTN MoMo, Government Ghana Card API, Third-Party APIs.

## 30 Role-Based Dashboards & User Access
1. Super Admin Dashboard (System Administrators, Regional Managers)
2. Company Owner Dashboard (Executive Management)
3. Executive Management Dashboard (Branch Managers)
4. Regional Manager Dashboard (Operations Managers)
5. Branch Manager Dashboard (Credit Analysts)
6. Operations Manager Dashboard (Senior Credit Officers)
7. Loan Officer Dashboard (Loan Underwriters)
8. Senior Credit Officer Dashboard (Superintendents)
9. Credit Analyst Dashboard (Asset Administrators)
10. Loan Underwriter Dashboard (Refinancing Practitioners)
11. Collections Dashboard (Finance Managers)
12. Field Officer Dashboard (Treasury Officers)
13. Customer Service Dashboard (Accountants)
14. Reception Dashboard (HR Practitioners)
15. Guarantor Portal Dashboard (Internal Audit Directors)
16. Member Portal Dashboard (System Developers)
17. Accountant Dashboard (Security Officers)
18. Finance Manager Dashboard (Proxy Managers)
19. Treasury Dashboard (Fraud Investigators)
20. Human Resource Dashboard (Special Network Managers)
21. Legal Department Dashboard (Review Staff & Agents)
22. Compliance Dashboard (Credit Analysts)
23. Internal Audit Dashboard (Compliance Officers)
24. Risk Management Dashboard (Quality Controllers)
25. Fraud Investigation Dashboard (Branch Network Managers)
26. Security Operations Dashboard (Mobile Staff & Agents)
27. Marketing Dashboard
28. Investor Dashboard
29. Board-Only Executive Dashboard
30. Mobile Staff Dashboard

## Mandatory Enterprise Services
- **Voice Identity Verification**: Central security service (`/api/v1/voice-auth`).
- **HR Employee Salary Grouping**: Qualifications, salary grades, steps, service bands, salary profiles.
- **Developer Control Center & AI Assistant**: Remote diagnostics, system lock/unlock, backups (`/api/v1/developer`, `/api/v1/ai-developer`).
- **Migration Services**: Bulk import, validation engine, mapping, duplicate detection, queue processing (`/api/v1/migration`).
