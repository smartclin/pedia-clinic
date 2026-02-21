### Prisma Schema

'''
.
model TwoFactor {
  id          String @id
  secret      String
  backupCodes String
  userId      String
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([secret])
  @@index([userId])
  @@map("twoFactor")
}

model User {
  id                    String                @id @default(cuid())
  email                 String                @unique
  name                  String?
  emailVerified         Boolean               @default(false)
  image                 String?
  bio                   String?
  timezone              String?               @default("UTC")
  language              String?               @default("en")
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  isAdmin               Boolean               @default(false)
  banned                Boolean               @default(false)
  betterAuthId          String?               @unique
  sessions              Session[]
  accounts              Account[]
  clinics               ClinicMember[]
  invitations           clinicInvitation[]
  notifications         Notification[]
  auditLogs             AuditLog[]
  twoFactorAuth         TwoFactorAuth?
  passkeys              Passkey[]
  apiKeys               APIKey[]
  twoFactors            TwoFactor[]
  files                 File[]
  folders               Folder[]
  clinicId              String?
  role                  UserRole?
  doctor                Doctor?
  staff                 Staff?
  guardians             Guardian[]
  medicalRecordAccesses MedicalRecordAccess[]
  userQuotas            UserQuota[]
  patientAsUser         Patient?              @relation("PatientUser")
  patientsAsDoctor      Patient[]             @relation("UserAsDoctor")
  patientsCreated       Patient[]             @relation("PatientCreatedBy")
  fileStorages          FileStorage[]

  @@index([email])
  @@map("users")
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token        String   @unique
  expiresAt    DateTime
  ipAddress    String?
  userAgent    String?
  deviceName   String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastActiveAt DateTime @default(now())

  @@index([userId])
  @@index([token])
  @@map("sessions")
}

model Account {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId    String
  providerId   String
  accessToken  String?
  refreshToken String?
  idToken      String?
  expiresAt    DateTime?
  password     String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@unique([providerId, accountId])
  @@index([userId])
  @@map("accounts")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([identifier, value])
  @@index([identifier])
  @@map("verifications")
}

model ClinicMember {
  id       String   @id @default(cuid())
  clinicId String
  clinic   Clinic   @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  userId   String
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  roleId   String
  role     Role     @relation(fields: [roleId], references: [id])
  joinedAt DateTime @default(now())

  @@unique([clinicId, userId])
  @@index([clinicId])
  @@index([userId])
  @@map("clinic_members")
}

model Role {
  id          String             @id @default(cuid())
  clinicId    String
  clinic      Clinic             @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  name        String
  description String?
  permissions Json
  isSystem    Boolean            @default(false)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  members     ClinicMember[]
  invitations clinicInvitation[]

  @@unique([clinicId, name])
  @@index([clinicId])
  @@map("roles")
}

model clinicInvitation {
  id          String    @id @default(cuid())
  clinicId    String
  clinic      Clinic    @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  email       String?
  invitedById String
  invitedBy   User      @relation(fields: [invitedById], references: [id])
  roleId      String
  role        Role      @relation(fields: [roleId], references: [id])
  token       String    @unique
  type        String    @default("email")
  maxUses     Int?
  usedCount   Int       @default(0)
  status      String    @default("pending")
  expiresAt   DateTime
  acceptedAt  DateTime?
  createdAt   DateTime  @default(now())

  @@index([token])
  @@index([email])
  @@index([clinicId])
  @@map("invitations")
}

model Notification {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  message   String
  type      String    @default("info")
  read      Boolean   @default(false)
  readAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId, read])
  @@map("notifications")
}

model TwoFactorAuth {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  secret      String
  enabled     Boolean  @default(false)
  backupCodes String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("two_factor_auth")
}

model Passkey {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  credentialId String    @unique
  publicKey    String
  counter      Int       @default(0)
  deviceName   String?
  lastUsedAt   DateTime?
  createdAt    DateTime  @default(now())

  @@index([userId])
  @@map("passkeys")
}

model SystemSettings {
  id                   String    @id @default("system")
  clinicId             String?
  clinic               Clinic?   @relation(fields: [clinicId], references: [id])
  theme                String    @default("default")
  maintenanceMode      Boolean   @default(false)
  maintenanceMessage   String?
  maintenanceStartedAt DateTime?
  maintenanceEndTime   DateTime?
  updatedAt            DateTime  @updatedAt
  updatedBy            String?

  @@index([clinicId])
  @@map("system_settings")
}

model APIKey {
  id          String    @id @default(cuid())
  clinicId    String
  clinic      Clinic    @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  name        String
  key         String    @unique
  hashedKey   String
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  createdById String
  createdBy   User      @relation(fields: [createdById], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())

  @@index([clinicId])
  @@index([key])
  @@index([createdById])
  @@map("api_keys")
}

model Settings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("settings")
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action     String
  level      String
  details    String?
  resource   String?
  resourceId String?
  metadata   Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
  recordId   String?  @map("record_id")
  model      String
  clinic     Clinic?  @relation(fields: [clinicId], references: [id])
  message    String?
  timestamp  DateTime @default(now())
  clinicId   String?
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@index([userId])
  @@index([clinicId])
  @@index([createdAt])
  @@map("audit_logs")
}
model Todo {
  id        Int     @id @default(autoincrement())
  text      String
  completed Boolean @default(false)

  @@map("todo")
}

model Feature {
  id          String  @id @default(uuid())
  clinicId    String
  clinic      Clinic  @relation(fields: [clinicId], references: [id])
  title       String
  description String?
  icon        String?
  color       String?
  order       Int?
  isActive    Boolean @default(true)
}

model File {
  id         String   @id
  slug       String   @unique
  userId     String   @map("user_id")
  folderId   String?  @map("folder_id")
  filename   String
  searchText String   @default("") @map("search_text")
  size       Int
  mimeType   String   @map("mime_type")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  user   User    @relation(fields: [userId], references: [id])
  folder Folder? @relation(fields: [folderId], references: [id])

  @@index([slug], name: "idx_files_slug")
  @@index([searchText], name: "idx_files_search_text")
  @@index([folderId], name: "idx_files_folder_id")
  @@map("files")
}

model Folder {
  id        String   @id
  userId    String   @map("user_id")
  name      String
  parentId  String?  @map("parent_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user       User     @relation(fields: [userId], references: [id])
  parent     Folder?  @relation("subfolders", fields: [parentId], references: [id])
  subfolders Folder[] @relation("subfolders")
  files      File[]

  @@index([userId], name: "idx_folders_user_id")
  @@index([parentId], name: "idx_folders_parent_id")
  @@map("folders")
}

model Clinic {
  id             String             @id @default(uuid())
  name           String             @unique
  email          String?            @db.Text
  slug           String?            @unique
  description    String?
  archived       Boolean            @default(false)
  archivedAt     DateTime?
  archivedBy     String?
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  timezone       String?            @default("UTC")
  address        String?
  phone          String?            @db.Text
  logo           String?
  doctors        Doctor[]
  patients       Patient[]
  appointments   Appointment[]
  medicalRecords MedicalRecords[]
  clinicSettings ClinicSetting[]
  prescriptions  Prescription[]
  payments       Payment[]
  encounters     Diagnosis[]
  services       Service[]
  auditLogs      AuditLog[]
  staffs         Staff[]
  expenses       Expense[]
  workingDays    WorkingDays[]
  features       Feature[]
  systemSettings SystemSettings[]
  clinicMembers  ClinicMember[]
  ratings        Rating[]
  growthRecords  GrowthRecord[]
  roles          Role[]
  invitations    clinicInvitation[]
  apiKeys        APIKey[]
  fileStorages   FileStorage[]
  knowledgeBase  KnowledgeBase?
  agents         Agent[]

  @@index([archivedAt])
  @@index([slug])
  @@index([name])
  @@map("clinics")
}

model Doctor {
  id                   String              @id @default(uuid())
  email                String?             @db.VarChar(255)
  name                 String
  userId               String?             @unique
  clinicId             String?             @map("clinic_id")
  specialty            String              @db.Text
  licenseNumber        String?
  phone                String?             @db.Text
  address              String?
  department           String?
  img                  String?
  colorCode            String?
  availabilityStatus   AvailabilityStatus?
  availableFromWeekDay Int?                @map("available_from_week_day")
  availableToWeekDay   Int?                @map("available_to_week_day")
  isActive             Boolean?
  status               Status?
  availableFromTime    String?             @map("available_from_time")
  availableToTime      String?             @map("available_to_time")
  type                 JOBTYPE             @default(FULL)
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt
  appointmentPrice     Decimal             @map("appointment_price") @db.Decimal(10, 2)
  role                 UserRole?
  deletedAt            DateTime?
  isDeleted            Boolean?            @default(false)
  user                 User?               @relation(fields: [userId], references: [id], onDelete: Cascade)
  clinic               Clinic?             @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  workingDays          WorkingDays[]
  appointments         Appointment[]
  encounter            Diagnosis[]
  Prescription         Prescription[]
  medicalRecords       MedicalRecords[]
  ratings              Rating[]
  fileStorages         FileStorage[]

  @@index([clinicId, isActive])
  @@index([specialty, clinicId])
  @@index([isDeleted])
  @@map("doctors")
}

model WorkingDays {
  id        Int      @id @default(autoincrement())
  doctorId  String
  clinicId  String
  day       String
  startTime String
  closeTime String
  doctor    Doctor   @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  clinic    Clinic   @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([doctorId, day])
}

model Staff {
  id            String    @id @default(uuid())
  email         String?   @db.VarChar(255)
  name          String
  phone         String?   @db.Text
  userId        String?   @unique
  user          User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  clinicId      String?
  clinic        Clinic?   @relation(fields: [clinicId], references: [id])
  address       String
  department    String?
  img           String?
  licenseNumber String?
  colorCode     String?
  hireDate      DateTime? @default(now()) @db.Date
  salary        Float?
  role          UserRole
  status        Status?   @default(ACTIVE)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
  isActive      Boolean?

  immunizations Immunization[] @relation("AdministeredByStaff")

  @@index([deletedAt])
}

model Payment {
  id            String        @id @default(uuid())
  clinicId      String?
  clinic        Clinic?       @relation(fields: [clinicId], references: [id])
  billId        String?
  patientId     String?
  appointmentId String        @unique
  billDate      DateTime
  paymentDate   DateTime?     @db.Date
  discount      Decimal?      @db.Decimal(10, 2)
  totalAmount   Decimal?      @db.Decimal(10, 2)
  amountPaid    Decimal?      @db.Decimal(10, 2)
  patient       Patient?      @relation(fields: [patientId], references: [id], onDelete: Cascade)
  appointment   Appointment?  @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  amount        Decimal?      @db.Decimal(10, 2)
  status        PaymentStatus @default(PAID)
  insurance     String?
  insuranceId   String?
  serviceDate   DateTime?
  dueDate       DateTime?
  paidDate      DateTime?
  notes         String?
  deletedAt     DateTime?
  isDeleted     Boolean?      @default(false)
  paymentMethod PaymentMethod @default(CASH)
  receiptNumber Int           @default(autoincrement())
  bills         PatientBill[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([isDeleted])
  @@index([patientId, status])
  @@index([status, dueDate])
  @@index([patientId, paymentDate])
}

model Reminder {
  id            String         @id @default(uuid())
  appointmentId String         @unique
  appointment   Appointment    @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  method        ReminderMethod
  sentAt        DateTime
  status        ReminderStatus
}

model PatientBill {
  id          String   @id @default(uuid())
  billId      String
  serviceId   String
  serviceDate DateTime
  quantity    Int
  unitCost    Decimal? @db.Decimal(10, 2)
  totalCost   Decimal? @db.Decimal(10, 2)
  service     Service  @relation(fields: [serviceId], references: [id])
  payment     Payment  @relation(fields: [billId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Service {
  id           String           @id @default(uuid())
  serviceName  String
  description  String
  price        Decimal          @db.Decimal(10, 2)
  labtest      LabTest[]
  bills        PatientBill[]
  category     ServiceCategory?
  duration     Int?
  isAvailable  Boolean?         @default(true)
  clinicId     String?
  status       Status?          @default(ACTIVE)
  clinic       Clinic?          @relation(fields: [clinicId], references: [id])
  icon         String?
  color        String?
  appointments Appointment[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  isDeleted Boolean?  @default(false)

  @@unique([id, clinicId], name: "service_clinic")
  @@index([isDeleted])
  @@index([serviceName])
}

model ClinicSetting {
  id                         String   @id @default(uuid())
  clinicId                   String   @unique
  clinic                     Clinic   @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  openingTime                String
  closingTime                String
  workingDays                String[]
  defaultAppointmentDuration Int      @default(30)
  requireEmergencyContact    Boolean  @default(true)
  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt

  @@map("clinic_settings")
}

model WHOGrowthStandard {
  id              String           @id @default(uuid())
  ageInMonths     Int?             @map("age_in_months")
  ageDays         Int
  gender          Gender
  chartType       ChartType?       @map("chart_type")
  measurementType MeasurementType? @map("measuement_type")
  lValue          Float?           @map("l_value") @db.DoublePrecision
  mValue          Float?           @map("m_value") @db.DoublePrecision
  sValue          Float?           @map("s_value") @db.DoublePrecision
  sd0             Float?           @map("sd0") @db.DoublePrecision
  sd1neg          Float?           @map("sd1neg") @db.DoublePrecision
  sd1pos          Float?           @map("sd1pos") @db.DoublePrecision
  sd2neg          Float?           @map("sd2neg") @db.DoublePrecision
  sd2pos          Float?           @map("sd2pos") @db.DoublePrecision
  sd3neg          Float?           @map("sd3neg") @db.DoublePrecision
  sd3pos          Float?           @map("sd3pos") @db.DoublePrecision
  sd4neg          Float?           @map("sd4neg") @db.DoublePrecision
  sd4pos          Float?           @map("sd4pos") @db.DoublePrecision
  createdAt       DateTime         @default(now()) @db.Timestamp(3)
  updatedAt       DateTime         @updatedAt @db.Timestamp(3)

  @@map("who_growth_standards")
}

model Rating {
  id        Int      @id @default(autoincrement())
  clinicId  String?  @map("clinic_id")
  clinic    Clinic?  @relation(fields: [clinicId], references: [id])
  staffId   String?  @map("staff_id")
  patientId String?  @map("patient_id")
  rating    Int
  comment   String?
  doctor    Doctor?  @relation(fields: [staffId], references: [id], onDelete: Cascade)
  patient   Patient? @relation(fields: [patientId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("rating")
}

model Prescription {
  id              String           @id @default(uuid())
  medicalRecordId String           @map("medical_record_id")
  doctorId        String?
  patientId       String
  encounterId     String
  encounter       Diagnosis        @relation(fields: [encounterId], references: [id])
  medicationName  String?          @map("medication_name")
  instructions    String?          @map("instructions") @db.Text
  issuedDate      DateTime         @default(now()) @map("issued_date") @db.Timestamp(3)
  endDate         DateTime?        @map("end_date") @db.Timestamp(3)
  status          String           @default("active")
  medicalRecord   MedicalRecords   @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)
  doctor          Doctor?          @relation(fields: [doctorId], references: [id])
  patient         Patient          @relation(fields: [patientId], references: [id])
  clinicId        String?
  clinic          Clinic?          @relation(fields: [clinicId], references: [id])
  createdAt       DateTime         @default(now()) @db.Timestamp(3)
  updatedAt       DateTime         @updatedAt @db.Timestamp(3)
  prescribedItems PrescribedItem[]

  @@index([clinicId])
  @@map("prescriptions")
}

model Drug {
  id              String           @id @default(uuid())
  name            String           @unique
  guidelines      DoseGuideline[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  prescribedItems PrescribedItem[]
}

model DoseGuideline {
  id                     String   @id @default(uuid())
  drugId                 String
  route                  String
  clinicalIndication     String
  minDosePerKg           Float?
  maxDosePerKg           Float?
  doseUnit               String?
  frequencyDays          String?
  gestationalAgeWeeksMin Float?
  gestationalAgeWeeksMax Float?
  postNatalAgeDaysMin    Float?
  postNatalAgeDaysMax    Float?
  maxDosePer24h          Float?
  stockConcentrationMgMl Float?
  finalConcentrationMgMl Float?
  minInfusionTimeMin     Int?
  compatibilityDiluent   String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  drug                   Drug     @relation(fields: [drugId], references: [id])
}

model PrescribedItem {
  id             String       @id @default(uuid())
  prescriptionId String
  drugId         String
  dosageValue    Float
  dosageUnit     DosageUnit
  frequency      String
  duration       String
  instructions   String?      @db.Text
  drugRoute      DrugRoute?
  prescription   Prescription @relation(fields: [prescriptionId], references: [id], onDelete: Cascade)
  drug           Drug         @relation(fields: [drugId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@map("prescribed_items")
}

enum UserRole {
  ADMIN
  STAFF
  DOCTOR
  OWNER
  PATIENT
}

enum EncounterType {
  CONSULTATION
  VACCINATION
  SCREENING
  FOLLOW_UP
  NUTRITION
  NEWBORN
  LACTATION
  OTHER
}

enum EncounterStatus {
  PENDING
  COMPLETED
  CANCELLED
}

enum AvailabilityStatus {
  AVAILABLE
  UNAVAILABLE
}

enum GrowthStatus {
  NORMAL
  OBESE
  OVERWEIGHT
  UNDERWEIGHT
  STUNTED
}

enum AppointmentType {
  CONSULTATION
  VACCINATION
  PROCEDURE
  EMERGENCY
  CHECKUP
  FOLLOW_UP
  FEEDING_SESSION
  OTHER
}

enum Status {
  ACTIVE
  INACTIVE
  DORMANT
}

enum JOBTYPE {
  FULL
  PART
}

enum Gender {
  MALE
  FEMALE
}

enum AppointmentStatus {
  PENDING
  SCHEDULED
  CANCELLED
  COMPLETED
  NO_SHOW
}

enum PaymentMethod {
  CASH
  CARD
  MOBILE
}

enum PaymentStatus {
  PAID
  UNPAID
  PARTIAL
  REFUNDED
}

enum ServiceCategory {
  CONSULTATION
  LAB_TEST
  VACCINATION
  PROCEDURE
  PHARMACY
  DIAGNOSIS
  OTHER
}

enum MeasurementType {
  Weight
  Height
  HeadCircumference
}

enum ChartType {
  WFA
  HFA
  HcFA
}

enum ReminderMethod {
  EMAIL
  SMS
}

enum ReminderStatus {
  SENT
  FAILED
  PENDING
}

enum NotificationType {
  APPOINTMENT_REMINDER
  BILLING
  GENERAL
  SECURITY
}

enum FeedingType {
  BREAST
  FORMULA
  MIXED
}

enum DevelopmentStatus {
  NORMAL
  DELAYED
  ADVANCED
  CONCERNING
}

enum ImmunizationStatus {
  COMPLETED
  PENDING
  OVERDUE
  DELAYED
  EXEMPTED
}

enum DosageUnit {
  MG
  ML
  TABLET
  MCG
  G
  IU
  DROP
  SPRAY
  PUFF
  UNIT
}

enum DrugRoute {
  IV
  PO
  IM
  SC
  TOPICAL
  INHALED
  RECTAL
  SUBLINGUAL
  BUCCAL
  TRANSDERMAL
}

model Guardian {
  id        String  @id @default(uuid())
  patientId String
  userId    String
  relation  String
  isPrimary Boolean @default(false)
  phone     String?
  email     String?
  patient   Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([patientId])
  @@index([userId])
}

enum LabStatus {
  PENDING
  COMPLETED
  REVIEWED
  CANCELLED
}

model Patient {
  id                      String                   @id @default(uuid())
  clinicId                String
  userId                  String                   @unique
  email                   String?                  @unique @db.VarChar(255)
  phone                   String?                  @db.Text
  emergencyContactNumber  String?                  @db.Text
  firstName               String
  lastName                String
  dateOfBirth             DateTime
  ageMonths               Int?
  ageDays                 Int?
  gender                  Gender                   @default(MALE)
  maritalStatus           String?
  nutritionalStatus       String?
  address                 String?
  emergencyContactName    String?                  @db.Text
  relation                String?
  allergies               String?                  @db.Text
  medicalConditions       String?                  @db.Text
  medicalHistory          String?                  @db.Text
  image                   String?                  @db.Text
  colorCode               String?
  role                    UserRole?
  status                  Status?                  @default(ACTIVE)
  isActive                Boolean?                 @default(true)
  deletedAt               DateTime?
  isDeleted               Boolean?                 @default(false)
  createdById             String?
  updatedById             String?
  bloodGroup              String?                  @db.Text
  createdAt               DateTime                 @default(now())
  updatedAt               DateTime                 @updatedAt
  clinic                  Clinic                   @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  user                    User                     @relation("PatientUser", fields: [userId], references: [id], onDelete: Cascade)
  createdBy               User?                    @relation("PatientCreatedBy", fields: [createdById], references: [id])
  appointments            Appointment[]
  medicalRecords          MedicalRecords[]
  encounters              Diagnosis[]
  immunizations           Immunization[]
  vitalSigns              VitalSigns[]
  feedingLogs             FeedingLog[]
  prescriptions           Prescription[]
  ratings                 Rating[]
  developmentalChecks     DevelopmentalCheck[]
  developmentalMilestones DevelopmentalMilestone[]
  growthRecords           GrowthRecord[]
  payments                Payment[]
  guardians               Guardian[]
  doctorId                String?
  doctor                  User?                    @relation("UserAsDoctor", fields: [doctorId], references: [id])
  fileStorages            FileStorage[]

  @@index([clinicId, isActive, isDeleted])
  @@index([clinicId, dateOfBirth])
  @@index([lastName, firstName, clinicId])
  @@index([createdAt(sort: Desc)])
  @@index([clinicId, status])
  @@map("patients")
}

model Appointment {
  id               String             @id @default(uuid())
  patientId        String
  doctorId         String
  serviceId        String?
  doctorSpecialty  String?
  clinicId         String
  appointmentDate  DateTime
  time             String?
  appointmentPrice Decimal?           @map("appointment_price_in_cents") @db.Decimal(10, 2)
  status           AppointmentStatus? @default(PENDING)
  type             AppointmentType
  note             String?
  reason           String?
  deletedAt        DateTime?
  isDeleted        Boolean?           @default(false)
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  duration         Int?
  patient          Patient            @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctor           Doctor             @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  clinic           Clinic             @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  service          Service?           @relation(fields: [serviceId], references: [id])
  bills            Payment[]
  medical          MedicalRecords[]
  reminders        Reminder[]
  encounters       Diagnosis[]

  @@index([clinicId, appointmentDate, status])
  @@index([doctorId, appointmentDate, status])
  @@index([patientId, appointmentDate(sort: Desc)])
  @@index([status, appointmentDate])
  @@index([type, appointmentDate])
  @@index([isDeleted])
}

model MedicalRecords {
  id             String                @id @default(uuid())
  patientId      String
  appointmentId  String
  doctorId       String?
  clinicId       String
  diagnosis      String?
  symptoms       String?
  treatmentPlan  String?
  labRequest     String?
  notes          String?
  attachments    String?
  followUpDate   DateTime?
  deletedAt      DateTime?
  isDeleted      Boolean?              @default(false)
  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt
  patient        Patient?              @relation(fields: [patientId], references: [id], onDelete: Cascade)
  appointment    Appointment           @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  doctor         Doctor?               @relation(fields: [doctorId], references: [id], onDelete: SetNull)
  clinic         Clinic                @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  labTest        LabTest[]
  immunizations  Immunization[]
  prescriptions  Prescription[]
  vitalSigns     VitalSigns[]
  encounter      Diagnosis[]
  growthRecords  GrowthRecord[]
  subjective     String?               @db.Text
  objective      String?               @db.Text
  assessment     String?               @db.Text
  plan           String?               @db.Text
  isConfidential Boolean               @default(false)
  accessLevel    AccessLevel           @default(STANDARD)
  lastAccessedAt DateTime?
  lastAccessedBy String?
  accessLogs     MedicalRecordAccess[]

  @@unique([patientId, appointmentId])
  @@index([patientId, createdAt(sort: Desc)])
  @@index([doctorId, createdAt(sort: Desc)])
  @@index([clinicId, createdAt(sort: Desc)])
  @@index([followUpDate, clinicId])
  @@index([patientId, isConfidential])
  @@index([lastAccessedAt])
  @@index([doctorId])
  @@index([isDeleted])
}

model MedicalRecordAccess {
  id         String         @id @default(uuid())
  recordId   String
  record     MedicalRecords @relation(fields: [recordId], references: [id], onDelete: Cascade)
  userId     String
  user       User           @relation(fields: [userId], references: [id])
  accessType AccessType
  purpose    String?
  ipAddress  String?
  userAgent  String?
  accessedAt DateTime       @default(now())

  @@index([recordId, accessedAt])
  @@index([userId, accessedAt])
}

enum AccessLevel {
  STANDARD
  SENSITIVE
  RESTRICTED
}

enum AccessType {
  VIEW
  EDIT
  PRINT
  EXPORT
}

model Diagnosis {
  id                    String           @id @default(uuid())
  patientId             String
  doctorId              String
  clinicId              String?
  appointmentId         String?
  medicalId             String           @unique
  date                  DateTime         @default(now())
  type                  String?
  diagnosis             String?
  treatment             String?
  notes                 String?
  symptoms              String
  prescribedMedications String?
  followUpPlan          String?
  deletedAt             DateTime?
  isDeleted             Boolean?         @default(false)
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  status                EncounterStatus? @default(PENDING)
  typeOfEncounter       EncounterType?   @default(CONSULTATION)
  patient               Patient          @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctor                Doctor           @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  clinic                Clinic?          @relation(fields: [clinicId], references: [id])
  appointment           Appointment?     @relation(fields: [appointmentId], references: [id])
  medical               MedicalRecords   @relation(fields: [medicalId], references: [id], onDelete: Cascade)
  vitalSigns            VitalSigns[]
  prescriptions         Prescription[]

  @@index([clinicId, date])
  @@index([doctorId, date])
  @@index([patientId, date])
  @@index([isDeleted])
}

model VitalSigns {
  id               String         @id @default(uuid())
  patientId        String
  medicalId        String         @unique
  encounterId      String?        @unique
  recordedAt       DateTime       @default(now())
  bodyTemperature  Float?
  systolic         Int?
  diastolic        Int?
  heartRate        Int?
  respiratoryRate  Int?
  oxygenSaturation Int?
  height           Float?
  weight           Float?
  bmi              Float?
  gender           Gender?
  notes            String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  ageDays          Int?
  ageMonths        Int?
  patient          Patient        @relation(fields: [patientId], references: [id], onDelete: Cascade)
  medical          MedicalRecords @relation(fields: [medicalId], references: [id], onDelete: Cascade)
  encounter        Diagnosis?     @relation(fields: [encounterId], references: [id], onDelete: Cascade)
  growthRecords    GrowthRecord[]

  @@index([patientId, recordedAt])
  @@index([encounterId])
}

model GrowthRecord {
  id                String           @id @default(uuid())
  patientId         String
  clinicId          String?
  clinic            Clinic?          @relation(fields: [clinicId], references: [id])
  gender            Gender?
  medicalId         String?          @unique
  vitalSignsId      String?          @unique
  ageDays           Int?
  ageMonths         Int?
  ageYears          Int?
  percentile        Decimal?         @db.Decimal(4, 3)
  zScore            Decimal?         @db.Decimal(4, 3)
  headCircumference Decimal?         @db.Decimal(5, 2)
  bmi               Decimal?         @db.Decimal(5, 2)
  weightForAgeZ     Decimal?         @db.Decimal(4, 3)
  heightForAgeZ     Decimal?         @db.Decimal(4, 3)
  bmiForAgeZ        Decimal?         @db.Decimal(4, 3)
  hcForAgeZ         Decimal?         @db.Decimal(4, 3)
  weight            Float?
  height            Float?
  notes             String?
  growthStatus      GrowthStatus?    @default(NORMAL)
  date              DateTime
  recordedAt        DateTime?        @default(now())
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  classification    String?
  deletedAt         DateTime?
  measurementType   MeasurementType?
  patient           Patient          @relation(fields: [patientId], references: [id], onDelete: Cascade)
  vitalSigns        VitalSigns?      @relation(fields: [vitalSignsId], references: [id])
  medical           MedicalRecords?  @relation(fields: [medicalId], references: [id])

  @@index([patientId, date])
}

model Immunization {
  id                    String              @id @default(uuid())
  patientId             String
  vaccine               String
  date                  DateTime
  dose                  String?
  lotNumber             String?
  administeredByStaffId String?
  notes                 String?
  createdAt             DateTime            @default(now())
  deletedAt             DateTime?
  isDeleted             Boolean?            @default(false)
  status                ImmunizationStatus?
  updatedAt             DateTime            @updatedAt
  isOverDue             Boolean?            @default(false)
  daysOverDue           Int?
  patient               Patient             @relation(fields: [patientId], references: [id], onDelete: Cascade)
  administeredBy        Staff?              @relation("AdministeredByStaff", fields: [administeredByStaffId], references: [id])
  medicalRecords        MedicalRecords[]

  @@index([patientId, vaccine, date])
  @@index([patientId, date])
}

model ConfigStore {
  key   String @id
  value String

  @@map("config_store")
}

model UserQuota {
  userId         String   @id @map("user_id")
  quota          Int      @default(0)
  usedQuota      Int      @default(0) @map("used_quota")
  fileCount      Int      @default(0) @map("file_count")
  fileCountQuota Int      @default(0) @map("file_count_quota")
  inviteCount    Int      @default(0) @map("invite_count")
  inviteQuota    Int      @default(0) @map("invite_quota")
  updatedAt      DateTime @default(now()) @updatedAt @map("updated_at")
  user           User     @relation(fields: [userId], references: [id])

  @@map("user_quota")
}

model LabTest {
  id            String         @id @default(uuid())
  recordId      String
  serviceId     String
  testDate      DateTime
  result        String
  status        LabStatus
  notes         String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  medicalRecord MedicalRecords @relation(fields: [recordId], references: [id], onDelete: Cascade)
  service       Service        @relation(fields: [serviceId], references: [id])

  @@index([serviceId])
  @@index([recordId])
}

model FeedingLog {
  id        String      @id @default(uuid())
  patientId String
  patient   Patient     @relation(fields: [patientId], references: [id], onDelete: Cascade)
  date      DateTime    @default(now())
  type      FeedingType
  duration  Int?
  amount    Float?
  breast    String?
  notes     String?

  @@index([patientId, date])
}

model DevelopmentalMilestone {
  id           Int      @id @default(autoincrement())
  patientId    String
  milestone    String
  ageAchieved  String
  dateRecorded DateTime
  notes        String?
  createdBy    String?
  updatedBy    String?
  patient      Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model DevelopmentalCheck {
  id                Int               @id @default(autoincrement())
  patientId         String
  checkDate         DateTime
  ageMonths         Int
  motorSkills       DevelopmentStatus
  languageSkills    DevelopmentStatus
  socialSkills      DevelopmentStatus
  cognitiveSkills   DevelopmentStatus
  milestonesMet     String?
  milestonesPending String?
  concerns          String?
  recommendations   String?
  patient           Patient           @relation(fields: [patientId], references: [id], onDelete: Cascade)
  createdAt         DateTime          @default(now()) @map("createdAt")
  updatedAt         DateTime          @updatedAt @map("updatedAt")

  @@index([patientId, checkDate])
  @@index([ageMonths])
  @@map("developmental_check")
}

model VaccineSchedule {
  id              Int      @id @default(autoincrement())
  vaccineName     String   @map("vaccine_name")
  recommendedAge  String
  dosesRequired   Int      @map("doses_required")
  minimumInterval Int?
  isMandatory     Boolean  @default(true) @map("is_mandatory")
  description     String?
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  ageInDaysMin    Int?
  ageInDaysMax    Int?

  @@unique([vaccineName, recommendedAge])
  @@index([ageInDaysMin, ageInDaysMax])
  @@map("vaccine_schedule")
}

model Expense {
  id            String             @id @default(cuid())
  clinicId      String             @map("ex_clinic_id")
  subCategoryId String             @map("ex_subcat_id")
  amount        Decimal            @db.Decimal(12, 2)
  date          DateTime           @db.Timestamptz(6)
  description   String?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  clinic        Clinic             @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  subCategory   ExpenseSubCategory @relation(fields: [subCategoryId], references: [id])

  @@index([clinicId, date(sort: Desc)], name: "ex_clinic_date_idx")
  @@index([subCategoryId, date], name: "ex_cat_date_idx")
  @@map("expense")
}

model ExpenseCategory {
  id            String               @id @default(cuid())
  name          String
  color         String?
  subCategories ExpenseSubCategory[]
}

model ExpenseSubCategory {
  id         String          @id @default(cuid())
  name       String
  color      String?
  categoryId String
  category   ExpenseCategory @relation(fields: [categoryId], references: [id])
  expenses   Expense[]
}

enum SavedFilterType {
  medical_records
  patients
  appointments
  lab_tests
}
model FileStorage {
  id          String    @id @default(uuid())
  fileName    String
  filePath    String    @unique
  fileType    String?
  fileSize    Int?
  mimeType    String?
  isSecure    Boolean   @default(false)
  accessToken String?   @unique
  tokenExpiry DateTime?
  description String?
  metadata    Json?
    clinicId    String?
  clinic      Clinic?   @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  userId      String?
  user        User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
status      String?
uploadExpiresAt     DateTime?
  doctorId      String?
  doctor        Doctor?        @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  patientId     String?
  patient       Patient?       @relation(fields: [patientId], references: [id], onDelete: Cascade)
  trainingFiles TrainingFile[]

  @@index([clinicId])
  @@index([userId])
  @@index([accessToken])
}

model TrainingFile {
  id              String             @id @default(uuid())
  knowledgeBaseId String
  knowledgeBase   KnowledgeBase      @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  fileStorageId   String
  fileStorage     FileStorage        @relation(fields: [fileStorageId], references: [id], onDelete: Cascade)
  status          TrainingFileStatus @default(PENDING)
  errorMessage    String?
  processedAt     DateTime?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@index([knowledgeBaseId])
  @@index([fileStorageId])
}

enum TrainingFileStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum KnowledgeBaseStatus {
  PENDING
  CREATING
  READY
  ERROR
}

model KnowledgeBase {
  id            String              @id @default(uuid())
  clinicId      String
  clinic        Clinic              @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  name          String
  description   String?
  vectorStoreId String?             @unique // OpenAI Vector Store ID
  status        KnowledgeBaseStatus @default(PENDING)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  agents           Agent[]
  trainingFiles    TrainingFile[]
  trainingWebsites TrainingWebsite[]

  // One knowledge base per clinic
  @@unique([clinicId])
  @@index([clinicId])
  @@index([vectorStoreId])
}

model TrainingWebsite {
  id              String                @id @default(uuid())
  knowledgeBaseId String
  knowledgeBase   KnowledgeBase         @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  url             String
  status          TrainingWebsiteStatus @default(PENDING)
  errorMessage    String?
  processedAt     DateTime?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  @@index([knowledgeBaseId])
  @@index([url])
}

enum TrainingWebsiteStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model Agent {
  id              String         @id @default(uuid())
  clinicId        String
  clinic          Clinic         @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  knowledgeBaseId String?
  knowledgeBase   KnowledgeBase? @relation(fields: [knowledgeBaseId], references: [id], onDelete: SetNull)
  name            String
  description     String?
  systemPrompt    String?
  model           String         @default("gpt-4")
  temperature     Float          @default(0.7)
  maxTokens       Int?
  isActive        Boolean        @default(true)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([clinicId])
  @@index([knowledgeBaseId])
}

view ClinicDashboardMV {
  clinicId   String
  clinicName String

  // Appointment stats
  totalAppointments     Int
  todayAppointments     Int
  upcomingAppointments  Int
  completedAppointments Int

  // Patient stats
  totalPatients        Int
  activePatients       Int
  newPatientsThisMonth Int

  // Financial stats
  monthlyRevenue  Float
  pendingPayments Float
  totalRevenue    Float

  // Doctor stats
  activeDoctors       Int
  averageDoctorRating Float

  // Pediatric-specific stats
  immunizationsDue    Int
  growthChecksPending Int

  // Staff stats
  totalStaff Int

  updatedAt DateTime
}

// =========== PATIENT OVERVIEW VIEW ===========

view PatientOverviewMV {
  patientId           String
  patientPublicId     String
  fullName            String
  dateOfBirth         DateTime?
  ageMonths           Int?
  gender              String?
  bloodGroup          String?
  medicalRecordNumber String

  // Contact info
  phone   String?
  email   String?
  address String?

  // Medical info
  allergies            String?
  medicalConditions    String?
  primaryCarePhysician String?

  // Appointment stats
  totalAppointments    Int
  lastAppointmentDate  DateTime?
  upcomingAppointments Int

  // Medical stats
  totalDiagnosis      Int
  totalPrescriptions  Int
  activePrescriptions Int

  // Immunization stats
  totalImmunizations   Int
  pendingImmunizations Int

  // Growth stats
  lastWeight      Float?
  lastHeight      Float?
  lastGrowthCheck DateTime?

  // Guardian info
  primaryGuardian String?
  guardianPhone   String?

  clinicId  String
  updatedAt DateTime
}

// =========== DOCTOR PERFORMANCE VIEW ===========

view DoctorPerformanceMV {
  doctorId          String
  doctorPublicId    String
  name              String
  specialty         String?
  email             String?
  phone             String?
  rating            Float?
  yearsOfExperience Int?

  // Appointment stats
  totalAppointments     Int
  appointmentsThisMonth Int
  completedAppointments Int
  cancellationRate      Float

  // Patient stats
  totalPatients        Int
  newPatientsThisMonth Int

  // Revenue stats
  totalRevenue   Float
  monthlyRevenue Float

  // Prescription stats
  totalPrescriptions  Int
  activePrescriptions Int

  // Rating stats
  averagePatientRating Float
  totalRatings         Int

  // Schedule stats
  averagePatientsPerDay Float
  utilizationRate       Float

  clinicId  String
  updatedAt DateTime
}

// =========== FINANCIAL OVERVIEW VIEW ===========

view FinancialOverviewMV {
  clinicId   String
  clinicName String

  // Revenue by month
  currentMonthRevenue  Float
  previousMonthRevenue Float

  // Revenue by category
  consultationRevenue Float
  procedureRevenue    Float
  labRevenue          Float
  vaccinationRevenue  Float

  // Payment status
  totalRevenue  Float
  paidAmount    Float
  pendingAmount Float

  // Expense breakdown
  totalExpenses         Float
  payrollExpenses       Float
  medicalSupplyExpenses Float
  facilityExpenses      Float

  // Net profit
  netProfit    Float
  profitMargin Float

  // Top revenue sources
  topService String?
  topDoctor  String?

  updatedAt DateTime
}

// =========== APPOINTMENT SCHEDULE VIEW ===========

view AppointmentScheduleMV {
  appointmentId       String
  appointmentPublicId String
  date                DateTime
  startTime           String?
  durationMinutes     Int?
  status              String
  type                String?
  reason              String?

  // Patient info
  patientId        String
  patientPublicId  String
  patientName      String
  patientAgeMonths Int?
  patientGender    String?
  patientPhone     String?

  // Doctor info
  doctorId        String
  doctorPublicId  String
  doctorName      String
  doctorSpecialty String?
  doctorColorCode String?

  // Service info
  serviceId       String?
  serviceName     String?
  serviceCategory String?
  servicePrice    Float?

  // Billing info
  paymentStatus String?
  totalAmount   Float?
  amountPaid    Float?

  clinicId  String
  updatedAt DateTime
}

// =========== PATIENT GROWTH CHART VIEW ===========

view PatientGrowthChartMV {
  patientId       String
  patientPublicId String
  fullName        String
  gender          String?
  dateOfBirth     DateTime?

  // Growth records
  ageDays   Int?
  ageMonths Int?

  // Measurements
  weight            Float?
  height            Float?
  headCircumference Float?
  bmi               Float?

  // WHO Percentiles
  weightForAgeZ Float?
  heightForAgeZ Float?
  hcForAgeZ     Float?

  // WHO Percentile classifications
  weightPercentile String?
  heightPercentile String?
  growthStatus     String?
  recordedBy       String?
  notes            String?
  recordedAt       DateTime
  clinicId         String
  updatedAt        DateTime
}

// =========== IMMUNIZATION SCHEDULE VIEW ===========

view ImmunizationScheduleMV {
  patientId       String
  patientPublicId String
  fullName        String
  dateOfBirth     DateTime?
  ageMonths       Int?

  // Immunization info
  immunizationId     String
  vaccineName        String
  doseNumber         Int?
  totalDoses         Int?
  administrationDate DateTime?
  nextDueDate        DateTime?
  status             String

  // Schedule info
  recommendedAgeDays Int?
  isMandatory        Boolean?
  description        String?

  // Timing
  daysOverdue  Int?
  daysUntilDue Int?
  isOverdue    Boolean

  // Admin info
  administeringDoctor String?
  manufacturer        String?
  batchNumber         String?
  notes               String?

  clinicId  String
  updatedAt DateTime
}

// =========== MEDICAL RECORDS VIEW ===========

view MedicalRecordsMV {
  medicalRecordId       String
  medicalRecordPublicId String

  // Patient info
  patientId             String
  patientPublicId       String
  patientName           String
  patientAgeAtDiagnosis Int?

  // Doctor info
  doctorId        String
  doctorPublicId  String
  doctorName      String
  doctorSpecialty String?

  // Diagnosis info
  encounterId   String?
  encounterDate DateTime?
  encounterType String?
  diagnosis     String?
  treatment     String?

  // Appointment info
  appointmentId     String?
  appointmentDate   DateTime?
  appointmentReason String?

  // SOAP Notes
  subjective String?
  objective  String?
  assessment String?
  plan       String?

  // Medical data
  symptoms       String?
  medications    String?
  followUpDate   DateTime?
  isConfidential Boolean?

  // Vital signs at time of encounter
  temperature      Float?
  heartRate        Int?
  systolic         Int?
  diastolic        Int?
  respiratoryRate  Int?
  oxygenSaturation Float?
  weight           Float?
  height           Float?

  // Prescriptions from this encounter
  prescriptionCount Int

  // Lab tests from this encounter
  labTestCount Int

  clinicId  String
  updatedAt DateTime
}

// =========== NOTIFICATIONS VIEW ===========

view NotificationsMV {
  notificationId       String
  notificationPublicId String

  // User info
  userId String

  // Notification content
  type    String
  title   String
  message String
  data    Json?

  // Status
  isRead    Boolean
  priority  String?
  actionUrl String?

  // Timing
  createdAt DateTime
  expiresAt DateTime?

  // Clinic context
  clinicId   String?
  clinicName String?

  // Notification metadata
  daysSinceCreated Int?
  isExpired        Boolean

  // Related entity info
  relatedPatientId     String?
  relatedAppointmentId String?
  relatedDoctorId      String?

  updatedAt DateTime
}

// =========== EXPENSE ANALYSIS VIEW ===========

view ExpenseAnalysisMV {
  clinicId   String
  clinicName String

  // Expense by category
  expenseCategoryId    String
  expenseCategoryName  String
  expenseCategoryColor String?

  // Expense by subcategory
  expenseSubcategoryId    String
  expenseSubcategoryName  String
  expenseSubcategoryColor String?

  // Expense details
  expenseId       String
  expensePublicId String
  amount          Float
  date            DateTime
  description     String?

  // Time analysis
  year      Int
  month     Int
  monthName String
  quarter   Int

  // Trend analysis
  monthlyAverage     Float?
  categoryPercentage Float?

  // Comparison metrics
  previousMonthAmount  Float?
  monthOverMonthChange Float?

  updatedAt DateTime
}
