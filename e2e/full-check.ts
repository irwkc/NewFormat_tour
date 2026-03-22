#!/usr/bin/env npx tsx
/**
 * Полная проверка всех маршрутов приложения для каждой роли.
 *
 * Run: BASE_URL=https://staff.nf-travel.ru npx tsx e2e/full-check.ts
 *
 * Credentials via env: OWNER_EMAIL, OWNER_PASS, etc. or defaults from test users.
 */

import { chromium, type Page } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const LOGIN_URL = '/auth/login'

const ROLES: Record<string, { login: string; password: string; routes: string[] }> = {
  owner: {
    login: process.env.OWNER_EMAIL || 'owner@test.local',
    password: process.env.OWNER_PASS || 'Owner123!',
    routes: [
      '/dashboard/owner',
      '/dashboard/owner/moderation',
      '/dashboard/owner/categories',
      '/dashboard/owner/promoters',
      '/dashboard/owner/managers',
      '/dashboard/owner/ticket-transfers',
      '/dashboard/owner/issued-items',
      '/dashboard/owner/statistics',
      '/dashboard/owner/invitations',
      '/dashboard/owner/referrals',
      '/dashboard/owner/settings',
    ],
  },
  owner_assistant: {
    login: process.env.ASSISTANT_EMAIL || 'assistant@test.local',
    password: process.env.ASSISTANT_PASS || 'Assistant123!',
    routes: ['/dashboard/owner-assistant'],
  },
  partner: {
    login: process.env.PARTNER_EMAIL || 'partner@test.local',
    password: process.env.PARTNER_PASS || 'Partner123!',
    routes: [
      '/dashboard/partner',
      '/dashboard/partner/tours',
      '/dashboard/partner/tours/create',
      '/dashboard/partner/tickets/check',
      '/dashboard/partner/statistics',
      '/dashboard/partner/settings',
    ],
  },
  partner_controller: {
    login: process.env.CONTROLLER_EMAIL || 'controller@test.local',
    password: process.env.CONTROLLER_PASS || 'Controller123!',
    routes: ['/dashboard/partner-controller', '/dashboard/partner-controller/tickets/check'],
  },
  manager: {
    login: process.env.MANAGER_EMAIL || 'manager@test.local',
    password: process.env.MANAGER_PASS || 'Manager123!',
    routes: [
      '/dashboard/manager',
      '/dashboard/manager/sales',
      '/dashboard/manager/sales/create',
      '/dashboard/manager/sales/create/cash-ticket',
      '/dashboard/manager/sales/create/acquiring-receipt',
      '/dashboard/manager/balance-history',
      '/dashboard/manager/issued-items',
      '/dashboard/manager/invitations',
      '/dashboard/manager/settings',
    ],
  },
  promoter: {
    login: process.env.PROMOTER_ID || '1001',
    password: process.env.PROMOTER_PASS || 'Promoter123!',
    routes: [
      '/dashboard/promoter',
      '/dashboard/promoter/sales',
      '/dashboard/promoter/sales/create',
      '/dashboard/promoter/sales/create/acquiring-receipt',
      '/dashboard/promoter/balance-history',
      '/dashboard/promoter/issued-items',
      '/dashboard/promoter/invitations',
      '/dashboard/promoter/settings',
    ],
  },
}

interface RouteResult {
  role: string
  url: string
  status: string
  statusCode?: number
  error?: string
}

async function login(
  page: Page,
  loginVal: string,
  password: string
): Promise<{ ok: boolean; role?: string; error?: string }> {
  await page.goto(BASE + LOGIN_URL, { waitUntil: 'networkidle', timeout: 20000 })
  const loginInput = await page.$('#login')
  const passInput = await page.$('#password')
  if (!loginInput || !passInput) return { ok: false, error: 'Login form not found' }
  await page.fill('#login', loginVal)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  try {
    await page.waitForURL((url) => !url.pathname.includes('auth/login'), { timeout: 15000 })
  } catch {
    const err = await page.$('.text-red-300, [role="alert"], .error')
    return { ok: false, error: (await err?.textContent()) || 'Login timeout' }
  }
  const path = page.url()
  const m = path.match(/dashboard\/(owner-assistant|partner-controller|owner|partner|manager|promoter)/)
  return { ok: true, role: m ? m[1].replace(/-/g, '_') : undefined }
}

async function checkRoute(page: Page, url: string): Promise<{ status: number; error?: string }> {
  try {
    const res = await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    return { status: res?.status() ?? 0 }
  } catch (e) {
    return { status: 0, error: String(e) }
  }
}

const PUBLIC_ROUTES = ['/', '/auth/login', '/auth/forgot-password', '/rules', '/privacy', '/terms']

async function run(): Promise<void> {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const allResults: RouteResult[] = []
  const failed: RouteResult[] = []

  // 1. Public routes (no login)
  for (const route of PUBLIC_ROUTES) {
    const { status, error } = await checkRoute(page, route)
    const ok = status >= 200 && status < 400
    const r: RouteResult = { role: 'public', url: route, status: ok ? `${status} OK` : status ? `${status}` : 'error', statusCode: status, error }
    allResults.push(r)
    if (!ok || error) failed.push(r)
  }

  // 2. Role-specific routes
  for (const [roleKey, cfg] of Object.entries(ROLES)) {
    const { ok, error } = await login(page, cfg.login, cfg.password)
    if (!ok) {
      failed.push({ role: roleKey, url: 'LOGIN', status: 'error', error })
      continue
    }

    for (const route of cfg.routes) {
      const { status, error } = await checkRoute(page, route)
      const ok = status >= 200 && status < 400
      const r: RouteResult = {
        role: roleKey,
        url: route,
        status: ok ? `${status} OK` : status ? `${status}` : 'error',
        statusCode: status || undefined,
        error,
      }
      allResults.push(r)
      if (!ok || error) failed.push(r)
    }
  }

  await browser.close()

  // Report
  console.log('\n## Full App Check Report\n')
  console.log('| Role | Route | Status |')
  console.log('|------|-------|--------|')
  for (const r of allResults) {
    const err = r.error ? ` (${r.error.slice(0, 30)}...)` : ''
    console.log(`| ${r.role} | ${r.url} | ${r.status}${err} |`)
  }
  if (failed.length > 0) {
    console.log(`\n⚠ ${failed.length} failure(s)`)
    process.exit(1)
  }
  console.log(`\n✅ All ${allResults.length} routes OK`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
