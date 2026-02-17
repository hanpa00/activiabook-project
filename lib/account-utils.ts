import { ChartOfAccount } from "@/types"

export type AccountNode = ChartOfAccount & {
  children: AccountNode[]
  level: number
}

/**
 * Builds a hierarchical tree from a flat list of accounts.
 */
export function buildAccountTree(accounts: ChartOfAccount[]): AccountNode[] {
  const accountMap = new Map<string, AccountNode>()
  const rootNodes: AccountNode[] = []

  // Initialize all nodes
  accounts.forEach(account => {
    accountMap.set(account.id, { ...account, children: [], level: 0 })
  })

  // Build tree
  accounts.forEach(account => {
    const node = accountMap.get(account.id)!
    if (account.parent_id && accountMap.has(account.parent_id)) {
      const parent = accountMap.get(account.parent_id)!
      node.level = parent.level + 1
      parent.children.push(node)
    } else {
      rootNodes.push(node)
    }
  })

  return rootNodes
}

/**
 * Flattens the account tree back into a list, preserving order (DFT) for display.
 */
export function flattenAccountTree(nodes: AccountNode[]): AccountNode[] {
  const result: AccountNode[] = []
  
  function traverse(node: AccountNode) {
    result.push(node)
    // Sort children by code or name if needed, currently assuming input was somewhat ordered or we sort here
    node.children.sort((a, b) => a.code.localeCompare(b.code))
    node.children.forEach(traverse)
  }

  // Sort roots
  nodes.sort((a, b) => a.code.localeCompare(b.code))
  nodes.forEach(traverse)
  
  return result
}
