import { BundleDiscountType, BundleItem, BundlePricingType, CreateBundlePayload } from '../../models/bundle.models';
import { BundlePricePreview } from '../price-preview/price-preview.component';
import { BundleStockPreview } from '../stock-preview/stock-preview.component';

export interface BundlePreviewItem {
  label: string;
  price: number;
  stock: number;
  quantity: number;
}

export function calculateBundlePricePreview(
  items: BundlePreviewItem[],
  pricingType: BundlePricingType,
  fixedPrice: number | null,
  discountType: BundleDiscountType | null,
  discountValue: number | null
): BundlePricePreview {
  const originalPrice = items.reduce((total, item) => total + item.price * item.quantity, 0);
  let finalPrice = originalPrice;

  if (pricingType === 'fixed') {
    finalPrice = Number(fixedPrice || 0);
  } else if (discountType === 'percentage') {
    finalPrice = originalPrice - (originalPrice * Number(discountValue || 0) / 100);
  } else if (discountType === 'fixed') {
    finalPrice = originalPrice - Number(discountValue || 0);
  }

  finalPrice = Math.max(0, finalPrice);
  const savedAmount = Math.max(0, originalPrice - finalPrice);

  return {
    originalPrice,
    finalPrice,
    savedAmount,
    savingsPercentage: originalPrice > 0 ? (savedAmount / originalPrice) * 100 : 0,
    discountType,
    discountValue
  };
}

export function calculateBundleStockPreview(items: BundlePreviewItem[]): BundleStockPreview {
  const previewItems = items.map((item) => ({
    label: item.label,
    availableStock: item.stock,
    requiredQuantity: item.quantity,
    possibleBundleQuantity: item.quantity > 0 ? Math.floor(item.stock / item.quantity) : 0
  }));
  const availableStock = previewItems.length
    ? Math.min(...previewItems.map((item) => item.possibleBundleQuantity))
    : 0;
  const limitingItem = previewItems.find((item) => item.possibleBundleQuantity === availableStock);

  return {
    availableStock,
    limitingItemLabel: limitingItem?.label ?? null,
    items: previewItems
  };
}

export function buildBundlePayload(input: {
  name: string;
  description?: string | null;
  image?: string | null;
  items: BundleItem[];
  pricingType: BundlePricingType;
  fixedPrice?: number | null;
  discountType?: BundleDiscountType | null;
  discountValue?: number | null;
  isActive: boolean;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}): CreateBundlePayload {
  const payload: CreateBundlePayload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    image: input.image || null,
    items: input.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: Number(item.quantity)
    })),
    pricingType: input.pricingType,
    isActive: input.isActive,
    startDate: formatDateValue(input.startDate),
    endDate: formatDateValue(input.endDate)
  };

  if (input.pricingType === 'fixed') {
    payload.fixedPrice = Number(input.fixedPrice);
  } else {
    payload.discountType = input.discountType ?? null;
    payload.discountValue = Number(input.discountValue);
  }

  return payload;
}

export function formatDateValue(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}
