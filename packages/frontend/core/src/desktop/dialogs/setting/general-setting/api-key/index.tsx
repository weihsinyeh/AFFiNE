import {
  Button,
  Input,
  Menu,
  MenuItem,
  MenuTrigger,
  notify,
} from '@affine/component';
import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import {
  DEFAULT_JOURNAL_MODEL_ID,
  GEMINI_API_KEY_STORAGE_KEY,
  GEMINI_JOURNAL_MODEL_STORAGE_KEY,
  GEMINI_MODELS,
} from '@affine/core/modules/ai-button/services/models';
import { GlobalStateService } from '@affine/core/modules/storage';
import { useService } from '@toeverything/infra';
import { useCallback, useState } from 'react';

const JournalModelSetting = () => {
  const globalState = useService(GlobalStateService).globalState;
  const [modelId, setModelId] = useState(
    () =>
      globalState.get<string>(GEMINI_JOURNAL_MODEL_STORAGE_KEY) ??
      DEFAULT_JOURNAL_MODEL_ID
  );

  const handleSelect = useCallback(
    (id: string) => {
      globalState.set(GEMINI_JOURNAL_MODEL_STORAGE_KEY, id);
      setModelId(id);
    },
    [globalState]
  );

  const current =
    GEMINI_MODELS.find(model => model.id === modelId) ??
    GEMINI_MODELS.find(model => model.id === DEFAULT_JOURNAL_MODEL_ID);

  return (
    <SettingRow
      name="智慧AI提煉大綱使用模型"
      desc="日記的 AI 摘要與心情偵測會使用這個 Gemini 模型。"
      data-testid="journal-model-row"
    >
      <Menu
        items={GEMINI_MODELS.map(model => (
          <MenuItem
            key={model.id}
            selected={model.id === modelId}
            onSelect={() => handleSelect(model.id)}
            data-testid={`journal-model-${model.id}`}
          >
            {model.name}
          </MenuItem>
        ))}
        contentOptions={{ align: 'end' }}
      >
        <MenuTrigger style={{ width: 220 }} data-testid="journal-model-trigger">
          {current?.name ?? modelId}
        </MenuTrigger>
      </Menu>
    </SettingRow>
  );
};

export const ApiKeySettings = () => {
  const globalState = useService(GlobalStateService).globalState;
  const [apiKey, setApiKey] = useState(
    () => globalState.get<string>(GEMINI_API_KEY_STORAGE_KEY) ?? ''
  );
  const [savedKey, setSavedKey] = useState(apiKey);

  const handleSave = useCallback(() => {
    const trimmed = apiKey.trim();
    globalState.set(GEMINI_API_KEY_STORAGE_KEY, trimmed || undefined);
    setSavedKey(trimmed);
    notify.success({
      title: trimmed ? 'API key saved' : 'API key removed',
      message: trimmed
        ? 'Gemini models can now use your API key.'
        : 'Your Gemini API key has been cleared.',
    });
  }, [apiKey, globalState]);

  const dirty = apiKey.trim() !== savedKey;

  return (
    <>
      <SettingHeader
        title="API Key"
        subtitle="Bring your own API key to chat with AI models."
        data-testid="api-key-title"
      />
      <SettingWrapper title="Google Gemini">
        <SettingRow
          name="Gemini API key"
          desc="Get a free key at aistudio.google.com/app/apikey. The key is stored locally in this browser only."
          spreadCol={false}
        >
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={setApiKey}
              onEnter={handleSave}
              data-testid="gemini-api-key-input"
              style={{ flex: 1 }}
            />
            <Button
              variant="primary"
              disabled={!dirty}
              onClick={handleSave}
              data-testid="gemini-api-key-save"
            >
              Save
            </Button>
          </div>
        </SettingRow>
        <JournalModelSetting />
      </SettingWrapper>
    </>
  );
};
