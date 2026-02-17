'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

interface Customer {
    id: string
    name: string
    first_name?: string
    last_name?: string
    address_line?: string
    city?: string
    state?: string
    zip_code?: string
    country?: string
    phone?: string
    cell_phone?: string
    email?: string
    notes?: string
    created_at: string
    updated_at?: string
}

interface CustomerContextType {
    selectedCustomer: Customer | null
    customers: Customer[]
    isLoading: boolean
    selectCustomer: (customer: Customer) => void
    refreshCustomers: () => Promise<void>
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined)

export function CustomerProvider({ children }: { children: React.ReactNode }) {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()
    const router = useRouter()
    const pathname = usePathname()
    const queryClient = useQueryClient()

    const refreshCustomers = useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await fetch('/api/customers')
            if (!res.ok) {
                if (res.status === 401) {
                    // Not logged in, skip fetch
                    return
                }
                throw new Error('Failed to fetch customers')
            }
            const data = await res.json()
            setCustomers(data || [])

            // Restore selection from localStorage if valid
            const savedId = localStorage.getItem('activiabook_customer_id')
            if (savedId) {
                const saved = data?.find((c: Customer) => c.id === savedId)
                if (saved) {
                    setSelectedCustomer(saved)
                } else {
                    localStorage.removeItem('activiabook_customer_id')
                }
            }
        } catch (error) {
            console.error('Error fetching customers:', error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        refreshCustomers()
    }, [refreshCustomers])

    const selectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer)
        localStorage.setItem('activiabook_customer_id', customer.id)
        // Set cookie for RSC compatibility (optional but recommended)
        document.cookie = `activiabook_customer_id=${customer.id}; path=/; max-age=31536000`

        // Invalidate all queries to ensure data refresh
        queryClient.invalidateQueries()

        // Refresh the page to ensure all data is re-fetched with the new customer context
        router.refresh()
    }

    // Redirect to customer selection if not selected and not on /customers or /login
    useEffect(() => {
        const isPublicPath = pathname === '/login' ||
            pathname === '/signup' ||
            pathname === '/forgot-password' ||
            pathname === '/reset-password' ||
            pathname === '/'

        if (!isLoading && !selectedCustomer && pathname !== '/customers' && !isPublicPath) {
            router.push('/customers')
        }
    }, [selectedCustomer, isLoading, pathname, router])

    return (
        <CustomerContext.Provider value={{ selectedCustomer, customers, isLoading, selectCustomer, refreshCustomers }}>
            {children}
        </CustomerContext.Provider>
    )
}

export function useCustomer() {
    const context = useContext(CustomerContext)
    if (context === undefined) {
        throw new Error('useCustomer must be used within a CustomerProvider')
    }
    return context
}
