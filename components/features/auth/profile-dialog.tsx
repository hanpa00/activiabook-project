
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, CheckCircle } from "lucide-react"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ProfileDialog({ open, onOpenChange }: Props) {
    const queryClient = useQueryClient()
    const [success, setSuccess] = useState(false)

    const { data: profile, isLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: async () => {
            const res = await fetch("/api/user")
            if (!res.ok) throw new Error("Failed to fetch profile")
            return res.json()
        },
        enabled: open,
    })

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        company_name: "",
        address_line: "",
        city: "",
        state: "",
        zip_code: "",
        country: "",
        line_phone: "",
        cell_phone: "",
    })

    useEffect(() => {
        if (profile) {
            setFormData({
                first_name: profile.first_name || "",
                last_name: profile.last_name || "",
                company_name: profile.company_name || "",
                address_line: profile.address_line || "",
                city: profile.city || "",
                state: profile.state || "",
                zip_code: profile.zip_code || "",
                country: profile.country || "",
                line_phone: profile.line_phone || "",
                cell_phone: profile.cell_phone || "",
            })
        }
    }, [profile])

    const mutation = useMutation({
        mutationFn: async (values: typeof formData) => {
            const res = await fetch("/api/user", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to update profile")
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profile"] })
            setSuccess(true)
            setTimeout(() => {
                setSuccess(false)
                onOpenChange(false)
            }, 1500)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        mutation.mutate(formData)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target
        setFormData((prev) => ({ ...prev, [id]: value }))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>User Profile</DialogTitle>
                    <DialogDescription>
                        Update your personal and business information.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" value={profile?.email || ""} readOnly className="bg-muted focus-visible:ring-0" />
                            <p className="text-[10px] text-muted-foreground italic">Email cannot be changed here.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input id="first_name" value={formData.first_name} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input id="last_name" value={formData.last_name} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company_name">Company Name</Label>
                            <Input id="company_name" value={formData.company_name} onChange={handleChange} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address_line">Address</Label>
                            <Input id="address_line" value={formData.address_line} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" value={formData.city} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State / Province</Label>
                                <Input id="state" value={formData.state} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="zip_code">Zip / Postal Code</Label>
                                <Input id="zip_code" value={formData.zip_code} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Input id="country" value={formData.country} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="line_phone">Office Phone</Label>
                                <Input id="line_phone" value={formData.line_phone} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cell_phone">Cell Phone</Label>
                                <Input id="cell_phone" value={formData.cell_phone} onChange={handleChange} />
                            </div>
                        </div>

                        <DialogFooter className="flex items-center justify-between sm:justify-between">
                            <div className="flex items-center gap-2">
                                {success && (
                                    <span className="text-green-600 text-sm flex items-center gap-1 font-medium italic animate-in fade-in slide-in-from-left-2">
                                        <CheckCircle className="h-4 w-4" /> Changes saved
                                    </span>
                                )}
                                {mutation.isError && (
                                    <span className="text-red-500 text-sm italic font-medium">
                                        {mutation.error.message}
                                    </span>
                                )}
                            </div>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
