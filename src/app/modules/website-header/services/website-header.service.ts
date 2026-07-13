import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DEFAULT_HEADER_CONFIG,
  HeaderAction,
  HeaderAppearance,
  HeaderBranding,
  HeaderConfig,
  HeaderContact,
  HeaderContactField,
  HeaderLinkType,
  HeaderLocalizedText,
  HeaderNavigationItem,
  HeaderReferenceOption,
  HeaderSaveResponse,
  HeaderSettings,
  HeaderTopBar
} from '../models/website-header.models';

@Injectable({ providedIn: 'root' })
export class WebsiteHeaderService {
  private readonly publicHeaderUrl = `${environment.api_base_url}header`;
  private readonly settingsUrl = `${environment.api_base_url}admin/header-settings`;
  private readonly navigationUrl = `${environment.api_base_url}admin/header-navigation`;
  private readonly actionsUrl = `${environment.api_base_url}admin/header-actions`;
  private readonly categoriesUrl = `${environment.api_base_url}categories`;
  private readonly productsUrl = `${environment.api_base_url}products`;
  private readonly pagesUrl = `${environment.api_base_url}pages`;

  constructor(private readonly http: HttpClient) {}

  getHeaderConfig(): Observable<HeaderConfig> {
    return this.http.get<unknown>(this.settingsUrl).pipe(map((response) => this.normalizeConfig(response)));
  }

  getPublicHeaderConfig(): Observable<HeaderConfig> {
    return this.http.get<unknown>(this.publicHeaderUrl).pipe(map((response) => this.normalizeConfig(response)));
  }

  updateHeaderConfig(config: HeaderConfig): Observable<HeaderSaveResponse> {
    return this.http.put<unknown>(this.settingsUrl, this.toSettingsPayload(config)).pipe(
      map((response) => this.normalizeSaveResponse(response, config))
    );
  }

  uploadLogo(type: 'logo' | 'mobileLogo', imageBase64: string): Observable<HeaderConfig> {
    return this.http.post<unknown>(`${this.settingsUrl}/logo`, { type, imageBase64 }).pipe(
      map((response) => this.normalizeConfig(response))
    );
  }

  deleteLogo(type: 'logo' | 'mobileLogo'): Observable<unknown> {
    return this.http.delete<unknown>(`${this.settingsUrl}/logo`, { params: { type } });
  }

  listNavigation(): Observable<HeaderNavigationItem[]> {
    return this.http.get<unknown>(this.navigationUrl).pipe(
      map((response) => this.extractArray(response, ['navigation', 'data.navigation', 'items', 'data.items', 'data']).map(
        (item, index) => this.normalizeNavigationItem(item, undefined, index)
      ))
    );
  }

  createNavigationItem(item: HeaderNavigationItem): Observable<HeaderNavigationItem> {
    return this.http.post<unknown>(this.navigationUrl, this.toNavigationPayload(item)).pipe(
      map((response) => this.normalizeNavigationItem(this.extractObject(response)))
    );
  }

  updateNavigationItem(item: HeaderNavigationItem): Observable<HeaderNavigationItem> {
    return this.http.put<unknown>(`${this.navigationUrl}/${encodeURIComponent(item.id)}`, this.toNavigationPayload(item)).pipe(
      map((response) => this.normalizeNavigationItem(this.extractObject(response), item))
    );
  }

  setNavigationStatus(id: string, isEnabled: boolean): Observable<HeaderNavigationItem> {
    return this.http.patch<unknown>(`${this.navigationUrl}/${encodeURIComponent(id)}/status`, { isEnabled }).pipe(
      map((response) => this.normalizeNavigationItem(this.extractObject(response), { id, isEnabled }))
    );
  }

