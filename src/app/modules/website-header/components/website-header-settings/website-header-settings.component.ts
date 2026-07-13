import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { SideNavComponent } from '../../../layout/components/side-nav/side-nav.component';
import { ThemeService } from '../../../shared/services/theme.service';
import {
  DEFAULT_HEADER_CONFIG,
  HeaderAction,
  HeaderConfig,
  HeaderLinkType,
  HeaderNavigationItem,
  HeaderReferenceOption
} from '../../models/website-header.models';
import { WebsiteHeaderService } from '../../services/website-header.service';

type LocalizedForm = FormGroup<{
  en: FormControl<string>;
  ar: FormControl<string>;
}>;

type SettingsForm = FormGroup<{
  isEnabled: FormControl<boolean>;
  isSticky: FormControl<boolean>;
  showTopBar: FormControl<boolean>;
  showMainHeader: FormControl<boolean>;
  showNavigation: FormControl<boolean>;
  showSearch: FormControl<boolean>;
  showCart: FormControl<boolean>;
  showWishlist: FormControl<boolean>;
  showAccount: FormControl<boolean>;
  showLanguageSwitcher: FormControl<boolean>;
  showMobileMenu: FormControl<boolean>;
}>;

type BrandingForm = FormGroup<{
  desktopLogo: FormControl<string>;
  mobileLogo: FormControl<string>;
  logoAlt: LocalizedForm;
  logoWidth: FormControl<number>;
  logoHeight: FormControl<number>;
  homeUrl: FormControl<string>;
}>;

type TopBarForm = FormGroup<{
  text: LocalizedForm;
  linkLabel: LocalizedForm;
  linkUrl: FormControl<string>;
  openInNewTab: FormControl<boolean>;
  backgroundColor: FormControl<string>;
  textColor: FormControl<string>;
  dismissible: FormControl<boolean>;
}>;

type ContactFieldForm = FormGroup<{
  value: FormControl<string>;
  isVisible: FormControl<boolean>;
}>;

type ContactForm = FormGroup<{
  phone: ContactFieldForm;
  whatsapp: ContactFieldForm;
  email: ContactFieldForm;
  address: ContactFieldForm;
}>;

type AppearanceForm = FormGroup<{
  backgroundColor: FormControl<string>;
  textColor: FormControl<string>;
  iconColor: FormControl<string>;
  activeColor: FormControl<string>;
  hoverColor: FormControl<string>;
  borderColor: FormControl<string>;
  desktopHeight: FormControl<number>;
  mobileHeight: FormControl<number>;
}>;

type HeaderMainForm = FormGroup<{
  settings: SettingsForm;
  branding: BrandingForm;
  topBar: TopBarForm;
  contact: ContactForm;
  appearance: AppearanceForm;
}>;

type NavigationItemForm = FormGroup<{
  id: FormControl<string>;
  label: LocalizedForm;
  linkType: FormControl<HeaderLinkType>;
  url: FormControl<string>;
  referenceId: FormControl<string>;
  referenceLabel: FormControl<string>;
  icon: FormControl<string>;
  image: FormControl<string>;
  openInNewTab: FormControl<boolean>;
  isEnabled: FormControl<boolean>;
  parentId: FormControl<string | null>;
  sortOrder: FormControl<number>;
}>;

type ActionForm = FormGroup<{
  id: FormControl<string>;
  label: LocalizedForm;
  icon: FormControl<string>;
  url: FormControl<string>;
  openInNewTab: FormControl<boolean>;
  isEnabled: FormControl<boolean>;
  sortOrder: FormControl<number>;
}>;

type HeaderSection = 'general' | 'branding' | 'topBar' | 'contact' | 'appearance' | 'navigation' | 'actions' | 'preview';
type PreviewMode = 'desktop' | 'tablet' | 'mobile';

