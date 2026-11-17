# GBS LOAN MANAGEMENT SYSTEM — MASTER DEVELOPMENT & ARCHITECTURE MEMORY

> **Permanent System Record**  
> This document records the complete architecture, development history, production data safeguards, API standards, navigation structure, security rules, and cloud deployment configuration of the **GBS Loan Management System**.

---

## 1. Core System Identity & Non-Negotiable Standards

1. **System Identity:**  
   Strictly an **Enterprise Fintech Microfinance & Loan Management System** (**GBS LOAN MANAGEMENT SYSTEM** — *"Smart Loans, Secure Future"*). All educational/school terminology has been permanently purged (0 occurrences in `Frontend/src` and `Backend/src`).
2. **Engineering Stack:**  
   Conventional enterprise software engineering: Node.js (CommonJS), Express.js, Prisma ORM, PostgreSQL, Socket.io, React 18, Vite, Recharts, and Leaflet GIS.
3. **Preserved Visual & Photographic Design:**  
   - Signature dark navy (`#060C18`, `#0A1426`) and brushed gold (`#D4AF37`, `#F4E07B`) glassmorphism aesthetic.
   - All **62 real high-resolution photography assets** (`dash-*.jpg` and `login-*.jpg`) in `Frontend/public/images/roles/` are preserved and wired across all **29 canonical roles** plus the **Hidden Developer Control Center**.
4. **Zero-Mock Production Rule:**  
   Every dashboard connects to live PostgreSQL records. Empty states display `0` statistics and `"No records available."` instead of hardcoded dummy data.

---

## 2. Protected Production Records & Data Provenance

| Record Type | Identifier / Code | Owner / Identity | Provenance Classification | Protection Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Genuine Production Institution** | **`TNT-6724`** (`GBS-INS-92292`) | **DE BRAIN**<br>Owner: **Gabriel Osei-Appiah Kubi**<br>Email: `oseiappiahgabrielkubi@gmail.com`<br>Phone: `0554594193` | `isProductionRecord: true`<br>`dataSource: 'PRODUCTION_LIVE'`<br>`environmentTag: 'PRODUCTION'` | **NEVER delete, reset, or classify as sample data.** |
| **Lead Developer Authority** | **`usr-dev-2026`** | **Lead Developer**<br>Email: `gabosei48@gmail.com`<br>Role: `LEAD_DEVELOPER` | Permanent Landlord Account | Synchronized on boot across all environments. |
| **Demo Walkthrough Sandbox** | **`DEMO-SANDBOX`** (`GBS-DEMO-SANDBOX`) | Isolated Training Sandbox | `isProductionRecord: false`<br>`dataSource: 'DEVELOPMENT_SEED'` | Strictly segregated from live production via `auth.js` environment partition checks. |
| **Database Safety Backup** | `backups/gbs_loan_2026-11-17T16-29-27-945Z.sql` | Full PostgreSQL `pg_dump` (838,660 bytes) | Verified Snapshot | Preserved before production activation. |

---

## 3. GBS Central System Response, Control and Communication Engine (GBS-RCCE)

Located in `Backend/src/framework/rcce/` and designed to be reusable across all GBS enterprise systems:

* **`responseCatalog.js`:** Predefined dictionary of operation codes (`OPERATION_SUCCESS`, `AUTH_LOGIN_SUCCESS`, `MISSING_INFORMATION`, `AUTH_FORBIDDEN`, `RECORD_FOUND`, `RECORD_CREATED`, `RECORD_UPDATED`, `PAYMENT_RECEIVED`, `LOAN_DISBURSED`, `ONBOARDING_APPROVED`, `SYSTEM_LOCKED`, `ROUTE_NOT_FOUND`).
* **`responseEngine.js`:** Global middleware enforcing the **7-field JSON response contract** on every endpoint:
  ```json
  {
    "success": true,
    "code": "OPERATION_SUCCESS",
    "message": "Operation completed successfully.",
    "data": {},
    "errors": null,
    "timestamp": "2026-11-17T19:32:57.655Z",
    "requestId": "req_eb9dbb7fdc3e417e"
  }
  ```
* **`businessRules.js`:**
  * Validates **Ghana Card** format (`GHA-XXXXXXXXX-X`).
  * Validates **Ghana 10-digit mobile** (`024...`, `055...`) and international **`+233`** phone numbers.
  * Validates positive financial amounts (`> 0`).
  * Enforces **Idempotency Protection** (`X-Idempotency-Key` TTL cache) to prevent duplicate loan applications or double payment charges.
* **`eventEngine.js`:** Dispatches real-time Socket.io events (`emitToTenant`, `emitToDeveloper`) and persists in-app notifications in PostgreSQL.
* **`auditEngine.js`:** Writes immutable audit records to PostgreSQL `AuditLog` (tenant operations) and `DeveloperAuditLog` (landlord operations).

---

## 4. Universal Page Navigation & Dedicated Detail Routes

