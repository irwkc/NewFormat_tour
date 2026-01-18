'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  navItems?: { label: string; href: string }[]
}

export default function DashboardLayout({ children, title, navItems = [] }: DashboardLayoutProps) {
  const router = useRouter()
  const { user, isAuthenticated, clearAuth } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  const handleLogout = async () => {
    clearAuth()
    router.push('/auth/login')
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/20" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(80px) saturate(40%)',
        WebkitBackdropFilter: 'blur(80px) saturate(40%)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Title */}
            <div className="flex items-center flex-shrink-0">
              <h1 className="text-xl font-bold text-gradient">{title}</h1>
            </div>

            {/* Desktop Navigation */}
            {navItems.length > 0 && (
              <nav className="hidden lg:flex items-center space-x-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-4 py-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* User info - hidden on mobile */}
              <span className="hidden sm:block text-white/90 text-sm font-medium">
                {user?.full_name || user?.email}
              </span>

              {/* Mobile menu button */}
              {navItems.length > 0 && (
                <button
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2 rounded-xl text-white hover:bg-white/10 transition-all duration-200"
                  aria-label="Меню"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {mobileMenuOpen ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>
              )}

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && navItems.length > 0 && (
        <>
          <div
            className="mobile-menu-overlay"
            onClick={closeMobileMenu}
          />
          <div className="mobile-menu-content fixed left-0 top-0 z-50 pt-16">
            <div className="flex flex-col h-full">
              <div className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className="block px-4 py-3 rounded-2xl text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200 font-medium"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="px-4 py-4 border-t border-white/10">
                <div className="px-4 py-2 text-white/90 text-sm font-medium">
                  {user?.full_name || user?.email}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        {children}
      </main>
    </div>
  )
}