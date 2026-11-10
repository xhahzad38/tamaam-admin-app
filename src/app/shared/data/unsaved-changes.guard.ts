import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';

/** Implement on a page component to be asked before leaving with unsaved edits. */
export interface HasUnsavedChanges {
    hasUnsavedChanges(): boolean;
}

/** `canDeactivate: [unsavedChangesGuard]` — asks before navigating away from a dirty form. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
    if (!component?.hasUnsavedChanges?.()) {
        return true;
    }
    return inject(ConfirmService).ask({
        title: 'Discard changes?',
        message: 'You have unsaved changes on this page. Leave without saving?',
        acceptLabel: 'Discard changes',
        rejectLabel: 'Stay',
        danger: true
    });
};
