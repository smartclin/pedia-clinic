/**
 * 🏷️ Hierarchical Cache Tags
 * Following BEST_PRACTICES.md - Hierarchical structure for precise invalidation
 */
export const CACHE_TAGS = {
	// ==================== ADMIN ====================
	admin: {
		range: (clinicId: string, from: Date, to: Date) =>
			`admin:dashboard:${clinicId}:${from.toISOString()}:${to.toISOString()}`,
		activity: (userId: string) => `admin:activity:${userId}`,
		activityByClinic: (clinicId: string) => `admin:activity:clinic:${clinicId}`,
		dashboard: (clinicId: string) => `admin:dashboard:${clinicId}`,
		reports: (clinicId: string, reportType: string) =>
			`admin:reports:${reportType}:clinic:${clinicId}`,
	},

	// ==================== APPOINTMENT ====================
	appointment: {
		all: 'appointments:all',
		analytics: (clinicId: string) => `appointments:analytics:${clinicId}`,
		details: (appointmentId: string) => `appointment:${appointmentId}`,
		byClinic: (clinicId: string) => `appointments:clinic:${clinicId}`,
		byDate: (date: Date) => `appointments:date:${date}`,
		byDateRange: (from: string, to: string) =>
			`appointments:range:${from}:${to}`,
		byDoctor: (doctorId: string) => `appointments:doctor:${doctorId}`,
		byId: (id: string) => `appointment:${id}`,
		byPatient: (patientId: string) => `appointments:patient:${patientId}`,
		byStatus: (status: string, clinicId: string) =>
			`appointments:status:${status}:clinic:${clinicId}`,
		past: (clinicId: string) => `appointments:past:${clinicId}`,
		list: (clinicId: string) => `appointments:list:${clinicId}`,
		today: (clinicId: string) => `appointments:today:${clinicId}`,
		upcoming: (clinicId: string) => `appointments:upcoming:${clinicId}`,
	},

	// Appointment tags
	appointments: (clinicId: string) => `clinic-${clinicId}-appointments`,
	appointmentsByDoctor: (doctorId: string) => `doctor-${doctorId}-appointments`,

	// ==================== CLINIC ====================
	clinic: {
		activity: (clinicId: string) => `clinic:${clinicId}:activity`,
		all: 'clinics:all',
		bills: (clinicId: string) => `clinic:${clinicId}:bills`,
		byId: (id: string) => `clinic:${id}`,
		counts: (clinicId: string) => `clinic:${clinicId}:counts`,
		dashboard: (clinicId: string) => `clinic:${clinicId}:dashboard`,
		features: (clinicId: string) => `clinic:${clinicId}:features`,
		members: (clinicId: string) => `clinic:${clinicId}:members`,
		patients: (clinicId: string) => `clinic:${clinicId}:patients`,
		payments: (clinicId: string) => `clinic:${clinicId}:payments`,
		settings: (clinicId: string) => `clinic:${clinicId}:settings`,
		stats: 'clinic:stats:global',
	},
	clinicDashboard: (clinicId: string) => `clinic-${clinicId}-dashboard`,
	clinicSettings: (clinicId: string) => `clinic-${clinicId}-settings`,
	clinicStats: (clinicId: string) => `clinic-${clinicId}-stats`,

	// ==================== DOCTOR ====================
	doctor: {
		all: 'doctors:all',
		slots: (doctorId: string) => `doctor:${doctorId}:slots`,
		appointments: (doctorId: string) => `doctor:${doctorId}:appointments`,
		byClinic: (clinicId: string) => `doctors:clinic:${clinicId}`,
		byId: (id: string) => `doctor:${id}`,
		bySpecialty: (specialty: string, clinicId: string) =>
			`doctors:specialty:${specialty}:clinic:${clinicId}`,
		performance: (doctorId: string) => `doctor:${doctorId}:performance`,
		ratings: (doctorId: string) => `doctor:${doctorId}:ratings`,
		// Nested resources
		workingDays: (doctorId: string) => `doctor:${doctorId}:working-days`,
	},
	doctorAppointments: (doctorId: string) => `doctor-${doctorId}-appointments`,
	doctorSchedule: (doctorId: string) => `doctor-${doctorId}-schedule`,

	// Doctor tags
	doctors: (clinicId: string) => `clinic-${clinicId}-doctors`,

	// ==================== DRUG ====================
	drug: {
		all: 'drugs:all',
		byId: (id: string) => `drug:${id}`,
		byName: (name: string) => `drug:name:${name}`,
		guidelines: (drugId: string) => `drug:${drugId}:guidelines`,
		search: (query: string) => `drugs:search:${query}`,
	},

	// ==================== FINANCIAL ====================
	financial: {
		bill: {
			byClinic: (clinicId: string) => `bills:clinic:${clinicId}`,
			byId: (id: string) => `bill:${id}`,
			byPatient: (patientId: string) => `bills:patient:${patientId}`,
			byPayment: (paymentId: string) => `bills:payment:${paymentId}`,
		},
		expense: {
			byCategory: (categoryId: string) => `expenses:category:${categoryId}`,
			byClinic: (clinicId: string) => `expenses:clinic:${clinicId}`,
			byDate: (date: string) => `expenses:date:${date}`,
			byId: (id: string) => `expense:${id}`,
		},
		payment: {
			stats: (clinicId: string) => `payments:stats:${clinicId}`,
			recent: (clinicId: string) => `payments:recent:${clinicId}`,
			byClinic: (clinicId: string) => `payments:clinic:${clinicId}`,
			byId: (id: string) => `payment:${id}`,
			byPatient: (patientId: string) => `payments:patient:${patientId}`,
			byStatus: (status: string, clinicId: string) =>
				`payments:status:${status}:clinic:${clinicId}`,
		},
	},

	// ==================== GROWTH ====================
	growth: {
		batchZScores: (hash: string) => `growth:zscore:batch:${hash}`,
		byClinic: (clinicId: string) => `growth:clinic:${clinicId}`,
		// Basic
		byId: (id: string) => `growth:${id}`,
		byPatient: (patientId: string) => `growth:patient:${patientId}`,
		recent: (clinicId: string) => `growth:recent:clinic:${clinicId}`,
		// Charts
		chartData: (gender: string, type: string) =>
			`growth:chart:${gender}:${type}`,
		comparisonByPatient: (patientId: string) =>
			`growth:comparison:patient:${patientId}`,

		// Overview
		overviewByClinic: (clinicId: string) =>
			`growth:overview:clinic:${clinicId}`,
		patientAllGrowth: (patientId: string) => `growth:patient:${patientId}:all`,
		patientChartData: (patientId: string, type: string) =>
			`growth:chart:patient:${patientId}:${type}`,

		// Calculations
		percentileByPatient: (patientId: string) =>
			`growth:percentile:patient:${patientId}`,
		projectionByPatient: (patientId: string) =>
			`growth:projection:patient:${patientId}`,
		recentByClinic: (clinicId: string) => `growth:recent:clinic:${clinicId}`,

		// WHO Standards
		standards: 'growth:who:standards',
		standardsByAge: (ageDays: number) => `growth:who:age:${ageDays}`,
		standardsByGender: (gender: string) => `growth:who:gender:${gender}`,
		standardsByType: (type: string) => `growth:who:type:${type}`,
		standardsInterpolation: (ageDays: number) => `growth:who:interp:${ageDays}`,
		standardsMap: 'growth:who:map',
		summaryByPatient: (patientId: string) =>
			`growth:summary:patient:${patientId}`,
		trendsByPatient: (patientId: string) =>
			`growth:trends:patient:${patientId}`,
		velocityByPatient: (patientId: string) =>
			`growth:velocity:patient:${patientId}`,

		// Keep these for backward compatibility
		whoAll: 'growth:who:all',
		whoByAge: (ageDays: number) => `growth:who:age:${ageDays}`,
		whoByGender: (gender: string) => `growth:who:gender:${gender}`,
		whoByType: (type: string) => `growth:who:type:${type}`,
		whoInterpolation: (ageDays: number) => `growth:who:interp:${ageDays}`,

		// Z-Scores
		zScore: (gender: string, ageDays: number) =>
			`growth:zscore:${gender}:${ageDays}`,
		zScoreByGender: (gender: string) => `growth:zscore:gender:${gender}`,
	},

	// ==================== MEDICAL ====================
	medical: {
		diagnosis: {
			byAppointment: (appointmentId: string) =>
				`diagnoses:appointment:${appointmentId}`,
			byClinic: (clinicId: string) => `diagnoses:clinic:${clinicId}`,
			byDoctor: (doctorId: string) => `diagnoses:doctor:${doctorId}`,
			byId: (id: string) => `diagnosis:${id}`,
			byMedicalRecord: (medicalRecordId: string) =>
				`diagnoses:medical-record:${medicalRecordId}`,
			byPatient: (patientId: string) => `diagnoses:patient:${patientId}`,
		},
		immunization: {
			byClinic: (clinicId: string) => `immunizations:clinic:${clinicId}`,
			byId: (id: string) => `immunization:${id}`,
			byPatient: (patientId: string) => `immunizations:patient:${patientId}`,
			byVaccine: (vaccine: string) => `immunizations:vaccine:${vaccine}`,
		},
		lab: {
			byClinic: (clinicId: string) => `lab-tests:clinic:${clinicId}`,
			byId: (id: string) => `lab-test:${id}`,
			byMedicalRecord: (medicalId: string) =>
				`medical:lab:medical:${medicalId}`,
			byPatient: (patientId: string) => `lab-tests:patient:${patientId}`,
			byService: (serviceId: string) => `lab-tests:service:${serviceId}`,
		},
		prescription: {
			active: (patientId: string) => `prescriptions:active:${patientId}`,
			byDoctor: (doctorId: string) => `prescriptions:doctor:${doctorId}`,
			byId: (id: string) => `prescription:${id}`,
			byMedicalRecord: (medicalRecordId: string) =>
				`prescriptions:medical-record:${medicalRecordId}`,
			byPatient: (patientId: string) => `prescriptions:patient:${patientId}`,
		},
		record: {
			byAppointment: (appointmentId: string) =>
				`medical-records:appointment:${appointmentId}`,
			byClinic: (clinicId: string) => `medical-records:clinic:${clinicId}`,
			byId: (id: string) => `medical-record:${id}`,
			byPatient: (patientId: string) => `medical-records:patient:${patientId}`,
			countByClinic: (clinicId: string) =>
				`medical-records:count:clinic:${clinicId}`,
		},
		vitalSigns: {
			byEncounter: (encounterId: string) =>
				`vital-signs:encounter:${encounterId}`,
			byId: (id: string) => `vital-signs:${id}`,
			byMedicalRecord: (medicalId: string) =>
				`medical:vital:medical:${medicalId}`,
			byPatient: (patientId: string) => `medical:vital:patient:${patientId}`,
			latestByPatient: (patientId: string) =>
				`medical:vital:patient:${patientId}:latest`,
		},
	},
	medicalRecord: (recordId: string) => `medical-record-${recordId}`,

	// Medical Record tags
	medicalRecords: (patientId: string) => `patient-${patientId}-records`,

	// ==================== PATIENT ====================
	patient: {
		all: 'patients:all',
		paginated: (clinicId: string, page: number, limit: number) =>
			`patients:paginated:${clinicId}:${page}:${limit}`,
		stats: (clinicId: string) => `patients:stats:clinic:${clinicId}`,
		list: (clinicId: string, search?: string) =>
			`patients:list:${clinicId}${search ? `:search:${search}` : ''}`,
		counts: (clinicId: string) => `patients:counts:clinic:${clinicId}`,
		// Nested resources
		fullData: (patientId: string) => `patient:${patientId}:full-date`,
		appointments: (patientId: string) => `patient:${patientId}:appointments`,
		billing: (patientId: string) => `patient:${patientId}:billing`,
		byClinic: (clinicId: string) => `patients:clinic:${clinicId}`,
		byId: (id: string) => `patient:${id}`,
		dashboard: (clinicId: string) => `dashboard:patients:${clinicId}`,
		growth: (patientId: string) => `patient:${patientId}:growth`,
		guardians: (patientId: string) => `patient:${patientId}:guardians`,
		immunizations: (patientId: string) => `patient:${patientId}:immunizations`,
		diagnoses: (patientId: string) => `patient:${patientId}:diagnosis`,
		labTests: (patientId: string) => `patient:${patientId}:lab-tests`,
		infants: (clinicId: string) => `patients:infants:${clinicId}`,
		prescriptions: (patientId: string) => `patient:${patientId}:prescriptions`,
		recent: (clinicId: string) => `patients:recent:${clinicId}`,
		records: (patientId: string) => `patient:${patientId}:medical-records`,
		vitalSigns: (patientId: string) => `patient:${patientId}:vitals`,
	},
	patientMeasurements: (patientId: string) =>
		`patient-${patientId}-measurements`,
	patientMedicalRecords: (patientId: string) =>
		`patient-${patientId}-medical-records`,
	patientPrescriptions: (patientId: string) =>
		`patient-${patientId}-prescriptions`,
	patients: (clinicId: string) => `clinic-${clinicId}-patients`,
	prescription: (prescriptionId: string) => `prescription-${prescriptionId}`,

	// Prescription tags
	prescriptions: (patientId: string) => `patient-${patientId}-prescriptions`,

	// ==================== SEARCH ====================
	search: {
		byClinic: (clinicId: string) => `search:clinic:${clinicId}`,
		byAppointment: (clinicId: string) => `search:appointment:${clinicId}`,
		byBill: (clinicId: string) => `search:bill:${clinicId}`,
		byDoctor: (clinicId: string) => `search:doctor:${clinicId}`,
		byMedicalRecord: (clinicId: string) => `search:medical-record:${clinicId}`,
		byPatient: (clinicId: string) => `search:patient:${clinicId}`,
		byPayment: (clinicId: string) => `search:payment:${clinicId}`,
		byPrescription: (clinicId: string) => `search:prescription:${clinicId}`,
		byStaff: (clinicId: string) => `search:staff:${clinicId}`,
		byVisit: (clinicId: string) => `search:visit:${clinicId}`,
		prefix: 'search',
	},

	// ==================== SERVICE ====================
	service: {
		all: 'services:all',
		usage: (clinicId: string) => `services:usage:clinic:${clinicId}`,
		available: (clinicId: string) => `services:available:clinic:${clinicId}`,
		byCategory: (category: string, clinicId: string) =>
			`services:category:${category}:clinic:${clinicId}`,
		byClinic: (clinicId: string) => `services:clinic:${clinicId}`,
		byId: (id: string) => `service:${id}`,
		filtered: (filters: Record<string, unknown>) =>
			`services:filtered:${JSON.stringify(filters)}`,
		stats: (clinicId: string) => `services:stats:${clinicId}`,
	},

	// Service tags
	services: (clinicId: string) => `clinic-${clinicId}-services`,

	// ==================== STAFF ====================
	staff: {
		all: 'staff:all',
		byClinic: (clinicId: string) => `staff:clinic:${clinicId}`,
		byDepartment: (department: string, clinicId: string) =>
			`staff:department:${department}:clinic:${clinicId}`,
		byId: (id: string) => `staff:${id}`,
	},

	// Staff tags
	staffList: (clinicId: string) => `clinic-${clinicId}-staff`,

	// ==================== SYSTEM ====================
	system: {
		drugs: 'system:drugs',
		settings: 'system:settings',
		vaccineSchedule: 'system:vaccine-schedule',
		whoStandards: 'system:who-standards',
	},

	// ==================== USER ====================
	user: {
		byEmail: (email: string) => `user:email:${email}`,
		byId: (id: string) => `user:${id}`,
		current: 'user:current',
		notifications: (userId: string) => `user:${userId}:notifications`,
		savedFilters: (userId: string, clinicId: string) =>
			`user:${userId}:filters:clinic:${clinicId}`,
	},

	// ==================== VACCINATION ====================
	vaccination: {
		all: 'vaccinations:all',
		byClinic: (clinicId: string) => `vaccinations:clinic:${clinicId}`,
		byId: (id: string) => `vaccination:${id}`,
		byName: (name: string) => `vaccination:name:${name}`,
		byPatient: (patientId: string) => `vaccinations:patient:${patientId}`,
		byStatus: (clinicId: string, status: string) =>
			`vaccinations:status:${status}:clinic:${clinicId}`,
		counts: (clinicId: string) => `vaccinations:counts:${clinicId}`,
		dashboard: (clinicId: string) => `dashboard:vaccinations:${clinicId}`,
		schedule: 'vaccinations:schedule',
		scheduleByAge: (ageMonth: number) => `vaccinations:schedule:${ageMonth}`,
		scheduled: (clinicId: string) => `vaccinations:scheduled:${clinicId}`,
		upcoming: (clinicId: string) => `vaccinations:upcoming:${clinicId}`,
	},

	// ==================== VISIT ====================
	visit: {
		all: 'visits:all',
		byClinic: (clinicId: string) => `visits:clinic:${clinicId}`,
		byDoctor: (doctorId: string) => `visits:doctor:${doctorId}`,
		byId: (id: string) => `visit:${id}`,
		byPatient: (patientId: string) => `visits:patient:${patientId}`,
		byStatus: (clinicId: string, status: string) =>
			`visits:status:${clinicId}:${status}`,
		counts: (clinicId: string) => `visits:counts:${clinicId}`,
		dashboard: (clinicId: string) => `visits:dashboard:${clinicId}`,
		doctorSchedule: (doctorId: string, dateKey: string) =>
			`visits:schedule:${doctorId}:${dateKey}`,
		month: (clinicId: string, monthKey: string) =>
			`visits:month:${clinicId}:${monthKey}`,
		recent: (clinicId: string) => `visits:recent:${clinicId}`,
		today: (clinicId: string) => `visits:today:${clinicId}`,
		upcoming: (clinicId: string) => `visits:upcoming:${clinicId}`,
	},

	// ==================== WORKING DAYS ====================
	workingDays: {
		byClinic: (clinicId: string) => `working-days:clinic:${clinicId}`,
		byDoctor: (doctorId: string) => `working-days:doctor:${doctorId}`,
	},
} as const

