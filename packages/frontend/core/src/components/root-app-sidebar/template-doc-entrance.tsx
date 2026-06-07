import { MenuItem as SidebarMenuItem } from '@affine/core/modules/app-sidebar/views';
import { useI18n } from '@affine/i18n';
import { TemplateIcon } from '@blocksuite/icons/rc';
import { useCallback, useState } from 'react';

import { JournalTemplateManagerDialog } from './journal-template-manager';

/**
 * Sidebar "Template" entry — opens the journal template manager where the
 * built-in journal templates (學習/旅遊/美食/心情) can be edited and new
 * ones added.
 */
export const TemplateDocEntrance = () => {
  const t = useI18n();
  const [open, setOpen] = useState(false);

  const openManager = useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <>
      <SidebarMenuItem
        data-testid="sidebar-template-doc-entrance"
        icon={<TemplateIcon />}
        onClick={openManager}
      >
        <span>{t['Template']()}</span>
      </SidebarMenuItem>
      <JournalTemplateManagerDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
