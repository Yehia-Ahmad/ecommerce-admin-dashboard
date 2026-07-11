import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BundleDetails,
  BundleDetailsItem,
  BundleDiscountType,
  BundleListItem,
  BundleListParams,
  BundlePricingType,
  BundleSelectableProduct,
  BundleSelectableVariant,
  BundlesPage,
  BundlesPagination,
  BundleStockResponse,
  CreateBundlePayload,
  ProductSearchPage,
  ProductSearchParams,
  UpdateBundlePayload
} from '../models/bundle.models';
import { formatDateValue } from '../components/bundle-form/bundle-form.utils';

const DEFAULT_PAGINATION: BundlesPagination = {
  page: 1,
  limit: 10,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false
};

@Injectable({ providedIn: 'root' })
export class BundlesService {
  private readonly baseUrl = `${environment.api_base_url}admin/bundles`;
  private readonly productsUrl = `${environment.api_base_url}products`;

  constructor(private readonly http: HttpClient) {}

  getBundles(params: BundleListParams = {}): Observable<BundlesPage> {
    const requestParams = this.toParams({ ...params });
    const requestedPage = Number(params.page || 1);
    const requestedLimit = Number(params.limit || 10);

    return this.http.get<unknown>(this.baseUrl, { params: requestParams }).pipe(
      map((response) => ({
        bundles: this.extractList(response).map((bundle) => this.normalizeListItem(bundle)),
        pagination: this.normalizePagination(response, requestedPage, requestedLimit)
      }))
    );
  }

  getBundleById(id: string): Observable<BundleDetails> {
    return this.http
      .get<unknown>(`${this.baseUrl}/${encodeURIComponent(id)}`)
      .pipe(map((response) => this.normalizeDetails(this.extractOne(response))));
  }

  createBundle(payload: CreateBundlePayload): Observable<BundleDetails> {
    return this.http
      .post<unknown>(this.baseUrl, payload)
      .pipe(map((response) => this.normalizeDetails(this.extractOne(response))));
  }

  updateBundle(id: string, payload: UpdateBundlePayload): Observable<BundleDetails> {
    return this.http
      .patch<unknown>(`${this.baseUrl}/${encodeURIComponent(id)}`, payload)
      .pipe(map((response) => this.normalizeDetails(this.extractOne(response))));
  }

  deleteBundle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  changeBundleStatus(id: string, isActive: boolean): Observable<BundleDetails> {
    return this.http
      .patch<unknown>(`${this.baseUrl}/${encodeURIComponent(id)}/status`, { isActive })
      .pipe(map((response) => this.normalizeDetails(this.extractOne(response))));
  }

  duplicateBundle(id: string): Observable<BundleDetails> {
    return this.http
      .post<unknown>(`${this.baseUrl}/${encodeURIComponent(id)}/duplicate`, {})
      .pipe(map((response) => this.normalizeDetails(this.extractOne(response))));
  }

  getBundleAvailableStock(id: string): Observable<BundleStockResponse> {
    return this.http
      .get<unknown>(`${this.baseUrl}/${encodeURIComponent(id)}/available-stock`)
      .pipe(map((response) => this.normalizeStock(response)));
  }

  searchProducts(params: ProductSearchParams): Observable<ProductSearchPage> {
    const requestParams = this.toParams({
      q: params.q ?? '',
      search: params.q ?? '',
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      categoryId: params.categoryId,
      brandId: params.brandId,
      includeInactive: params.includeInactive ?? true,
      deleted: false
    });

    return this.http.get<unknown>(this.productsUrl, { params: requestParams }).pipe(
      map((response) => ({
        products: this.extractList(response).map((product) => this.normalizeProduct(product)),
        pagination: this.normalizePagination(response, params.page ?? 1, params.limit ?? 10)
      }))
    );
  }