Every command, card, and table row across all dashboards opens a dedicated full page with its own URL and a persistent top-left `<BackButtonBar />` that restores the previous tab, search query, and filter state:

### A. Tenant & Institutional Dashboards (`Frontend/src/pages/DetailPages.jsx`)
* `/loans/:id` — `LoanDetailPage`: Full loan file, amortized schedule, underwriting review, approval, and 2FA disbursement.
* `/members/:id` — `MemberDetailPage`: Borrower KYC dossier, Ghana Card, live photo, GPS address, and active loans.
* `/payments/:id` — `PaymentDetailPage`: Repayment receipt, MoMo/Bank/Cash breakdown, and teller reconciliation.
* `/staff/:id` — `StaffDetailPage`: Staff profile, qualification verification, HR salary grade/step, and department.
* `/collectors/:id` — `CollectorDetailPage`: Field agent profile, GPS waypoints, speed telemetry, and assigned zone.
* `/guarantors/:id` — `GuarantorDetailPage`: Guarantor surety file, signed agreement status, and backed loans.
* `/tenants/:id` — `TenantDetailPage`: Institution profile, registration/license/TIN, GPS coordinates, and branches.
* `/reports/:id` — `ReportDetailPage`: Wrapped Weekly/Monthly/Yearly financial snapshot and CSV export.
* `/meetings/:id` — `MeetingDetailPage`: Scheduled online meeting details, host info, and Zoom join link.

### B. Hidden Developer Control Center (`Frontend/src/pages/DeveloperDetailPages.jsx`)
* `/dev-portal/tenants/:id` — `DeveloperTenantDetailPage`: Full regulatory dossier, approve 1-month trial, reject, lock/unlock (+30d), apply subscription tier, and direct tenant messaging.
* `/dev-portal/users/:id` — `DeveloperUserDetailPage`: System user identity, biometrics status, login history, and provenance.
* `/dev-portal/subscriptions/:id` — `DeveloperSubscriptionDetailPage`: Subscription tier, pricing, validity countdown, and payment reference.
* `/dev-portal/activities/:id` — `DeveloperActivityDetailPage`: Full JSON payload inspection of any system or developer audit event.
* `/dev-portal/security-alerts/:id` — `DeveloperSecurityAlertDetailPage`: Threat severity, trigger IP, and one-click resolution.

---

## 5. Mandatory GPS Address & CCTV Stream Verification

1. **Mandatory Digital GPS Address & Live Geolocation:**
   * Public registration (`Frontend/src/pages/Login.jsx`) and dashboard registration forms (`Frontend/src/dashboards/RoleDashboards.jsx`) require `gpsAddress` (e.g., `GA-183-8164`) and provide a one-click **`Detect GPS`** button (`navigator.geolocation`) that populates `gpsLatitude` and `gpsLongitude` into PostgreSQL (`User`, `Member`, `Guarantor`, `Staff`).
2. **CCTV Camera Mobile Linking, Stream Testing & Audit Storage:**
   * Backend endpoint `POST /api/v1/enterprise/cctv/:id/test` (`Backend/src/services/cctv.service.js`) validates `HTTP`/`HTTPS`/`HLS`/`MP4`/`RTSP` camera streams, measures latency, updates camera status, and records an immutable `AuditLog` entry (`entityType: 'CctvCamera'`, `event: 'CCTV_STREAM_VERIFIED'`).
   * Frontend `Frontend/src/components/CctvMobilePanel.jsx` provides a **`Test & Display`** button on every camera row, an inline **Live Camera Monitor** (`<video>`, `<img>`, or NVR player), QR code generation for Company Owner mobile viewing (`/cctv-mobile`), and a **`Store Verification Record`** button.

---

## 6. Multi-Tenant Isolation, RBAC & Deployment Pipeline

* **Three-Layer Security Enforcement:**
  1. **Frontend Role Filtering:** `ROLES_META` and `resolveRoleCapabilities` mount only authorized tabs and actions per role.
  2. **Backend Anti-Spoofing & RBAC:** `Backend/src/middleware/auth.js` blocks cross-tenant `x-tenant-id` header spoofing with `HTTP 403 TENANT_ISOLATION_VIOLATION`. `Backend/src/middleware/rbac.js` enforces role permissions (`companyOwnerOnly`, `managementAndAbove`, `creditTeam`, `financeTeam`, `fieldTeam`, `securityAndAudit`).
  3. **Database Query Scoping:** Every service query filters by `tenantId` (and `userId` for self-service Member/Guarantor portals).
* **Local Execution Ports:**
  * Backend API & Production SPA: `http://localhost:5005` (`/api/v1`, `/api/v1/health`)
  * Frontend Vite Dev Server: `http://localhost:3005`
* **GitHub & Render Continuous Deployment:**
  * GitHub Repository: `https://github.com/A1-ul/gbs-loan-system.git` (branch `main`, official email `gabosei48@gmail.com`)
  * Render Cloud Service: `https://gbs-loan-system.onrender.com` (`autoDeploy: true` via `render.yaml`)
