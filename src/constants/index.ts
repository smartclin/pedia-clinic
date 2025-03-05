import {
  ChartNoAxesCombined,
  CircleDollarSign,
  Cog,
  House,
  Info,
  Package,
  TableProperties,
  TicketPercent,
  Users,
} from 'lucide-react'

export const PUBLIC_ROUTES = {
  ABOUT: '/about',
  HOME: '/',
  LOGIN: '/auth/login',
  SERVICES: '/services',
  SIGNUP: '/auth/sign-up',
}

export const LANDING_PAGE_NAV_LINKS = [
  {
    href: PUBLIC_ROUTES.HOME,
    icon: House,
    name: 'Home',
  },
  {
    href: PUBLIC_ROUTES.ABOUT,
    icon: Info,
    name: 'About',
  },
  {
    href: PUBLIC_ROUTES.SERVICES,
    icon: CircleDollarSign,
    name: 'Services',
  },
]

export const PROTECTED_ROUTES = {
  ANALYTICS: '/dashboard/analytics',
  CATEGORIES: '/dashboard/categories',
  COLLECTIONS: '/dashboard/collections',
  CUSTOMERS: '/dashboard/customers',
  DASHBOARD: '/dashboard',
  DISCOUNTS: '/dashboard/discounts',
  ONLINE_STORE: '/dashboard/online-store',
  ORDERS: '/dashboard/orders',
  PRODUCTS: '/dashboard/products',
  SETTINGS: '/dashboard/settings',
}

export const DASHBOARD_SIDEBAR_LINKS_DASGBOARDLINKS = [
  {
    href: PROTECTED_ROUTES.DASHBOARD,
    icon: House,
    name: 'home',
    subLinks: [],
  },
  {
    href: PROTECTED_ROUTES.ORDERS,
    icon: TableProperties,
    name: 'orders',
    subLinks: [],
  },
  {
    href: PROTECTED_ROUTES.PRODUCTS,
    icon: Package,
    name: 'products',
    subLinks: [
      {
        href: PROTECTED_ROUTES.COLLECTIONS,
        name: 'collections',
      },
      {
        href: PROTECTED_ROUTES.CATEGORIES,
        name: 'categories',
      },
    ],
  },
  {
    href: PROTECTED_ROUTES.CUSTOMERS,
    icon: Users,
    name: 'customers',
    subLinks: [],
  },
  {
    href: PROTECTED_ROUTES.ANALYTICS,
    icon: ChartNoAxesCombined,
    name: 'analytics',
    subLinks: [],
  },
  {
    href: PROTECTED_ROUTES.DISCOUNTS,
    icon: TicketPercent,
    name: 'discounts',
    subLinks: [],
  },
  {
    href: PROTECTED_ROUTES.SETTINGS,
    icon: Cog,
    name: 'settings',
    subLinks: [],
  },
]

export const DEFAULT_LOGIN_REDIRECT = '/dashboard'

export const authRoutes = [PUBLIC_ROUTES.LOGIN, PUBLIC_ROUTES.SIGNUP]

export const publicRoutes = [
  PUBLIC_ROUTES.HOME,
  PUBLIC_ROUTES.ABOUT,
  PUBLIC_ROUTES.SERVICES,
]