// Type helper
export type CacheTag =
	| ReturnType<typeof CACHE_TAGS.clinic.byId>
	| ReturnType<typeof CACHE_TAGS.patient.byId>
	| ReturnType<typeof CACHE_TAGS.doctor.byId>
	| ReturnType<typeof CACHE_TAGS.visit.byId>
	| ReturnType<typeof CACHE_TAGS.appointment.byId>
	| ReturnType<typeof CACHE_TAGS.growth.byId>
	| ReturnType<typeof CACHE_TAGS.vaccination.byId>
	| ReturnType<typeof CACHE_TAGS.medical.record.byId>
	| ReturnType<typeof CACHE_TAGS.medical.diagnosis.byId>
	| ReturnType<typeof CACHE_TAGS.medical.vitalSigns.byId>
	| ReturnType<typeof CACHE_TAGS.medical.immunization.byId>
	| ReturnType<typeof CACHE_TAGS.medical.prescription.byId>
	| ReturnType<typeof CACHE_TAGS.medical.lab.byId>
	| ReturnType<typeof CACHE_TAGS.financial.payment.byId>
	| ReturnType<typeof CACHE_TAGS.financial.bill.byId>
	| ReturnType<typeof CACHE_TAGS.financial.expense.byId>
	| ReturnType<typeof CACHE_TAGS.drug.byId>
	| ReturnType<typeof CACHE_TAGS.user.byId>
	| (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS][keyof (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]]
export const cacheTags = CACHE_TAGS
