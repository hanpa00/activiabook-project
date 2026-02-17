
"use client"

import { useAccounts } from "@/hooks/use-accounts"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Plus, Trash2, Pencil, ChevronRight, ChevronDown, AlertCircle } from "lucide-react"
import { useState, useMemo } from "react"
import { CreateAccountDialog } from "@/components/features/accounts/create-account-dialog"
import { buildAccountTree, AccountNode } from "@/lib/account-utils"
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
import { useQueryClient } from "@tanstack/react-query"
import { getAccountTypeColor, ACCOUNT_TYPE_LABELS } from "@/lib/account-types"
import { AccountType } from "@/types"

export default function AccountsPage() {
    const { data: accounts, isLoading, error } = useAccounts()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<{
        id: string,
        name: string,
        code: string,
        parent_id: string | null,
        type: string
    } | null>(null)
    const queryClient = useQueryClient()
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, name: string } | null>(null)

    // Memoize tree structure
    const accountTree = useMemo(() => {
        if (!accounts) return []
        return buildAccountTree(accounts)
    }, [accounts])

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    if (error) return <div className="p-8 text-red-500">Error loading accounts</div>

    // Edit Handlers
    async function handleUpdateAccount(e: React.FormEvent) {
        e.preventDefault()
        if (!editingAccount) return

        try {
            const res = await fetch('/api/accounts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingAccount.id,
                    name: editingAccount.name,
                    code: editingAccount.code,
                    parent_id: editingAccount.parent_id,
                    type: editingAccount.type
                })
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to update')
            }

            await queryClient.invalidateQueries({ queryKey: ['accounts'] })
            // Invalidate reports since hierarchy/code changes affect them
            await queryClient.invalidateQueries({ queryKey: ['profit-and-loss'] })
            await queryClient.invalidateQueries({ queryKey: ['balance-sheet'] })

            setEditingAccount(null)
        } catch (e: any) {
            alert(e.message || 'Failed to update account')
        }
    }

    // Delete Handler
    async function handleDelete() {
        if (!deleteConfirmation) return
        setDeleteError(null)

        try {
            const res = await fetch(`/api/accounts?id=${deleteConfirmation.id}`, { method: 'DELETE' })
            if (!res.ok) {
                const data = await res.json()
                if (res.status === 409) {
                    setDeleteError(data.error)
                    setDeleteConfirmation(null)
                    return
                }
                throw new Error(data.error || 'Failed to delete')
            }
            await queryClient.invalidateQueries({ queryKey: ['accounts'] })
            setDeleteConfirmation(null)
        } catch (e) {
            setDeleteError('An unexpected error occurred while deleting.')
            setDeleteConfirmation(null)
        }
    }

    // Using helper now
    // function getBadgeColor(type: string) { ... }

    // Recursive Row Component
    function AccountRow({ node }: { node: AccountNode }) {
        const [isExpanded, setIsExpanded] = useState(true)
        const hasChildren = node.children.length > 0

        return (
            <>
                <TableRow>
                    <TableCell style={{ paddingLeft: `${node.level * 24 + 12}px` }}>
                        <div className="flex items-center">
                            {hasChildren && (
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="mr-2 p-1 hover:bg-muted rounded"
                                >
                                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </button>
                            )}
                            {!hasChildren && <span className="w-6" />} {/* Spacer */}
                            <span className="font-mono text-xs text-muted-foreground mr-2">{node.code}</span>
                            <span className="font-medium">{node.name}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge className={getAccountTypeColor(node.type as AccountType)} variant="outline">{ACCOUNT_TYPE_LABELS[node.type as AccountType] || node.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(node.balance || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingAccount({
                                id: node.id,
                                name: node.name,
                                code: node.code,
                                parent_id: node.parent_id || null,
                                type: node.type
                            })}
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmation({ id: node.id, name: node.name })}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </TableCell>
                </TableRow>
                {isExpanded && node.children.sort((a, b) => a.code.localeCompare(b.code)).map(child => (
                    <AccountRow key={child.id} node={child} />
                ))}
            </>
        )
    }

    return (
        <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
                    <p className="text-muted-foreground">Manage your financial accounts and hierarchy.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Account
                </Button>
            </div>

            {deleteError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[400px]">Account</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-right w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {accountTree.sort((a, b) => a.code.localeCompare(b.code)).map((node) => (
                            <AccountRow key={node.id} node={node} />
                        ))}
                        {accountTree.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                    No accounts found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <CreateAccountDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

            {/* Edit Dialog */}
            <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Account</DialogTitle>
                        <DialogDescription>Modify account details and hierarchy.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateAccount}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-code" className="text-right">Code</Label>
                                <Input
                                    id="edit-code"
                                    value={editingAccount?.code || ''}
                                    onChange={(e) => setEditingAccount(prev => prev ? { ...prev, code: e.target.value } : null)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">Name</Label>
                                <Input
                                    id="edit-name"
                                    value={editingAccount?.name || ''}
                                    onChange={(e) => setEditingAccount(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-parent" className="text-right">Parent</Label>
                                <select
                                    id="edit-parent"
                                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={editingAccount?.parent_id || 'none'}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setEditingAccount(prev => {
                                            if (!prev) return null;
                                            const newParent = val === 'none' ? null : val;
                                            // Automatically sync type if parent changes
                                            const parent = accounts?.find(a => a.id === newParent);
                                            return {
                                                ...prev,
                                                parent_id: newParent,
                                                type: parent ? parent.type : prev.type
                                            };
                                        })
                                    }}
                                >
                                    <option value="none">None</option>
                                    {accounts?.filter(a => a.id !== editingAccount?.id).map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-type" className="text-right">Type</Label>
                                <select
                                    id="edit-type"
                                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={editingAccount?.type || ''}
                                    onChange={(e) => setEditingAccount(prev => prev ? { ...prev, type: e.target.value } : null)}
                                    disabled={!!editingAccount?.parent_id && editingAccount.parent_id !== 'none'}
                                >
                                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmation} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Account</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteConfirmation?.name}</span>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmation(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
