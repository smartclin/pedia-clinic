# Pediatric Clinic Management App - Custom Development Rules

A production-ready pediatric clinic management system built with Next.js 16, TypeScript, Bun, tRPC, Prisma, and Better Auth.

## Core Stack Requirements

- **Framework**: Next.js 16 with App Router and React 19
- **Runtime**: Bun (for faster development and production)
- **Language**: TypeScript 5 (strict mode enabled)
- **Database**: PostgreSQL via Prisma ORM
- **API Layer**: tRPC with React Query (end-to-end type safety)
- **Authentication**: Better Auth with pediatric-specific roles
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Charts**: Recharts for growth charts and analytics
- **Icons**: Lucide React (medical icons from `lucide-react`)
- **Forms**: TanStack Form + Zod validation
- **Date Handling**: date-fns (for age calculations)
- **PDF Generation**: React-PDF (for prescriptions, reports)

## Project Structure

```
├── app/                           # Next.js App Router
│   ├── (auth)/                    # Authentication pages
│   │   ├── login/
│   │   ├── signup/
│   │   │   ├── doctor/            # Doctor registration (requires license)
│   │   │   ├── staff/             # Staff registration (requires clinic code)
│   │   │   └── patient/           # Patient/guardian registration
│   │   └── verify-email/
│   ├── (dashboard)/               # Protected dashboard routes
│   │   ├── page.tsx               # Dashboard with clinic overview
│   │   ├── patients/              # Patient management
│   │   │   ├── page.tsx           # Patient list with filters (age, status)
│   │   │   ├── [id]/              # Patient details
│   │   │   │   ├── page.tsx       # Patient overview
│   │   │   │   ├── records/       # Medical records
│   │   │   │   ├── appointments/  # Appointment history
│   │   │   │   ├── growth/        # Growth charts (WHO percentiles)
│   │   │   │   ├── immunizations/ # Vaccine schedule & records
│   │   │   │   ├── prescriptions/ # Medication history
│   │   │   │   ├── billing/       # Payment history
│   │   │   │   └── documents/     # Uploaded documents
│   │   │   └── register/          # New patient registration
│   │   ├── appointments/           # Appointment management
│   │   │   ├── page.tsx           # Calendar view
│   │   │   ├── schedule/          # Schedule new appointment
│   │   │   └── queue/              # Today's patient queue (session-based)
│   │   ├── doctors/                # Doctor management
│   │   │   ├── page.tsx           # Doctor list
│   │   │   ├── [id]/               # Doctor schedule & performance
│   │   │   └── schedule/           # Manage working hours
│   │   ├── staff/                   # Staff management
│   │   ├── inventory/               # Medical supplies & vaccines
│   │   │   ├── page.tsx           # Inventory list
│   │   │   ├── vaccines/          # Vaccine stock (temperature-sensitive)
│   │   │   └── medications/        # Medication inventory
│   │   ├── billing/                 # Financial management
│   │   │   ├── page.tsx           # Billing dashboard
│   │   │   ├── invoices/           # Invoice management
│   │   │   ├── payments/           # Payment processing
│   │   │   └── reports/            # Financial reports
│   │   ├── reports/                 # Analytics & reports
│   │   │   ├── clinical/           # Clinical reports
│   │   │   ├── financial/          # Financial analytics
│   │   │   └── operational/        # Operational metrics
│   │   ├── settings/                # Clinic settings
│   │   │   ├── profile/            # User profile
│   │   │   ├── clinic/              # Clinic information
│   │   │   │   ├── general/        # Clinic details, hours
│   │   │   │   ├── services/       # Services & pricing
│   │   │   │   ├── doctors/        # Manage doctors
│   │   │   │   ├── staff/          # Manage staff
│   │   │   │   └── working-hours/  # Clinic schedule
│   │   │   ├── team/                # Team management
│   │   │   ├── notifications/       # Notification preferences
│   │   │   └── security/            # Security settings
│   │   └── notifications/           # In-app notifications
│   ├── (admin)/                     # Admin route group (platform-wide)
│   │   └── admin/
│   │       ├── layout.tsx          # Admin layout
│   │       ├── page.tsx            # System dashboard
│   │       ├── clinics/             # Clinic management
│   │       ├── users/               # User management
│   │       ├── audit/               # Audit logs (HIPAA)
│   │       └── maintenance/         # Maintenance mode
│   ├── api/                          # API routes
│   │   ├── auth/[...all]/           # Better Auth routes
│   │   ├── trpc/[trpc]/             # tRPC routes
│   │   ├── webhooks/                 # Stripe, Twilio webhooks
│   │   └── upload/                   # File upload endpoints
│   └── layout.tsx                    # Root layout with providers
├── server/                            # Server-side code
│   └── api/                           # tRPC routers
│       ├── trpc.ts                    # tRPC setup with context
│       └── routers/
│           ├── _app.ts                # Router aggregation
│           ├── patient.ts             # Patient CRUD, growth charts
│           ├── appointment.ts          # Appointment scheduling, queue
│           ├── doctor.ts               # Doctor management, schedule
│           ├── medical-record.ts       # EMR, diagnoses, prescriptions
│           ├── immunization.ts         # Vaccine tracking, schedules
│           ├── billing.ts              # Payments, invoices, insurance
│           ├── inventory.ts             # Stock management
│           ├── analytics.ts             # Reports & metrics
│           ├── clinic.ts                # Clinic settings, members
│           ├── admin.ts                 # Platform admin functions
│           └── notification.ts          # Notifications
├── components/                          # React components
│   ├── patients/                        # Patient-specific components
│   │   ├── patient-table.tsx           # Filterable patient list
│   │   ├── patient-card.tsx            # Patient summary card
│   │   ├── registration-form.tsx       # Multi-step registration
│   │   ├── growth-chart.tsx            # WHO percentile charts
│   │   ├── immunization-schedule.tsx   # Vaccine timeline
│   │   └── medical-history-timeline.tsx # Chronological records
│   ├── appointments/                    # Appointment components
│   │   ├── calendar-view.tsx           # Weekly/monthly calendar
│   │   ├── schedule-form.tsx            # Booking form
│   │   ├── patient-queue.tsx            # Session-based queue
│   │   │   ├── queue-context.tsx       # React Context for queue state
│   │   │   ├── queue-list.tsx           # Visual queue display
│   │   │   └── queue-controls.tsx       # Check-in, call, complete
│   │   └── appointment-card.tsx         # Appointment summary
│   ├── clinical/                        # Clinical components
│   │   ├── vital-signs-input.tsx        # Pediatric vitals
│   │   ├── growth-calculator.tsx        # BMI, percentiles
│   │   ├── prescription-writer.tsx      # E-prescribing
│   │   ├── diagnosis-browser.tsx        # ICD-10 browser
│   │   └── vaccine-selector.tsx          # Vaccine lookup
│   ├── billing/                          # Billing components
│   │   ├── payment-form.tsx             # Payment processing
│   │   ├── invoice-generator.tsx        # PDF invoices
│   │   └── insurance-verification.tsx   # Insurance check
│   ├── dashboard/                        # Dashboard components
│   │   ├── stats-cards.tsx              # Key metrics
│   │   ├── activity-feed.tsx            # Recent activity
│   │   ├── upcoming-appointments.tsx    # Today's schedule
│   │   └── alerts-banner.tsx            # Vaccine alerts, etc.
│   ├── ui/                               # shadcn/ui components
│   ├── forms/                            # Form components
│   │   ├── patient-form.tsx
│   │   ├── appointment-form.tsx
│   │   └── prescription-form.tsx
│   └── providers/                        # Context providers
│       ├── auth-provider.tsx
│       ├── queue-provider.tsx            # Session-based patient queue
│       ├── clinic-provider.tsx
│       └── theme-provider.tsx
├── lib/                                    # Utilities
│   ├── auth/                               # Better Auth configuration
│   │   ├── config.ts                       # Auth config with roles
│   │   └── roles.ts                        # Pediatric-specific roles
│   ├── trpc/                               # tRPC client/server
│   ├── db/                                 # Prisma client
│   ├── validations/                         # Zod schemas
│   │   ├── patient.ts
│   │   ├── appointment.ts
│   │   └── prescription.ts
│   ├── medical/                             # Medical utilities
│   │   ├── who-growth-charts.ts             # WHO percentile data
│   │   ├── vaccine-schedules.ts             # Immunization schedules
│   │   ├── icd10-codes.ts                    # Diagnosis codes
│   │   └── drug-database.ts                  # Medication database
│   ├── billing/                              # Billing utilities
│   │   ├── pricing.ts                         # Service pricing
│   │   └── insurance.ts                       # Insurance verification
│   ├── pdf/                                   # PDF generation
│   │   ├── prescription-template.tsx
│   │   └── invoice-template.tsx
│   ├── sms/                                   # SMS notifications
│   │   └── twilio-client.ts
│   ├── email/                                 # Email service
│   │   ├── templates/
│   │   └── service.ts
│   ├── utils.ts                               # General utilities
│   ├── logger.ts                              # HIPAA-compliant logging
│   └── rate-limit.ts                          # Rate limiting
├── prisma/                                     # Prisma schema
│   └── schema.prisma                           # Database schema
├── public/                                     # Static assets
│   ├── vaccine-schedules/                      # PDF vaccine schedules
│   └── consent-forms/                          # PDF consent forms
├── hooks/                                       # Custom React hooks
│   ├── use-queue.ts                            # Session-based queue hook
│   ├── use-growth-chart.ts                      # WHO percentile calculations
│   ├── use-immunization-schedule.ts             # Vaccine due dates
│   ├── use-clinic-stats.ts                      # Real-time stats
│   └── use-auth.ts
├── types/                                       # TypeScript types
│   ├── patient.ts
│   ├── appointment.ts
│   └── medical.ts
└── middleware.ts                                # Next.js middleware (auth, queue)

```

