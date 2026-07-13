import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ThemeService } from '../../../shared/services/theme.service';
import { DEFAULT_HEADER_CONFIG } from '../../models/website-header.models';
import { WebsiteHeaderService } from '../../services/website-header.service';
import { WebsiteHeaderSettingsComponent } from './website-header-settings.component';

describe('WebsiteHeaderSettingsComponent', () => {
  let component: WebsiteHeaderSettingsComponent;
  let service: jasmine.SpyObj<WebsiteHeaderService>;

  beforeEach(() => {
    service = jasmine.createSpyObj<WebsiteHeaderService>('WebsiteHeaderService', [
      'getHeaderConfig',
      'updateHeaderConfig',
      'getCategoryOptions',
      'getProductOptions',
      'getPageOptions',
      'listNavigation',
      'listActions',
      'uploadLogo',
      'deleteLogo',
      'createNavigationItem',
      'updateNavigationItem',
      'setNavigationStatus',
      'deleteNavigationItem',
      'createAction',
      'updateAction',
      'deleteAction',
      'reorderActions',
      'reorderNavigation'
    ]);
    service.getHeaderConfig.and.returnValue(of(DEFAULT_HEADER_CONFIG));
    service.getCategoryOptions.and.returnValue(of([]));
    service.getProductOptions.and.returnValue(of([]));
    service.getPageOptions.and.returnValue(of([]));
    service.listNavigation.and.returnValue(of([]));
    service.listActions.and.returnValue(of([]));
    service.createNavigationItem.and.callFake((item) => of(item));
    service.updateNavigationItem.and.callFake((item) => of(item));
    service.setNavigationStatus.and.callFake((id, isEnabled) => of({
      id,
      label: { en: '', ar: '' },
      linkType: 'custom',
      url: '',
      referenceId: '',
      referenceLabel: '',
      icon: '',
      image: '',
      openInNewTab: false,
      isEnabled,
      parentId: null,
      sortOrder: 1,
      children: []
    }));
    service.deleteNavigationItem.and.returnValue(of({}));
    service.createAction.and.callFake((item) => of(item));
    service.updateAction.and.callFake((item) => of(item));
    service.deleteAction.and.returnValue(of({}));
    service.reorderActions.and.returnValue(of([]));
    service.reorderNavigation.and.returnValue(of([]));

    component = new WebsiteHeaderSettingsComponent(
      new FormBuilder(),
      service,
      { isDarkMode$: of(false) } as ThemeService,
      { instant: (key: string) => key } as any,
      { detectChanges: () => undefined } as ChangeDetectorRef
    );
  });

  it('tracks unsaved form changes', () => {
    component.ngOnInit();
    expect(component.hasUnsavedChanges()).toBeFalse();

    component.form.controls.settings.controls.showCart.setValue(false);
    component.form.controls.settings.controls.showCart.markAsDirty();

    expect(component.hasUnsavedChanges()).toBeTrue();
  });

  it('requires a valid path or URL for custom navigation links', () => {
    component.openCreateNavigation();
    component.navigationForm.patchValue({
      label: { en: 'Broken', ar: 'رابط' },
      linkType: 'custom',
      url: 'not-a-url'
    });

    component.saveNavigationItem();

    expect(component.navigationForm.invalid).toBeTrue();
    expect(component.navigationDialogVisible).toBeTrue();
  });

  it('rolls back action order when persistence fails', () => {
    component.config = {
      ...DEFAULT_HEADER_CONFIG,
      actions: [
        { id: 'a', label: { en: 'A', ar: 'أ' }, icon: 'a', url: '/a', openInNewTab: false, isEnabled: true, sortOrder: 1 },
        { id: 'b', label: { en: 'B', ar: 'ب' }, icon: 'b', url: '/b', openInNewTab: false, isEnabled: true, sortOrder: 2 }
      ]
    };
    (component as any).originalConfigSnapshot = (component as any).snapshotConfig(component.config);
    service.reorderActions.and.returnValue(throwError(() => new Error('failed')));

    component.moveAction(component.config.actions[0], 1);

    expect(component.config.actions.map((action) => action.id)).toEqual(['a', 'b']);
    expect(component.messageTone).toBe('error');
  });
});
