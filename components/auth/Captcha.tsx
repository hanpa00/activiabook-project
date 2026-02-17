'use client'

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

export interface CaptchaHandle {
    verify: (input: string) => boolean
    reset: () => void
}

export const Captcha = forwardRef<CaptchaHandle, { onVerify?: (isValid: boolean) => void }>((props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [code, setCode] = useState('')
    const [userInput, setUserInput] = useState('')

    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let result = ''
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    const drawCaptcha = (text: string) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#f3f4f6'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Add some noise lines
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.3)`
            ctx.beginPath()
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
            ctx.stroke()
        }

        ctx.font = 'bold 24px monospace'
        ctx.textBaseline = 'middle'

        for (let i = 0; i < text.length; i++) {
            const char = text[i]
            ctx.save()
            ctx.translate(20 + i * 25, 25)
            ctx.rotate((Math.random() - 0.5) * 0.4)
            ctx.fillStyle = `rgb(${Math.random() * 100},${Math.random() * 100},${Math.random() * 100})`
            ctx.fillText(char, 0, 0)
            ctx.restore()
        }
    }

    const reset = () => {
        const newCode = generateCode()
        setCode(newCode)
        setUserInput('')
        drawCaptcha(newCode)
        if (props.onVerify) props.onVerify(false)
    }

    useEffect(() => {
        reset()
    }, [])

    useImperativeHandle(ref, () => ({
        verify: (input: string) => input.toUpperCase() === code,
        reset
    }))

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setUserInput(value)
        if (props.onVerify) {
            props.onVerify(value.toUpperCase() === code)
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <canvas
                    ref={canvasRef}
                    width={180}
                    height={50}
                    className="border rounded bg-gray-50 cursor-pointer"
                    onClick={reset}
                    title="Click to refresh"
                />
                <Button type="button" variant="ghost" size="icon" onClick={reset}>
                    <RotateCcw className="h-4 w-4" />
                </Button>
            </div>
            <Input
                placeholder="Enter CAPTCHA code"
                value={userInput}
                onChange={handleInputChange}
                className="uppercase"
            />
        </div>
    )
})

Captcha.displayName = 'Captcha'