## Database Schema (Prisma)

```prisma
// Focus on pediatric-specific models
model Clinic {
  id          String   @id @default(cuid())
  name        String
  email       String?
  phone       String?
  address     String?
  timezone    String   @default("UTC")
  licenseNo   String?  @unique // Medical license
  isActive    Boolean  @default(true)

  // Relations
  members     ClinicMember[]
  patients    Patient[]
  doctors     Doctor[]
  staff       Staff[]
  appointments Appointment[]
  services    Service[]
  inventory   InventoryItem[]

  @@map("clinics")
}

model Patient {
  id              String   @id @default(cuid())
  clinicId        String
  // Demographics
  firstName       String
  lastName        String
  dateOfBirth     DateTime
  gender          Gender
  bloodGroup      String?

  // Birth details
  birthWeight     Float?   // kg
  birthLength     Float?   // cm
  gestationalAge  Int?     // weeks

  // Contact
  phone           String?
  email           String?
  address         String?

  // Emergency
  emergencyName   String?
  emergencyPhone  String?
  emergencyRelation String?

  // Medical
  allergies       String?
  chronicConditions String?

  // Insurance
  insuranceProvider String?
  insuranceNumber String?

  // Status
  isActive        Boolean  @default(true)
  deletedAt       DateTime?

  // Relations
  clinic          Clinic   @relation(fields: [clinicId], references: [id])
  guardians       Guardian[]
  appointments    Appointment[]
  medicalRecords  MedicalRecord[]
  immunizations   Immunization[]
  growthRecords   GrowthRecord[]
  prescriptions   Prescription[]

  @@index([clinicId, dateOfBirth])
  @@index([clinicId, lastName])
  @@map("patients")
}

model Guardian {
  id          String   @id @default(cuid())
  patientId   String
  name        String
  relation    String // Mother, Father, Grandparent
  phone       String?
  email       String?
  isPrimary   Boolean @default(false)

  patient     Patient @relation(fields: [patientId], references: [id])

  @@unique([patientId, email])
  @@map("guardians")
}

model Doctor {
  id              String   @id @default(cuid())
  clinicId        String
  userId          String   @unique // Link to auth user

  // Professional
  licenseNumber   String   @unique
  specialty       String   // Pediatrician, etc.
  qualifications  String[]
  experienceYears Int?

  // Contact
  name            String
  email           String?
  phone           String?

  // Schedule
  workingHours    WorkingHour[]
  isActive        Boolean  @default(true)

  // Relations
  clinic          Clinic   @relation(fields: [clinicId], references: [id])
  appointments    Appointment[]
  medicalRecords  MedicalRecord[]

  @@index([clinicId, specialty])
  @@map("doctors")
}

model WorkingHour {
  id          String   @id @default(cuid())
  doctorId    String
  dayOfWeek   Int      // 0-6 (Sunday-Saturday)
  startTime   String   // "09:00"
  endTime     String   // "17:00"
  isAvailable Boolean  @default(true)

  doctor      Doctor   @relation(fields: [doctorId], references: [id])

  @@unique([doctorId, dayOfWeek])
  @@map("working_hours")
}

model Appointment {
  id              String   @id @default(cuid())
  clinicId        String
  patientId       String
  doctorId        String
  serviceId       String?

  scheduledAt     DateTime
  duration        Int      @default(30) // minutes
  status          AppointmentStatus @default(SCHEDULED)
  type            AppointmentType
  reason          String?
  notes           String?

  // Check-in/out
  checkedInAt     DateTime?
  checkedOutAt    DateTime?
  waitTime        Int?      // minutes

  // Relations
  clinic          Clinic   @relation(fields: [clinicId], references: [id])
  patient         Patient  @relation(fields: [patientId], references: [id])
  doctor          Doctor   @relation(fields: [doctorId], references: [id])
  service         Service? @relation(fields: [serviceId], references: [id])
  medicalRecord   MedicalRecord?

  @@index([clinicId, scheduledAt])
  @@index([doctorId, scheduledAt])
  @@index([patientId, scheduledAt])
  @@map("appointments")
}

model MedicalRecord {
  id              String   @id @default(cuid())
  appointmentId   String   @unique
  patientId       String
  doctorId        String

  // SOAP Notes
  subjective      String?  // Chief complaint
  objective       String?  // Vitals, exam findings
  assessment      String?  // Diagnosis
  plan            String?  // Treatment plan

  // Diagnoses
  diagnoses       Diagnosis[]

  // Vitals at time of visit
  vitalSigns      VitalSigns?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  appointment     Appointment @relation(fields: [appointmentId], references: [id])
  patient         Patient     @relation(fields: [patientId], references: [id])
  doctor          Doctor      @relation(fields: [doctorId], references: [id])
  prescriptions   Prescription[]
  labTests        LabTest[]

  @@map("medical_records")
}

model VitalSigns {
  id              String   @id @default(cuid())
  medicalRecordId String   @unique

  // Pediatric vitals
  temperature     Float?   // Celsius
  heartRate       Int?     // bpm
  respiratoryRate Int?     // breaths/min
  bloodPressureSystolic Int?
  bloodPressureDiastolic Int?
  oxygenSaturation Int?    // %

  // Growth metrics
  weightKg        Float?
  heightCm        Float?
  headCircumferenceCm Float?
  bmi             Float?   // Calculated

  recordedAt      DateTime @default(now())

  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id])

  @@map("vital_signs")
}

model GrowthRecord {
  id              String   @id @default(cuid())
  patientId       String
  recordedAt      DateTime @default(now())

  // Measurements
  ageDays         Int
  weightKg        Float?
  heightCm        Float?
  headCircumferenceCm Float?

  // WHO Percentiles/Z-scores
  weightForAgeZ   Float?
  heightForAgeZ   Float?
  weightForHeightZ Float?
  bmiForAgeZ      Float?
  hcForAgeZ       Float?

  // Assessment
  nutritionalStatus String? // NORMAL, UNDERWEIGHT, STUNTED, WASTED, OVERWEIGHT

  patient         Patient  @relation(fields: [patientId], references: [id])

  @@index([patientId, recordedAt])
  @@map("growth_records")
}

model Immunization {
  id              String   @id @default(cuid())
  patientId       String
  administeredAt  DateTime @default(now())

  // Vaccine details
  vaccineName     String
  cvxCode         String?  // Vaccine CVX code
  manufacturer    String?
  lotNumber       String?
  expirationDate  DateTime?

  // Administration
  doseNumber      Int?
  route           String?  // IM, Subcutaneous, Oral
  site            String?  // Left arm, Right thigh
  administeredBy  String?  // Staff ID

  // Status
  isCompleted     Boolean  @default(true)
  nextDueDate     DateTime? // Calculated from schedule

  patient         Patient @relation(fields: [patientId], references: [id])

  @@index([patientId, administeredAt])
  @@map("immunizations")
}

model VaccineSchedule {
  id              String   @id @default(cuid())
  vaccineName     String
  doseNumber      Int
  ageRecommendedDays Int    // Days from birth
  ageMinDays      Int      // Minimum age
  ageMaxDays      Int?     // Maximum age (catch-up)
  intervalMinDays Int?     // From previous dose
  isMandatory     Boolean  @default(true)

  @@unique([vaccineName, doseNumber])
  @@map("vaccine_schedules")
}

model Prescription {
  id              String   @id @default(cuid())
  medicalRecordId String
  patientId       String
  doctorId        String

  prescribedAt    DateTime @default(now())
  medicationName  String
  dosage          String   // e.g., "5 mg/kg"
  frequency       String   // e.g., "Twice daily"
  duration        String   // e.g., "7 days"
  instructions    String?
  refills         Int      @default(0)

  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id])
  patient         Patient       @relation(fields: [patientId], references: [id])
  doctor          Doctor        @relation(fields: [doctorId], references: [id])

  @@map("prescriptions")
}

model Service {
  id              String   @id @default(cuid())
  clinicId        String
  name            String
  description     String?
  price           Decimal
  duration        Int      // minutes
  category        ServiceCategory
  isActive        Boolean  @default(true)

  clinic          Clinic   @relation(fields: [clinicId], references: [id])
  appointments    Appointment[]

  @@unique([clinicId, name])
  @@map("services")
}

model InventoryItem {
  id              String   @id @default(cuid())
  clinicId        String
  name            String
  category        InventoryCategory // VACCINE, MEDICATION, SUPPLY
  quantity        Int
  unit            String   // e.g., "doses", "boxes"
  reorderLevel    Int
  expiryDate      DateTime?
  batchNumber     String?
  manufacturer    String?

  // Temperature tracking for vaccines
  requiresRefrigeration Boolean @default(false)
  temperatureLogs  Json?   // Store temperature readings

  clinic          Clinic   @relation(fields: [clinicId], references: [id])

  @@index([clinicId, expiryDate])
  @@map("inventory")
}

model Payment {
  id              String   @id @default(cuid())
  clinicId        String
  patientId       String
  appointmentId   String?
  invoiceId       String   @unique

  amount          Decimal
  paymentMethod   PaymentMethod
  status          PaymentStatus
  paidAt          DateTime?
  notes           String?

  // Insurance
  insuranceClaimId String?

  clinic          Clinic   @relation(fields: [clinicId], references: [id])
  patient         Patient  @relation(fields: [patientId], references: [id])
  appointment     Appointment? @relation(fields: [appointmentId], references: [id])

  @@index([clinicId, paidAt])
  @@map("payments")
}

// Enums
enum Gender {
  MALE
  FEMALE
  OTHER
}

enum AppointmentStatus {
  SCHEDULED
  CHECKED_IN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum AppointmentType {
  WELL_CHILD
  SICK_VISIT
  VACCINATION
  FOLLOW_UP
  EMERGENCY
  TELEHEALTH
}

enum ServiceCategory {
  CONSULTATION
  VACCINATION
  LAB_TEST
  PROCEDURE
}

enum PaymentMethod {
  CASH
  CARD
  INSURANCE
  ONLINE
}

enum PaymentStatus {
  PAID
  UNPAID
  PARTIAL
  REFUNDED
}

enum InventoryCategory {
  VACCINE
  MEDICATION
  SUPPLY
  EQUIPMENT
}

enum UserRole {
  SUPER_ADMIN      // Platform-wide admin
  CLINIC_ADMIN     // Clinic owner/manager
  DOCTOR           // Pediatrician
  NURSE            // Nursing staff
  RECEPTIONIST     // Front desk
  PHARMACIST       // Pharmacy staff
  LAB_TECHNICIAN   // Lab staff
  PATIENT          // Patient account
  GUARDIAN         // Parent/guardian
}
```

