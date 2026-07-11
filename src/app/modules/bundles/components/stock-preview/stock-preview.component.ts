import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface BundleStockPreviewItem {
  label: string;
  availableStock: number;
  requiredQuantity: number;
  possibleBundleQuantity: number;
}

export interface BundleStockPreview {
  availableStock: number;
  limitingItemLabel: string | null;
  items: BundleStockPreviewItem[];
}

@Component({
  selector: 'app-bundle-stock-preview',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <section class="grid gap-4 rounded-xl border border-[#5a5a5a] bg-[#2f2f2f]/75 p-4">
      <div>
        <h3 class="m-0 font-bold text-orange">{{ 'bundles.form.stockPreview.title' | translate }}</h3>
        <p class="mt-1 text-sm text-[#bdbdbd]">{{ 'bundles.form.stockPreview.previewOnly' | translate }}</p>
      </div>
      <strong class="text-xl" [ngClass]="preview.availableStock <= 0 ? 'text-red-500' : 'text-green-500'">
        {{ 'bundles.form.stockPreview.availableStock' | translate }}: {{ preview.availableStock }}
      </strong>
      @if (preview.limitingItemLabel) {
        <p class="m-0 text-sm text-yellow-400">{{ 'bundles.form.stockPreview.limitedBy' | translate }} {{ preview.limitingItemLabel }}</p>
      }
      @if (preview.availableStock <= 0 && preview.items.length) {
        <p class="m-0 text-sm text-red-500">{{ 'bundles.form.stockPreview.outOfStock' | translate }}</p>
      }
      <div class="grid gap-3">
        @for (item of preview.items; track item.label) {
          <div class="grid gap-1 rounded-lg border border-[#4b5563] p-3 text-light_orange">
            <strong>{{ item.label }}</strong>
            <span class="text-sm text-[#d1d5db]">{{ 'bundles.form.stockPreview.currentStock' | translate }}: {{ item.availableStock }}</span>
            <span class="text-sm text-[#d1d5db]">{{ 'bundles.form.stockPreview.required' | translate }}: {{ item.requiredQuantity }}</span>
            <span class="text-sm text-[#d1d5db]">{{ 'bundles.form.stockPreview.possible' | translate }}: {{ item.possibleBundleQuantity }}</span>
          </div>
        } @empty {
          <p class="m-0 text-sm text-[#bdbdbd]">{{ 'bundles.form.stockPreview.noItems' | translate }}</p>
        }
      </div>
    </section>
  `
})
export class BundleStockPreviewComponent {
  @Input({ required: true }) preview!: BundleStockPreview;
}
