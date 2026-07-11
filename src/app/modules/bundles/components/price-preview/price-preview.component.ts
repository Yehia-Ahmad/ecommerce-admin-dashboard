import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface BundlePricePreview {
  originalPrice: number;
  finalPrice: number;
  savedAmount: number;
  savingsPercentage: number;
  discountType?: string | null;
  discountValue?: number | null;
}

@Component({
  selector: 'app-bundle-price-preview',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <section class="grid gap-4 rounded-xl border border-[#5a5a5a] bg-orange/10 p-4">
      <div>
        <h3 class="m-0 font-bold text-orange">
          {{ 'bundles.form.pricePreview.title' | translate }}
        </h3>
        <p class="mt-1 text-sm text-[#bdbdbd]">
          {{ 'bundles.form.pricePreview.previewOnly' | translate }}
        </p>
      </div>
      <dl class="m-0 grid gap-2">
        <div class="flex justify-between gap-4">
          <dt class="text-[#bdbdbd]">
            {{ 'bundles.form.pricePreview.originalPrice' | translate }}
          </dt>
          <dd class="m-0 font-bold text-light_orange">
            {{ preview.originalPrice | number: '1.2-2' }}
          </dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-[#bdbdbd]">{{ 'bundles.form.pricePreview.discount' | translate }}</dt>
          <dd class="m-0 font-bold text-light_orange">{{ discountLabel }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-[#bdbdbd]">{{ 'bundles.form.pricePreview.finalPrice' | translate }}</dt>
          <dd class="m-0 font-bold text-light_orange">
            {{ preview.finalPrice | number: '1.2-2' }}
          </dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-[#bdbdbd]">{{ 'bundles.form.pricePreview.savedAmount' | translate }}</dt>
          <dd class="m-0 font-bold text-light_orange">
            {{ preview.savedAmount | number: '1.2-2' }}
          </dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-[#bdbdbd]">
            {{ 'bundles.form.pricePreview.savingsPercentage' | translate }}
          </dt>
          <dd class="m-0 font-bold text-light_orange">
            {{ preview.savingsPercentage | number: '1.0-2' }}%
          </dd>
        </div>
      </dl>
    </section>
  `,
})
export class BundlePricePreviewComponent {
  @Input({ required: true }) preview!: BundlePricePreview;

  get discountLabel(): string {
    if (!this.preview.discountType || !this.preview.discountValue) return '-';
    return this.preview.discountType === 'percentage'
      ? `${this.preview.discountValue}%`
      : `${this.preview.discountValue}`;
  }
}