## Pediatric-Specific Features

### 1. Session-Based Patient Queue (React Context)

```typescript
// components/appointments/queue/queue-context.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface QueuePatient {
  id: string;
  name: string;
  age: number;
  appointmentTime: string;
  status: 'waiting' | 'checked-in' | 'in-progress' | 'completed';
  doctorId: string;
  priority?: 'normal' | 'urgent';
  waitTime?: number;
}

interface QueueContextType {
  queue: QueuePatient[];
  checkedIn: QueuePatient[];
  inProgress: QueuePatient[];
  completed: QueuePatient[];
  addToQueue: (patient: QueuePatient) => void;
  updateStatus: (patientId: string, status: QueuePatient['status']) => void;
  removeFromQueue: (patientId: string) => void;
  getDoctorQueue: (doctorId: string) => QueuePatient[];
  waitingCount: number;
  averageWaitTime: number;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueuePatient[]>([]);

  // Queue operations
  const addToQueue = (patient: QueuePatient) => {
    setQueue(prev => [...prev, patient]);
  };

  const updateStatus = (patientId: string, status: QueuePatient['status']) => {
    setQueue(prev => prev.map(p =>
      p.id === patientId ? { ...p, status } : p
    ));
  };

  // Derived state
  const checkedIn = queue.filter(p => p.status === 'checked-in');
  const inProgress = queue.filter(p => p.status === 'in-progress');
  const completed = queue.filter(p => p.status === 'completed');
  const waitingCount = checkedIn.length;

  const averageWaitTime = checkedIn.reduce((acc, p) => acc + (p.waitTime || 0), 0) / waitingCount || 0;

  return (
    <QueueContext.Provider value={{
      queue,
      checkedIn,
      inProgress,
      completed,
      addToQueue,
      updateStatus,
      removeFromQueue,
      getDoctorQueue: (doctorId) => queue.filter(p => p.doctorId === doctorId),
      waitingCount,
      averageWaitTime
    }}>
      {children}
    </QueueContext.Provider>
  );
}

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) throw new Error('useQueue must be used within QueueProvider');
  return context;
};
```

