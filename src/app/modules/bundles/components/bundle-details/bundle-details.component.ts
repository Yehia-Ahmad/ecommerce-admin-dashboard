import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Observable } from 'rxjs';
import { SideNavComponent } from '../../../layout/components/side-nav/side-nav.component';
import { HOME_VIEW_STORAGE_KEY } from '../../../layout/constants/home-view.constants';
import { ThemeService } from '../../../shared/services/theme.service';
import { BundleDetails } from '../../models/bundle.models';
import { BundlesService } from '../../services/bundles.service';

@Component({
  selector: 'app-bundle-details',
  standalone: true,
  imports: [
    CommonModule,
    SideNavComponent,
    TranslatePipe,
    TableModule,
    DialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './bundle-details.component.html',
})
export class BundleDetailsComponent implements OnInit {
  bundle = signal<BundleDetails | null>(null);
  isLoading = signal(false);
  actionLoading = signal(false);
  loadError = signal('');
  confirmDialogVisible = false;
  confirmAction: 'delete' | 'status' | 'duplicate' | null = null;
  isDarkMode$;
  private readonly isBrowser: boolean;

  constructor(
    private readonly themeService: ThemeService,
    private readonly service: BundlesService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) localStorage.setItem(HOME_VIEW_STORAGE_KEY, 'inventory');
    this.loadBundle();
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

  edit(): void {
    const bundle = this.bundle();
    if (!bundle) return;
    this.router.navigate(['/admin/bundles', bundle.id, 'edit']);
  }

  openConfirm(action: 'delete' | 'status' | 'duplicate'): void {
    this.confirmAction = action;
    this.confirmDialogVisible = true;
  }

  closeConfirm(): void {
    if (this.actionLoading()) return;
    this.confirmDialogVisible = false;
    this.confirmAction = null;
  }

  runConfirmedAction(): void {
    const bundle = this.bundle();
    const action = this.confirmAction;
    if (!bundle || !action || this.actionLoading()) return;
    this.actionLoading.set(true);
    const request: Observable<unknown> =
      action === 'delete'
        ? this.service.deleteBundle(bundle.id)
        : action === 'status'
          ? this.service.changeBundleStatus(bundle.id, !bundle.isActive)
          : this.service.duplicateBundle(bundle.id);

    request.subscribe({
      next: (result: any) => {
        this.actionLoading.set(false);
        this.confirmDialogVisible = false;
        this.snackBar.open('Bundle action completed.', undefined, { duration: 3000 });
        if (action === 'delete') {
          this.router.navigate(['/admin/bundles']);
          return;
        }
        if (action === 'duplicate' && result?.id) {
          this.router.navigate(['/admin/bundles', result.id, 'edit']);
          return;
        }
        this.loadBundle();
      },
      error: (error) => {
        this.actionLoading.set(false);
        this.snackBar.open(this.errorMessage(error, 'Bundle action failed.'), undefined, {
          duration: 5000,
        });
      },
    });
  }

  confirmTitle(): string {
    const bundle = this.bundle();
    if (this.confirmAction === 'delete') return 'bundles.dialog.deleteTitle';
    if (this.confirmAction === 'duplicate') return 'bundles.dialog.duplicateTitle';
    return bundle?.isActive ? 'bundles.dialog.deactivateTitle' : 'bundles.dialog.activateTitle';
  }

  confirmMessage(): string {
    if (this.confirmAction === 'delete') return 'bundles.dialog.deleteMessage';
    if (this.confirmAction === 'duplicate') return 'bundles.dialog.duplicateMessage';
    return 'bundles.dialog.statusMessage';
  }

  goBack(): void {
    this.router.navigate(['/admin/bundles']);
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.message || fallback;
  }
}
