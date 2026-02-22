-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'DOCTOR', 'OWNER', 'PATIENT');

-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('CONSULTATION', 'VACCINATION', 'SCREENING', 'FOLLOW_UP', 'NUTRITION', 'NEWBORN', 'LACTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "GrowthStatus" AS ENUM ('NORMAL', 'OBESE', 'OVERWEIGHT', 'UNDERWEIGHT', 'STUNTED');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTATION', 'VACCINATION', 'PROCEDURE', 'EMERGENCY', 'CHECKUP', 'FOLLOW_UP', 'FEEDING_SESSION', 'OTHER');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE', 'DORMANT');

-- CreateEnum
CREATE TYPE "JOBTYPE" AS ENUM ('FULL', 'PART');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'SCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'MOBILE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID', 'PARTIAL', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CONSULTATION', 'LAB_TEST', 'VACCINATION', 'PROCEDURE', 'PHARMACY', 'DIAGNOSIS', 'OTHER');

-- CreateEnum
CREATE TYPE "MeasurementType" AS ENUM ('Weight', 'Height', 'HeadCircumference');

-- CreateEnum
CREATE TYPE "ChartType" AS ENUM ('WFA', 'HFA', 'HcFA');

-- CreateEnum
CREATE TYPE "ReminderMethod" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('SENT', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_REMINDER', 'BILLING', 'GENERAL', 'SECURITY');

-- CreateEnum
CREATE TYPE "FeedingType" AS ENUM ('BREAST', 'FORMULA', 'MIXED');

-- CreateEnum
CREATE TYPE "DevelopmentStatus" AS ENUM ('NORMAL', 'DELAYED', 'ADVANCED', 'CONCERNING');

-- CreateEnum
CREATE TYPE "ImmunizationStatus" AS ENUM ('COMPLETED', 'PENDING', 'OVERDUE', 'DELAYED', 'EXEMPTED');

-- CreateEnum
CREATE TYPE "DosageUnit" AS ENUM ('MG', 'ML', 'TABLET', 'MCG', 'G', 'IU', 'DROP', 'SPRAY', 'PUFF', 'UNIT');

-- CreateEnum
CREATE TYPE "DrugRoute" AS ENUM ('IV', 'PO', 'IM', 'SC', 'TOPICAL', 'INHALED', 'RECTAL', 'SUBLINGUAL', 'BUCCAL', 'TRANSDERMAL');

-- CreateEnum
CREATE TYPE "LabStatus" AS ENUM ('PENDING', 'COMPLETED', 'REVIEWED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('STANDARD', 'SENSITIVE', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('VIEW', 'EDIT', 'PRINT', 'EXPORT');

-- CreateEnum
CREATE TYPE "SavedFilterType" AS ENUM ('medical_records', 'patients', 'appointments', 'lab_tests');

-- CreateEnum
CREATE TYPE "TrainingFileStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "KnowledgeBaseStatus" AS ENUM ('PENDING', 'CREATING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "TrainingWebsiteStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "twoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "bio" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "language" TEXT DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "betterAuthId" TEXT,
    "clinicId" TEXT,
    "role" "UserRole",
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "phone" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_members" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "email" TEXT,
    "invitedById" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'email',
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_auth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "two_factor_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkeys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "deviceName" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "credentialID" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "aaguid" TEXT,

    CONSTRAINT "passkeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'system',
    "clinicId" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'default',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "maintenanceStartedAt" TIMESTAMP(3),
    "maintenanceEndTime" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "details" TEXT,
    "resource" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "record_id" TEXT,
    "model" TEXT NOT NULL,
    "message" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clinicId" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinicInvitation" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "clinicInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todo" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "todo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "order" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "filename" TEXT NOT NULL,
    "search_text" TEXT NOT NULL DEFAULT '',
    "size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "slug" TEXT,
    "description" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "archivedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT DEFAULT 'UTC',
    "address" TEXT,
    "phone" TEXT,
    "logo" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN DEFAULT false,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255),
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "clinic_id" TEXT,
    "specialty" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "department" TEXT,
    "img" TEXT,
    "colorCode" TEXT,
    "availabilityStatus" "AvailabilityStatus",
    "available_from_week_day" INTEGER,
    "available_to_week_day" INTEGER,
    "isActive" BOOLEAN,
    "status" "Status",
    "available_from_time" TEXT,
    "available_to_time" TEXT,
    "type" "JOBTYPE" NOT NULL DEFAULT 'FULL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appointment_price" DECIMAL(10,2) NOT NULL,
    "role" "UserRole",
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN DEFAULT false,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingDays" (
    "id" SERIAL NOT NULL,
    "doctorId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkingDays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255),
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "userId" TEXT,
    "clinicId" TEXT,
    "address" TEXT NOT NULL,
    "department" TEXT,
    "img" TEXT,
    "licenseNumber" TEXT,
    "colorCode" TEXT,
    "hireDate" DATE DEFAULT CURRENT_TIMESTAMP,
    "salary" DOUBLE PRECISION,
    "role" "UserRole" NOT NULL,
    "status" "Status" DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isActive" BOOLEAN,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "billId" TEXT,
    "patientId" TEXT,
    "appointmentId" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" DATE,
    "discount" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2),
    "amountPaid" DECIMAL(10,2),
    "amount" DECIMAL(10,2),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "insurance" TEXT,
    "insuranceId" TEXT,
    "serviceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN DEFAULT false,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "receiptNumber" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "method" "ReminderMethod" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientBill" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(10,2),
    "totalCost" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "category" "ServiceCategory",
    "duration" INTEGER,
    "isAvailable" BOOLEAN DEFAULT true,
    "clinicId" TEXT,
    "status" "Status" DEFAULT 'ACTIVE',
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN DEFAULT false,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_settings" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "openingTime" TEXT NOT NULL,
    "closingTime" TEXT NOT NULL,
    "workingDays" TEXT[],
    "defaultAppointmentDuration" INTEGER NOT NULL DEFAULT 30,
    "requireEmergencyContact" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "who_growth_standards" (
    "id" TEXT NOT NULL,
    "age_in_months" INTEGER,
    "ageDays" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "chart_type" "ChartType",
    "measuement_type" "MeasurementType",
    "l_value" DOUBLE PRECISION,
    "m_value" DOUBLE PRECISION,
    "s_value" DOUBLE PRECISION,
    "sd0" DOUBLE PRECISION,
    "sd1neg" DOUBLE PRECISION,
    "sd1pos" DOUBLE PRECISION,
    "sd2neg" DOUBLE PRECISION,
    "sd2pos" DOUBLE PRECISION,
    "sd3neg" DOUBLE PRECISION,
    "sd3pos" DOUBLE PRECISION,
    "sd4neg" DOUBLE PRECISION,
    "sd4pos" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "who_growth_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating" (
    "id" SERIAL NOT NULL,
    "clinic_id" TEXT,
    "staff_id" TEXT,
    "patient_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "doctorId" TEXT,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "medication_name" TEXT,
    "instructions" TEXT,
    "issued_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "clinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drug" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoseGuideline" (
    "id" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "clinicalIndication" TEXT NOT NULL,
    "minDosePerKg" DOUBLE PRECISION,
    "maxDosePerKg" DOUBLE PRECISION,
    "doseUnit" TEXT,
    "frequencyDays" TEXT,
    "gestationalAgeWeeksMin" DOUBLE PRECISION,
    "gestationalAgeWeeksMax" DOUBLE PRECISION,
    "postNatalAgeDaysMin" DOUBLE PRECISION,
    "postNatalAgeDaysMax" DOUBLE PRECISION,
    "maxDosePer24h" DOUBLE PRECISION,
    "stockConcentrationMgMl" DOUBLE PRECISION,
    "finalConcentrationMgMl" DOUBLE PRECISION,
    "minInfusionTimeMin" INTEGER,
    "compatibilityDiluent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoseGuideline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescribed_items" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "dosageValue" DOUBLE PRECISION NOT NULL,
    "dosageUnit" "DosageUnit" NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "instructions" TEXT,
    "drugRoute" "DrugRoute",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescribed_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" VARCHAR(255),
    "phone" TEXT,
    "emergencyContactNumber" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "ageMonths" INTEGER,
    "ageDays" INTEGER,
    "gender" "Gender" NOT NULL DEFAULT 'MALE',
    "maritalStatus" TEXT,
    "nutritionalStatus" TEXT,
    "address" TEXT,
    "emergencyContactName" TEXT,
    "relation" TEXT,
    "allergies" TEXT,
    "medicalConditions" TEXT,
    "medicalHistory" TEXT,
    "image" TEXT,
    "colorCode" TEXT,
    "role" "UserRole",
    "status" "Status" DEFAULT 'ACTIVE',
    "isActive" BOOLEAN DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN DEFAULT false,
    "createdById" TEXT,
    "updatedById" TEXT,
    "bloodGroup" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "doctorId" TEXT,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "serviceId" TEXT,
    "doctorSpecialty" TEXT,
    "clinicId" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "appointment_price_in_cents" DECIMAL(10,2),
    "status" "AppointmentStatus" DEFAULT 'PENDING',
    "type" "AppointmentType" NOT NULL,
    "note" TEXT,
    "reason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecords" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorId" TEXT,
    "clinicId" TEXT NOT NULL,
    "diagnosis" TEXT,
    "symptoms" TEXT,
    "treatmentPlan" TEXT,
    "labRequest" TEXT,
    "notes" TEXT,
    "attachments" TEXT,
    "followUpDate" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'STANDARD',
    "lastAccessedAt" TIMESTAMP(3),
    "lastAccessedBy" TEXT,

    CONSTRAINT "MedicalRecords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecordAccess" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessType" "AccessType" NOT NULL,
    "purpose" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalRecordAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "clinicId" TEXT,
    "appointmentId" TEXT,
    "medicalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "notes" TEXT,
    "symptoms" TEXT NOT NULL,
    "prescribedMedications" TEXT,
    "followUpPlan" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "EncounterStatus" DEFAULT 'PENDING',
    "typeOfEncounter" "EncounterType" DEFAULT 'CONSULTATION',

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalSigns" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicalId" TEXT NOT NULL,
    "encounterId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bodyTemperature" DOUBLE PRECISION,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "heartRate" INTEGER,
    "respiratoryRate" INTEGER,
    "oxygenSaturation" INTEGER,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "gender" "Gender",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ageDays" INTEGER,
    "ageMonths" INTEGER,

    CONSTRAINT "VitalSigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT,
    "gender" "Gender",
    "medicalId" TEXT,
    "vitalSignsId" TEXT,
    "ageDays" INTEGER,
    "ageMonths" INTEGER,
    "ageYears" INTEGER,
    "percentile" DECIMAL(4,3),
    "zScore" DECIMAL(4,3),
    "headCircumference" DECIMAL(5,2),
    "bmi" DECIMAL(5,2),
    "weightForAgeZ" DECIMAL(4,3),
    "heightForAgeZ" DECIMAL(4,3),
    "bmiForAgeZ" DECIMAL(4,3),
    "hcForAgeZ" DECIMAL(4,3),
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "notes" TEXT,
    "growthStatus" "GrowthStatus" DEFAULT 'NORMAL',
    "date" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "classification" TEXT,
    "deletedAt" TIMESTAMP(3),
    "measurementType" "MeasurementType",

    CONSTRAINT "GrowthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Immunization" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "vaccine" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dose" TEXT,
    "lotNumber" TEXT,
    "administeredByStaffId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN DEFAULT false,
    "status" "ImmunizationStatus",
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isOverDue" BOOLEAN DEFAULT false,
    "daysOverDue" INTEGER,

    CONSTRAINT "Immunization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_store" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "config_store_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "user_quota" (
    "user_id" TEXT NOT NULL,
    "quota" INTEGER NOT NULL DEFAULT 0,
    "used_quota" INTEGER NOT NULL DEFAULT 0,
    "file_count" INTEGER NOT NULL DEFAULT 0,
    "file_count_quota" INTEGER NOT NULL DEFAULT 0,
    "invite_count" INTEGER NOT NULL DEFAULT 0,
    "invite_quota" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_quota_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "result" TEXT NOT NULL,
    "status" "LabStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedingLog" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "FeedingType" NOT NULL,
    "duration" INTEGER,
    "amount" DOUBLE PRECISION,
    "breast" TEXT,
    "notes" TEXT,

    CONSTRAINT "FeedingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentalMilestone" (
    "id" SERIAL NOT NULL,
    "patientId" TEXT NOT NULL,
    "milestone" TEXT NOT NULL,
    "ageAchieved" TEXT NOT NULL,
    "dateRecorded" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentalMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developmental_check" (
    "id" SERIAL NOT NULL,
    "patientId" TEXT NOT NULL,
    "checkDate" TIMESTAMP(3) NOT NULL,
    "ageMonths" INTEGER NOT NULL,
    "motorSkills" "DevelopmentStatus" NOT NULL,
    "languageSkills" "DevelopmentStatus" NOT NULL,
    "socialSkills" "DevelopmentStatus" NOT NULL,
    "cognitiveSkills" "DevelopmentStatus" NOT NULL,
    "milestonesMet" TEXT,
    "milestonesPending" TEXT,
    "concerns" TEXT,
    "recommendations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developmental_check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_schedule" (
    "id" SERIAL NOT NULL,
    "vaccine_name" TEXT NOT NULL,
    "recommendedAge" TEXT NOT NULL,
    "doses_required" INTEGER NOT NULL,
    "minimumInterval" INTEGER,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ageInDaysMin" INTEGER,
    "ageInDaysMax" INTEGER,

    CONSTRAINT "vaccine_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "ex_clinic_id" TEXT NOT NULL,
    "ex_subcat_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseSubCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ExpenseSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileStorage" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "isSecure" BOOLEAN NOT NULL DEFAULT false,
    "accessToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "description" TEXT,
    "metadata" JSONB,
    "clinicId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT,
    "uploadExpiresAt" TIMESTAMP(3),
    "doctorId" TEXT,
    "patientId" TEXT,

    CONSTRAINT "FileStorage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingFile" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "fileStorageId" TEXT NOT NULL,
    "status" "TrainingFileStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vectorStoreId" TEXT,
    "status" "KnowledgeBaseStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingWebsite" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "TrainingWebsiteStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingWebsite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClinicMemberToOrganization" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClinicMemberToOrganization_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ImmunizationToMedicalRecords" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ImmunizationToMedicalRecords_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "twoFactor_secret_idx" ON "twoFactor"("secret");

-- CreateIndex
CREATE INDEX "twoFactor_userId_idx" ON "twoFactor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_betterAuthId_key" ON "users"("betterAuthId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_identifier_value_key" ON "verifications"("identifier", "value");

-- CreateIndex
CREATE INDEX "clinic_members_clinicId_idx" ON "clinic_members"("clinicId");

-- CreateIndex
CREATE INDEX "clinic_members_userId_idx" ON "clinic_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_members_clinicId_userId_key" ON "clinic_members"("clinicId", "userId");

-- CreateIndex
CREATE INDEX "roles_clinicId_idx" ON "roles"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_clinicId_name_key" ON "roles"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_token_idx" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE INDEX "invitations_clinicId_idx" ON "invitations"("clinicId");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "two_factor_auth_userId_key" ON "two_factor_auth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "passkeys_credentialId_key" ON "passkeys"("credentialId");

-- CreateIndex
CREATE INDEX "passkeys_userId_idx" ON "passkeys"("userId");

-- CreateIndex
CREATE INDEX "passkeys_credentialID_idx" ON "passkeys"("credentialID");

-- CreateIndex
CREATE INDEX "system_settings_clinicId_idx" ON "system_settings"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_clinicId_idx" ON "api_keys"("clinicId");

-- CreateIndex
CREATE INDEX "api_keys_key_idx" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_createdById_idx" ON "api_keys"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_clinicId_idx" ON "audit_logs"("clinicId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "clinicInvitation_clinicId_idx" ON "clinicInvitation"("clinicId");

-- CreateIndex
CREATE INDEX "clinicInvitation_email_idx" ON "clinicInvitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "files_slug_key" ON "files"("slug");

-- CreateIndex
CREATE INDEX "idx_files_slug" ON "files"("slug");

-- CreateIndex
CREATE INDEX "idx_files_search_text" ON "files"("search_text");

-- CreateIndex
CREATE INDEX "idx_files_folder_id" ON "files"("folder_id");

-- CreateIndex
CREATE INDEX "idx_folders_user_id" ON "folders"("user_id");

-- CreateIndex
CREATE INDEX "idx_folders_parent_id" ON "folders"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_name_key" ON "clinics"("name");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_slug_key" ON "clinics"("slug");

-- CreateIndex
CREATE INDEX "clinics_archivedAt_idx" ON "clinics"("archivedAt");

-- CreateIndex
CREATE INDEX "clinics_slug_idx" ON "clinics"("slug");

-- CreateIndex
CREATE INDEX "clinics_name_idx" ON "clinics"("name");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_userId_key" ON "doctors"("userId");

-- CreateIndex
CREATE INDEX "doctors_clinic_id_isActive_idx" ON "doctors"("clinic_id", "isActive");

-- CreateIndex
CREATE INDEX "doctors_specialty_clinic_id_idx" ON "doctors"("specialty", "clinic_id");

-- CreateIndex
CREATE INDEX "doctors_isDeleted_idx" ON "doctors"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingDays_doctorId_day_key" ON "WorkingDays"("doctorId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- CreateIndex
CREATE INDEX "Staff_deletedAt_idx" ON "Staff"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_appointmentId_key" ON "Payment"("appointmentId");

-- CreateIndex
CREATE INDEX "Payment_isDeleted_idx" ON "Payment"("isDeleted");

-- CreateIndex
CREATE INDEX "Payment_patientId_status_idx" ON "Payment"("patientId", "status");

-- CreateIndex
CREATE INDEX "Payment_status_dueDate_idx" ON "Payment"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Payment_patientId_paymentDate_idx" ON "Payment"("patientId", "paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_appointmentId_key" ON "Reminder"("appointmentId");

-- CreateIndex
CREATE INDEX "Service_isDeleted_idx" ON "Service"("isDeleted");

-- CreateIndex
CREATE INDEX "Service_serviceName_idx" ON "Service"("serviceName");

-- CreateIndex
CREATE UNIQUE INDEX "Service_id_clinicId_key" ON "Service"("id", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_settings_clinicId_key" ON "clinic_settings"("clinicId");

-- CreateIndex
CREATE INDEX "prescriptions_clinicId_idx" ON "prescriptions"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Drug_name_key" ON "Drug"("name");

-- CreateIndex
CREATE INDEX "Guardian_patientId_idx" ON "Guardian"("patientId");

-- CreateIndex
CREATE INDEX "Guardian_userId_idx" ON "Guardian"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_userId_key" ON "patients"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_email_key" ON "patients"("email");

-- CreateIndex
CREATE INDEX "patients_clinicId_isActive_isDeleted_idx" ON "patients"("clinicId", "isActive", "isDeleted");

-- CreateIndex
CREATE INDEX "patients_clinicId_dateOfBirth_idx" ON "patients"("clinicId", "dateOfBirth");

-- CreateIndex
CREATE INDEX "patients_lastName_firstName_clinicId_idx" ON "patients"("lastName", "firstName", "clinicId");

-- CreateIndex
CREATE INDEX "patients_createdAt_idx" ON "patients"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "patients_clinicId_status_idx" ON "patients"("clinicId", "status");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_appointmentDate_status_idx" ON "Appointment"("clinicId", "appointmentDate", "status");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_appointmentDate_status_idx" ON "Appointment"("doctorId", "appointmentDate", "status");

-- CreateIndex
CREATE INDEX "Appointment_patientId_appointmentDate_idx" ON "Appointment"("patientId", "appointmentDate" DESC);

-- CreateIndex
CREATE INDEX "Appointment_status_appointmentDate_idx" ON "Appointment"("status", "appointmentDate");

-- CreateIndex
CREATE INDEX "Appointment_type_appointmentDate_idx" ON "Appointment"("type", "appointmentDate");

-- CreateIndex
CREATE INDEX "Appointment_isDeleted_idx" ON "Appointment"("isDeleted");

-- CreateIndex
CREATE INDEX "MedicalRecords_patientId_createdAt_idx" ON "MedicalRecords"("patientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MedicalRecords_doctorId_createdAt_idx" ON "MedicalRecords"("doctorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MedicalRecords_clinicId_createdAt_idx" ON "MedicalRecords"("clinicId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MedicalRecords_followUpDate_clinicId_idx" ON "MedicalRecords"("followUpDate", "clinicId");

-- CreateIndex
CREATE INDEX "MedicalRecords_patientId_isConfidential_idx" ON "MedicalRecords"("patientId", "isConfidential");

-- CreateIndex
CREATE INDEX "MedicalRecords_lastAccessedAt_idx" ON "MedicalRecords"("lastAccessedAt");

-- CreateIndex
CREATE INDEX "MedicalRecords_doctorId_idx" ON "MedicalRecords"("doctorId");

-- CreateIndex
CREATE INDEX "MedicalRecords_isDeleted_idx" ON "MedicalRecords"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRecords_patientId_appointmentId_key" ON "MedicalRecords"("patientId", "appointmentId");

-- CreateIndex
CREATE INDEX "MedicalRecordAccess_recordId_accessedAt_idx" ON "MedicalRecordAccess"("recordId", "accessedAt");

-- CreateIndex
CREATE INDEX "MedicalRecordAccess_userId_accessedAt_idx" ON "MedicalRecordAccess"("userId", "accessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Diagnosis_medicalId_key" ON "Diagnosis"("medicalId");

-- CreateIndex
CREATE INDEX "Diagnosis_clinicId_date_idx" ON "Diagnosis"("clinicId", "date");

-- CreateIndex
CREATE INDEX "Diagnosis_doctorId_date_idx" ON "Diagnosis"("doctorId", "date");

-- CreateIndex
CREATE INDEX "Diagnosis_patientId_date_idx" ON "Diagnosis"("patientId", "date");

-- CreateIndex
CREATE INDEX "Diagnosis_isDeleted_idx" ON "Diagnosis"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "VitalSigns_medicalId_key" ON "VitalSigns"("medicalId");

-- CreateIndex
CREATE UNIQUE INDEX "VitalSigns_encounterId_key" ON "VitalSigns"("encounterId");

-- CreateIndex
CREATE INDEX "VitalSigns_patientId_recordedAt_idx" ON "VitalSigns"("patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "VitalSigns_encounterId_idx" ON "VitalSigns"("encounterId");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthRecord_medicalId_key" ON "GrowthRecord"("medicalId");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthRecord_vitalSignsId_key" ON "GrowthRecord"("vitalSignsId");

-- CreateIndex
CREATE INDEX "GrowthRecord_patientId_date_idx" ON "GrowthRecord"("patientId", "date");

-- CreateIndex
CREATE INDEX "Immunization_patientId_vaccine_date_idx" ON "Immunization"("patientId", "vaccine", "date");

-- CreateIndex
CREATE INDEX "Immunization_patientId_date_idx" ON "Immunization"("patientId", "date");

-- CreateIndex
CREATE INDEX "LabTest_serviceId_idx" ON "LabTest"("serviceId");

-- CreateIndex
CREATE INDEX "LabTest_recordId_idx" ON "LabTest"("recordId");

-- CreateIndex
CREATE INDEX "FeedingLog_patientId_date_idx" ON "FeedingLog"("patientId", "date");

-- CreateIndex
CREATE INDEX "developmental_check_patientId_checkDate_idx" ON "developmental_check"("patientId", "checkDate");

-- CreateIndex
CREATE INDEX "developmental_check_ageMonths_idx" ON "developmental_check"("ageMonths");

-- CreateIndex
CREATE INDEX "vaccine_schedule_ageInDaysMin_ageInDaysMax_idx" ON "vaccine_schedule"("ageInDaysMin", "ageInDaysMax");

-- CreateIndex
CREATE UNIQUE INDEX "vaccine_schedule_vaccine_name_recommendedAge_key" ON "vaccine_schedule"("vaccine_name", "recommendedAge");

-- CreateIndex
CREATE INDEX "ex_clinic_date_idx" ON "expense"("ex_clinic_id", "date" DESC);

-- CreateIndex
CREATE INDEX "ex_cat_date_idx" ON "expense"("ex_subcat_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FileStorage_filePath_key" ON "FileStorage"("filePath");

-- CreateIndex
CREATE UNIQUE INDEX "FileStorage_accessToken_key" ON "FileStorage"("accessToken");

-- CreateIndex
CREATE INDEX "FileStorage_clinicId_idx" ON "FileStorage"("clinicId");

-- CreateIndex
CREATE INDEX "FileStorage_userId_idx" ON "FileStorage"("userId");

-- CreateIndex
CREATE INDEX "FileStorage_accessToken_idx" ON "FileStorage"("accessToken");

-- CreateIndex
CREATE INDEX "TrainingFile_knowledgeBaseId_idx" ON "TrainingFile"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "TrainingFile_fileStorageId_idx" ON "TrainingFile"("fileStorageId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBase_vectorStoreId_key" ON "KnowledgeBase"("vectorStoreId");

-- CreateIndex
CREATE INDEX "KnowledgeBase_clinicId_idx" ON "KnowledgeBase"("clinicId");

-- CreateIndex
CREATE INDEX "KnowledgeBase_vectorStoreId_idx" ON "KnowledgeBase"("vectorStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBase_clinicId_key" ON "KnowledgeBase"("clinicId");

-- CreateIndex
CREATE INDEX "TrainingWebsite_knowledgeBaseId_idx" ON "TrainingWebsite"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "TrainingWebsite_url_idx" ON "TrainingWebsite"("url");

-- CreateIndex
CREATE INDEX "Agent_clinicId_idx" ON "Agent"("clinicId");

-- CreateIndex
CREATE INDEX "Agent_knowledgeBaseId_idx" ON "Agent"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "_ClinicMemberToOrganization_B_index" ON "_ClinicMemberToOrganization"("B");

-- CreateIndex
CREATE INDEX "_ImmunizationToMedicalRecords_B_index" ON "_ImmunizationToMedicalRecords"("B");

-- AddForeignKey
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_members" ADD CONSTRAINT "clinic_members_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_members" ADD CONSTRAINT "clinic_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_members" ADD CONSTRAINT "clinic_members_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor_auth" ADD CONSTRAINT "two_factor_auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinicInvitation" ADD CONSTRAINT "clinicInvitation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinicInvitation" ADD CONSTRAINT "clinicInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingDays" ADD CONSTRAINT "WorkingDays_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingDays" ADD CONSTRAINT "WorkingDays_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_settings" ADD CONSTRAINT "clinic_settings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating" ADD CONSTRAINT "rating_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating" ADD CONSTRAINT "rating_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating" ADD CONSTRAINT "rating_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Diagnosis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "MedicalRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoseGuideline" ADD CONSTRAINT "DoseGuideline_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescribed_items" ADD CONSTRAINT "prescribed_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescribed_items" ADD CONSTRAINT "prescribed_items_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecords" ADD CONSTRAINT "MedicalRecords_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecords" ADD CONSTRAINT "MedicalRecords_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecords" ADD CONSTRAINT "MedicalRecords_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecords" ADD CONSTRAINT "MedicalRecords_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecordAccess" ADD CONSTRAINT "MedicalRecordAccess_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MedicalRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecordAccess" ADD CONSTRAINT "MedicalRecordAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_medicalId_fkey" FOREIGN KEY ("medicalId") REFERENCES "MedicalRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSigns" ADD CONSTRAINT "VitalSigns_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSigns" ADD CONSTRAINT "VitalSigns_medicalId_fkey" FOREIGN KEY ("medicalId") REFERENCES "MedicalRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSigns" ADD CONSTRAINT "VitalSigns_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Diagnosis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthRecord" ADD CONSTRAINT "GrowthRecord_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthRecord" ADD CONSTRAINT "GrowthRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthRecord" ADD CONSTRAINT "GrowthRecord_vitalSignsId_fkey" FOREIGN KEY ("vitalSignsId") REFERENCES "VitalSigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthRecord" ADD CONSTRAINT "GrowthRecord_medicalId_fkey" FOREIGN KEY ("medicalId") REFERENCES "MedicalRecords"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Immunization" ADD CONSTRAINT "Immunization_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Immunization" ADD CONSTRAINT "Immunization_administeredByStaffId_fkey" FOREIGN KEY ("administeredByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quota" ADD CONSTRAINT "user_quota_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MedicalRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedingLog" ADD CONSTRAINT "FeedingLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentalMilestone" ADD CONSTRAINT "DevelopmentalMilestone_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developmental_check" ADD CONSTRAINT "developmental_check_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_ex_clinic_id_fkey" FOREIGN KEY ("ex_clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_ex_subcat_id_fkey" FOREIGN KEY ("ex_subcat_id") REFERENCES "ExpenseSubCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSubCategory" ADD CONSTRAINT "ExpenseSubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileStorage" ADD CONSTRAINT "FileStorage_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileStorage" ADD CONSTRAINT "FileStorage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileStorage" ADD CONSTRAINT "FileStorage_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileStorage" ADD CONSTRAINT "FileStorage_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingFile" ADD CONSTRAINT "TrainingFile_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingFile" ADD CONSTRAINT "TrainingFile_fileStorageId_fkey" FOREIGN KEY ("fileStorageId") REFERENCES "FileStorage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBase" ADD CONSTRAINT "KnowledgeBase_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingWebsite" ADD CONSTRAINT "TrainingWebsite_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClinicMemberToOrganization" ADD CONSTRAINT "_ClinicMemberToOrganization_A_fkey" FOREIGN KEY ("A") REFERENCES "clinic_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClinicMemberToOrganization" ADD CONSTRAINT "_ClinicMemberToOrganization_B_fkey" FOREIGN KEY ("B") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImmunizationToMedicalRecords" ADD CONSTRAINT "_ImmunizationToMedicalRecords_A_fkey" FOREIGN KEY ("A") REFERENCES "Immunization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImmunizationToMedicalRecords" ADD CONSTRAINT "_ImmunizationToMedicalRecords_B_fkey" FOREIGN KEY ("B") REFERENCES "MedicalRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;