### 2. WHO Growth Chart Calculator

```typescript
// lib/medical/who-growth-charts.ts

export interface GrowthData {
  ageMonths: number;
  weightKg: number;
  heightCm: number;
  headCircumferenceCm?: number;
  gender: 'MALE' | 'FEMALE';
}

export interface GrowthPercentiles {
  weightForAge: number;      // Percentile (0-100)
  heightForAge: number;      // Percentile (0-100)
  weightForHeight: number;   // Percentile (0-100)
  bmiForAge: number;         // Percentile (0-100)
  headCircumferenceForAge?: number;

  weightForAgeZ: number;     // Z-score
  heightForAgeZ: number;     // Z-score
  weightForHeightZ: number;  // Z-score
  bmiForAgeZ: number;        // Z-score

  nutritionalStatus: 'NORMAL' | 'UNDERWEIGHT' | 'SEVERELY_UNDERWEIGHT' |
                     'OVERWEIGHT' | 'OBESE' | 'STUNTED' | 'WASTED' | 'SEVERE_WASTING';
}

export function calculateGrowthPercentiles(data: GrowthData): GrowthPercentiles {
  // Implementation using WHO growth charts
  // Reference data would be imported from JSON files
  const referenceData = getWHOReference(data.gender, data.ageMonths);

  // Calculate LMS-based percentiles
  const L = referenceData.l;  // Box-Cox power
  const M = referenceData.m;  // Median
  const S = referenceData.s;  // Coefficient of variation

  // Calculate Z-score: ((value/M)^L - 1) / (L*S)
  const zScore = ((Math.pow(data.weightKg / M, L) - 1) / (L * S));

  // Convert to percentile
  const percentile = calculatePercentileFromZScore(zScore);

  // Determine nutritional status
  const nutritionalStatus = determineNutritionalStatus(
    zScore,
    data.ageMonths,
    data.gender
  );

  return {
    weightForAge: percentile,
    heightForAge: calculateHeightPercentile(data),
    weightForHeight: calculateWeightForHeightPercentile(data),
    bmiForAge: calculateBMIPercentile(data),
    weightForAgeZ: zScore,
    heightForAgeZ: calculateHeightZScore(data),
    weightForHeightZ: calculateWeightForHeightZScore(data),
    bmiForAgeZ: calculateBMIZScore(data),
    nutritionalStatus
  };
}
```

