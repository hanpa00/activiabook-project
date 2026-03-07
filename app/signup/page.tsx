'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, EyeIcon, EyeOffIcon, Facebook } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Captcha, CaptchaHandle } from '@/components/auth/Captcha'
import { LegalDocument } from '@/components/auth/LegalDocument'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export default function SignUpPage() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        companyName: '',
        addressLine: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        linePhone: '',
        cellPhone: '',
        email: '',
        password: '',
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const [captchaVerified, setCaptchaVerified] = useState(false)
    const captchaRef = useRef<CaptchaHandle>(null)
    const [reactivationStatus, setReactivationStatus] = useState<any>(null)
    const [isReactivating, setIsReactivating] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target
        setFormData(prev => ({ ...prev, [id]: value }))
    }

    const checkUserStatus = async (email: string) => {
        try {
            const normalizedEmail = email.toLowerCase().trim()
            const res = await fetch(`/api/auth/user-exists?email=${encodeURIComponent(normalizedEmail)}`)
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            return data
        } catch (error: any) {
            console.error('Error checking user:', error)
            throw error // Re-throw to be handled by handleSignUp
        }
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (!acceptedTerms) {
            setError('You must acknowledge and accept the terms and privacy policy.')
            setLoading(false)
            return
        }

        if (!captchaVerified) {
            setError('Please complete the CAPTCHA verification.')
            setLoading(false)
            return
        }

        try {
            // 1. Check if user already exists
            const normalizedEmail = formData.email.toLowerCase().trim()
            const status = await checkUserStatus(normalizedEmail)
            if (status.exists) {
                if (status.isClosed) {
                    if (status.canReactivate) {
                        setReactivationStatus(status)
                        setLoading(false)
                    } else {
                        // Grace period expired. Auto-reactivate with reset.
                        handleReactivate('fresh')
                    }
                } else {
                    setError('An account with this email already exists.')
                    setLoading(false)
                    captchaRef.current?.reset()
                }
                return
            }

            // 2. Validate against test accounts allow-list (if enabled)
            const validationRes = await fetch('/api/auth/validate-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: normalizedEmail,
                    profileData: formData
                }),
            })

            if (!validationRes.ok) {
                const validationData = await validationRes.json()
                setError(validationData.error || 'Signup is restricted.')
                setLoading(false)
                captchaRef.current?.reset()
                return
            }

            // 3. Proceed with Supabase sign up
            const { data, error } = await supabase.auth.signUp({
                email: normalizedEmail,
                password: formData.password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                    data: {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        company_name: formData.companyName,
                        address_line: formData.addressLine,
                        city: formData.city,
                        state: formData.state,
                        zip_code: formData.zipCode,
                        country: formData.country,
                        line_phone: formData.linePhone,
                        cell_phone: formData.cellPhone,
                    }
                },
            })

            if (error) {
                setError(error.message)
                setLoading(false)
                captchaRef.current?.reset()
            } else {
                // Auto-confirm may return user but no session; sign in manually if needed
                let hasSession = !!data.session

                if (!hasSession && data.user) {
                    const { error: signInError } = await supabase.auth.signInWithPassword({
                        email: normalizedEmail,
                        password: formData.password,
                    })
                    if (signInError) {
                        setError('Account created. Please sign in manually.')
                        setLoading(false)
                        return
                    }
                    hasSession = true
                }

                if (hasSession) {
                    // Send welcome email (await to prevent browser cancellation on redirect)
                    try {
                        await fetch('/api/auth/signup-welcome', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: normalizedEmail, name: formData.firstName || 'User' }),
                        })
                    } catch (emailError) {
                        console.error('Welcome email fetch failed:', emailError)
                    }
                    window.location.href = '/dashboard'
                } else {
                    setError('Check your email for the confirmation link.')
                    setLoading(false)
                }
            }
        } catch (err: any) {
            console.error('Signup error:', err)
            setError(err.message || 'An unexpected error occurred during signup.')
            setLoading(false)
            captchaRef.current?.reset()
        }
    }

    // const handleSocialSignIn = async (provider: 'google' | 'facebook') => {
    //     if (!acceptedTerms) {
    //         setError('You must accept the terms and privacy policy before using social sign-in.')
    //         return
    //     }
    //
    //     const { error } = await supabase.auth.signInWithOAuth({
    //         provider,
    //         options: {
    //             redirectTo: `${location.origin}/auth/callback`,
    //             queryParams: {
    //                 access_type: 'offline',
    //                 prompt: 'consent',
    //             },
    //         },
    //     })
    //     if (error) {
    //         setError(error.message)
    //     }
    // }

    const handleReactivate = async (mode: 'restore' | 'fresh' = 'restore') => {
        setIsReactivating(true)
        setError(null)
        try {
            const res = await fetch('/api/auth/reactivate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    mode,
                    profileData: formData, // Pass the full form data
                    password: formData.password // Explicitly pass password for sync
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Reactivation failed')
            }

            // Automatically sign in the user after reactivation
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            })

            if (signInError) {
                throw signInError
            }

            // Redirect to dashboard
            window.location.href = '/dashboard'
        } catch (err: any) {
            console.error(err)
            setError(err.message)
            setReactivationStatus(null)
            setLoading(false)
        } finally {
            setIsReactivating(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-12">
            <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-indigo-500">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto w-120 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-white font-bold text-2xl"> Welcome to ActiviaBook </span>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">Create an account</CardTitle>
                    <CardDescription>Enter your details below to get started with ActiviaBook</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignUp} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" placeholder="John" value={formData.firstName} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input id="lastName" placeholder="Doe" value={formData.lastName} onChange={handleInputChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input id="companyName" placeholder="Acme Inc." value={formData.companyName} onChange={handleInputChange} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="addressLine">Address Line</Label>
                            <Input id="addressLine" placeholder="123 Main St" value={formData.addressLine} onChange={handleInputChange} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" placeholder="Miami" value={formData.city} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input id="state" placeholder="FL" value={formData.state} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="zipCode">Zip Code</Label>
                                <Input id="zipCode" placeholder="33101" value={formData.zipCode} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label htmlFor="country">Country</Label>
                                <Input id="country" placeholder="USA" value={formData.country} onChange={handleInputChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="linePhone">Line Phone</Label>
                                <Input id="linePhone" type="tel" placeholder="+1..." value={formData.linePhone} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cellPhone">Cell Phone</Label>
                                <Input id="cellPhone" type="tel" placeholder="+1..." value={formData.cellPhone} onChange={handleInputChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email <span className="text-red-500 font-bold">*</span></Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password <span className="text-red-500 font-bold">*</span></Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOffIcon className="h-4 w-4" />
                                    ) : (
                                        <EyeIcon className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border">
                                <Checkbox
                                    id="terms"
                                    checked={acceptedTerms}
                                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                                    required
                                />
                                <div className="text-sm font-medium leading-none">
                                    I acknowledge and accept the{' '}
                                    <LegalDocument title="Terms of Service" url="/api/legal/terms" triggerText="Terms of Service" />
                                    {' '}and{' '}
                                    <LegalDocument title="Privacy Policy" url="/api/legal/privacy" triggerText="Privacy Policy" />
                                    {' '}<span className="text-red-500 font-bold">*</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Human Verification <span className="text-red-500 font-bold">*</span></Label>
                            <Captcha ref={captchaRef} onVerify={setCaptchaVerified} />
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-lg font-semibold shadow-lg shadow-indigo-200 dark:shadow-none" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Account
                        </Button>

                        {/* Social sign-in disabled for beta
<!--
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white dark:bg-slate-950 px-2 text-muted-foreground font-semibold">Or continue with</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Button type="button" variant="outline" className="h-11 border-2" onClick={() => handleSocialSignIn('google')} disabled={loading}>
                                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Google
                            </Button>
                            <Button type="button" variant="outline" className="h-11 border-2" onClick={() => handleSocialSignIn('facebook')} disabled={loading}>
                                <Facebook className="mr-2 h-4 w-4 text-[#1877F2]" fill="currentColor" />
                                Facebook
                            </Button>
                        </div>
-->
                        */}
                    </form>
                </CardContent>
                <CardFooter>
                    <p className="text-sm text-center text-muted-foreground w-full">
                        Already have an account?{' '}
                        <button onClick={() => router.push('/login')} className="text-indigo-600 hover:text-indigo-500 font-semibold underline-offset-4 hover:underline transition-colors">
                            Sign In
                        </button>
                    </p>
                </CardFooter>
            </Card>

            <Dialog open={!!reactivationStatus} onOpenChange={(open) => !open && setReactivationStatus(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-indigo-500" />
                            Account Reactivation
                        </DialogTitle>
                        <DialogDescription>
                            This account was recently closed. Would you like to restore your old data or start from scratch?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">Option 1: Reactivate & Restore</p>
                            <p className="text-xs text-muted-foreground">Keep all your existing customers, accounts, and journal entries.</p>
                            {reactivationStatus?.reactivationDeadline && (
                                <p className="text-[10px] text-indigo-600 font-medium italic">
                                    Restore available until: {new Date(reactivationStatus.reactivationDeadline).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">Option 2: Fresh Start</p>
                            <p className="text-xs text-muted-foreground text-destructive">Permanently delete all old data and start a new account with this email.</p>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="ghost" onClick={() => setReactivationStatus(null)} disabled={isReactivating} className="sm:mr-auto">
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleReactivate('fresh')}
                            disabled={isReactivating}
                            className="border-destructive text-destructive hover:bg-destructive/5 hover:text-destructive"
                        >
                            Fresh Start
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => handleReactivate('restore')}
                            disabled={isReactivating}
                        >
                            {isReactivating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Restore Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
