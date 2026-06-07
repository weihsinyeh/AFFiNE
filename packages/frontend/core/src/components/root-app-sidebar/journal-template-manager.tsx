import { Button, IconButton, Modal, notify } from '@affine/component';
import {
  DEFAULT_JOURNAL_TEMPLATES,
  JOURNAL_TEMPLATES_STORAGE_KEY,
  type StoredJournalTemplate,
} from '@affine/core/blocksuite/block-suite-editor/journal-templates';
import { GlobalStateService } from '@affine/core/modules/storage';
import { DeleteIcon } from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
import { useCallback, useEffect, useState } from 'react';

import * as styles from './journal-template-manager.css';

/**
 * Manager for the journal templates shown on every journal doc (the bar
 * below the Info table). Edit labels/content, delete templates or add new
 * ones; saved to GlobalState so the bar updates immediately.
 */
export const JournalTemplateManagerDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const globalState = useService(GlobalStateService).globalState;
  const [templates, setTemplates] = useState<StoredJournalTemplate[]>([]);

  // (re)load from storage every time the dialog opens
  useEffect(() => {
    if (open) {
      setTemplates(
        globalState.get<StoredJournalTemplate[]>(
          JOURNAL_TEMPLATES_STORAGE_KEY
        ) ?? DEFAULT_JOURNAL_TEMPLATES
      );
    }
  }, [open, globalState]);

  const updateTemplate = useCallback(
    (id: string, patch: Partial<StoredJournalTemplate>) => {
      setTemplates(prev =>
        prev.map(item => (item.id === id ? { ...item, ...patch } : item))
      );
    },
    []
  );

  const removeTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(item => item.id !== id));
  }, []);

  const addTemplate = useCallback(() => {
    setTemplates(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        label: '🆕 新模板',
        content: '# 🆕 新模板\n第一行內容：\n',
      },
    ]);
  }, []);

  const handleSave = useCallback(() => {
    const cleaned = templates
      .map(item => ({ ...item, label: item.label.trim() }))
      .filter(item => item.label.length > 0);
    globalState.set(JOURNAL_TEMPLATES_STORAGE_KEY, cleaned);
    notify.success({
      title: '模板已儲存',
      message: '日記頁面的模板列已同步更新。',
    });
    onOpenChange(false);
  }, [templates, globalState, onOpenChange]);

  const handleReset = useCallback(() => {
    setTemplates(DEFAULT_JOURNAL_TEMPLATES);
  }, []);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="管理日記模板"
      width={560}
    >
      <div className={styles.body} data-testid="journal-template-manager">
        <div className={styles.hint}>
          每行一個區塊：<code># 大標題</code>、<code>## 小標題</code>、
          <code>- 圓點</code>、<code>[] 待辦方框</code>，其他文字為一般段落，
          空行會留白。
        </div>
        {templates.map(template => (
          <div key={template.id} className={styles.templateCard}>
            <div className={styles.cardHeader}>
              <input
                className={styles.labelInput}
                value={template.label}
                onChange={e =>
                  updateTemplate(template.id, { label: e.target.value })
                }
                placeholder="模板名稱（會顯示在按鈕上）"
                data-testid={`template-label-${template.id}`}
              />
              <IconButton
                aria-label="刪除模板"
                onClick={() => removeTemplate(template.id)}
                data-testid={`template-delete-${template.id}`}
              >
                <DeleteIcon />
              </IconButton>
            </div>
            <textarea
              className={styles.contentTextarea}
              value={template.content}
              onChange={e =>
                updateTemplate(template.id, { content: e.target.value })
              }
              data-testid={`template-content-${template.id}`}
            />
          </div>
        ))}
        <Button onClick={addTemplate} data-testid="template-add">
          ＋ 新增模板
        </Button>
      </div>
      <div className={styles.footer}>
        <Button variant="plain" onClick={handleReset}>
          恢復預設四個模板
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          data-testid="template-save"
        >
          儲存
        </Button>
      </div>
    </Modal>
  );
};
