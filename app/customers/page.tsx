'use client'

import React, { useState } from 'react'
import { useCustomer } from '@/components/providers/customer-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusCircle, Building2, ArrowRight, Loader2, CheckCircle, Trash2, AlertCircle, Edit, Save, X, Phone, MapPin, User, FileText, Mail, Copy, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CustomerFormData {
    name: string
    first_name: string
    last_name: string
    email: string
    address_line: string
    city: string
    state: string
    zip_code: string
    country: string
    phone: string
    cell_phone: string
    notes: string
}

const initialFormData: CustomerFormData = {
    name: '',
    first_name: '',
    last_name: '',
    email: '',
    address_line: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    phone: '',
    cell_phone: '',
    notes: '',
}

export default function CustomersPage() {
    const { customers, selectedCustomer, selectCustomer, refreshCustomers, isLoading: isContextLoading } = useCustomer()
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [formData, setFormData] = useState<CustomerFormData>(initialFormData)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const router = useRouter()

    const handleSelectCustomer = (customer: any) => {
        selectCustomer(customer)
        router.push('/dashboard')
    }

    const handleOpenCreateForm = () => {
        setEditingId(null)
        setFormData(initialFormData)
        setIsFormOpen(true)
    }

    const handleOpenEditForm = (customer: any) => {
        setEditingId(customer.id)
        setFormData({
            name: customer.name || '',
            first_name: customer.first_name || '',
            last_name: customer.last_name || '',
            email: customer.email || '',
            address_line: customer.address_line || '',
            city: customer.city || '',
            state: customer.state || '',
            zip_code: customer.zip_code || '',
            country: customer.country || '',
            phone: customer.phone || '',
            cell_phone: customer.cell_phone || '',
            notes: customer.notes || '',
        })
        setIsFormOpen(true)
    }

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) return

        setIsSubmitting(true)
        try {
            const method = editingId ? 'PUT' : 'POST'
            const body = editingId ? { ...formData, id: editingId } : formData

            const res = await fetch('/api/customers', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || `Failed to ${editingId ? 'update' : 'create'} customer`)
            }

            // Immediately clear the editing state and form to prevent "stuck" UI
            setIsFormOpen(false)
            setEditingId(null)
            setFormData(initialFormData)

            // Refresh the server data
            await refreshCustomers()
        } catch (error: any) {
            console.error('Form Error:', error)
            alert(error.message || 'Action failed.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteCustomer = async () => {
        if (!deletingId || deleteConfirmText !== 'Delete customer account') return

        setIsDeleting(true)
        try {
            const res = await fetch(`/api/customers?id=${deletingId}`, {
                method: 'DELETE'
            })

            if (!res.ok) {
                const result = await res.json()
                throw new Error(result.error || 'Failed to delete customer')
            }

            await refreshCustomers()
            setDeletingId(null)
            setDeleteConfirmText('')
        } catch (error: any) {
            console.error('Error deleting customer:', error)
            alert(error.message || 'Failed to delete customer.')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleCopyToClipboard = (customer: any) => {
        const text = `
Customer Name: ${customer.name}
Contact Person: ${customer.first_name || ''} ${customer.last_name || ''}
Email: ${customer.email || 'N/A'}
Phone: ${customer.phone || 'N/A'}
Cell Phone: ${customer.cell_phone || 'N/A'}
Address: ${[customer.address_line, customer.city, customer.state, customer.zip_code, customer.country].filter(Boolean).join(', ') || 'N/A'}
Notes: ${customer.notes || 'N/A'}
Customer ID: ${customer.id}
Created At: ${new Date(customer.created_at).toLocaleString()}
        `.trim()

        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(customer.id)
            setTimeout(() => setCopiedId(null), 2000)
        })
    }

    if (isContextLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="container max-w-5xl mx-auto py-12 px-4">
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent italic">
                            Customer Accounts
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Manage your business entities and accounting contexts.
                        </p>
                    </div>
                    <Button onClick={handleOpenCreateForm} className="shadow-lg shadow-primary/20">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Customer
                    </Button>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {customers.map((customer) => (
                        <Card
                            key={customer.id}
                            className={`group cursor-pointer transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 ${selectedCustomer?.id === customer.id ? 'border-primary ring-1 ring-primary' : ''}`}
                            onClick={() => handleSelectCustomer(customer)}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <div className="p-2 bg-primary/5 rounded-lg group-hover:bg-primary/10 transition-colors">
                                        <Building2 className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleCopyToClipboard(customer)
                                            }}
                                            title="Copy customer information"
                                        >
                                            {copiedId === customer.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleOpenEditForm(customer)
                                            }}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setDeletingId(customer.id)
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <CardTitle className="text-xl font-bold truncate">{customer.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-1 mt-1">
                                        <User className="h-3 w-3" />
                                        {customer.first_name || customer.last_name
                                            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                                            : 'No contact specified'}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="py-2 text-xs text-muted-foreground space-y-2">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{customer.email || 'No email specified'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">
                                        {[customer.city, customer.state, customer.country].filter(Boolean).join(', ') || 'No address'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 shrink-0" />
                                    <span>{customer.phone || customer.cell_phone || 'No phone'}</span>
                                </div>
                                <div className="border-t pt-3 mt-2 space-y-1.5 opacity-60">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-wider font-semibold">Customer ID</span>
                                        <span className="font-mono break-all line-clamp-1">{customer.id}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-wider font-semibold">Created Date</span>
                                        <span>{new Date(customer.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <Button
                                    variant="secondary"
                                    className="w-full justify-between items-center group/btn"
                                >
                                    Select Context
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}

                    <Card
                        className="border-dashed border-2 flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all text-muted-foreground hover:text-primary group"
                        onClick={handleOpenCreateForm}
                    >
                        <div className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                            <PlusCircle className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold">Add New Entity</h3>
                        <p className="text-xs text-center mt-1">Configure another business or project context.</p>
                    </Card>
                </div>
            </div>

            {/* CREATE/EDIT FORM DIALOG */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            {editingId ? <Edit className="h-6 w-6 text-primary" /> : <PlusCircle className="h-6 w-6 text-primary" />}
                            {editingId ? 'Edit Customer' : 'Create New Customer'}
                        </DialogTitle>
                        <DialogDescription>
                            Define the details for your business entity. All fields except Name are optional.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleFormSubmit} className="space-y-8 py-6">
                        {editingId && (
                            <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border border-border/50">
                                <div className="space-y-1">
                                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Customer ID</span>
                                    <p className="font-mono break-all">{editingId}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Created Date</span>
                                    <p>
                                        {(() => {
                                            const c = customers.find(curr => curr.id === editingId);
                                            return c?.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { dateStyle: 'full' }) : 'N/A';
                                        })()}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-8">
                            {/* General Info */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider border-b pb-2">
                                    <Building2 className="h-4 w-4" /> Basic Information
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Display Name *</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g., Acme Corporation"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="border-primary/20 focus:border-primary"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="flex items-center gap-2">
                                            <Mail className="h-4 w-4" /> Email Address
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="contact@example.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name">First Name</Label>
                                        <Input
                                            id="first_name"
                                            placeholder="John"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name">Last Name</Label>
                                        <Input
                                            id="last_name"
                                            placeholder="Doe"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            placeholder="Business Phone"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cell_phone">Cell Phone</Label>
                                        <Input
                                            id="cell_phone"
                                            placeholder="Mobile"
                                            value={formData.cell_phone}
                                            onChange={(e) => setFormData({ ...formData, cell_phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address & Notes */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider border-b pb-2">
                                    <MapPin className="h-4 w-4" /> Location & Details
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address Line</Label>
                                    <Input
                                        id="address"
                                        placeholder="123 Financial Way"
                                        value={formData.address_line}
                                        onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            placeholder="Miami"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            placeholder="FL"
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="zip">Zip Code</Label>
                                        <Input
                                            id="zip"
                                            placeholder="33101"
                                            value={formData.zip_code}
                                            onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Input
                                            id="country"
                                            placeholder="United States"
                                            value={formData.country}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" /> Additional Notes
                            </Label>
                            <Textarea
                                id="notes"
                                placeholder="Any specific requirements or notes for this entity..."
                                className="min-h-[100px] resize-none border-primary/20 focus:border-primary"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsFormOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !formData.name.trim()}
                                className="min-w-[120px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {editingId ? 'Updating...' : 'Creating...'}
                                    </>
                                ) : (
                                    <>
                                        {editingId ? <Save className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        {editingId ? 'Save Changes' : 'Create Entity'}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Delete Customer Account
                        </DialogTitle>
                        <DialogDescription>
                            This action is permanent and will delete all journal entries and accounts associated with this customer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm font-medium">
                            To confirm, type <span className="font-bold underline text-destructive">Delete customer account</span> below:
                        </p>
                        <Input
                            placeholder="Type the confirmation phrase"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="border-destructive/20 focus:border-destructive"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingId(null)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteCustomer}
                            disabled={deleteConfirmText !== 'Delete customer account' || isDeleting}
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
