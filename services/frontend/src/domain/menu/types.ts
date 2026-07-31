export interface MenuItemDto {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  quantity: number;
  createdAt: string;
}

export interface CreateMenuItemDto {
  name: string;
  description?: string;
  price: number;
  category: string;
}

export interface UpdateMenuItemDto {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  quantity?: number;
  isAvailable?: boolean;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