  deleteNavigationItem(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.navigationUrl}/${encodeURIComponent(id)}`);
  }

  reorderNavigation(items: HeaderNavigationItem[]): Observable<HeaderNavigationItem[]> {
    return this.http.patch<unknown>(`${this.navigationUrl}/reorder`, {
      items: items.map((item, index) => ({ id: item.id, parentId: item.parentId, sortOrder: index }))
    }).pipe(map((response) => this.extractArray(response, ['navigation', 'data.navigation', 'items', 'data.items', 'data']).map(
      (item, index) => this.normalizeNavigationItem(item, items[index])
    )));
  }

  listActions(): Observable<HeaderAction[]> {
    return this.http.get<unknown>(this.actionsUrl).pipe(
      map((response) => this.extractArray(response, ['actions', 'data.actions', 'items', 'data.items', 'data']).map(
        (item, index) => this.normalizeAction(item, undefined, index)
      ))
    );
  }

  createAction(action: HeaderAction): Observable<HeaderAction> {
    return this.http.post<unknown>(this.actionsUrl, this.toActionPayload(action)).pipe(
      map((response) => this.normalizeAction(this.extractObject(response), action))
    );
  }

  updateAction(action: HeaderAction): Observable<HeaderAction> {
    return this.http.put<unknown>(`${this.actionsUrl}/${encodeURIComponent(action.id)}`, this.toActionPayload(action)).pipe(
      map((response) => this.normalizeAction(this.extractObject(response), action))
    );
  }

  deleteAction(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.actionsUrl}/${encodeURIComponent(id)}`);
  }

  reorderActions(actions: HeaderAction[]): Observable<HeaderAction[]> {
    return this.http.patch<unknown>(`${this.actionsUrl}/reorder`, {
      items: actions.map((action, index) => ({ id: action.id, sortOrder: index }))
    }).pipe(map((response) => this.extractArray(response, ['actions', 'data.actions', 'items', 'data.items', 'data']).map(
      (item, index) => this.normalizeAction(item, actions[index])
    )));
  }

  getCategoryOptions(query = '', page = 1, limit = 20): Observable<HeaderReferenceOption[]> {
    return this.http.get<unknown>(this.categoriesUrl, { params: { search: query, page, limit } }).pipe(
      map((response) => this.extractArray(response, ['categories', 'data.categories', 'items', 'data.items', 'data']).map(
        (item) => this.normalizeReferenceOption(item)
      ).filter((item) => item.id))
    );
  }

  getProductOptions(query = '', page = 1, limit = 20): Observable<HeaderReferenceOption[]> {
    return this.http.get<unknown>(this.productsUrl, { params: { search: query, q: query, page, limit } }).pipe(
      map((response) => this.extractArray(response, ['products', 'data.products', 'items', 'data.items', 'data']).map(
        (item) => this.normalizeReferenceOption(item)
      ).filter((item) => item.id))
    );
  }

  getPageOptions(query = '', page = 1, limit = 20): Observable<HeaderReferenceOption[]> {
    return this.http.get<unknown>(this.pagesUrl, { params: { search: query, page, limit } }).pipe(
      map((response) => this.extractArray(response, ['pages', 'data.pages', 'items', 'data.items', 'data']).map(
        (item) => this.normalizeReferenceOption(item)
      ).filter((item) => item.id))
    );
  }

  normalizeConfig(response: unknown): HeaderConfig {
    const raw = this.extractObject(response);
    const fallback = DEFAULT_HEADER_CONFIG;

    return {
      id: String(raw?._id || raw?.id || fallback.id),
      version: String(raw?.version || raw?.updatedAt || raw?.topBarVersion || fallback.version),
      settings: this.normalizeSettings(raw?.settings || raw),
      branding: this.normalizeBranding(raw?.branding || raw?.logo || raw),
      topBar: this.normalizeTopBar(raw?.topBar || raw),
      contact: this.normalizeContact(raw?.contact || raw?.contactInformation || raw),
      appearance: this.normalizeAppearance(raw?.appearance || raw),
      navigation: this.normalizeNavigation(raw?.navigation || raw?.navigationItems || raw?.menuItems || raw?.headerNavigation || []),
      actions: this.normalizeActions(raw?.actions || raw?.headerActions || [])
    };
  }

  private normalizeSaveResponse(response: unknown, fallback: HeaderConfig): HeaderSaveResponse {
    const body = response as any;
    const config = this.normalizeConfig(body?.config || body?.header || body?.data || fallback);
    if (!config.navigation.length) config.navigation = fallback.navigation;
    if (!config.actions.length) config.actions = fallback.actions;
    if (!config.branding.desktopLogo) config.branding.desktopLogo = fallback.branding.desktopLogo;
    if (!config.branding.mobileLogo) config.branding.mobileLogo = fallback.branding.mobileLogo;
    return {
      success: Boolean(body?.success ?? true),
      message: String(body?.message || 'Website header saved successfully.'),
      config
    };
  }

  private normalizeSettings(raw: any): HeaderSettings {
    const fallback = DEFAULT_HEADER_CONFIG.settings;
    return {
      isEnabled: this.boolean(raw?.isEnabled ?? raw?.enabled, fallback.isEnabled),
      isSticky: this.boolean(raw?.isSticky ?? raw?.stickyHeader, fallback.isSticky),
      showTopBar: this.boolean(raw?.showTopBar, fallback.showTopBar),
      showMainHeader: this.boolean(raw?.showMainHeader, fallback.showMainHeader),
      showNavigation: this.boolean(raw?.showNavigation, fallback.showNavigation),
      showSearch: this.boolean(raw?.showSearch, fallback.showSearch),
      showCart: this.boolean(raw?.showCart, fallback.showCart),
      showWishlist: this.boolean(raw?.showWishlist, fallback.showWishlist),
      showAccount: this.boolean(raw?.showAccount, fallback.showAccount),
      showLanguageSwitcher: this.boolean(raw?.showLanguageSwitcher, fallback.showLanguageSwitcher),
      showMobileMenu: this.boolean(raw?.showMobileMenu, fallback.showMobileMenu)
    };
  }

  private normalizeBranding(raw: any): HeaderBranding {
    const fallback = DEFAULT_HEADER_CONFIG.branding;
    return {
      desktopLogo: String(raw?.desktopLogo || raw?.logoUrl || raw?.logoURL || raw?.mainLogo || raw?.logo || fallback.desktopLogo),
      mobileLogo: String(raw?.mobileLogo || raw?.mobileLogoUrl || raw?.desktopLogo || raw?.logoUrl || raw?.mainLogo || raw?.logo || fallback.mobileLogo),
      logoAlt: this.localized(raw?.logoAlt || raw?.logoAltText || raw?.altText || raw?.logoAlternativeText, fallback.logoAlt),
      logoWidth: this.positiveNumber(raw?.logoWidth, fallback.logoWidth),
      logoHeight: this.positiveNumber(raw?.logoHeight, fallback.logoHeight),
      homeUrl: String(raw?.homeUrl || raw?.homeURL || fallback.homeUrl)
    };
  }

  private normalizeTopBar(raw: any): HeaderTopBar {
    const fallback = DEFAULT_HEADER_CONFIG.topBar;
    return {
      text: this.localized(raw?.text || raw?.topBarText, fallback.text),
      linkLabel: this.localized(raw?.linkLabel || raw?.topBarLinkText || raw?.topBarLinkLabel, fallback.linkLabel),
      linkUrl: String(raw?.linkUrl || raw?.topBarLinkUrl || raw?.linkURL || ''),
      openInNewTab: this.boolean(raw?.openInNewTab, fallback.openInNewTab),
      backgroundColor: this.color(raw?.backgroundColor || raw?.topBarBackgroundColor, fallback.backgroundColor),
      textColor: this.color(raw?.textColor || raw?.topBarTextColor, fallback.textColor),
      dismissible: this.boolean(raw?.dismissible ?? raw?.topBarDismissible, fallback.dismissible)
    };
  }

  private normalizeContact(raw: any): HeaderContact {
    const fallback = DEFAULT_HEADER_CONFIG.contact;
    return {
      phone: this.contactField(raw?.phone || raw?.phoneNumber, raw?.phoneVisible, fallback.phone),
      whatsapp: this.contactField(raw?.whatsapp || raw?.whatsApp || raw?.whatsappNumber, raw?.whatsappVisible, fallback.whatsapp),
      email: this.contactField(raw?.email, raw?.emailVisible, fallback.email),
      address: this.contactField(raw?.address, raw?.addressVisible, fallback.address)
    };
  }

  private normalizeAppearance(raw: any): HeaderAppearance {
    const fallback = DEFAULT_HEADER_CONFIG.appearance;
    return {
      backgroundColor: this.color(raw?.backgroundColor || raw?.headerBackgroundColor, fallback.backgroundColor),
      textColor: this.color(raw?.textColor || raw?.headerTextColor, fallback.textColor),
      iconColor: this.color(raw?.iconColor || raw?.headerIconColor, fallback.iconColor),
      activeColor: this.color(raw?.activeColor || raw?.activeItemColor || raw?.activeNavigationItemColor, fallback.activeColor),
      hoverColor: this.color(raw?.hoverColor, fallback.hoverColor),
      borderColor: this.color(raw?.borderColor, fallback.borderColor),
      desktopHeight: this.positiveNumber(raw?.desktopHeight || raw?.desktopHeaderHeight, fallback.desktopHeight),
      mobileHeight: this.positiveNumber(raw?.mobileHeight || raw?.mobileHeaderHeight, fallback.mobileHeight)
    };
  }

  private normalizeNavigation(items: any[]): HeaderNavigationItem[] {
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => this.normalizeNavigationItem(item, undefined, index + 1))
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  private normalizeNavigationItem(raw: any, fallback?: Partial<HeaderNavigationItem>, sortOrder?: number): HeaderNavigationItem {
    const linkType = String(raw?.type || raw?.linkType || fallback?.linkType || 'custom').toLowerCase();
    return {
      id: String(raw?._id || raw?.id || fallback?.id || this.tempId()),
      label: this.localized(raw?.label || raw?.title || raw?.name, fallback?.label || { en: '', ar: '' }),
      linkType: this.isLinkType(linkType) ? linkType : 'custom',
      url: String(raw?.url || raw?.href || fallback?.url || ''),
      referenceId: String(raw?.referenceId || raw?.categoryId || raw?.productId || raw?.pageId || fallback?.referenceId || ''),
      referenceLabel: String(raw?.referenceLabel || raw?.referenceName || fallback?.referenceLabel || ''),
      icon: String(raw?.icon || fallback?.icon || ''),
      image: String(raw?.image || raw?.imageBase64 || raw?.imageUrl || fallback?.image || ''),
      openInNewTab: this.boolean(raw?.openInNewTab, fallback?.openInNewTab ?? false),
      isEnabled: this.boolean(raw?.isEnabled ?? raw?.enabled, fallback?.isEnabled ?? true),
      parentId: raw?.parentId || raw?.parent?._id || fallback?.parentId || null,
      sortOrder: Number(raw?.sortOrder ?? fallback?.sortOrder ?? sortOrder ?? 1),
      children: this.normalizeNavigation(raw?.children || raw?.items || [])
    };
  }

  private normalizeActions(items: any[]): HeaderAction[] {
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => this.normalizeAction(item, undefined, index + 1))
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  private normalizeAction(raw: any, fallback?: Partial<HeaderAction>, sortOrder?: number): HeaderAction {
    return {
      id: String(raw?._id || raw?.id || fallback?.id || this.tempId()),
      label: this.localized(raw?.label || raw?.title || raw?.name, fallback?.label || { en: '', ar: '' }),
      icon: String(raw?.icon || fallback?.icon || ''),
      url: String(raw?.url || raw?.href || fallback?.url || ''),
      openInNewTab: this.boolean(raw?.openInNewTab, fallback?.openInNewTab ?? false),
      isEnabled: this.boolean(raw?.isEnabled ?? raw?.enabled, fallback?.isEnabled ?? true),
      sortOrder: Number(raw?.sortOrder ?? fallback?.sortOrder ?? sortOrder ?? 1)
    };
  }

  private toSettingsPayload(config: HeaderConfig): Record<string, unknown> {
    return {
      isEnabled: config.settings.isEnabled,
      isSticky: config.settings.isSticky,
      showTopBar: config.settings.showTopBar,
      showNavigation: config.settings.showNavigation,
      showSearch: config.settings.showSearch,
      showCart: config.settings.showCart,
      showWishlist: config.settings.showWishlist,
      showAccount: config.settings.showAccount,
      logoAltText: config.branding.logoAlt.en || config.branding.logoAlt.ar,
      homeUrl: config.branding.homeUrl,
      topBarText: config.topBar.text.en || config.topBar.text.ar,
      topBarLinkText: config.topBar.linkLabel.en || config.topBar.linkLabel.ar,
      topBarLinkUrl: config.topBar.linkUrl,
      topBarBackgroundColor: config.topBar.backgroundColor,
      topBarTextColor: config.topBar.textColor,
      phoneNumber: config.contact.phone.value,
      whatsappNumber: config.contact.whatsapp.value,
      email: config.contact.email.value,
      headerBackgroundColor: config.appearance.backgroundColor,
      headerTextColor: config.appearance.textColor,
      headerIconColor: config.appearance.iconColor,
      activeItemColor: config.appearance.activeColor,
      hoverColor: config.appearance.hoverColor,
      borderColor: config.appearance.borderColor
    };
  }

  private toNavigationPayload(item: HeaderNavigationItem): Record<string, unknown> {
    return {
      label: item.label.en || item.label.ar,
      url: item.url,
      type: item.linkType,
      referenceId: item.referenceId,
      icon: item.icon,
      imageUrl: item.image || null,
      openInNewTab: item.openInNewTab,
      isEnabled: item.isEnabled,
      sortOrder: item.sortOrder,
      parentId: item.parentId
    };
  }

  private toActionPayload(action: HeaderAction): Record<string, unknown> {
    return {
      label: action.label.en || action.label.ar,
      icon: action.icon,
      url: action.url,
      openInNewTab: action.openInNewTab,
      isEnabled: action.isEnabled,
      sortOrder: action.sortOrder
    };
  }

  private localized(value: any, fallback: HeaderLocalizedText): HeaderLocalizedText {
    if (typeof value === 'string') return { en: value, ar: fallback.ar || value };
    return {
      en: String(value?.en || value?.english || fallback.en || ''),
      ar: String(value?.ar || value?.arabic || fallback.ar || '')
    };
  }

  private contactField(value: any, visibleValue: any, fallback: HeaderContactField): HeaderContactField {
    if (value && typeof value === 'object') {
      return {
        value: String(value?.value || value?.number || value?.text || ''),
        isVisible: this.boolean(value?.isVisible ?? value?.visible, fallback.isVisible)
      };
    }
    return {
      value: String(value || fallback.value),
      isVisible: this.boolean(visibleValue, fallback.isVisible)
    };
  }

  private normalizeReferenceOption(item: any): HeaderReferenceOption {
    return {
      id: String(item?._id || item?.id || ''),
      label: String(item?.name || item?.title || item?.label || ''),
      image: item?.image || item?.imageBase64 || item?.imageUrl
    };
  }

  private extractObject(response: any): any {
    return response?.data?.headerNavigation || response?.data?.headerAction ||
      response?.data?.navigationItem || response?.data?.action ||
      response?.data?.header || response?.data?.config || response?.data?.item || response?.data ||
      response?.headerNavigation || response?.headerAction || response?.navigationItem || response?.action ||
      response?.header || response?.config || response?.item || response || {};
  }

  private extractArray(response: any, keys: string[]): any[] {
    if (Array.isArray(response)) return response;
    for (const key of keys) {
      const value = key.split('.').reduce((current, part) => current?.[part], response);
      if (Array.isArray(value)) return value;
    }
    return [];
  }

  private color(value: unknown, fallback: string): string {
    const next = String(value || '').trim();
    return /^#[0-9A-Fa-f]{6}$/.test(next) ? next.toUpperCase() : fallback;
  }

  private positiveNumber(value: unknown, fallback: number): number {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
  }

  private boolean(value: unknown, fallback: boolean): boolean {
    if (value === undefined || value === null) return fallback;
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private isLinkType(value: string): value is HeaderLinkType {
    return ['custom', 'category', 'product', 'page'].includes(value);
  }

  private tempId(): string {
    return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
