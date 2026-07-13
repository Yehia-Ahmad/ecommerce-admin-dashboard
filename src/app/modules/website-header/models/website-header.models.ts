export type HeaderLinkType = 'custom' | 'category' | 'product' | 'page';

export interface HeaderLocalizedText {
  en: string;
  ar: string;
}

export interface HeaderSettings {
  isEnabled: boolean;
  isSticky: boolean;
  showTopBar: boolean;
  showMainHeader: boolean;
  showNavigation: boolean;
  showSearch: boolean;
  showCart: boolean;
  showWishlist: boolean;
  showAccount: boolean;
  showLanguageSwitcher: boolean;
  showMobileMenu: boolean;
}

export interface HeaderBranding {
  desktopLogo: string;
  mobileLogo: string;
  logoAlt: HeaderLocalizedText;
  logoWidth: number;
  logoHeight: number;
  homeUrl: string;
}

export interface HeaderTopBar {
  text: HeaderLocalizedText;
  linkLabel: HeaderLocalizedText;
  linkUrl: string;
  openInNewTab: boolean;
  backgroundColor: string;
  textColor: string;
  dismissible: boolean;
}

export interface HeaderContactField {
  value: string;
  isVisible: boolean;
}

export interface HeaderContact {
  phone: HeaderContactField;
  whatsapp: HeaderContactField;
  email: HeaderContactField;
  address: HeaderContactField;
}

export interface HeaderAppearance {
  backgroundColor: string;
  textColor: string;
  iconColor: string;
  activeColor: string;
  hoverColor: string;
  borderColor: string;
  desktopHeight: number;
  mobileHeight: number;
}

export interface HeaderNavigationItem {
  id: string;
  label: HeaderLocalizedText;
  linkType: HeaderLinkType;
  url: string;
  referenceId: string;
  referenceLabel: string;
  icon: string;
  image: string;
  openInNewTab: boolean;
  isEnabled: boolean;
  parentId: string | null;
  sortOrder: number;
  children: HeaderNavigationItem[];
}

export interface HeaderAction {
  id: string;
  label: HeaderLocalizedText;
  icon: string;
  url: string;
  openInNewTab: boolean;
  isEnabled: boolean;
  sortOrder: number;
}

export interface HeaderConfig {
  id: string;
  version: string;
  settings: HeaderSettings;
  branding: HeaderBranding;
  topBar: HeaderTopBar;
  contact: HeaderContact;
  appearance: HeaderAppearance;
  navigation: HeaderNavigationItem[];
  actions: HeaderAction[];
}

export interface HeaderReferenceOption {
  id: string;
  label: string;
  image?: string;
}

export interface HeaderSaveResponse {
  success: boolean;
  message: string;
  config: HeaderConfig;
}

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  id: '',
  version: '',
  settings: {
    isEnabled: true,
    isSticky: false,
    showTopBar: true,
    showMainHeader: true,
    showNavigation: true,
    showSearch: true,
    showCart: true,
    showWishlist: true,
    showAccount: true,
    showLanguageSwitcher: true,
    showMobileMenu: true
  },
  branding: {
    desktopLogo: '',
    mobileLogo: '',
    logoAlt: { en: 'Store logo', ar: 'شعار المتجر' },
    logoWidth: 160,
    logoHeight: 56,
    homeUrl: '/'
  },
  topBar: {
    text: { en: '', ar: '' },
    linkLabel: { en: '', ar: '' },
    linkUrl: '',
    openInNewTab: false,
    backgroundColor: '#2F2F2F',
    textColor: '#FFFFFF',
    dismissible: false
  },
  contact: {
    phone: { value: '', isVisible: false },
    whatsapp: { value: '', isVisible: false },
    email: { value: '', isVisible: false },
    address: { value: '', isVisible: false }
  },
  appearance: {
    backgroundColor: '#FFFFFF',
    textColor: '#2F2F2F',
    iconColor: '#2F2F2F',
    activeColor: '#FF9933',
    hoverColor: '#FFDFC2',
    borderColor: '#E5E7EB',
    desktopHeight: 80,
    mobileHeight: 64
  },
  navigation: [],
  actions: []
};