### 3. Immunization Schedule Engine

```typescript
// lib/medical/vaccine-schedules.ts

export interface VaccineDue {
  vaccineName: string;
  doseNumber: number;
  dueDate: Date;
  status: 'DUE' | 'OVERDUE' | 'COMPLETED' | 'SCHEDULED';
  administeredDate?: Date;
  minimumAgeDays: number;
  recommendedAgeDays: number;
  maximumAgeDays?: number;
}

export function calculateImmunizationSchedule(
  dateOfBirth: Date,
  administeredVaccines: Array<{ name: string; dose: number; date: Date }>
): VaccineDue[] {
  const ageInDays = Math.floor((Date.now() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24));

  // Standard CDC/WHO vaccine schedule
  const schedule = [
    { name: 'Hepatitis B', doses: 3, ages: [0, 30, 180] },
    { name: 'DTaP', doses: 5, ages: [60, 120, 180, 480, 1825] },
    { name: 'Hib', doses: 4, ages: [60, 120, 180, 480] },
    { name: 'PCV', doses: 4, ages: [60, 120, 180, 480] },
    { name: 'IPV', doses: 4, ages: [60, 120, 180, 1460] },
    { name: 'MMR', doses: 2, ages: [365, 1460] },
    { name: 'Varicella', doses: 2, ages: [365, 1460] },
    { name: 'Hepatitis A', doses: 2, ages: [365, 730] },
    { name: 'HPV', doses: 2, ages: [3340, 3650] }, // 11-12 years
    { name: 'Tdap', doses: 1, ages: [4015] }, // 11-12 years booster
    { name: 'Meningococcal', doses: 2, ages: [4015, 4380] },
    { name: 'Rotavirus', doses: 3, ages: [60, 120, 180] },
    { name: 'Influenza', doses: 1, ages: [180] }, // Annual after 6 months
  ];

  const dueVaccines: VaccineDue[] = [];

  schedule.forEach(vaccine => {
    for (let dose = 1; dose <= vaccine.doses; dose++) {
      const recommendedAgeDays = vaccine.ages[dose - 1];

      // Check if already administered
      const administered = administeredVaccines.find(
        v => v.name === vaccine.name && v.dose === dose
      );

      if (administered) {
        dueVaccines.push({
          vaccineName: vaccine.name,
          doseNumber: dose,
          dueDate: administered.date,
          status: 'COMPLETED',
          administeredDate: administered.date,
          minimumAgeDays: recommendedAgeDays - 14, // 2 week grace
          recommendedAgeDays,
          maximumAgeDays: dose < vaccine.doses ? vaccine.ages[dose] : undefined
        });
      } else {
        const dueDate = new Date(dateOfBirth);
        dueDate.setDate(dueDate.getDate() + recommendedAgeDays);

        let status: 'DUE' | 'OVERDUE' | 'SCHEDULED' = 'SCHEDULED';

        if (ageInDays >= recommendedAgeDays) {
          status = 'OVERDUE';
        } else if (ageInDays >= recommendedAgeDays - 30) {
          status = 'DUE'; // Due within 30 days
        }

        dueVaccines.push({
          vaccineName: vaccine.name,
          doseNumber: dose,
          dueDate,
          status,
          minimumAgeDays: recommendedAgeDays - 14,
          recommendedAgeDays,
          maximumAgeDays: dose < vaccine.doses ? vaccine.ages[dose] : undefined
        });
      }
    }
  });

  return dueVaccines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}
```

