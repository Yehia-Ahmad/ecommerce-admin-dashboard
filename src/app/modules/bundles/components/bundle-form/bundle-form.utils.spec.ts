import { FormArray, FormBuilder, Validators } from '@angular/forms';
import {
  dateRangeValidator,
  duplicateBundleItemsValidator,
  minimumBundleItemsValidator,
  pricingValidator
} from './bundle-form.component';
import {
  buildBundlePayload,
  calculateBundlePricePreview,
  calculateBundleStockPreview
} from './bundle-form.utils';

describe('Bundle form validation and preview helpers', () => {
  const fb = new FormBuilder();

  function item(productId: string, variantId: string | null, quantity = 1) {
    return fb.group({
      productId: fb.nonNullable.control(productId, Validators.required),
      variantId: fb.control<string | null>(variantId),
      quantity: fb.nonNullable.control(quantity, [Validators.required, Validators.min(1)])
    });
  }

  function form(items = new FormArray([item('p1', null), item('p2', null)])) {
    return fb.group({
      items,
      pricingType: fb.nonNullable.control<'fixed' | 'discount'>('discount'),
      fixedPrice: fb.control<number | null>(null),
      discountType: fb.control<'percentage' | 'fixed' | null>('percentage'),
      discountValue: fb.control<number | null>(10),
      startDate: fb.control<string | null>(null),
      endDate: fb.control<string | null>(null)
    }, {
      validators: [
        minimumBundleItemsValidator(),
        duplicateBundleItemsValidator(),
        dateRangeValidator(),
        pricingValidator()
      ]
    });
  }

  it('requires at least two bundle items', () => {
    const target = form(new FormArray([item('p1', null)]));
    expect(target.errors?.['minimumBundleItems']).toBeTrue();
  });

  it('rejects duplicate product and variant combinations', () => {
    const target = form(new FormArray([item('p1', 'v1'), item('p1', 'v1')]));
    expect(target.errors?.['duplicateBundleItems']).toBeTrue();
  });

  it('requires positive quantities', () => {
    const target = item('p1', null, 0);
    expect(target.controls.quantity.invalid).toBeTrue();
  });

  it('validates fixed price pricing', () => {
    const target = form();
    target.patchValue({ pricingType: 'fixed', fixedPrice: 0, discountType: null, discountValue: null });
    target.updateValueAndValidity();
    expect(target.errors?.['fixedPriceRequired']).toBeTrue();
  });

  it('validates percentage discounts', () => {
    const target = form();
    target.patchValue({ pricingType: 'discount', discountType: 'percentage', discountValue: 101 });
    target.updateValueAndValidity();
    expect(target.errors?.['percentageDiscountTooHigh']).toBeTrue();
  });

  it('validates fixed discount value is present', () => {
    const target = form();
    target.patchValue({ pricingType: 'discount', discountType: 'fixed', discountValue: 0 });
    target.updateValueAndValidity();
    expect(target.errors?.['discountValueRequired']).toBeTrue();
  });

  it('validates date range', () => {
    const target = form();
    target.patchValue({ startDate: '2026-02-02', endDate: '2026-01-01' });
    target.updateValueAndValidity();
    expect(target.errors?.['invalidDateRange']).toBeTrue();
  });

  it('calculates original and percentage-discount final price preview', () => {
    const preview = calculateBundlePricePreview([
      { label: 'A', price: 100, stock: 5, quantity: 2 },
      { label: 'B', price: 50, stock: 8, quantity: 1 }
    ], 'discount', null, 'percentage', 10);

    expect(preview.originalPrice).toBe(250);
    expect(preview.finalPrice).toBe(225);
    expect(preview.savedAmount).toBe(25);
  });

  it('calculates fixed-price final price preview', () => {
    const preview = calculateBundlePricePreview([
      { label: 'A', price: 100, stock: 5, quantity: 2 }
    ], 'fixed', 150, null, null);

    expect(preview.originalPrice).toBe(200);
    expect(preview.finalPrice).toBe(150);
  });

  it('calculates bundle stock preview and limiting item', () => {
    const preview = calculateBundleStockPreview([
      { label: 'A', price: 100, stock: 5, quantity: 2 },
      { label: 'B', price: 50, stock: 12, quantity: 3 }
    ]);

    expect(preview.availableStock).toBe(2);
    expect(preview.limitingItemLabel).toBe('A');
  });

  it('maps create payload without frontend-calculated prices', () => {
    const payload = buildBundlePayload({
      name: ' Oil Bundle ',
      description: '',
      image: null,
      items: [
        { productId: 'p1', variantId: null, quantity: 1 },
        { productId: 'p2', variantId: 'v2', quantity: 2 }
      ],
      pricingType: 'discount',
      discountType: 'percentage',
      discountValue: 10,
      isActive: true,
      startDate: null,
      endDate: null
    });

    expect(payload.name).toBe('Oil Bundle');
    expect(payload.items[1].variantId).toBe('v2');
    expect((payload as any).originalPrice).toBeUndefined();
    expect((payload as any).finalPrice).toBeUndefined();
  });
});

