'use client'

import { useEffect } from 'react'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <nav className="glass border-b border-purple-100/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gradient">{title}</h1>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-gray-600 hover:text-purple-700 hover:bg-purple-50/50 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 text-sm font-medium">{user?.full_name || user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-purple-700 hover:bg-purple-50/50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
