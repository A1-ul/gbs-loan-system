# GBS Backend Module Architecture Map

| Module Name | Route Prefix | Responsibility | CommonJS Export |
|---|---|---|---|
| Authentication & Security | `/api/v1/auth` | JWT, 2FA TOTP, Refresh Tokens, Session handling | `module.exports` |
| Voice Identity Verification | `/api/v1/voice-auth` | Speaker verification & Voice Biometrics | `module.exports` |
| Core Loans Subsystem | `/api/v1/loans` | Applications, Approvals, Repayment Schedules, Penalties | `module.exports` |
| Payments & MTN MoMo | `/api/v1/payments` | Payment processing, receipt generation, MoMo callbacks | `module.exports` |
| Field Operations & GPS | `/api/v1/collectors`, `/api/v1/gps` | GPS route logs, collector assignments, geofencing | `module.exports` |
| HR & Salary Grouping | `/api/v1/salaries`, `/api/v1/hr/salary-grouping` | Grades, steps, service bands, payroll compute | `module.exports` |
| Developer Platform | `/api/v1/developer` | Hidden Dev Control Center, live logs, lock state | `module.exports` |
| AI Developer Assistant | `/api/v1/ai-developer` | Code scanner, stack trace diagnostic engine | `module.exports` |
| Migration Service | `/api/v1/migration` | Data migration queue, duplicate checker, audit log | `module.exports` |
| Reports & Analytics | `/api/v1/reports`, `/api/v1/dashboard` | Dashboard metrics aggregation & snapshots | `module.exports` |
