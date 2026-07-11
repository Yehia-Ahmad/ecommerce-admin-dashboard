import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { BundlesService } from '../../services/bundles.service';
import { BundleSelectableProduct, BundlesPagination } from '../../models/bundle.models';

const DEFAULT_PAGINATION: BundlesPagination = {
  page: 1,
  limit: 8,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false
};

@Component({
  selector: 'app-bundle-product-selector-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, TranslatePipe],
  template: `
    <p-dialog
      [visible]="visible"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [style]="{ width: 'min(64rem, 96vw)' }"
      styleClass="!border-0"
      [header]="'bundles.productSelector.title' | translate"
    >
      <div class="grid gap-4 text-light_orange">
        <input
          pInputText
          class="w-full rounded-lg border border-[#696969] bg-[#2f2f2f] p-3 text-light_orange outline-none focus:border-orange"
          type="search"
          [(ngModel)]="search"
          (ngModelChange)="onSearchChange($event)"
          [placeholder]="'bundles.productSelector.searchPlaceholder' | translate"
          aria-label="Search products"
        />

        @if (isLoading()) {
          <div class="p-8 text-center text-[#d1d5db]">{{ 'actions.loading' | translate }}</div>
        } @else if (loadError()) {
          <div class="grid gap-3 p-8 text-center text-red-300">
            <p>{{ loadError() }}</p>
            <button class="mx-auto rounded-lg bg-orange px-4 py-3 font-bold text-gray_dark" type="button" (click)="loadProducts()">{{ 'bundles.actions.retry' | translate }}</button>
          </div>
        } @else {
          <div class="grid max-h-[60vh] grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 overflow-auto">
            @for (product of products; track product.id) {
              <article class="grid gap-3 rounded-xl border border-[#515151] bg-[#242424] p-3" [class.opacity-50]="disabledProductIds.includes(product.id)">
                <img class="aspect-video w-full rounded-lg bg-black object-cover" [src]="product.image || 'assets/img/Kapo.jpeg'" [alt]="product.name" />
                <div class="grid gap-1">
                  <h3 class="m-0 text-base font-bold text-orange">{{ product.name }}</h3>
                  <p class="m-0 text-sm text-[#d1d5db]">{{ product.sku || '-' }}</p>
                  <p class="m-0 text-sm text-[#d1d5db]">{{ 'bundles.productSelector.price' | translate }}: {{ product.price | number:'1.2-2' }}</p>
                  <p class="m-0 text-sm text-[#d1d5db]">{{ 'bundles.productSelector.stock' | translate }}: {{ product.stock }}</p>
                  <p class="m-0 text-sm text-[#d1d5db]">{{ 'bundles.productSelector.variants' | translate }}: {{ product.variants.length }}</p>
                  @if (!product.isActive) {
                    <span class="w-max rounded-full bg-yellow-400 px-2 py-1 text-xs font-bold text-gray_dark">{{ 'bundles.status.inactive' | translate }}</span>
                  }
                  @if (product.stock <= 0) {
                    <span class="w-max rounded-full bg-red-800 px-2 py-1 text-xs font-bold text-white">{{ 'bundles.status.outOfStock' | translate }}</span>
                  }
                </div>
                <button
                  type="button"
                  class="rounded-lg bg-orange px-4 py-3 font-bold text-gray_dark disabled:cursor-not-allowed disabled:opacity-60"
                  (click)="select(product)"
                  [disabled]="disabledProductIds.includes(product.id)"
                >
                  {{ 'bundles.productSelector.select' | translate }}
                </button>
              </article>
            } @empty {
              <div class="p-8 text-center text-[#d1d5db]">{{ 'bundles.productSelector.empty' | translate }}</div>
            }
          </div>
        }

        <div class="flex items-center justify-center gap-4">
          <button class="rounded-lg bg-orange px-4 py-3 font-bold text-gray_dark disabled:cursor-not-allowed disabled:opacity-60" type="button" (click)="changePage(pagination.page - 1)" [disabled]="pagination.page <= 1 || isLoading()">&lt;</button>
          <span>{{ pagination.page }} / {{ pagination.totalPages }}</span>
          <button class="rounded-lg bg-orange px-4 py-3 font-bold text-gray_dark disabled:cursor-not-allowed disabled:opacity-60" type="button" (click)="changePage(pagination.page + 1)" [disabled]="pagination.page >= pagination.totalPages || isLoading()">&gt;</button>
        </div>
      </div>
    </p-dialog>
  `
})
export class ProductSelectorDialogComponent {
  @Input() visible = false;
  @Input() disabledProductIds: string[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() productSelected = new EventEmitter<BundleSelectableProduct>();

  products: BundleSelectableProduct[] = [];
  pagination: BundlesPagination = { ...DEFAULT_PAGINATION };
  search = '';
  isLoading = signal(false);
  loadError = signal('');
  private searchChanges = new Subject<string>();

  constructor(private readonly bundlesService: BundlesService) {
    this.searchChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((query) => {
        this.isLoading.set(true);
        this.loadError.set('');
        return this.bundlesService.searchProducts({ q: query, page: 1, limit: this.pagination.limit });
      })
    ).subscribe({
      next: (page) => {
        this.products = page.products;
        this.pagination = page.pagination;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.loadError.set(this.errorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  ngOnChanges(): void {
    if (this.visible && !this.products.length) {
      this.loadProducts();
    }
  }

  onSearchChange(value: string): void {
    this.searchChanges.next(value);
  }

  loadProducts(page = 1): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.bundlesService.searchProducts({ q: this.search, page, limit: this.pagination.limit }).subscribe({
      next: (result) => {
        this.products = result.products;
        this.pagination = result.pagination;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.loadError.set(this.errorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  changePage(page: number): void {
    if (page < 1 || page > this.pagination.totalPages) return;
    this.loadProducts(page);
  }

  select(product: BundleSelectableProduct): void {
    if (this.disabledProductIds.includes(product.id)) return;
    this.productSelected.emit(product);
    this.visibleChange.emit(false);
  }

  private errorMessage(error: any): string {
    return error?.error?.message || error?.message || 'Failed to load products.';
  }
}
