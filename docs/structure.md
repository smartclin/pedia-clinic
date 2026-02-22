src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── sign-in/
│   │   │   └── page.tsx
│   │   └── sign-up/
│   │       └── page.tsx
│   │
│   ├── (public)/
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── services/
│   │   │   └── page.tsx
│   │   ├── contact/
│   │   │   └── page.tsx
│   │   ├── privacy/
│   │   │   └── page.tsx
│   │   └── terms/
│   │       └── page.tsx
│   │
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   │
│   │   ├── patients/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── patients-client.tsx
│   │   │   ├── new/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new-patient-client.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── patient-details-client.tsx
│   │   │
│   │   ├── appointments/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── appointments-client.tsx
│   │   │   ├── new/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new-appointment-client.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── appointment-details-client.tsx
│   │   │
│   │   ├── medical-records/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── medical-records-client.tsx
│   │   │   ├── new/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new-medical-record-client.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── medical-record-details-client.tsx
│   │   │
│   │   ├── growth/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── growth-charts-client.tsx
│   │   │   ├── [patientId]/
│   │   │   │   ├── page.tsx
│   │   │   │   └── patient-growth-client.tsx
│   │   │   └── add/
│   │   │       ├── page.tsx
│   │   │       └── add-growth-client.tsx
│   │   │
│   │   ├── immunizations/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── immunizations-client.tsx
│   │   │   ├── schedule/
│   │   │   │   ├── page.tsx
│   │   │   │   └── schedule-client.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── immunization-details-client.tsx
│   │   │
│   │   ├── prescriptions/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── prescriptions-client.tsx
│   │   │   ├── new/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new-prescription-client.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── prescription-details-client.tsx
│   │   │
│   │   ├── lab/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── lab-tests-client.tsx
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx
│   │   │   │   └── orders-client.tsx
│   │   │   └── results/
│   │   │       ├── page.tsx
│   │   │       └── results-client.tsx
│   │   │
│   │   ├── doctors/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── doctors-client.tsx
│   │   │   ├── schedule/
│   │   │   │   ├── page.tsx
│   │   │   │   └── schedule-client.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── doctor-details-client.tsx
│   │   │
│   │   ├── staff/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── staff-client.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── staff-details-client.tsx
│   │   │
│   │   ├── billing/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── billing-client.tsx
│   │   │   ├── payments/
│   │   │   │   ├── page.tsx
│   │   │   │   └── payments-client.tsx
│   │   │   └── invoices/
│   │   │       ├── page.tsx
│   │   │       └── invoices-client.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── reports-client.tsx
│   │   │
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── loading.tsx
│   │       ├── clinic/
│   │       │   └── page.tsx
│   │       ├── profile/
│   │       │   └── page.tsx
│   │       └── users/
│   │           └── page.tsx
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...all]/
│   │   │       └── route.ts
│   │   └── trpc/
│   │       └── [trpc]/
│   │           └── route.ts
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   ├── not-found.tsx
│   ├── global-error.tsx
│   └── manifest.json
│
├── components/
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── sidebar.tsx
│   │   ├── mode-toggle.tsx
│   │   └── user-menu.tsx
│   │
│   ├── ui/ (shadcn/ui components)
│   │
│   ├── patients/
│   │   ├── patient-table.tsx
│   │   ├── patient-card.tsx
│   │   ├── patient-form.tsx
│   │   ├── patient-search.tsx
│   │   └── patient-filters.tsx
│   │
│   ├── appointments/
│   │   ├── appointment-calendar.tsx
│   │   ├── appointment-list.tsx
│   │   ├── appointment-form.tsx
│   │   └── appointment-card.tsx
│   │
│   ├── medical/
│   │   ├── medical-record-form.tsx
│   │   ├── diagnosis-list.tsx
│   │   ├── vital-signs-form.tsx
│   │   └── lab-test-form.tsx
│   │
│   ├── growth/
│   │   ├── growth-chart.tsx
│   │   ├── growth-form.tsx
│   │   ├── percentile-chart.tsx
│   │   └── growth-summary.tsx
│   │
│   ├── immunizations/
│   │   ├── immunization-table.tsx
│   │   ├── immunization-form.tsx
│   │   ├── vaccine-schedule.tsx
│   │   └── immunization-card.tsx
│   │
│   ├── prescriptions/
│   │   ├── prescription-form.tsx
│   │   ├── prescription-list.tsx
│   │   ├── prescription-card.tsx
│   │   └── dosage-calculator.tsx
│   │
│   ├── lab/
│   │   ├── lab-test-table.tsx
│   │   ├── lab-order-form.tsx
│   │   ├── lab-result-form.tsx
│   │   └── lab-test-card.tsx
│   │
│   ├── doctors/
│   │   ├── doctor-table.tsx
│   │   ├── doctor-card.tsx
│   │   ├── doctor-form.tsx
│   │   └── working-hours-form.tsx
│   │
│   ├── staff/
│   │   ├── staff-table.tsx
│   │   ├── staff-card.tsx
│   │   └── staff-form.tsx
│   │
│   ├── billing/
│   │   ├── invoice-table.tsx
│   │   ├── payment-form.tsx
│   │   ├── invoice-card.tsx
│   │   └── billing-summary.tsx
│   │
│   ├── reports/
│   │   ├── report-charts.tsx
│   │   ├── report-filters.tsx
│   │   └── report-export.tsx
│   │
│   ├── shared/
│   │   ├── data-table.tsx
│   │   ├── search-input.tsx
│   │   ├── pagination.tsx
│   │   ├── loading-spinner.tsx
│   │   ├── error-boundary.tsx
│   │   └── empty-state.tsx
│   │
│   └── skeletons/
│       ├── table-skeleton.tsx
│       ├── card-skeleton.tsx
│       ├── form-skeleton.tsx
│       └── dashboard-skeleton.tsx
│
├── server/
│   ├── db/
│   │   ├── client.ts
│   │   └── queries/
│   │       ├── patient.queries.ts
│   │       ├── appointment.queries.ts
│   │       ├── medical.queries.ts
│   │       ├── growth.queries.ts
│   │       ├── immunization.queries.ts
│   │       ├── prescription.queries.ts
│   │       ├── lab.queries.ts
│   │       ├── doctor.queries.ts
│   │       ├── staff.queries.ts
│   │       ├── billing.queries.ts
│   │       ├── clinic.queries.ts
│   │       └── dashboard.queries.ts
│   │
│   ├── services/
│   │   ├── patient.service.ts
│   │   ├── appointment.service.ts
│   │   ├── medical.service.ts
│   │   ├── growth.service.ts
│   │   ├── immunization.service.ts
│   │   ├── prescription.service.ts
│   │   ├── lab.service.ts
│   │   ├── doctor.service.ts
│   │   ├── staff.service.ts
│   │   ├── billing.service.ts
│   │   ├── clinic.service.ts
│   │   └── dashboard.service.ts
│   │
│   ├── actions/
│   │   ├── patient.actions.ts
│   │   ├── appointment.actions.ts
│   │   ├── medical.actions.ts
│   │   ├── growth.actions.ts
│   │   ├── immunization.actions.ts
│   │   ├── prescription.actions.ts
│   │   ├── lab.actions.ts
│   │   ├── doctor.actions.ts
│   │   ├── staff.actions.ts
│   │   ├── billing.actions.ts
│   │   ├── clinic.actions.ts
│   │   └── types.ts
│   │
│   ├── api/
│   │   ├── routers/
│   │   │   ├── patient.router.ts
│   │   │   ├── appointment.router.ts
│   │   │   ├── medical.router.ts
│   │   │   ├── growth.router.ts
│   │   │   ├── immunization.router.ts
│   │   │   ├── prescription.router.ts
│   │   │   ├── lab.router.ts
│   │   │   ├── doctor.router.ts
│   │   │   ├── staff.router.ts
│   │   │   ├── billing.router.ts
│   │   │   ├── clinic.router.ts
│   │   │   ├── dashboard.router.ts
│   │   │   └── admin.router.ts
│   │   └── trpc.ts
│   │
│   └── cache/
│       ├── utils/
│       │   ├── helpers.ts
│       │   ├── profiles.ts
│       │   └── tags.ts
│       ├── patient.cache.ts
│       ├── appointment.cache.ts
│       ├── medical.cache.ts
│       ├── growth.cache.ts
│       └── clinic.cache.ts
│
├── trpc/
│   ├── client.tsx
│   └── server.tsx
│
├── lib/
│   ├── auth.ts
│   ├── utils.ts
│   └── validations/
│       ├── patient.ts
│       ├── appointment.ts
│       ├── medical.ts
│       ├── growth.ts
│       ├── immunization.ts
│       ├── prescription.ts
│       ├── lab.ts
│       ├── doctor.ts
│       ├── staff.ts
│       └── billing.ts
│
├── hooks/
│   ├── use-debounce.ts
│   ├── use-media-query.ts
│   ├── use-permissions.ts
│   └── use-clinic.ts
│
└── types/
    ├── patient.ts
    ├── appointment.ts
    ├── medical.ts
    ├── growth.ts
    └── index.ts
