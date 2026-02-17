
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Loader2, KeyRound, Mail, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"

export default function SecurityPage() {
    const [step, setStep] = useState<"request" | "verify">("request")
    const [email, setEmail] = useState<string>("")
    const [code, setCode] = useState("")
    const [passwords, setPasswords] = useState({ new: "", confirm: "" })
    const [showPasswords, setShowPasswords] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    useEffect(() => {
        async function getUser() {
            const res = await fetch("/api/user")
            const data = await res.json()
            if (data.email) {
                setEmail(data.email)
            } else {
                router.push("/login")
            }
        }
        getUser()
    }, [router])

    const handleSendCode = async () => {
        setIsSubmitting(true)
        setError(null)
        try {
            const res = await fetch("/api/user/security/send-code", { method: "POST" })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to send code")
            }
            setStep("verify")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (passwords.new !== passwords.confirm) {
            setError("Passwords do not match")
            return
        }
        if (passwords.new.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setIsSubmitting(true)
        setError(null)
        try {
            const res = await fetch("/api/user/security/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, newPassword: passwords.new }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to change password")
            }
            setSuccess(true)
            setTimeout(() => {
                router.push("/dashboard")
            }, 2000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (success) {
        return (
            <div className="container max-w-2xl mx-auto py-24 px-4">
                <Card className="border-green-100 shadow-2xl bg-gradient-to-br from-white to-green-50/30">
                    <CardContent className="pt-12 pb-12 flex flex-col items-center text-center space-y-4">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-green-800">Password Changed!</CardTitle>
                        <CardDescription className="text-lg">
                            Your security settings have been updated successfully. Redirecting you back to dashboard...
                        </CardDescription>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container max-w-2xl mx-auto py-24 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="border-slate-200 shadow-2xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <CardHeader className="space-y-1 pt-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Shield className="h-6 w-6 text-indigo-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Security Settings</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                        Manage your account security and authentication methods.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 py-6">
                    {step === "request" ? (
                        <div className="space-y-6">
                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 flex gap-4">
                                <Mail className="h-6 w-6 text-blue-600 shrink-0" />
                                <div className="space-y-1">
                                    <p className="font-semibold text-blue-900">Email Verification Required</p>
                                    <p className="text-sm text-blue-700">
                                        To change your password, we need to send a one-time verification code to your registered email:
                                        <span className="font-medium block mt-1">{email}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => router.back()}
                                    disabled={isSubmitting}
                                    className="flex-1 h-12 text-base font-semibold border-slate-200 hover:bg-slate-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSendCode}
                                    disabled={isSubmitting}
                                    className="flex-[2] h-12 text-base font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Sending Code...
                                        </>
                                    ) : (
                                        "Send Verification Code"
                                    )}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleChangePassword} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-2">
                                <Label htmlFor="code" className="text-sm font-semibold text-slate-700">Verification Code</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="code"
                                        placeholder="Enter 6-digit code"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="pl-10 h-11 border-slate-200 focus:ring-indigo-500"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                                <p className="text-xs text-slate-500 italic">Code sent to {email}</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword text-sm font-semibold text-slate-700">New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="newPassword"
                                            type={showPasswords ? "text" : "password"}
                                            placeholder="Min. 6 characters"
                                            value={passwords.new}
                                            onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                                            className="pr-10 h-11 border-slate-200 focus:ring-indigo-500"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword text-sm font-semibold text-slate-700">Confirm New Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type={showPasswords ? "text" : "password"}
                                        placeholder="Repeat your password"
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                                        className="h-11 border-slate-200 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium animate-in shake">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    {error}
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                    disabled={isSubmitting}
                                    className="flex-1 h-11 border-slate-200 hover:bg-slate-50"
                                >
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] h-11 font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Updating Password...
                                        </>
                                    ) : (
                                        "Update Password"
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        Security is our priority. Your password changes are logged and monitored. If you notice any suspicious activity, please contact our security team immediately.
                    </p>
                </div>
            </Card>
        </div>
    )
}
