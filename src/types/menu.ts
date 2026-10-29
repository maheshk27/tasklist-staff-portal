export interface Menu {
  menuId: number
  parentId?: number | null
  menuCode: string
  menuName: string
  icon?: string | null
  routePath?: string | null
  portal: string
  sequence: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MenuTreeNode extends Menu {
  children: MenuTreeNode[]
}

export interface MyPermissions {
  roleId: number
  roleName: string
  permissions: string[]
}
