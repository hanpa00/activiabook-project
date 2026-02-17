
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

export default function CloseAccountPage() {
    const [email, setEmail] = useState<string | null>(null)
    const [confirmation, setConfirmation] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setEmail(user.email ?? null)
            } else {
                router.push("/login")
            }
        }
        getUser()
    }, [supabase, router])

    if (!email) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const expectedConfirmation = `Close user account ${email}`

    const handleCloseAccount = async () => {
        if (confirmation !== expectedConfirmation) return

        setIsSubmitting(true)
        setError(null)
        try {
            const res = await fetch("/api/user/close", {
                method: "POST",
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to close account")
            }

            // Successfully closed account and signed out
            window.location.href = "/"
        } catch (err: any) {
            console.error(err)
            setError(err.message)
            setIsSubmitting(false)
        }
    }

    return (
        <div className="container max-w-2xl mx-auto py-24 px-4">
            <Card className="border-destructive/20 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-destructive flex items-center gap-2">
                        <AlertCircle className="h-6 w-6" />
                        Close User Account
                    </CardTitle>
                    <CardDescription>
                        This action will soft-delete your profile. You will be signed out and unable to access your data unless your account is restored. A confirmation email will be sent to your registered email address with reactivation instructions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                        <p className="font-medium mb-2">📧 Email Confirmation</p>
                        <p>A confirmation email will be sent to <strong>{email}</strong> with details about your 30-day reactivation window.</p>
                    </div>

                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-sm text-destructive font-medium">
                        To confirm, please type exactly: <br />
                        <span className="font-mono mt-2 block select-all bg-background border rounded px-2 py-1">
                            {expectedConfirmation}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmation">Confirmation String</Label>
                        <Input
                            id="confirmation"
                            placeholder="Type the string above to confirm"
                            value={confirmation}
                            onChange={(e) => setConfirmation(e.target.value)}
                            className="border-destructive/20 focus-visible:ring-destructive"
                            autoComplete="off"
                            data-1p-ignore
                            data-lpignore="true"
                        />
                    </div>

                    {error && (
                        <div className="text-destructive text-sm font-medium">
                            {error}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleCloseAccount}
                        disabled={confirmation !== expectedConfirmation || isSubmitting}
                        className="min-w-[150px]"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            "Permanently Close"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
