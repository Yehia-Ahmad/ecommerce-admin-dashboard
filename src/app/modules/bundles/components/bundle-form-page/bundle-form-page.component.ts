import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { SideNavComponent } from '../../../layout/components/side-nav/side-nav.component';
import { HOME_VIEW_STORAGE_KEY } from '../../../layout/constants/home-view.constants';
import { ThemeService } from '../../../shared/services/theme.service';
import { BundleFormComponent } from '../bundle-form/bundle-form.component';
import { BundleDetails, CreateBundlePayload } from '../../models/bundle.models';
import { BundlesService } from '../../services/bundles.service';

@Component({
  selector: 'app-bundle-form-page',
  standalone: true,
  imports: [CommonModule, SideNavComponent, BundleFormComponent, TranslatePipe, MatSnackBarModule],
  template: `
    <app-side-nav>
      <div
        class="grid min-h-full auto-rows-min content-start gap-5 p-4"
        [ngClass]="{
          'bg-[#1f1f1f] text-light_orange': isDarkMode$ | async,
          'bg-[#f7f7f7] text-gray_dark': !(isDarkMode$ | async),
        }"
      >
        <div class="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <h1 class="m-0 font-azonix text-2xl text-orange">
              {{ (mode === 'create' ? 'bundles.createTitle' : 'bundles.editTitle') | translate }}
            </h1>
            <p class="mt-1 text-[#bdbdbd]">{{ 'bundles.form.subtitle' | translate }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg bg-[#e1e0e0] px-4 py-3 font-bold text-gray_dark"
            (click)="goBack()"
          >
            {{ 'home.actions.back' | translate }}
          </button>
        </div>

        @if (isLoading()) {
          <div class="rounded-xl border border-[#515151] bg-[#2f2f2f] p-8 text-center">
            {{ 'actions.loading' | translate }}
          </div>
        } @else if (loadError()) {
          <div
            class="grid gap-3 rounded-xl border border-[#515151] bg-[#2f2f2f] p-8 text-center text-red-300"
          >
            <p>{{ loadError() }}</p>
            <button
              type="button"
              class="mx-auto rounded-lg bg-orange px-4 py-3 font-bold text-gray_dark"
              (click)="loadBundle()"
            >
              {{ 'bundles.actions.retry' | translate }}
            </button>
          </div>
        } @else {
          <app-bundle-form
            [mode]="mode"
            [bundle]="bundle()"
            [isSubmitting]="isSubmitting()"
            [backendErrors]="backendErrors"
            (formSubmit)="save($event)"
            (cancel)="goBack()"
          ></app-bundle-form>
        }
      </div>
    </app-side-nav>
  `,
})
export class BundleFormPageComponent implements OnInit {
  mode: 'create' | 'edit' = 'create';
  bundle = signal<BundleDetails | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);
  loadError = signal('');
  backendErrors: Record<string, string> = {};
  isDarkMode$;
  private readonly isBrowser: boolean;

  constructor(
    private readonly themeService: ThemeService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly service: BundlesService,
    private readonly snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) localStorage.setItem(HOME_VIEW_STORAGE_KEY, 'inventory');
    this.mode = this.route.snapshot.routeConfig?.path?.includes('edit') ? 'edit' : 'create';
    if (this.mode === 'edit') this.loadBundle();
  }

  loadBundle(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.isLoading.set(true);
    this.loadError.set('');
    this.service.getBundleById(id).subscribe({
      next: (bundle) => {
        this.bundle.set(bundle);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.loadError.set(this.errorMessage(error, 'Failed to load bundle.'));
        this.isLoading.set(false);
      },
    });
  }

  save(payload: CreateBundlePayload): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.backendErrors = {};
    const request =
      this.mode === 'create'
        ? this.service.createBundle(payload)
        : this.service.updateBundle(this.route.snapshot.paramMap.get('id') || '', payload);

    request.subscribe({
      next: (bundle) => {
        this.isSubmitting.set(false);
        this.snackBar.open('Bundle saved successfully.', undefined, { duration: 3000 });
        this.router.navigate(['/admin/bundles', bundle.id]);
      },
      error: (error) => {
        this.backendErrors = this.extractValidationErrors(error);
        this.snackBar.open(this.errorMessage(error, 'Failed to save bundle.'), undefined, {
          duration: 5000,
        });
        this.isSubmitting.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/bundles']);
  }

  private extractValidationErrors(error: any): Record<string, string> {
    const errors = error?.error?.errors || error?.error?.validationErrors || {};
    if (!errors || typeof errors !== 'object') return {};
    return Object.fromEntries(
      Object.entries(errors).map(([key, value]) => [
        key,
        Array.isArray(value) ? String(value[0]) : String(value),
      ]),
    );
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.message || fallback;
  }
}
