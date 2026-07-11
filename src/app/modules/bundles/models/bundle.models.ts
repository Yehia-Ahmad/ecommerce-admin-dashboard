export type BundlePricingType = 'fixed' | 'discount';
export type BundleDiscountType = 'percentage' | 'fixed';
export type BundleSortBy = 'createdAt' | 'name' | 'originalPrice' | 'finalPrice';
export type SortOrder = 'asc' | 'desc';

export interface BundleItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface BundleListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean | null;
  isAvailable?: boolean | null;
  pricingType?: BundlePricingType | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  sortBy?: BundleSortBy;
  sortOrder?: SortOrder;
}

export interface BundlesPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface BundlesPage {
  bundles: BundleListItem[];
  pagination: BundlesPagination;
}

export interface BundleListItem {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  itemsCount: number;
  originalPrice: number;
  finalPrice: number;
  savedAmount: number;
  discountPercentage: number;
  availableStock: number;
  isAvailable: boolean;
  isActive: boolean;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BundleDetails extends BundleListItem {
  description?: string | null;
  pricingType: BundlePricingType;
  fixedPrice?: number | null;
  discountType?: BundleDiscountType | null;
  discountValue?: number | null;
  items: BundleDetailsItem[];
}

export interface BundleDetailsItem {
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  sku?: string | null;
  image?: string | null;
  unitPrice: number;
  quantity: number;
  requiredStock: number;
  currentStock: number;
  possibleBundleQuantity: number;
  subtotal: number;
  product?: BundleSelectableProduct | null;
  variant?: BundleSelectableVariant | null;
}

export interface CreateBundlePayload {
  name: string;
  description?: string | null;
  image?: string | null;
  items: BundleItem[];
  pricingType: BundlePricingType;
  fixedPrice?: number | null;
  discountType?: BundleDiscountType | null;
  discountValue?: number | null;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export type UpdateBundlePayload = Partial<CreateBundlePayload>;

export interface BundleStockResponse {
  availableStock: number;
  isAvailable: boolean;
  items?: Array<{
    productId: string;
    variantId?: string | null;
    currentStock: number;
    requiredQuantity: number;
    possibleBundleQuantity: number;
  }>;
}

export interface BundleSelectableVariant {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  stock: number;
  isActive?: boolean;
}

export interface BundleSelectableProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  image?: string | null;
  price: number;
  stock: number;
  isActive?: boolean;
  isDeleted?: boolean;
  variants: BundleSelectableVariant[];
}

export interface ProductSearchParams {
  q?: string;
  page?: number;
  limit?: number;
  categoryId?: string | null;
  brandId?: string | null;
  includeInactive?: boolean;
}

export interface ProductSearchPage {
  products: BundleSelectableProduct[];
  pagination: BundlesPagination;
}
