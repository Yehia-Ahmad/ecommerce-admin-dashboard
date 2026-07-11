import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { Observable } from 'rxjs';
import { SideNavComponent } from '../../../layout/components/side-nav/side-nav.component';
import { HOME_VIEW_STORAGE_KEY } from '../../../layout/constants/home-view.constants';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ThemeService } from '../../../shared/services/theme.service';
import {
  BundleListItem,
  BundleListParams,
  BundlePricingType,
  BundleSortBy,
  BundlesPagination,
  SortOrder,
} from '../../models/bundle.models';
import { BundlesService } from '../../services/bundles.service';

const DEFAULT_PAGINATION: BundlesPagination = {
  page: 1,
  limit: 10,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

@Component({
  selector: 'app-bundle-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SideNavComponent,
    TranslatePipe,
    TableModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    PaginationComponent,
    MatSnackBarModule,
  ],
  templateUrl: './bundle-list.component.html',
})
export class BundleListComponent implements OnInit {
  bundles: BundleListItem[] = [];
  pagination: BundlesPagination = { ...DEFAULT_PAGINATION };
  isLoading = signal(false);
  actionLoadingId = signal<string | null>(null);
  loadError = signal('');
  confirmDialogVisible = false;
  confirmAction: 'delete' | 'status' | 'duplicate' | null = null;
  selectedBundle: BundleListItem | null = null;
  isDarkMode$;

  filters: BundleListParams = {
    page: 1,
    limit: 10,
    search: '',
    isActive: null,
    isAvailable: null,
    pricingType: null,
    startDate: null,
    endDate: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  readonly statusOptions = [
    { label: 'All', value: null },
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ];
  readonly availabilityOptions = [
    { label: 'All', value: null },
    { label: 'Available', value: true },
    { label: 'Unavailable', value: false },
  ];
  readonly pricingOptions: Array<{ label: string; value: BundlePricingType | null }> = [
    { label: 'All', value: null },
    { label: 'Fixed', value: 'fixed' },
    { label: 'Discount', value: 'discount' },
  ];
  readonly sortByOptions: BundleSortBy[] = ['createdAt', 'name', 'originalPrice', 'finalPrice'];
  readonly sortOrderOptions: SortOrder[] = ['desc', 'asc'];
  private readonly isBrowser: boolean;

  constructor(
    private readonly themeService: ThemeService,
    private readonly service: BundlesService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) localStorage.setItem(HOME_VIEW_STORAGE_KEY, 'inventory');
    this.restoreFiltersFromQuery();
    this.loadBundles();
  }

  loadBundles(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.syncQueryParams();
    this.service.getBundles(this.filters).subscribe({
      next: (page) => {
        this.bundles = page.bundles;
        this.pagination = page.pagination;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.bundles = [];
        this.pagination = { ...DEFAULT_PAGINATION, limit: this.filters.limit || 10 };
        this.loadError.set(this.errorMessage(error, 'Failed to load bundles.'));
        this.isLoading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.filters.page = 1;
    this.loadBundles();
  }

  clearFilters(): void {
    this.filters = {
      ...this.filters,
      search: '',
      isActive: null,
      isAvailable: null,
      pricingType: null,
      startDate: null,
      endDate: null,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
    };
    this.loadBundles();
  }

  pageChanged(page: number): void {
    this.filters.page = page;
    this.loadBundles();
  }

  createBundle(): void {
    this.router.navigate(['/admin/bundles/create']);
  }

  viewBundle(bundle: BundleListItem): void {
    this.router.navigate(['/admin/bundles', bundle.id]);
  }

  editBundle(bundle: BundleListItem): void {
    this.router.navigate(['/admin/bundles', bundle.id, 'edit']);
  }

  openConfirm(bundle: BundleListItem, action: 'delete' | 'status' | 'duplicate'): void {
    this.selectedBundle = bundle;
    this.confirmAction = action;
    this.confirmDialogVisible = true;
  }

  closeConfirm(): void {
    if (this.actionLoadingId()) return;
    this.confirmDialogVisible = false;
    this.selectedBundle = null;
    this.confirmAction = null;
  }

  runConfirmedAction(): void {
    const bundle = this.selectedBundle;
    const action = this.confirmAction;
    if (!bundle || !action || this.actionLoadingId()) return;
    this.actionLoadingId.set(bundle.id);

    const request: Observable<unknown> =
      action === 'delete'
        ? this.service.deleteBundle(bundle.id)
        : action === 'status'
          ? this.service.changeBundleStatus(bundle.id, !bundle.isActive)
          : this.service.duplicateBundle(bundle.id);

    request.subscribe({
      next: (result: any) => {
        this.actionLoadingId.set(null);
        this.confirmDialogVisible = false;
        this.snackBar.open('Bundle action completed.', undefined, { duration: 3000 });
        if (action === 'duplicate' && result?.id) {
          this.router.navigate(['/admin/bundles', result.id, 'edit']);
          return;
        }
        if (action === 'delete' && this.bundles.length === 1 && (this.filters.page || 1) > 1) {
          this.filters.page = (this.filters.page || 1) - 1;
        }
        this.loadBundles();
      },
      error: (error) => {
        this.actionLoadingId.set(null);
        this.snackBar.open(this.errorMessage(error, 'Bundle action failed.'), undefined, {
          duration: 5000,
        });
      },
    });
  }

  confirmTitle(): string {
    if (this.confirmAction === 'delete') return 'bundles.dialog.deleteTitle';
    if (this.confirmAction === 'duplicate') return 'bundles.dialog.duplicateTitle';
    return this.selectedBundle?.isActive
      ? 'bundles.dialog.deactivateTitle'
      : 'bundles.dialog.activateTitle';
  }

  confirmMessage(): string {
    if (this.confirmAction === 'delete') return 'bundles.dialog.deleteMessage';
    if (this.confirmAction === 'duplicate') return 'bundles.dialog.duplicateMessage';
    return 'bundles.dialog.statusMessage';
  }

  private restoreFiltersFromQuery(): void {
    const params = this.route.snapshot.queryParamMap;
    this.filters = {
      ...this.filters,
      page: Number(params.get('page') || 1),
      search: params.get('search') || '',
      isActive: this.booleanParam(params.get('isActive')),
      isAvailable: this.booleanParam(params.get('isAvailable')),
      pricingType: (params.get('pricingType') as BundlePricingType | null) || null,
      startDate: params.get('startDate'),
      endDate: params.get('endDate'),
      sortBy: (params.get('sortBy') as BundleSortBy | null) || 'createdAt',
      sortOrder: (params.get('sortOrder') as SortOrder | null) || 'desc',
    };
  }

  private syncQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.filters,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private booleanParam(value: string | null): boolean | null {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.message || fallback;
  }
}
