import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import {
  BundleDetails,
  BundleDiscountType,
  BundlePricingType,
  BundleSelectableProduct,
  BundleSelectableVariant,
  CreateBundlePayload,
} from '../../models/bundle.models';
import {
  BundlePricePreview,
  BundlePricePreviewComponent,
} from '../price-preview/price-preview.component';
import {
  BundleStockPreview,
  BundleStockPreviewComponent,
} from '../stock-preview/stock-preview.component';
import { ProductSelectorDialogComponent } from '../product-selector-dialog/product-selector-dialog.component';
import {
  buildBundlePayload,
  calculateBundlePricePreview,
  calculateBundleStockPreview,
} from './bundle-form.utils';

export type BundleItemForm = FormGroup<{
  productId: FormControl<string>;
  variantId: FormControl<string | null>;
  quantity: FormControl<number>;
}>;

export type BundleFormGroup = FormGroup<{
  name: FormControl<string>;
  description: FormControl<string | null>;
  image: FormControl<string | null>;
  items: FormArray<BundleItemForm>;
  pricingType: FormControl<BundlePricingType>;
  fixedPrice: FormControl<number | null>;
  discountType: FormControl<BundleDiscountType | null>;
  discountValue: FormControl<number | null>;
  isActive: FormControl<boolean>;
  startDate: FormControl<string | Date | null>;
  endDate: FormControl<string | Date | null>;
}>;

export function minimumBundleItemsValidator(minItems = 2): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const items = control.get('items') as FormArray | null;
    return items && items.length >= minItems ? null : { minimumBundleItems: true };
  };
}

export function duplicateBundleItemsValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const items = control.get('items') as FormArray<BundleItemForm> | null;
    if (!items) return null;

    const seen = new Set<string>();
    for (const item of items.controls) {
      const productId = item.controls.productId.value;
      if (!productId) continue;
      const variantId = item.controls.variantId.value || 'none';
      const key = `${productId}:${variantId}`;
      if (seen.has(key)) return { duplicateBundleItems: true };
      seen.add(key);
    }
    return null;
  };
}

export function dateRangeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;
    if (!startDate || !endDate) return null;
    return new Date(endDate).getTime() >= new Date(startDate).getTime()
      ? null
      : { invalidDateRange: true };
  };
}

export function pricingValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const pricingType = control.get('pricingType')?.value as BundlePricingType;
    const fixedPrice = Number(control.get('fixedPrice')?.value);
    const discountType = control.get('discountType')?.value as BundleDiscountType | null;
    const discountValue = Number(control.get('discountValue')?.value);

    if (pricingType === 'fixed') {
      return Number.isFinite(fixedPrice) && fixedPrice > 0 ? null : { fixedPriceRequired: true };
    }

    if (!discountType) return { discountTypeRequired: true };
    if (!Number.isFinite(discountValue) || discountValue <= 0)
      return { discountValueRequired: true };
    if (discountType === 'percentage' && discountValue > 100)
      return { percentageDiscountTooHigh: true };
    return null;
  };
}

