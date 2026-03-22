#!/usr/bin/env npx tsx
/**
 * Universal exploratory browser test. Works for any web app.
 *
 * Run: BASE_URL=http://localhost:3000 npx tsx e2e/explore-app.ts [--json] [--auth] [--headed]
 *
 * --headed  open visible browser window and slow down actions so you can watch
 *
 * Env:
 *   BASE_URL       - app URL (default: http://localhost:3000)
 *   LOGIN_URL      - login page path (default: /auth/login)
 *   TEST_EMAIL     - login email (required for --auth)
 *   TEST_PASSWORD  - login password (required for --auth)
 *
 * Pass credentials when running: TEST_EMAIL='x' TEST_PASSWORD='y' npx tsx e2e/explore-app.ts --auth
 *
 * Requires: npm install -D @playwright/test && npx playwright install chromium
 */

import { chromium, type Page } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const LOGIN_URL = process.env.LOGIN_URL || '/auth/login'
const JSON_OUT = process.argv.includes('--json')
const AUTH_MODE = process.argv.includes('--auth')
const HEADED = process.argv.includes('--headed')
const SLOW_MO = HEADED ? (parseInt(process.env.SLOW_MO || '300', 10) || 300) : 0
const TEST_EMAIL = process.env.TEST_EMAIL || ''
const TEST_PASSWORD = process.env.TEST_PASSWORD || ''

/** Project-specific fallback when nav links can't be extracted. Customize per project. */
const DASHBOARD_ROUTES: Record<string, string[]> = {
  owner: [
    '/dashboard/owner',
    '/dashboard/owner/categories',
    '/dashboard/owner/promoters',
    '/dashboard/owner/managers',
    '/dashboard/owner/issued-items',
    '/dashboard/owner/statistics',
    '/dashboard/owner/invitations',
    '/dashboard/owner/referrals',
    '/dashboard/owner/settings',
  ],
  owner_assistant: ['/dashboard/owner-assistant'],
  partner: [
    '/dashboard/partner',
    '/dashboard/partner/tours',
    '/dashboard/partner/tickets/check',
    '/dashboard/partner/statistics',
    '/dashboard/partner/settings',
  ],
  partner_controller: ['/dashboard/partner-controller', '/dashboard/partner-controller/tickets/check'],
  manager: [
    '/dashboard/manager',
    '/dashboard/manager/sales',
    '/dashboard/manager/balance-history',
    '/dashboard/manager/issued-items',
    '/dashboard/manager/invitations',
    '/dashboard/manager/settings',
  ],
  promoter: [
    '/dashboard/promoter',
    '/dashboard/promoter/sales',
    '/dashboard/promoter/balance-history',
    '/dashboard/promoter/issued-items',
    '/dashboard/promoter/invitations',
    '/dashboard/promoter/settings',
  ],
}

interface Result {
  url: string
  status: string
  statusCode?: number
  error?: string
  role?: string
}

interface Report {
  results: Result[]
  consoleErrors: string[]
  failed: Result[]
  passed: Result[]
  authRole?: string
  loginSuccess?: boolean
}

const LOGIN_SELECTORS = ['#login', '#email', 'input[name="email"]', 'input[type="email"]']
const PASSWORD_SELECTORS = ['#password', 'input[name="password"]', 'input[type="password"]']

async function findAndFill(page: Page, selectors: string[], value: string): Promise<boolean> {
  for (const sel of selectors) {
    const el = await page.$(sel)
    if (el) {
      await page.fill(sel, value)
      return true
    }
  }
  return false
}

