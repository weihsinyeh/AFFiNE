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
  DEFAULT_DOC_AI_MODEL_ID,
  DEFAULT_JOURNAL_MODEL_ID,
  DEFAULT_RECOMMEND_CITY,
  DEFAULT_RECOMMEND_DISTRICT,
  DEFAULT_RECOMMEND_MODEL_ID,
  FOOD_RECOMMEND_CITY_KEY,
  FOOD_RECOMMEND_DISTRICT_KEY,
  GEMINI_API_KEY_STORAGE_KEY,
  GEMINI_DOC_AI_MODEL_STORAGE_KEY,
  GEMINI_JOURNAL_MODEL_STORAGE_KEY,
  GEMINI_MODELS,
  GEMINI_RECOMMEND_MODEL_STORAGE_KEY,
  TAIWAN_CITIES,
  TRAVEL_RECOMMEND_CITY_KEY,
  TRAVEL_RECOMMEND_DISTRICT_KEY,
} from '@affine/core/modules/ai-button/services/models';
import { GlobalStateService } from '@affine/core/modules/storage';
import { useService } from '@toeverything/infra';
import { useCallback, useState } from 'react';

const GeminiModelSetting = ({
  name,
  desc,
  storageKey,
  defaultModelId,
  testIdPrefix,
}: {
  name: string;
  desc: string;
  storageKey: string;
  defaultModelId: string;
  testIdPrefix: string;
}) => {
  const globalState = useService(GlobalStateService).globalState;
  const [modelId, setModelId] = useState(
    () => globalState.get<string>(storageKey) ?? defaultModelId
  );

  const handleSelect = useCallback(
    (id: string) => {
      globalState.set(storageKey, id);
      setModelId(id);
    },
    [globalState, storageKey]
  );

  const current =
    GEMINI_MODELS.find(model => model.id === modelId) ??
    GEMINI_MODELS.find(model => model.id === defaultModelId);

  return (
    <SettingRow name={name} desc={desc} data-testid={`${testIdPrefix}-row`}>
      <Menu
        items={GEMINI_MODELS.map(model => (
          <MenuItem
            key={model.id}
            selected={model.id === modelId}
            onSelect={() => handleSelect(model.id)}
            data-testid={`${testIdPrefix}-${model.id}`}
          >
            {model.name}
          </MenuItem>
        ))}
        contentOptions={{ align: 'end' }}
      >
        <MenuTrigger
          style={{ width: 220 }}
          data-testid={`${testIdPrefix}-trigger`}
        >
          {current?.name ?? modelId}
        </MenuTrigger>
      </Menu>
    </SettingRow>
  );
};

const LocationSetting = ({
  name,
  desc,
  cityKey,
  districtKey,
  testIdPrefix,
}: {
  name: string;
  desc: string;
  cityKey: string;
  districtKey: string;
  testIdPrefix: string;
}) => {
  const globalState = useService(GlobalStateService).globalState;
  const [city, setCity] = useState(
    () => globalState.get<string>(cityKey) ?? DEFAULT_RECOMMEND_CITY
  );
  const [district, setDistrict] = useState(
    () => globalState.get<string>(districtKey) ?? DEFAULT_RECOMMEND_DISTRICT
  );

  const handleCitySelect = useCallback(
    (value: string) => {
      globalState.set(cityKey, value);
      setCity(value);
    },
    [globalState, cityKey]
  );

  const handleDistrictChange = useCallback(
    (value: string) => {
      setDistrict(value);
      globalState.set(districtKey, value.trim() || undefined);
    },
    [globalState, districtKey]
  );

  return (
    <SettingRow name={name} desc={desc} data-testid={`${testIdPrefix}-row`}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Menu
          items={TAIWAN_CITIES.map(item => (
            <MenuItem
              key={item}
              selected={item === city}
              onSelect={() => handleCitySelect(item)}
              data-testid={`${testIdPrefix}-city-${item}`}
            >
              {item}
            </MenuItem>
          ))}
          contentOptions={{
            align: 'end',
            style: { maxHeight: 360, overflowY: 'auto' },
          }}
        >
          <MenuTrigger
            style={{ width: 110 }}
            data-testid={`${testIdPrefix}-city-trigger`}
          >
            {city}
          </MenuTrigger>
        </Menu>
        <Input
          value={district}
          onChange={handleDistrictChange}
          placeholder="區域，如：大安區"
          style={{ width: 120 }}
          data-testid={`${testIdPrefix}-district-input`}
        />
      </div>
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
        <GeminiModelSetting
          name="智慧AI提煉大綱使用模型"
          desc="日記的 AI 摘要與心情偵測會使用這個 Gemini 模型。"
          storageKey={GEMINI_JOURNAL_MODEL_STORAGE_KEY}
          defaultModelId={DEFAULT_JOURNAL_MODEL_ID}
          testIdPrefix="journal-model"
        />
        <GeminiModelSetting
          name="日記內/ai使用模型"
          desc="在文件中輸入 /ai（Ask AI、摘要、續寫等）會使用這個 Gemini 模型。"
          storageKey={GEMINI_DOC_AI_MODEL_STORAGE_KEY}
          defaultModelId={DEFAULT_DOC_AI_MODEL_ID}
          testIdPrefix="doc-ai-model"
        />
        <GeminiModelSetting
          name="AI智慧推薦使用模型"
          desc="日記「AI智慧推薦」（隨機推薦旅遊行程與美食）會使用這個 Gemini 模型。"
          storageKey={GEMINI_RECOMMEND_MODEL_STORAGE_KEY}
          defaultModelId={DEFAULT_RECOMMEND_MODEL_ID}
          testIdPrefix="recommend-model"
        />
        <LocationSetting
          name="旅遊推薦地區"
          desc="AI智慧推薦旅遊行程時鎖定的縣市與區域。"
          cityKey={TRAVEL_RECOMMEND_CITY_KEY}
          districtKey={TRAVEL_RECOMMEND_DISTRICT_KEY}
          testIdPrefix="travel-location"
        />
        <LocationSetting
          name="美食推薦地區"
          desc="AI智慧推薦美食時鎖定的縣市與區域。"
          cityKey={FOOD_RECOMMEND_CITY_KEY}
          districtKey={FOOD_RECOMMEND_DISTRICT_KEY}
          testIdPrefix="food-location"
        />
      </SettingWrapper>
    </>
  );
};
