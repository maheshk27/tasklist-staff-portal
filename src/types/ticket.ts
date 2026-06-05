export interface TicketResponseDto {
  ticketId: number;
  ticketNumber: string;
  storeId: number;
  store?: { storeId: number; storeName: string; storeCode: string };
  departmentId: number;
  department?: { departmentId: number; departmentName: string };
  ticketCategoryId: number;
  ticketCategory?: { ticketCategoryId: number; categoryName: string };
  title: string;
  description?: string;
  priority?: string;
  severity?: string;
  status: string;
  createdBy: number;
  createdByUser?: { userId: number; userName: string };
  assignedTo?: number;
  assignedToUser?: { userId: number; userName: string };
  raisedAt?: string;
  assignedAt?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  slaDueAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCategoryDto {
  ticketCategoryId: number;
  categoryName: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketDto {
  storeId: number;
  departmentId: number;
  ticketCategoryId: number;
  title: string;
  description?: string;
  priority?: string;
  severity?: string;
  createdBy: number;
  assignedTo?: number;
}

export interface UpdateTicketDto {
  title?: string;
  description?: string;
  priority?: string;
  severity?: string;
  status?: string;
  assignedTo?: number;
  resolutionNotes?: string;
}

export interface DepartmentDto {
  departmentId: number;
  departmentName: string;
}

export interface TicketFilterParams {
  createdBy?: number;
  storeId?: number;
  departmentId?: number;
  ticketCategoryId?: number;
  assignedTo?: number;
  createdFrom?: string;
  createdTo?: string;
}