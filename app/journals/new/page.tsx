"use client"

import { JournalForm, JournalFormHandle } from "@/components/features/journal/journal-form"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"

export default function NewJournalPage() {
  const formRef = useRef<JournalFormHandle>(null)

  const handlePost = async () => {
    if (formRef.current) {
        await formRef.current.submitWithStatus('POSTED')
    }
  }

  return (
    <div className="container mx-auto p-8">
      <div className="pb-8 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">New Journal Entry</h1>
            <p className="text-muted-foreground">
            Create a new double-entry journal transaction.
            </p>
        </div>
        <Button onClick={handlePost}>
            <Save className="mr-2 h-4 w-4" />
            Post Entry
        </Button>
      </div>
      <div>
        <JournalForm ref={formRef} />
      </div>
    </div>
  )
}
