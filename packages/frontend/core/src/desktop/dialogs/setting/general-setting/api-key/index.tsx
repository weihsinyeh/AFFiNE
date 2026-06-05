import { Button, Input, notify } from '@affine/component';
import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { GEMINI_API_KEY_STORAGE_KEY } from '@affine/core/modules/ai-button/services/models';
import { GlobalStateService } from '@affine/core/modules/storage';
import { useService } from '@toeverything/infra';
import { useCallback, useState } from 'react';

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
      </SettingWrapper>
    </>
  );
};
