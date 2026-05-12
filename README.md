# CoinTrack Enterprise

Philippine HR & Payroll Management System — built with modern stack, compliant with Philippine labor law.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm |
| Backend | NestJS 10 + Prisma 5 + PostgreSQL 16 |
| Frontend | Next.js 14 (App Router) + shadcn/ui + Tailwind CSS |
| Auth | JWT + httpOnly cookies + Zustand |
| Forms | react-hook-form + Zod |
| State | TanStack React Query |
| Cache | Redis 7 |

## Features

### Human Resources
- **Employees** — Full CRUD with 4-tab form (Personal, Contact & IDs, Employment, Compensation)
- **Companies** — Client company management with government IDs
- **Sites** — Branch/location management (linked to companies)
- **Departments** — Hierarchical org structure with parent departments
- **Positions** — Job titles and roles
- **Schedules** — Work shifts with day-of-week toggles
- **Rates** — Daily rate tables with PH labor law premium multipliers
- **Org Chart** — Visual employee hierarchy by department

### Employee Hierarchy
- **Customizable Employee Levels** — Rank and File, Team Lead, Supervisor, Manager, Director (user-defined)
- **Approval Chain** — Configurable per level (e.g., RnF → Supervisor → Manager)
- **Reports To** — Dynamic approver fields based on chain configuration

### Time & Attendance
- **Attendance** — Manual entry with hours breakdown, day type flags, late/undertime/OT
- **Timekeeping** — Cutoff period processing (aggregates attendance → timekeeping data)
- **Holidays** — PH regular and special holidays with year filtering

### Payroll
- **Payroll Processing** — Generate from completed timekeeping periods
- **Payroll Register** — Summary report with SSS/PhilHealth/Pag-IBIG/Tax columns
- **15 Premium Multipliers** — Regular OT, Night Diff, Rest Day, Special/Legal/Double Holiday combinations
- **SSS** — 2025 contribution table (50+ brackets, MPF for >₱20k)
- **PhilHealth** — 5% rate (floor ₱10k, cap ₱100k)
- **Pag-IBIG** — 1-2% EE + 2% ER, capped ₱100
- **Withholding Tax** — TRAIN Law 2025 (6 brackets)
- **7 Allowances** — Rice, Clothing, Laundry, Medical, Transportation, Communication, Other

### Leave & Overtime
- **Leave Applications** — File, approve/reject with leave type selection
- **Leave Credits** — Allocate per employee per year
- **Overtime Applications** — File, approve/reject

### Deductions & Loans
- **Deductions** — SSS/Pag-IBIG loans, cash advance, company loan
- **Loans** — Track principal, amortization, balance

### Reports
- **Government Remittance** — SSS, PhilHealth, Pag-IBIG contribution reports
- **BIR Reports** — Withholding tax by year
- **13th Month Pay** — Auto-calculated from annual payroll data

### Settings (14 tabs)
- General, Attendance, Leaves, Holiday, Overtime, Timekeeping, Payroll, Rate, Government, Tax, Employee Levels, Approval Chain, Logo, About

### Other
- **Users** — System user management with roles
- **Roles & Permissions** — CRUD with system/custom role types
- **Audit Trail** — Action logs with entity/user tracking
- **Notifications** — Read/unread system alerts
- **Dashboard** — Stats cards with employee/attendance/leave/OT counts

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL + Redis)

### Setup

```bash
# Clone
git clone https://github.com/kinnrichard/cointrack-enterprise.git
cd cointrack-enterprise

# Install dependencies
pnpm install

# Start database
docker compose up -d

# Push schema & seed
cd apps/api
npx prisma db push
npx prisma generate
npx prisma db seed
cd ../..

# Start dev servers
pnpm dev
```

### Access
- **Web:** http://localhost:3010
- **API:** http://localhost:3009/api
- **Login:** Company Code `DEMO`, Username `developer`, Password `admin123!`

## Project Structure

```
cointrack-enterprise/
├── apps/
│   ├── api/                    # NestJS Backend (23 modules)
│   │   ├── prisma/             # Schema (50+ models) + seed
│   │   └── src/modules/        # Feature modules
│   └── web/                    # Next.js Frontend (27 pages)
│       ├── app/(dashboard)/    # All dashboard pages
│       ├── components/         # Shared + shadcn/ui
│       └── lib/                # API client, auth, utils
├── docker-compose.yml          # PostgreSQL 16 + Redis 7
├── turbo.json
└── pnpm-workspace.yaml
```

## Design System

Based on [ProcunexPro Enterprise](https://github.com/kinnrichard) design patterns:
- Modals: muted header, scrollable content, gradient footer
- Filters: Popover button with badge + status chips
- DatePicker: Custom calendar with month/year dropdowns
- Theme: CoinTrack red (#DC2626)
- All shadcn/ui components (Radix primitives)

## License

Proprietary — Kinnitech Softwares

---

Developed by [Kinnitech Softwares](https://kinn-softwares.solutions)