@Component({
  selector: 'app-bundle-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DatePickerModule,
    CheckboxModule,
    TextareaModule,
    ProductSelectorDialogComponent,
    BundlePricePreviewComponent,
    BundleStockPreviewComponent,
  ],
  templateUrl: './bundle-form.component.html',
})
export class BundleFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() mode: 'create' | 'edit' = 'create';
  @Input() bundle: BundleDetails | null = null;
  @Input() isSubmitting = false;
  @Input() backendErrors: Record<string, string> = {};
  @Output() formSubmit = new EventEmitter<CreateBundlePayload>();
  @Output() cancel = new EventEmitter<void>();

  productDialogVisible = false;
  selectedProducts = signal<Record<string, BundleSelectableProduct>>({});
  imagePreview: string | null = null;
  readonly pricingTypeOptions: Array<{ label: string; value: BundlePricingType }> = [
    { label: 'Fixed', value: 'fixed' },
    { label: 'Discount', value: 'discount' },
  ];
  readonly discountTypeOptions: Array<{ label: string; value: BundleDiscountType }> = [
    { label: 'Percentage', value: 'percentage' },
    { label: 'Fixed amount', value: 'fixed' },
  ];
  readonly primeInputClass =
    'w-full !rounded-lg !border !border-[#696969] !bg-[#393939] !p-3 !text-light_orange !shadow-none !outline-none placeholder:!text-[#9ca3af] focus:!border-orange';
  readonly primeSelectClass =
    'w-full !rounded-lg !border !border-[#696969] !bg-[#393939] !shadow-none [&_.p-select-label]:!p-3 [&_.p-select-label]:!text-light_orange [&_.p-select-dropdown]:!text-light_orange';

  form: BundleFormGroup = this.fb.group(
    {
      name: this.fb.nonNullable.control('', [Validators.required]),
      description: this.fb.control<string | null>(null),
      image: this.fb.control<string | null>(null),
      items: this.fb.array<BundleItemForm>([]),
      pricingType: this.fb.nonNullable.control<BundlePricingType>('discount'),
      fixedPrice: this.fb.control<number | null>(null),
      discountType: this.fb.control<BundleDiscountType | null>('percentage'),
      discountValue: this.fb.control<number | null>(10),
      isActive: this.fb.nonNullable.control(true),
      startDate: this.fb.control<string | Date | null>(null),
      endDate: this.fb.control<string | Date | null>(null),
    },
    {
      validators: [
        minimumBundleItemsValidator(2),
        duplicateBundleItemsValidator(),
        dateRangeValidator(),
        pricingValidator(),
      ],
    },
  ) as BundleFormGroup;

  constructor() {
    this.form.controls.pricingType.valueChanges.subscribe((type) => this.applyPricingMode(type));
  }

  ngOnChanges(): void {
    if (this.bundle) {
      this.patchBundle(this.bundle);
    } else if (!this.items.length) {
      this.addEmptyItem();
      this.addEmptyItem();
    }
  }

  get items(): FormArray<BundleItemForm> {
    return this.form.controls.items;
  }

  get disabledProductIds(): string[] {
    return this.items.controls.map((item) => item.controls.productId.value).filter(Boolean);
  }

  get pricePreview(): BundlePricePreview {
    return calculateBundlePricePreview(
      this.previewItems(),
      this.form.controls.pricingType.value,
      this.form.controls.fixedPrice.value,
      this.form.controls.discountType.value,
      this.form.controls.discountValue.value,
    );
  }

  get stockPreview(): BundleStockPreview {
    return calculateBundleStockPreview(this.previewItems());
  }

  addEmptyItem(): void {
    this.items.push(this.createItemForm());
    this.form.updateValueAndValidity();
  }

  openProductDialog(): void {
    this.productDialogVisible = true;
  }

  addSelectedProduct(product: BundleSelectableProduct): void {
    const emptyItem = this.items.controls.find((item) => !item.controls.productId.value);
    const item = emptyItem ?? this.createItemForm();
    if (!emptyItem) this.items.push(item);

    item.controls.productId.setValue(product.id);
    item.controls.variantId.setValue(null);
    item.controls.quantity.setValue(1);
    this.selectedProducts.update((products) => ({ ...products, [product.id]: product }));
    this.form.updateValueAndValidity();
  }

  removeItem(index: number): void {
    if (this.items.length <= 2) {
      this.items.at(index).reset({ productId: '', variantId: null, quantity: 1 });
    } else {
      this.items.removeAt(index);
    }
    this.form.updateValueAndValidity();
  }

  onProductChanged(item: BundleItemForm): void {
    item.controls.variantId.setValue(null);
    this.form.updateValueAndValidity();
  }

  productFor(item: BundleItemForm): BundleSelectableProduct | null {
    return this.selectedProducts()[item.controls.productId.value] ?? null;
  }

  variantFor(item: BundleItemForm): BundleSelectableVariant | null {
    const product = this.productFor(item);
    const variantId = item.controls.variantId.value;
    if (!product || !variantId) return null;
    return product.variants.find((variant) => variant.id === variantId) ?? null;
  }

  selectedPrice(item: BundleItemForm): number {
    const product = this.productFor(item);
    if (!product) return 0;
    return this.variantFor(item)?.price ?? product.price;
  }

  selectedStock(item: BundleItemForm): number {
    const product = this.productFor(item);
    if (!product) return 0;
    return this.variantFor(item)?.stock ?? product.stock;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type) || file.size > 2 * 1024 * 1024) {
      this.form.controls.image.setErrors({ invalidImage: true });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      this.imagePreview = value;
      this.form.controls.image.setValue(value);
    };
    reader.readAsDataURL(file);
  }

  submit(): void {
    if (this.isSubmitting) return;
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();

    if (this.form.invalid || this.hasNonPositiveFixedDiscount()) {
      this.scrollToFirstInvalid();
      return;
    }

    this.formSubmit.emit(this.toPayload());
  }

  errorFor(controlName: keyof BundleFormGroup['controls']): string {
    const control = this.form.controls[controlName];
    if (!control || !control.touched || !control.invalid)
      return this.backendErrors[String(controlName)] || '';
    if (control.errors?.['required']) return 'bundles.validation.required';
    if (control.errors?.['invalidImage']) return 'bundles.validation.invalidImage';
    return this.backendErrors[String(controlName)] || '';
  }

  itemError(index: number, controlName: keyof BundleItemForm['controls']): string {
    const control = this.items.at(index).controls[controlName];
    if (!control.touched || !control.invalid) return '';
    if (control.errors?.['required']) return 'bundles.validation.required';
    if (control.errors?.['min']) return 'bundles.validation.quantity';
    return '';
  }

  formError(): string {
    if (this.form.errors?.['minimumBundleItems']) return 'bundles.validation.minimumItems';
    if (this.form.errors?.['duplicateBundleItems']) return 'bundles.validation.duplicateItems';
    if (this.form.errors?.['invalidDateRange']) return 'bundles.validation.dateRange';
    if (this.form.errors?.['fixedPriceRequired']) return 'bundles.validation.fixedPrice';
    if (this.form.errors?.['discountTypeRequired']) return 'bundles.validation.discountType';
    if (this.form.errors?.['discountValueRequired']) return 'bundles.validation.discountValue';
    if (this.form.errors?.['percentageDiscountTooHigh'])
      return 'bundles.validation.percentageDiscount';
    if (this.hasNonPositiveFixedDiscount()) return 'bundles.validation.fixedDiscountTooHigh';
    return '';
  }

  private createItemForm(): BundleItemForm {
    return this.fb.group({
      productId: this.fb.nonNullable.control('', [Validators.required]),
      variantId: this.fb.control<string | null>(null),
      quantity: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    }) as BundleItemForm;
  }

  private patchBundle(bundle: BundleDetails): void {
    this.items.clear();
    const selectedProducts: Record<string, BundleSelectableProduct> = {};
    bundle.items.forEach((item) => {
      const itemForm = this.createItemForm();
      itemForm.patchValue({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
      });
      this.items.push(itemForm);
      if (item.product) {
        selectedProducts[item.productId] = item.product;
      } else {
        selectedProducts[item.productId] = {
          id: item.productId,
          name: item.productName,
          sku: item.sku,
          image: item.image,
          price: item.unitPrice,
          stock: item.currentStock,
          isActive: true,
          variants: item.variant ? [item.variant] : [],
        };
      }
    });
    while (this.items.length < 2) this.addEmptyItem();
    this.selectedProducts.set(selectedProducts);
    this.imagePreview = bundle.image ?? null;
    this.form.patchValue({
      name: bundle.name,
      description: bundle.description ?? null,
      image: bundle.image ?? null,
      pricingType: bundle.pricingType,
      fixedPrice: bundle.fixedPrice ?? null,
      discountType: bundle.discountType ?? null,
      discountValue: bundle.discountValue ?? null,
      isActive: bundle.isActive,
      startDate: this.toDateInput(bundle.startDate),
      endDate: this.toDateInput(bundle.endDate),
    });
    this.applyPricingMode(bundle.pricingType);
    this.form.updateValueAndValidity();
  }

  private applyPricingMode(type: BundlePricingType): void {
    if (type === 'discount') {
      this.form.controls.fixedPrice.setValue(null, { emitEvent: false });
      if (!this.form.controls.discountType.value) {
        this.form.controls.discountType.setValue('percentage', { emitEvent: false });
      }
      if (this.form.controls.discountValue.value === null) {
        this.form.controls.discountValue.setValue(10, { emitEvent: false });
      }
    }
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private hasNonPositiveFixedDiscount(): boolean {
    return (
      this.form.controls.pricingType.value === 'discount' &&
      this.form.controls.discountType.value === 'fixed' &&
      this.pricePreview.originalPrice > 0 &&
      this.pricePreview.finalPrice <= 0
    );
  }

  private toPayload(): CreateBundlePayload {
    const raw = this.form.getRawValue();
    return buildBundlePayload({
      name: raw.name.trim(),
      description: raw.description?.trim() || null,
      image: raw.image || null,
      items: raw.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: Number(item.quantity),
      })),
      pricingType: raw.pricingType,
      fixedPrice: raw.fixedPrice,
      discountType: raw.discountType,
      discountValue: raw.discountValue,
      isActive: raw.isActive,
      startDate: raw.startDate || null,
      endDate: raw.endDate || null,
    });
  }

  private previewItems() {
    return this.items.controls
      .map((item) => {
        const product = this.productFor(item);
        if (!product) return null;
        const variant = this.variantFor(item);
        return {
          label: variant ? `${product.name} - ${variant.name}` : product.name,
          price: variant?.price ?? product.price,
          stock: variant?.stock ?? product.stock,
          quantity: Number(item.controls.quantity.value || 0),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  private toDateInput(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private scrollToFirstInvalid(): void {
    queueMicrotask(() => {
      document
        .querySelector<HTMLElement>('.ng-invalid[formControlName], .form-error')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
    });
  }
}