async function loginAndExploreDashboards(
  page: Page,
  addResult: (r: Result) => void
): Promise<{ role?: string; loginOk: boolean }> {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    addResult({ url: `${LOGIN_URL}→auth`, status: 'error', error: 'TEST_EMAIL and TEST_PASSWORD required for --auth' })
    return { loginOk: false }
  }
  await page.goto(BASE + LOGIN_URL, { waitUntil: 'networkidle', timeout: 15000 })
  const filledLogin = await findAndFill(page, LOGIN_SELECTORS, TEST_EMAIL)
  const filledPass = await findAndFill(page, PASSWORD_SELECTORS, TEST_PASSWORD)
  if (!filledLogin || !filledPass) {
    addResult({ url: `${LOGIN_URL}→auth`, status: 'error', error: 'Login form not found' })
    return { loginOk: false }
  }
  await page.click('button[type="submit"]')
  try {
    await page.waitForURL((url) => !url.pathname.includes(LOGIN_URL.replace(/^\//, '')), { timeout: 10000 })
  } catch {
    const errEl = await page.$('.alert-error p, [role="alert"], .error')
    const errText = (errEl ? await errEl.textContent() : null) ?? 'Login timeout or redirect failed'
    addResult({ url: `${LOGIN_URL}→auth`, status: 'error', error: errText })
    return { loginOk: false }
  }
  const url = page.url()
  const roleMatch = url.match(/dashboard\/(owner-assistant|partner-controller|owner|partner|manager|promoter)/)
  const role = roleMatch ? roleMatch[1].replace(/-/g, '_') : 'owner'

  const links = await page.$$eval('a[href]', (els) => els.map((e) => (e as HTMLAnchorElement).href))
  const baseOrigin = new URL(BASE).origin
  const internalPaths = [...new Set(
    links
      .filter((h) => h.startsWith(baseOrigin) && !h.includes('#') && !h.toLowerCase().includes('logout'))
      .map((h) => new URL(h).pathname || '/')
  )].slice(0, 25)
  const routes =
    internalPaths.length > 0
      ? internalPaths
      : (role && DASHBOARD_ROUTES[role]) || ['/dashboard', '/admin', '/app']

  for (const route of routes.slice(0, 20)) {
    try {
      const res = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 12000 })
      const status = res?.status() ?? 0
      const ok = status >= 200 && status < 400
      addResult({
        url: route,
        status: ok ? `${status} OK` : `${status}`,
        statusCode: status,
        role,
      })
    } catch (e) {
      addResult({ url: route, status: 'error', error: String(e), role })
    }
  }
  return { role, loginOk: true }
}

async function explore(): Promise<Report> {
  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: SLOW_MO,
  })
  const page = await browser.newPage()
  const results: Result[] = []

  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    const type = msg.type()
    if (type === 'error') {
      const text = msg.text()
      if (!text.includes('Turnstile') && !text.includes('favicon'))
        consoleErrors.push(text)
    }
  })

  try {
    // 1. Public routes (discover more from links below)
    const publicRoutes = ['/', LOGIN_URL]
    for (const route of publicRoutes) {
      try {
        const res = await page.goto(BASE + route, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        })
        const status = res?.status() ?? 0
        results.push({
          url: route,
          status: status >= 200 && status < 400 ? `${status} OK` : `${status}`,
          statusCode: status,
        })
      } catch (e) {
        results.push({ url: route, status: 'error', error: String(e) })
      }
    }

    // 2. Collect links from login page and visit internal ones
    await page.goto(BASE + LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 10000 })
    const links = await page.$$eval('a[href]', (els) =>
      els.map((e) => (e as HTMLAnchorElement).href)
    )
    const internal = [...new Set(links.filter((h) => h.startsWith(BASE) && !h.includes('#')))].slice(
      0,
      15
    )
    for (const href of internal) {
      const path = href.replace(BASE, '') || '/'
      if (results.some((r) => r.url === path)) continue
      try {
        const res = await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 8000 })
        const status = res?.status() ?? 0
        results.push({
          url: path,
          status: status >= 200 && status < 400 ? `${status} OK` : `${status}`,
          statusCode: status,
        })
      } catch (e) {
        results.push({ url: path, status: 'error', error: String(e) })
      }
    }

    let authRole: string | undefined
    let loginSuccess: boolean | undefined
    if (AUTH_MODE) {
      const authResult = await loginAndExploreDashboards(page, (r) => results.push(r))
      authRole = authResult.role
      loginSuccess = authResult.loginOk
    }

    const failed = results.filter(
      (r) => r.status.includes('500') || r.status.includes('404') || r.status === 'error'
    )
    const passed = results.filter(
      (r) => !r.status.includes('500') && !r.status.includes('404') && r.status !== 'error'
    )
    const report: Report = {
      results,
      consoleErrors,
      failed,
      passed,
      ...(AUTH_MODE && { authRole, loginSuccess }),
    }

    if (JSON_OUT) {
      console.log(JSON.stringify(report, null, 0))
      return report
    }

    // Human-readable report
    console.log('\n## Exploration Report\n')
    console.log('| Route | Status |')
    console.log('|-------|--------|')
    for (const r of results) {
      const err = r.error ? ` (${r.error.slice(0, 40)}...)` : ''
      console.log(`| ${r.url} | ${r.status}${err} |`)
    }
    if (consoleErrors.length) {
      console.log('\n### Console errors encountered\n')
      consoleErrors.forEach((e) => console.log('-', e))
    }
    if (failed.length) {
      console.log(`\n⚠ ${failed.length} route(s) failed. Fix and re-run.`)
    }
    if (AUTH_MODE) {
      console.log(
        loginSuccess
          ? `\n✅ Logged in as ${authRole}. Dashboard routes checked.`
          : '\n❌ Login failed. Provide TEST_EMAIL and TEST_PASSWORD (e.g. paste in chat).'
      )
    }
    return report
  } finally {
    await browser.close()
  }
}

explore().catch((e) => {
  console.error(e)
  process.exit(1)
})
