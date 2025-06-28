// Pagination interfaces
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Query filter base interface - KEEP (utility interface for filtering)
export interface BaseQueryFilters {
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
}