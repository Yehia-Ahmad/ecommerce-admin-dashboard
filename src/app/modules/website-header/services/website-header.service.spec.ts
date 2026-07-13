import { HttpClient } from '@angular/common/http';
import { WebsiteHeaderService } from './website-header.service';

describe('WebsiteHeaderService', () => {
  let service: WebsiteHeaderService;

  beforeEach(() => {
    service = new WebsiteHeaderService({} as HttpClient);
  });

  it('normalizes nested header navigation and fallback settings', () => {
    const config = service.normalizeConfig({
      data: {
        id: 'header-1',
        enabled: false,
        branding: { mainLogo: 'logo.png', altText: { en: 'Logo', ar: 'الشعار' } },
        navigationItems: [
          {
            _id: 'nav-1',
            label: { en: 'Shop', ar: 'المتجر' },
            linkType: 'category',
            categoryId: 'cat-1',
            enabled: true,
            children: [{ _id: 'nav-2', label: 'Offers', url: '/offers' }]
          }
        ],
        actions: [{ id: 'act-1', label: 'Track', icon: 'truck', url: '/track' }]
      }
    });

    expect(config.id).toBe('header-1');
    expect(config.settings.isEnabled).toBeFalse();
    expect(config.branding.desktopLogo).toBe('logo.png');
    expect(config.navigation[0].referenceId).toBe('cat-1');
    expect(config.navigation[0].children[0].label.en).toBe('Offers');
    expect(config.actions[0].icon).toBe('truck');
  });

  it('falls back to safe appearance colors when backend values are invalid', () => {
    const config = service.normalizeConfig({
      appearance: {
        backgroundColor: 'red',
        textColor: '#111111',
        desktopHeight: 0
      }
    });

    expect(config.appearance.backgroundColor).toBe('#FFFFFF');
    expect(config.appearance.textColor).toBe('#111111');
    expect(config.appearance.desktopHeight).toBe(80);
  });
});