@Component({
  selector: 'app-website-header-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SideNavComponent, TranslatePipe, DialogModule, SelectModule],
  templateUrl: './website-header-settings.component.html',
  styleUrl: './website-header-settings.component.scss'
})
export class WebsiteHeaderSettingsComponent implements OnInit {
  isDarkMode$;
  form: HeaderMainForm;
  config: HeaderConfig = { ...DEFAULT_HEADER_CONFIG };
  originalConfigSnapshot = '';
  activeSection: HeaderSection = 'general';
  previewMode: PreviewMode = 'desktop';
  isLoading = true;
  isSaving = false;
  isSavingNavigationItem = false;
  isSavingActionItem = false;
  isUploadingLogo = false;
  isSavingNavigationOrder = false;
  isSavingActionOrder = false;
  messageVisible = false;
  messageTitle = '';
  messageBody = '';
  messageTone: 'success' | 'error' | 'info' = 'info';
  navigationDialogVisible = false;
  actionDialogVisible = false;
  confirmDialogVisible = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmAction: (() => void) | null = null;
  editingNavigationId: string | null = null;
  editingActionId: string | null = null;
  navigationForm: NavigationItemForm;
  actionForm: ActionForm;
  categories: HeaderReferenceOption[] = [];
  products: HeaderReferenceOption[] = [];
  pages: HeaderReferenceOption[] = [];
  sectionOptions: { id: HeaderSection; label: string }[] = [
    { id: 'general', label: 'websiteHeader.sections.general' },
    { id: 'branding', label: 'websiteHeader.sections.branding' },
    { id: 'topBar', label: 'websiteHeader.sections.topBar' },
    { id: 'contact', label: 'websiteHeader.sections.contact' },
    { id: 'appearance', label: 'websiteHeader.sections.appearance' },
    { id: 'navigation', label: 'websiteHeader.sections.navigation' },
    { id: 'actions', label: 'websiteHeader.sections.actions' },
    { id: 'preview', label: 'websiteHeader.sections.preview' }
  ];
  linkTypeOptions: { label: string; value: HeaderLinkType }[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: WebsiteHeaderService,
    private readonly themeService: ThemeService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
    this.setTranslatedSelectOptions();
    this.form = this.createMainForm(DEFAULT_HEADER_CONFIG);
    this.navigationForm = this.createNavigationForm();
    this.actionForm = this.createActionForm();
  }