## Authentication & Authorization (Better Auth)

```typescript
// lib/auth/config.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/lib/db';

export const auth = betterAuth({
  database: prismaAdapter(prisma),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  // User roles for pediatric clinic
  user: {
    modelName: 'user',
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'PATIENT',
        enum: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT', 'GUARDIAN'],
      },
      clinicId: {
        type: 'string',
        required: false,
      },
      licenseNumber: {
        type: 'string',
        required: false, // For doctors
      },
      specialty: {
        type: 'string',
        required: false,
      },
    },
  },

  // Email verification
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // Send via Resend
      await sendVerificationEmail(user.email, url);
    },
  },

  // Password reset
  resetPassword: {
    sendResetPasswordEmail: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },

  // 2FA support
  twoFactor: {
    enabled: true,
  },

  // Session management
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
```

## tRPC Routers with Pediatric Context

```typescript
// server/api/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';
import superjson from 'superjson';
import { ZodError } from 'zod';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Middleware to check if user is authenticated
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      user: ctx.user,
      session: ctx.session,
    },
  });
});

// Role-based middleware
const hasRole = (roles: string[]) => {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    return next({ ctx });
  });
};

// Clinic access middleware
const hasClinicAccess = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // Get clinicId from request
  const clinicId = ctx.req?.headers['x-clinic-id'] as string;

  if (!clinicId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Clinic ID required' });
  }

  // Check if user belongs to clinic
  const member = await prisma.clinicMember.findUnique({
    where: {
      userId_clinicId: {
        userId: ctx.user.id,
        clinicId,
      },
    },
  });

  if (!member && ctx.user.role !== 'SUPER_ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }

  return next({
    ctx: {
      ...ctx,
      clinicId,
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const clinicProcedure = t.procedure.use(isAuthed).use(hasClinicAccess);

// Role-specific procedures
export const doctorProcedure = clinicProcedure.use(hasRole(['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN']));
export const adminProcedure = clinicProcedure.use(hasRole(['CLINIC_ADMIN', 'SUPER_ADMIN']));
export const superAdminProcedure = t.procedure.use(hasRole(['SUPER_ADMIN']));
```