  private toParams(values: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      const normalizedValue = value instanceof Date ? formatDateValue(value) : value;
      if (normalizedValue === null || normalizedValue === '') return;
      params = params.set(key, String(normalizedValue));
    });
    return params;
  }

  private extractList(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.bundles)) return response.data.bundles;
    if (Array.isArray(response?.bundles)) return response.bundles;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response?.products)) return response.products;
    if (Array.isArray(response?.data?.products)) return response.data.products;
    return [];
  }

  private extractOne(response: any): any {
    return response?.data?.bundle || response?.data || response?.bundle || response || {};
  }

  private normalizePagination(response: any, requestedPage: number, requestedLimit: number): BundlesPagination {
    const source = response?.pagination ?? response?.data?.pagination ?? response?.meta ?? {};
    const page = this.positiveInteger(source.page ?? source.currentPage, requestedPage);
    const limit = this.positiveInteger(source.limit ?? source.perPage, requestedLimit);
    const totalItems = this.positiveInteger(source.totalItems ?? source.total ?? source.count, 0);
    const totalPages = this.positiveInteger(
      source.totalPages ?? (totalItems ? Math.ceil(totalItems / limit) : 1),
      1
    );

    return {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: Boolean(source.hasNextPage ?? page < totalPages),
      hasPrevPage: Boolean(source.hasPrevPage ?? page > 1)
    };
  }

  private normalizeListItem(bundle: any): BundleListItem {
    const id = String(bundle?._id || bundle?.id || '');
    const originalPrice = this.number(bundle?.originalPrice);
    const finalPrice = this.number(bundle?.finalPrice);
    const savedAmount = this.number(bundle?.savedAmount ?? Math.max(0, originalPrice - finalPrice));
    const discountPercentage = this.number(
      bundle?.discountPercentage ?? (originalPrice > 0 ? (savedAmount / originalPrice) * 100 : 0)
    );

    return {
      id,
      name: String(bundle?.name || ''),
      slug: String(bundle?.slug || ''),
      image: this.stringOrNull(bundle?.image),
      itemsCount: this.number(bundle?.itemsCount ?? bundle?.items?.length),
      originalPrice,
      finalPrice,
      savedAmount,
      discountPercentage,
      availableStock: this.number(bundle?.availableStock),
      isAvailable: Boolean(bundle?.isAvailable ?? this.number(bundle?.availableStock) > 0),
      isActive: Boolean(bundle?.isActive),
      startDate: this.stringOrNull(bundle?.startDate),
      endDate: this.stringOrNull(bundle?.endDate),
      createdAt: this.stringOrNull(bundle?.createdAt),
      updatedAt: this.stringOrNull(bundle?.updatedAt)
    };
  }

  private normalizeDetails(bundle: any): BundleDetails {
    const listItem = this.normalizeListItem(bundle);
    return {
      ...listItem,
      description: this.stringOrNull(bundle?.description),
      pricingType: this.pricingType(bundle?.pricingType),
      fixedPrice: this.nullableNumber(bundle?.fixedPrice),
      discountType: this.discountType(bundle?.discountType),
      discountValue: this.nullableNumber(bundle?.discountValue),
      items: this.extractBundleItems(bundle).map((item) => this.normalizeDetailsItem(item))
    };
  }

  private extractBundleItems(bundle: any): any[] {
    if (Array.isArray(bundle?.items)) return bundle.items;
    if (Array.isArray(bundle?.bundleItems)) return bundle.bundleItems;
    return [];
  }

  private normalizeDetailsItem(item: any): BundleDetailsItem {
    const product = item?.product || item?.productId || {};
    const variant = item?.variant || item?.variantId || null;
    const productId = String(item?.productId?._id || item?.productId?.id || item?.productId || product?._id || product?.id || '');
    const variantId = variant ? String(item?.variantId?._id || item?.variantId?.id || item?.variantId || variant?._id || variant?.id || '') : null;
    const quantity = this.positiveInteger(item?.quantity, 1);
    const unitPrice = this.number(item?.unitPrice ?? item?.price ?? variant?.price ?? product?.priceAfterDiscount ?? product?.retailPrice ?? product?.price);
    const currentStock = this.number(item?.currentStock ?? item?.availableStock ?? variant?.stock ?? variant?.inventoryCount ?? product?.inventoryCount);

    return {
      productId,
      variantId,
      productName: String(item?.productName || product?.name || ''),
      variantName: this.stringOrNull(item?.variantName || variant?.name),
      sku: this.stringOrNull(item?.sku || variant?.sku || product?.sku || product?.code),
      image: this.stringOrNull(item?.image || product?.image),
      unitPrice,
      quantity,
      requiredStock: this.number(item?.requiredStock ?? quantity),
      currentStock,
      possibleBundleQuantity: this.number(item?.possibleBundleQuantity ?? Math.floor(currentStock / quantity)),
      subtotal: this.number(item?.subtotal ?? unitPrice * quantity),
      product: productId ? this.normalizeProduct(product) : null,
      variant: variantId && variant ? this.normalizeVariant(variant) : null
    };
  }

  private normalizeStock(response: any): BundleStockResponse {
    const source = response?.data ?? response ?? {};
    return {
      availableStock: this.number(source.availableStock),
      isAvailable: Boolean(source.isAvailable ?? this.number(source.availableStock) > 0),
      items: Array.isArray(source.items) ? source.items.map((item: any) => ({
        productId: String(item?.productId || ''),
        variantId: this.stringOrNull(item?.variantId),
        currentStock: this.number(item?.currentStock),
        requiredQuantity: this.number(item?.requiredQuantity ?? item?.quantity),
        possibleBundleQuantity: this.number(item?.possibleBundleQuantity)
      })) : []
    };
  }

  private normalizeProduct(product: any): BundleSelectableProduct {
    const variants = this.extractVariants(product).map((variant) => this.normalizeVariant(variant));
    return {
      id: String(product?._id || product?.id || ''),
      name: String(product?.name || ''),
      sku: this.stringOrNull(product?.sku || product?.code),
      barcode: this.stringOrNull(product?.barcode),
      image: this.stringOrNull(product?.image),
      price: this.number(product?.priceAfterDiscount ?? product?.retailPrice ?? product?.price ?? product?.wholesalePrice),
      stock: this.number(product?.stock ?? product?.inventoryCount),
      isActive: product?.isActive === undefined ? true : Boolean(product.isActive),
      isDeleted: Boolean(product?.isDeleted ?? product?.deleted),
      variants
    };
  }

  private extractVariants(product: any): any[] {
    if (Array.isArray(product?.variants)) return product.variants;
    if (Array.isArray(product?.models)) return product.models;
    if (Array.isArray(product?.options)) return product.options;
    return [];
  }

  private normalizeVariant(variant: any): BundleSelectableVariant {
    return {
      id: String(variant?._id || variant?.id || ''),
      name: String(variant?.name || variant?.title || variant?.sku || ''),
      sku: this.stringOrNull(variant?.sku || variant?.code),
      price: this.number(variant?.priceAfterDiscount ?? variant?.retailPrice ?? variant?.price),
      stock: this.number(variant?.stock ?? variant?.inventoryCount),
      isActive: variant?.isActive === undefined ? true : Boolean(variant.isActive)
    };
  }

  private pricingType(value: unknown): BundlePricingType {
    return value === 'fixed' ? 'fixed' : 'discount';
  }

  private discountType(value: unknown): BundleDiscountType | null {
    return value === 'percentage' || value === 'fixed' ? value : null;
  }

  private stringOrNull(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    return String(value);
  }

  private nullableNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private number(value: unknown): number {
    return this.nullableNumber(value) ?? 0;
  }

  private positiveInteger(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  }
}
