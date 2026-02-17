"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useState } from "react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { cn } from "@/lib/utils"
import { useProfitAndLoss } from "@/hooks/use-profit-and-loss"
import { DateRange } from "react-day-picker"

export default function ProfitAndLossPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    })

    const { data, isLoading, error } = useProfitAndLoss(
        dateRange?.from?.toISOString(),
        dateRange?.to?.toISOString()
    )

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount)
    }

    return (
        <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Profit & Loss
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Track your financial performance over a selected period.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-[280px] justify-start text-left font-normal border-zinc-200 dark:border-zinc-800",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                            {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" onClick={() => window.print()} className="shadow-sm">
                        Print Report
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg">
                    Error loading P&L data. Please try again later.
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Calculating your performance...</p>
                </div>
            ) : !data ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <p className="text-muted-foreground">Please select a customer account to view this report.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-zinc-900 to-zinc-800 text-white dark:from-zinc-950 dark:to-zinc-900 border-zinc-800/50">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <DollarSign size={80} />
                            </div>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-zinc-400 font-medium uppercase tracking-wider text-xs">Total Revenue</CardDescription>
                                <CardTitle className="text-4xl font-bold">{formatCurrency(data?.totalRevenue || 0)}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-emerald-400 text-sm font-medium">
                                    Revenue generated in this period
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200/50 dark:border-zinc-800/50 shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardDescription className="uppercase tracking-wider text-xs font-semibold">Total Expenses</CardDescription>
                                <CardTitle className="text-4xl font-bold text-foreground">{formatCurrency(data?.totalExpenses || 0)}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-rose-500 text-sm font-medium">
                                    Operational costs in this period
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200/50 dark:border-zinc-800/50 shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardDescription className="uppercase tracking-wider text-xs font-semibold">Net Profit</CardDescription>
                                <CardTitle className={cn(
                                    "text-4xl font-bold",
                                    (data?.netProfit || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                                )}>
                                    {formatCurrency(data?.netProfit || 0)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={cn(
                                    "flex items-center text-sm font-medium",
                                    (data?.netProfit || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                                )}>
                                    {(data?.netProfit || 0) >= 0 ? <TrendingUp className="mr-1 h-4 w-4" /> : <TrendingDown className="mr-1 h-4 w-4" />}
                                    Final balance for this period
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-zinc-200/50 dark:border-zinc-800/50 shadow-lg bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Detailed Statement</CardTitle>
                            <CardDescription>Breakdown by individual ledger accounts</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-12">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        Operating Income
                                    </h3>
                                    <div className="divide-y">
                                        {data?.incomeItems && data.incomeItems.length > 0 ? (
                                            data.incomeItems.map((item) => (
                                                <div key={item.id} className="grid grid-cols-2 py-3 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.name}</span>
                                                        <span className="text-xs text-muted-foreground">{item.code}</span>
                                                    </div>
                                                    <span className="text-right font-mono font-medium self-center">{formatCurrency(item.amount)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="py-4 text-sm text-muted-foreground italic text-center">No income recorded for this period.</p>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t-2 border-double">
                                        <span className="font-bold">Total Operating Income</span>
                                        <span className="font-bold underline">{formatCurrency(data?.totalRevenue || 0)}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                                        Operating Expenses
                                    </h3>
                                    <div className="divide-y">
                                        {data?.expenseItems && data.expenseItems.length > 0 ? (
                                            data.expenseItems.map((item) => (
                                                <div key={item.id} className="grid grid-cols-2 py-3 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.name}</span>
                                                        <span className="text-xs text-muted-foreground">{item.code}</span>
                                                    </div>
                                                    <span className="text-right font-mono font-medium self-center">{formatCurrency(item.amount)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="py-4 text-sm text-muted-foreground italic text-center">No expenses recorded for this period.</p>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t-2 border-double">
                                        <span className="font-bold">Total Operating Expenses</span>
                                        <span className="font-bold underline">({formatCurrency(data?.totalExpenses || 0)})</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/30 rounded-lg flex justify-between items-center border-t-4 border-double">
                                    <h3 className="text-xl font-bold uppercase tracking-wider">Net Profit / (Loss)</h3>
                                    <span className={cn(
                                        "text-2xl font-bold",
                                        (data?.netProfit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        {formatCurrency(data?.netProfit || 0)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