## Growth Chart Router Example

```typescript
// server/api/routers/growth.ts
import { z } from 'zod';
import { doctorProcedure, router } from '../trpc';
import { calculateGrowthPercentiles } from '@/lib/medical/who-growth-charts';
import { TRPCError } from '@trpc/server';

export const growthRouter = router({
  // Record new growth measurements
  record: doctorProcedure
    .input(
      z.object({
        patientId: z.string(),
        weightKg: z.number().optional(),
        heightCm: z.number().optional(),
        headCircumferenceCm: z.number().optional(),
        recordedAt: z.date().default(() => new Date()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get patient details for age calculation
      const patient = await ctx.prisma.patient.findUnique({
        where: { id: input.patientId },
        select: { dateOfBirth: true, gender: true },
      });

      if (!patient) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Calculate age in days
      const ageDays = Math.floor(
        (input.recordedAt.getTime() - patient.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate WHO percentiles
      const percentiles = calculateGrowthPercentiles({
        ageMonths: ageDays / 30.44,
        weightKg: input.weightKg || 0,
        heightCm: input.heightCm || 0,
        headCircumferenceCm: input.headCircumferenceCm,
        gender: patient.gender,
      });

      // Create growth record
      const growthRecord = await ctx.prisma.growthRecord.create({
        data: {
          patientId: input.patientId,
          recordedAt: input.recordedAt,
          ageDays,
          weightKg: input.weightKg,
          heightCm: input.heightCm,
          headCircumferenceCm: input.headCircumferenceCm,
          weightForAgeZ: percentiles.weightForAgeZ,
          heightForAgeZ: percentiles.heightForAgeZ,
          weightForHeightZ: percentiles.weightForHeightZ,
          bmiForAgeZ: percentiles.bmiForAgeZ,
          hcForAgeZ: percentiles.headCircumferenceForAge,
          nutritionalStatus: percentiles.nutritionalStatus,
        },
      });

      return growthRecord;
    }),

  // Get growth chart data for a patient
  getChartData: clinicProcedure
    .input(
      z.object({
        patientId: z.string(),
        months: z.number().default(24), // Last 24 months
      })
    )
    .query(async ({ ctx, input }) => {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - input.months);

      const records = await ctx.prisma.growthRecord.findMany({
        where: {
          patientId: input.patientId,
          recordedAt: { gte: cutoffDate },
        },
        orderBy: { recordedAt: 'asc' },
      });

      // Get WHO reference curves for comparison
      const patient = await ctx.prisma.patient.findUnique({
        where: { id: input.patientId },
        select: { gender: true, dateOfBirth: true },
      });

      // Format for Recharts
      const chartData = records.map(record => ({
        date: record.recordedAt,
        ageMonths: record.ageDays / 30.44,
        weight: record.weightKg,
        height: record.heightCm,
        headCircumference: record.headCircumferenceCm,
        weightPercentile: calculatePercentileFromZScore(record.weightForAgeZ),
        heightPercentile: calculatePercentileFromZScore(record.heightForAgeZ),
        // Add WHO reference lines
        whoWeightMedian: getWHOMedian(patient?.gender, record.ageDays / 30.44, 'weight'),
        whoHeightMedian: getWHOMedian(patient?.gender, record.ageDays / 30.44, 'height'),
      }));

      return chartData;
    }),
});
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"

# OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Email (Resend)
RESEND_API_KEY="..."
RESEND_FROM_EMAIL="noreply@pediacare.com"

# SMS (Twilio)
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="..."

# File Storage (Supabase/S3)
SUPABASE_URL="..."
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_BUCKET="pediacare"

# Payment (Stripe)
STRIPE_SECRET_KEY="..."
STRIPE_WEBHOOK_SECRET="..."

# Rate Limiting
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# Admin Access
ADMIN_EMAILS="admin@pediacare.com,owner@clinic.com"

# Clinic Defaults
DEFAULT_TIMEZONE="America/New_York"
DEFAULT_APPOINTMENT_DURATION="30"
VACCINE_REMINDER_DAYS="7"
APPOINTMENT_REMINDER_HOURS="24"
```

## Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbo -p 5000",
    "build": "next build",
    "start": "next start",
    "lint": "biome check --apply . && oxlint .",
    "format": "biome format --write .",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "type-check": "tsc --noEmit",
    "prepare": "husky"
  }
}
```

## Key Pediatric Features Summary

1. **Patient Management**: Comprehensive pediatric profiles with birth details, growth tracking
2. **Growth Charts**: WHO-based percentile calculations with visual charts
3. **Immunization Schedules**: Automated vaccine due date calculations with reminders
4. **Session-Based Queue**: Real-time patient queue with status tracking
5. **EMR System**: SOAP notes, prescriptions, lab results
6. **Age-Based Filtering**: Filter patients by age groups (infants, toddlers, children)
7. **Vaccine Inventory**: Temperature-sensitive inventory tracking
8. **Guardian Management**: Multiple guardians with primary contact
9. **Appointment Scheduling**: Pediatric-specific appointment types
10. **Billing Integration**: Insurance claims, payment processing
11. **Analytics**: Clinical outcomes, immunization rates, growth trends
12. **HIPAA Compliance**: Audit logs, data encryption, access controls

This structure provides a complete foundation for a pediatric clinic management system with all the specialized features needed for modern pediatric practice.
