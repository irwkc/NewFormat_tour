'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import Image from 'next/image'

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  navItems?: { label: string; href: string }[]
}

export default function DashboardLayout({ children, title, navItems = [] }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, clearAuth } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    // Проверяем токен при загрузке
    const checkAuth = async () => {
      if (!isAuthenticated) {
        // Проверяем токены в storage
        if (typeof window !== 'undefined') {
          const localStorageToken = localStorage.getItem('auth-token')
          const sessionStorageToken = sessionStorage.getItem('auth-token')
          const token = localStorageToken || sessionStorageToken
          
          if (token) {
            // Проверяем токен на сервере
            try {
              const response = await fetch('/api/auth/me', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              })
              
              if (response.ok) {
                const data = await response.json()
                if (data.success) {
                  // Токен валиден, пользователь авторизован
                  return
                }
              }
            } catch (error) {
              console.error('Auth check error:', error)
            }
          }
        }
        
        // Если токена нет или он невалиден - перенаправляем на логин
        router.push('/auth/login')
      }
    }
    
    checkAuth()
  }, [isAuthenticated, router])

  useEffect(() => {
    // Закрывать меню при смене страницы
    setMenuOpen(false)
  }, [pathname])

  if (!isAuthenticated) {
    return null
  }

  const handleLogout = async () => {
    clearAuth()
    router.push('/auth/login')
  }

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  const closeMenu = () => {
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/30 backdrop-blur-xl" style={{
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        backdropFilter: 'blur(24px) saturate(180%)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <Link href="/dashboard/owner" className="flex items-center">
                <Image 
                  src="/logo.png" 
                  alt="Logo" 
                  width={32} 
                  height={32} 
                  className="h-8 w-auto"
                  priority
                />
              </Link>
            </div>

            {/* Burger Menu Button */}
            <button
              onClick={toggleMenu}
              className="p-2 rounded-xl text-white hover:bg-white/10 transition-all duration-200"
              aria-label="Меню"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {menuOpen ? (
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
          </div>
        </div>
      </header>

      {/* Side Menu */}
      {menuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={closeMenu}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] z-50 glass-card shadow-2xl transform transition-transform duration-300 ease-out" style={{
            transform: menuOpen ? 'translateX(0)' : 'translateX(100%)'
          }}>
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="px-6 py-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Меню</h2>
                  <button
                    onClick={closeMenu}
                    className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="px-3 py-2 rounded-xl bg-white/10">
                  <div className="text-sm text-white/70">Пользователь</div>
                  <div className="text-white font-medium truncate">{user?.full_name || user?.email}</div>
                  {user?.promoter_id && (
                    <div className="text-xs text-white/60 mt-1">ID: {user.promoter_id}</div>
                  )}
                </div>
              </div>

              {/* Navigation Items */}
              {navItems.length > 0 && (
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className={`block px-4 py-3 rounded-2xl transition-all duration-200 font-medium ${
                          isActive
                            ? 'bg-white/20 text-white shadow-lg'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
              )}

              {/* Footer with Logout */}
              <div className="px-4 py-4 border-t border-white/10 space-y-2">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 rounded-2xl text-white/90 hover:text-white hover:bg-red-500/20 transition-all duration-200 font-medium text-left border border-red-500/30"
                >
                  Выйти
                </button>
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