  ngOnInit(): void {
    this.loadConfig();
    this.loadReferenceOptions();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  get navigationItems(): HeaderNavigationItem[] {
    return this.config.navigation;
  }

  get actionItems(): HeaderAction[] {
    return this.config.actions;
  }

  get flatNavigationItems(): Array<HeaderNavigationItem & { depth: number }> {
    return this.flattenNavigation(this.config.navigation);
  }

  get parentOptions(): { label: string; value: string | null }[] {
    const editingId = this.navigationForm.controls.id.value;
    return [
      { label: this.tr('websiteHeader.navigation.noParent'), value: null },
      ...this.flatNavigationItems
        .filter((item) => item.id !== editingId && !this.isDescendantOf(item.id, editingId))
        .map((item) => ({ label: `${'— '.repeat(item.depth)}${item.label.en || item.label.ar || this.tr('websiteHeader.common.untitled')}`, value: item.id }))
    ];
  }

  get selectedReferenceOptions(): HeaderReferenceOption[] {
    const type = this.navigationForm.controls.linkType.value;
    if (type === 'category') return this.categories;
    if (type === 'product') return this.products;
    if (type === 'page') return this.pages;
    return [];
  }

  get previewConfig(): HeaderConfig {
    return {
      ...this.config,
      settings: this.form.controls.settings.getRawValue(),
      branding: this.form.controls.branding.getRawValue(),
      topBar: this.form.controls.topBar.getRawValue(),
      contact: this.form.controls.contact.getRawValue(),
      appearance: this.form.controls.appearance.getRawValue()
    };
  }

  get previewFrameClass(): string {
    if (this.previewMode === 'mobile') return 'header-preview__frame header-preview__frame--mobile';
    if (this.previewMode === 'tablet') return 'header-preview__frame header-preview__frame--tablet';
    return 'header-preview__frame';
  }

  get previewStyle(): Record<string, string> {
    const appearance = this.previewConfig.appearance;
    return {
      '--header-background-color': appearance.backgroundColor,
      '--header-text-color': appearance.textColor,
      '--header-icon-color': appearance.iconColor,
      '--header-active-color': appearance.activeColor,
      '--header-hover-color': appearance.hoverColor,
      '--header-border-color': appearance.borderColor,
      '--header-desktop-height': `${appearance.desktopHeight}px`,
      '--header-mobile-height': `${appearance.mobileHeight}px`
    };
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty || this.snapshotConfig(this.config) !== this.originalConfigSnapshot;
  }

  loadConfig(): void {
    this.isLoading = true;
    this.service.getHeaderConfig().subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.isLoading = false;
        this.loadNavigationAndActions();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.applyConfig(DEFAULT_HEADER_CONFIG);
        this.isLoading = false;
        this.showMessage('error', this.tr('websiteHeader.messages.loadFailedTitle'), this.errorMessage(error, this.tr('websiteHeader.messages.loadFailed')));
        this.cdr.detectChanges();
      }
    });
  }

  save(): void {
    if (this.form.invalid || this.isSaving || !this.hasUnsavedChanges()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload = this.buildConfigFromForm();
    this.service.updateHeaderConfig(payload).subscribe({
      next: (response) => {
        this.applyConfig(response.config);
        this.isSaving = false;
        this.showMessage('success', this.tr('websiteHeader.messages.savedTitle'), response.message);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isSaving = false;
        this.showMessage('error', this.tr('websiteHeader.messages.saveFailedTitle'), this.errorMessage(error, this.tr('websiteHeader.messages.settingsSaveFailed')));
        this.cdr.detectChanges();
      }
    });
  }

  setSection(section: HeaderSection): void {
    this.activeSection = section;
  }

  onLogoSelected(event: Event, controlName: 'desktopLogo' | 'mobileLogo'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showMessage('error', this.tr('websiteHeader.messages.invalidImageTitle'), this.tr('websiteHeader.messages.invalidImage'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const imageBase64 = reader.result;
      this.isUploadingLogo = true;
      const logoType = controlName === 'desktopLogo' ? 'logo' : 'mobileLogo';
      this.service.uploadLogo(logoType, imageBase64).subscribe({
        next: (config) => {
          this.isUploadingLogo = false;
          if (config.branding.desktopLogo || config.branding.mobileLogo) {
            this.form.controls.branding.patchValue(config.branding);
          } else {
            this.form.controls.branding.controls[controlName].setValue(imageBase64);
            this.form.controls.branding.controls[controlName].markAsDirty();
          }
        this.showMessage('success', this.tr('websiteHeader.messages.logoUploadedTitle'), this.tr('websiteHeader.messages.logoUploaded'));
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isUploadingLogo = false;
          this.showMessage('error', this.tr('websiteHeader.messages.uploadFailedTitle'), this.errorMessage(error, this.tr('websiteHeader.messages.logoUploadFailed')));
          this.cdr.detectChanges();
        }
      });
    };
    reader.onerror = () => {
      this.showMessage('error', this.tr('websiteHeader.messages.uploadFailedTitle'), this.tr('websiteHeader.messages.imageReadFailed'));
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  removeLogo(controlName: 'desktopLogo' | 'mobileLogo'): void {
    this.isUploadingLogo = true;
    const logoType = controlName === 'desktopLogo' ? 'logo' : 'mobileLogo';
    this.service.deleteLogo(logoType).subscribe({
      next: () => {
        this.isUploadingLogo = false;
        this.form.controls.branding.controls[controlName].setValue('');
        this.form.controls.branding.controls[controlName].markAsDirty();
        this.showMessage('success', this.tr('websiteHeader.messages.logoRemovedTitle'), this.tr('websiteHeader.messages.logoRemoved'));
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isUploadingLogo = false;
        this.showMessage('error', this.tr('websiteHeader.messages.removeFailedTitle'), this.errorMessage(error, this.tr('websiteHeader.messages.logoRemoveFailed')));
        this.cdr.detectChanges();
      }
    });
  }

  openCreateNavigation(): void {
    this.editingNavigationId = null;
    this.navigationForm = this.createNavigationForm(undefined, this.flatNavigationItems.length + 1);
    this.updateNavigationValidators();
    this.navigationDialogVisible = true;
  }

  openEditNavigation(item: HeaderNavigationItem): void {
    this.editingNavigationId = item.id;
    this.navigationForm = this.createNavigationForm(item);
    this.updateNavigationValidators();
    this.navigationDialogVisible = true;
  }

  saveNavigationItem(): void {
    this.updateNavigationValidators();
    if (this.navigationForm.invalid) {
      this.navigationForm.markAllAsTouched();
      return;
    }

    const item = this.navigationFormToItem();
    this.isSavingNavigationItem = true;
    if (this.editingNavigationId) {
      this.service.updateNavigationItem(item).subscribe({
        next: (savedItem) => {
          this.isSavingNavigationItem = false;
          this.replaceNavigationItem(savedItem);
          this.markConfigDirty();
          this.navigationDialogVisible = false;
          this.showMessage('success', this.tr('websiteHeader.messages.savedTitle'), this.tr('websiteHeader.messages.menuSaved'));
          this.cdr.detectChanges();
        },
        error: (error) => this.handleNavigationSaveError(error)
      });
    } else {
      this.service.createNavigationItem(item).subscribe({
        next: (savedItem) => {
          this.isSavingNavigationItem = false;
          this.config.navigation = this.insertNavigationItem(this.config.navigation, savedItem);
          this.markConfigDirty();
          this.navigationDialogVisible = false;
          this.showMessage('success', this.tr('websiteHeader.messages.createdTitle'), this.tr('websiteHeader.messages.menuCreated'));
          this.cdr.detectChanges();
        },
        error: (error) => this.handleNavigationSaveError(error)
      });
    }
  }

  requestDeleteNavigation(item: HeaderNavigationItem): void {
    this.openConfirm(this.tr('websiteHeader.dialog.deleteMenuTitle'), this.tr('websiteHeader.dialog.deleteMenuMessage'), () => {
      this.service.deleteNavigationItem(item.id).subscribe({
        next: () => {
          this.config.navigation = this.removeNavigationItem(this.config.navigation, item.id);
          this.markConfigDirty();
          this.confirmDialogVisible = false;
          this.showMessage('success', this.tr('websiteHeader.messages.deletedTitle'), this.tr('websiteHeader.messages.menuDeleted'));
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.confirmDialogVisible = false;
          this.showMessage('error', this.tr('websiteHeader.messages.deleteFailedTitle'), this.errorMessage(error, this.tr('websiteHeader.messages.menuDeleteFailed')));
          this.cdr.detectChanges();
        }
      });
    });
  }

  toggleNavigation(item: HeaderNavigationItem): void {
    const previous = item.isEnabled;
    item.isEnabled = !item.isEnabled;
    this.service.setNavigationStatus(item.id, item.isEnabled).subscribe({
      next: () => this.markConfigDirty(),
      error: (error) => {
        item.isEnabled = previous;
        this.showMessage('error', this.tr('websiteHeader.messages.statusFailedTitle'), this.errorMessage(error, this.tr('websiteHeader.messages.menuStatusFailed')));
        this.cdr.detectChanges();
      }
    });
  }

  moveNavigation(item: HeaderNavigationItem, direction: -1 | 1): void {
    const previous = this.cloneNavigation(this.config.navigation);
    const moved = this.moveItemInTree(this.config.navigation, item.id, direction);
    if (!moved) return;
    this.markConfigDirty();
    this.persistNavigationOrder(previous);
  }

  openCreateAction(): void {
    this.editingActionId = null;
    this.actionForm = this.createActionForm(undefined, this.config.actions.length + 1);
    this.actionDialogVisible = true;
  }

  openEditAction(action: HeaderAction): void {
    this.editingActionId = action.id;
    this.actionForm = this.createActionForm(action);
    this.actionDialogVisible = true;
  }

  saveActionItem(): void {
    if (this.actionForm.invalid) {
      this.actionForm.markAllAsTouched();
      return;
    }
    const action = this.actionFormToItem();
    this.isSavingActionItem = true;
    if (this.editingActionId) {
      this.service.updateAction(action).subscribe({
        next: (savedAction) => {
          this.isSavingActionItem = false;
          this.config.actions = this.config.actions.map((item) => item.id === savedAction.id ? savedAction : item);
          this.sortActions();
          this.markConfigDirty();
          this.actionDialogVisible = false;
          this.showMessage('success', this.tr('websiteHeader.messages.savedTitle'), this.tr('websiteHeader.messages.actionSaved'));
          this.cdr.detectChanges();
        },
        error: (error) => this.handleActionSaveError(error)
      });
    } else {
      this.service.createAction(action).subscribe({
        next: (savedAction) => {
          this.isSavingActionItem = false;
          this.config.actions = [...this.config.actions, savedAction];
          this.sortActions();
          this.markConfigDirty();
          this.actionDialogVisible = false;
          this.showMessage('success', this.tr('websiteHeader.messages.createdTitle'), this.tr('websiteHeader.messages.actionCreated'));
          this.cdr.detectChanges();
        },
        error: (error) => this.handleActionSaveError(error)
      });
    }
  }

  requestDeleteAction(action: HeaderAction): void {
    this.openConfirm(this.tr('websiteHeader.dialog.deleteActionTitle'), this.tr('websiteHeader.dialog.deleteActionMessage'), () => {
      this.service.deleteAction(action.id).subscribe({
        next: () => {
          this.config.actions = this.config.actions.filter((item) => item.id !== action.id);
          this.markConfigDirty();
          this.confirmDialogVisible = false;
          this.showMessage('success', this.tr('websiteHeader.messages.deletedTitle'), this.tr('websiteHeader.messages.actionDeleted'));
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.confirmDialogVisible = false;
          this.showMessage('error', this.tr('websiteHeader.messages.deleteFailedTitle'), this.errorMessage(error, this.tr('websiteHeader.messages.actionDeleteFailed')));
          this.cdr.detectChanges();
        }
      });
    });
  }

  toggleAction(action: HeaderAction): void {
    action.isEnabled = !action.isEnabled;
    this.markConfigDirty();
  }

  moveAction(action: HeaderAction, direction: -1 | 1): void {
    const previous = this.config.actions.map((item) => ({ ...item, label: { ...item.label } }));
    const index = this.config.actions.findIndex((item) => item.id === action.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.config.actions.length) return;
    [this.config.actions[index], this.config.actions[nextIndex]] = [this.config.actions[nextIndex], this.config.actions[index]];
    this.config.actions = this.config.actions.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex + 1 }));
    this.markConfigDirty();
    this.persistActionOrder(previous);
  }

  onNavigationLinkTypeChanged(): void {
    this.navigationForm.controls.url.setValue('');
    this.navigationForm.controls.referenceId.setValue('');
    this.navigationForm.controls.referenceLabel.setValue('');
    this.updateNavigationValidators();
  }

  onReferenceChanged(referenceId: string): void {
    const option = this.selectedReferenceOptions.find((item) => item.id === referenceId);
    this.navigationForm.controls.referenceLabel.setValue(option?.label || '');
  }

  closeMessageDialog(): void {
    this.messageVisible = false;
  }

  closeConfirmDialog(): void {
    this.confirmDialogVisible = false;
    this.confirmAction = null;
  }

  runConfirmAction(): void {
    this.confirmAction?.();
  }

  imageForPreview(): string {
    return this.previewMode === 'mobile'
      ? this.previewConfig.branding.mobileLogo || this.previewConfig.branding.desktopLogo
      : this.previewConfig.branding.desktopLogo || this.previewConfig.branding.mobileLogo;
  }

  labelText(label: { en: string; ar: string }): string {
    return label.en || label.ar || this.tr('websiteHeader.common.untitled');
  }

  enabledNavigation(items: HeaderNavigationItem[]): HeaderNavigationItem[] {
    return items.filter((item) => item.isEnabled);
  }

  trackById(index: number, item: { id: string }): string {
    return item.id || String(index);
  }

  private createMainForm(config: HeaderConfig): HeaderMainForm {
    return this.fb.group({
      settings: this.fb.group({
        isEnabled: this.fb.nonNullable.control(config.settings.isEnabled),
        isSticky: this.fb.nonNullable.control(config.settings.isSticky),
        showTopBar: this.fb.nonNullable.control(config.settings.showTopBar),
        showMainHeader: this.fb.nonNullable.control(config.settings.showMainHeader),
        showNavigation: this.fb.nonNullable.control(config.settings.showNavigation),
        showSearch: this.fb.nonNullable.control(config.settings.showSearch),
        showCart: this.fb.nonNullable.control(config.settings.showCart),
        showWishlist: this.fb.nonNullable.control(config.settings.showWishlist),
        showAccount: this.fb.nonNullable.control(config.settings.showAccount),
        showLanguageSwitcher: this.fb.nonNullable.control(config.settings.showLanguageSwitcher),
        showMobileMenu: this.fb.nonNullable.control(config.settings.showMobileMenu)
      }),
      branding: this.fb.group({
        desktopLogo: this.fb.nonNullable.control(config.branding.desktopLogo),
        mobileLogo: this.fb.nonNullable.control(config.branding.mobileLogo),
        logoAlt: this.createLocalizedForm(config.branding.logoAlt.en, config.branding.logoAlt.ar, true),
        logoWidth: this.fb.nonNullable.control(config.branding.logoWidth, [Validators.required, Validators.min(24), Validators.max(400)]),
        logoHeight: this.fb.nonNullable.control(config.branding.logoHeight, [Validators.required, Validators.min(16), Validators.max(200)]),
        homeUrl: this.fb.nonNullable.control(config.branding.homeUrl, [Validators.required, this.urlOrPathValidator])
      }),
      topBar: this.fb.group({
        text: this.createLocalizedForm(config.topBar.text.en, config.topBar.text.ar),
        linkLabel: this.createLocalizedForm(config.topBar.linkLabel.en, config.topBar.linkLabel.ar),
        linkUrl: this.fb.nonNullable.control(config.topBar.linkUrl, [this.optionalUrlOrPathValidator]),
        openInNewTab: this.fb.nonNullable.control(config.topBar.openInNewTab),
        backgroundColor: this.fb.nonNullable.control(config.topBar.backgroundColor, [Validators.required, this.colorValidator]),
        textColor: this.fb.nonNullable.control(config.topBar.textColor, [Validators.required, this.colorValidator]),
        dismissible: this.fb.nonNullable.control(config.topBar.dismissible)
      }),
      contact: this.fb.group({
        phone: this.createContactFieldForm(config.contact.phone.value, config.contact.phone.isVisible),
        whatsapp: this.createContactFieldForm(config.contact.whatsapp.value, config.contact.whatsapp.isVisible),
        email: this.createContactFieldForm(config.contact.email.value, config.contact.email.isVisible, [Validators.email]),
        address: this.createContactFieldForm(config.contact.address.value, config.contact.address.isVisible)
      }),
      appearance: this.fb.group({
        backgroundColor: this.fb.nonNullable.control(config.appearance.backgroundColor, [Validators.required, this.colorValidator]),
        textColor: this.fb.nonNullable.control(config.appearance.textColor, [Validators.required, this.colorValidator]),
        iconColor: this.fb.nonNullable.control(config.appearance.iconColor, [Validators.required, this.colorValidator]),
        activeColor: this.fb.nonNullable.control(config.appearance.activeColor, [Validators.required, this.colorValidator]),
        hoverColor: this.fb.nonNullable.control(config.appearance.hoverColor, [Validators.required, this.colorValidator]),
        borderColor: this.fb.nonNullable.control(config.appearance.borderColor, [Validators.required, this.colorValidator]),
        desktopHeight: this.fb.nonNullable.control(config.appearance.desktopHeight, [Validators.required, Validators.min(48), Validators.max(180)]),
        mobileHeight: this.fb.nonNullable.control(config.appearance.mobileHeight, [Validators.required, Validators.min(48), Validators.max(140)])
      })
    });
  }

  private createLocalizedForm(en = '', ar = '', required = false): LocalizedForm {
    const validators = required ? [Validators.required, Validators.maxLength(120)] : [Validators.maxLength(160)];
    return this.fb.group({
      en: this.fb.nonNullable.control(en, validators),
      ar: this.fb.nonNullable.control(ar, validators)
    });
  }

  private createContactFieldForm(value = '', isVisible = false, validators = []): ContactFieldForm {
    return this.fb.group({
      value: this.fb.nonNullable.control(value, validators),
      isVisible: this.fb.nonNullable.control(isVisible)
    });
  }

  private createNavigationForm(item?: HeaderNavigationItem, sortOrder = 1): NavigationItemForm {
    return this.fb.group({
      id: this.fb.nonNullable.control(item?.id || this.tempId()),
      label: this.createLocalizedForm(item?.label.en || '', item?.label.ar || '', true),
      linkType: this.fb.nonNullable.control<HeaderLinkType>(item?.linkType || 'custom'),
      url: this.fb.nonNullable.control(item?.url || ''),
      referenceId: this.fb.nonNullable.control(item?.referenceId || ''),
      referenceLabel: this.fb.nonNullable.control(item?.referenceLabel || ''),
      icon: this.fb.nonNullable.control(item?.icon || '', [Validators.maxLength(80)]),
      image: this.fb.nonNullable.control(item?.image || ''),
      openInNewTab: this.fb.nonNullable.control(item?.openInNewTab ?? false),
      isEnabled: this.fb.nonNullable.control(item?.isEnabled ?? true),
      parentId: this.fb.control<string | null>(item?.parentId || null),
      sortOrder: this.fb.nonNullable.control(item?.sortOrder || sortOrder, [Validators.required, Validators.min(1)])
    });
  }

  private createActionForm(action?: HeaderAction, sortOrder = 1): ActionForm {
    return this.fb.group({
      id: this.fb.nonNullable.control(action?.id || this.tempId()),
      label: this.createLocalizedForm(action?.label.en || '', action?.label.ar || '', true),
      icon: this.fb.nonNullable.control(action?.icon || '', [Validators.required, Validators.maxLength(80)]),
      url: this.fb.nonNullable.control(action?.url || '', [Validators.required, this.urlOrPathValidator]),
      openInNewTab: this.fb.nonNullable.control(action?.openInNewTab ?? false),
      isEnabled: this.fb.nonNullable.control(action?.isEnabled ?? true),
      sortOrder: this.fb.nonNullable.control(action?.sortOrder || sortOrder, [Validators.required, Validators.min(1)])
    });
  }

  private updateNavigationValidators(): void {
    const url = this.navigationForm.controls.url;
    const referenceId = this.navigationForm.controls.referenceId;
    if (this.navigationForm.controls.linkType.value === 'custom') {
      url.setValidators([Validators.required, this.urlOrPathValidator]);
      referenceId.clearValidators();
    } else {
      url.clearValidators();
      referenceId.setValidators([Validators.required]);
    }
    url.updateValueAndValidity();
    referenceId.updateValueAndValidity();
  }

  private navigationFormToItem(): HeaderNavigationItem {
    const value = this.navigationForm.getRawValue();
    return {
      ...value,
      children: this.findNavigationItem(value.id)?.children || []
    };
  }

  private actionFormToItem(): HeaderAction {
    return this.actionForm.getRawValue();
  }

  private buildConfigFromForm(): HeaderConfig {
    const value = this.form.getRawValue();
    return {
      ...this.config,
      settings: value.settings,
      branding: value.branding,
      topBar: value.topBar,
      contact: value.contact,
      appearance: value.appearance,
      navigation: this.renumberNavigation(this.config.navigation),
      actions: this.config.actions.map((action, index) => ({ ...action, sortOrder: index + 1 }))
    };
  }

  private applyConfig(config: HeaderConfig): void {
    this.config = {
      ...config,
      navigation: this.renumberNavigation(config.navigation),
      actions: config.actions.map((action, index) => ({ ...action, sortOrder: index + 1 }))
    };
    this.form = this.createMainForm(this.config);
    this.form.markAsPristine();
    this.originalConfigSnapshot = this.snapshotConfig(this.config);
  }

  private loadReferenceOptions(): void {
    this.service.getCategoryOptions().subscribe({ next: (items) => { this.categories = items; this.cdr.detectChanges(); }, error: () => undefined });
    this.service.getProductOptions().subscribe({ next: (items) => { this.products = items; this.cdr.detectChanges(); }, error: () => undefined });
    this.service.getPageOptions().subscribe({ next: (items) => { this.pages = items; this.cdr.detectChanges(); }, error: () => undefined });
  }

  private loadNavigationAndActions(): void {
    this.service.listNavigation().subscribe({
      next: (items) => {
        this.config.navigation = this.renumberNavigation(items);
        this.originalConfigSnapshot = this.snapshotConfig(this.config);
        this.cdr.detectChanges();
      },
      error: () => undefined
    });
    this.service.listActions().subscribe({
      next: (items) => {
        this.config.actions = items.map((action, index) => ({ ...action, sortOrder: index + 1 }));
        this.originalConfigSnapshot = this.snapshotConfig(this.config);
        this.cdr.detectChanges();
      },
      error: () => undefined
    });
  }

  private handleNavigationSaveError(error: unknown): void {
    this.isSavingNavigationItem = false;
    this.showMessage('error', this.tr('websiteHeader.messages.saveFailedTitle'), this.errorMessage(error, this.tr('websiteHeader.messages.menuSaveFailed')));
    this.cdr.detectChanges();
  }

  private handleActionSaveError(error: unknown): void {
    this.isSavingActionItem = false;
    this.showMessage('error', this.tr('websiteHeader.messages.saveFailedTitle'), this.errorMessage(error, this.tr('websiteHeader.messages.actionSaveFailed')));
    this.cdr.detectChanges();
  }

  private replaceNavigationItem(item: HeaderNavigationItem): void {
    this.config.navigation = this.removeNavigationItem(this.config.navigation, item.id);
    this.config.navigation = this.insertNavigationItem(this.config.navigation, item);
  }

  private insertNavigationItem(items: HeaderNavigationItem[], item: HeaderNavigationItem): HeaderNavigationItem[] {
    if (!item.parentId) return this.renumberNavigation([...items, item]);
    return this.renumberNavigation(items.map((current) => {
      if (current.id === item.parentId) {
        return { ...current, children: this.renumberNavigation([...current.children, item]) };
      }
      return { ...current, children: this.insertNavigationItem(current.children, item) };
    }));
  }

  private removeNavigationItem(items: HeaderNavigationItem[], id: string): HeaderNavigationItem[] {
    return this.renumberNavigation(items
      .filter((item) => item.id !== id)
      .map((item) => ({ ...item, children: this.removeNavigationItem(item.children, id) })));
  }

  private moveItemInTree(items: HeaderNavigationItem[], id: string, direction: -1 | 1): boolean {
    const index = items.findIndex((item) => item.id === id);
    if (index >= 0) {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) return false;
      [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
      this.config.navigation = this.renumberNavigation(this.config.navigation);
      return true;
    }
    return items.some((item) => this.moveItemInTree(item.children, id, direction));
  }

  private persistNavigationOrder(previous: HeaderNavigationItem[]): void {
    this.isSavingNavigationOrder = true;
    this.service.reorderNavigation(this.flatNavigationItems).subscribe({
      next: () => {
        this.isSavingNavigationOrder = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.config.navigation = previous;
        this.isSavingNavigationOrder = false;
        this.showMessage('error', this.tr('websiteHeader.messages.reorderFailedTitle'), this.errorMessage(error, this.tr('websiteHeader.messages.menuReorderFailed')));
        this.cdr.detectChanges();
      }
    });
  }

  private persistActionOrder(previous: HeaderAction[]): void {
    this.isSavingActionOrder = true;
    this.service.reorderActions(this.config.actions).subscribe({
      next: () => {
        this.isSavingActionOrder = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.config.actions = previous;
        this.isSavingActionOrder = false;
        this.showMessage('error', this.tr('websiteHeader.messages.reorderFailedTitle'), this.errorMessage(error, this.tr('websiteHeader.messages.actionReorderFailed')));
        this.cdr.detectChanges();
      }
    });
  }

  private renumberNavigation(items: HeaderNavigationItem[]): HeaderNavigationItem[] {
    return items
      .map((item, index) => ({
        ...item,
        sortOrder: index + 1,
        children: this.renumberNavigation(item.children || [])
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  private flattenNavigation(items: HeaderNavigationItem[], depth = 0): Array<HeaderNavigationItem & { depth: number }> {
    return items.flatMap((item) => [
      { ...item, depth },
      ...this.flattenNavigation(item.children || [], depth + 1)
    ]);
  }

  private findNavigationItem(id: string, items = this.config.navigation): HeaderNavigationItem | null {
    for (const item of items) {
      if (item.id === id) return item;
      const child = this.findNavigationItem(id, item.children);
      if (child) return child;
    }
    return null;
  }

  private isDescendantOf(itemId: string, ancestorId: string): boolean {
    if (!ancestorId) return false;
    const ancestor = this.findNavigationItem(ancestorId);
    return Boolean(ancestor && this.findNavigationItem(itemId, ancestor.children));
  }

  private sortActions(): void {
    this.config.actions = [...this.config.actions]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((action, index) => ({ ...action, sortOrder: index + 1 }));
  }

  private cloneNavigation(items: HeaderNavigationItem[]): HeaderNavigationItem[] {
    return items.map((item) => ({ ...item, label: { ...item.label }, children: this.cloneNavigation(item.children) }));
  }

  private markConfigDirty(): void {
    this.config = this.buildConfigFromForm();
    this.cdr.detectChanges();
  }

  private snapshotConfig(config: HeaderConfig): string {
    return JSON.stringify(this.buildSnapshot(config));
  }

  private buildSnapshot(config: HeaderConfig): unknown {
    return {
      ...config,
      navigation: this.renumberNavigation(config.navigation),
      actions: config.actions.map((action, index) => ({ ...action, sortOrder: index + 1 }))
    };
  }

  private openConfirm(title: string, message: string, action: () => void): void {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmAction = action;
    this.confirmDialogVisible = true;
  }

  private showMessage(tone: 'success' | 'error' | 'info', title: string, body: string): void {
    this.messageTone = tone;
    this.messageTitle = title;
    this.messageBody = body;
    this.messageVisible = true;
  }

  private tr(key: string): string {
    return this.translate.instant(key);
  }

  private setTranslatedSelectOptions(): void {
    this.linkTypeOptions = [
      { label: this.tr('websiteHeader.linkTypes.custom'), value: 'custom' },
      { label: this.tr('websiteHeader.linkTypes.category'), value: 'category' },
      { label: this.tr('websiteHeader.linkTypes.product'), value: 'product' },
      { label: this.tr('websiteHeader.linkTypes.page'), value: 'page' }
    ];
  }

  private errorMessage(error: any, fallback: string): string {
    return String(error?.error?.message || error?.message || fallback);
  }

  private colorValidator(control: AbstractControl): ValidationErrors | null {
    return /^#[0-9A-Fa-f]{6}$/.test(String(control.value || '')) ? null : { color: true };
  }

  private urlOrPathValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value || '').trim();
    if (/^(\/|https?:\/\/)/i.test(value)) return null;
    return { urlOrPath: true };
  }

  private optionalUrlOrPathValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value || '').trim();
    if (!value) return null;
    if (/^(\/|https?:\/\/)/i.test(value)) return null;
    return { urlOrPath: true };
  }

  private tempId(): string {
    return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
