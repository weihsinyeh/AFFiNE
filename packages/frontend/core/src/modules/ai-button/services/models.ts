import { getPromptModelsQuery, SubscriptionStatus } from '@affine/graphql';
import {
  createSignalFromObservable,
  type Signal,
} from '@blocksuite/affine/shared/utils';
import { signal } from '@preact/signals-core';
import { LiveData, Service } from '@toeverything/infra';

import type { GraphQLService, SubscriptionService } from '../../cloud';
import type { GlobalStateService } from '../../storage';

const AI_MODEL_ID_KEY = 'AIModelId';

export const GEMINI_API_KEY_STORAGE_KEY = 'GeminiApiKey';

/**
 * The Gemini model used by the journal "智慧AI提煉大綱" feature
 * (mood detection + summary), configurable in Settings -> General -> API Key.
 */
export const GEMINI_JOURNAL_MODEL_STORAGE_KEY = 'GeminiJournalModelId';

export const DEFAULT_JOURNAL_MODEL_ID = 'gemini-2.5-flash';

/**
 * The Gemini model used by in-doc "/ai" actions (Ask AI, summarize,
 * continue writing, ...), configurable in Settings -> General -> API Key.
 */
export const GEMINI_DOC_AI_MODEL_STORAGE_KEY = 'GeminiDocAiModelId';

export const DEFAULT_DOC_AI_MODEL_ID = 'gemini-2.5-flash';

/**
 * "AI智慧推薦" (random travel/food diary recommendations on empty
 * journals): model + preferred locations, configurable in
 * Settings -> General -> API Key.
 */
export const GEMINI_RECOMMEND_MODEL_STORAGE_KEY = 'GeminiRecommendModelId';

export const DEFAULT_RECOMMEND_MODEL_ID = 'gemini-2.5-flash';

export const TRAVEL_RECOMMEND_CITY_KEY = 'AIRecommendTravelCity';
export const TRAVEL_RECOMMEND_DISTRICT_KEY = 'AIRecommendTravelDistrict';
export const FOOD_RECOMMEND_CITY_KEY = 'AIRecommendFoodCity';
export const FOOD_RECOMMEND_DISTRICT_KEY = 'AIRecommendFoodDistrict';
export const DEFAULT_RECOMMEND_CITY = '台北市';
export const DEFAULT_RECOMMEND_DISTRICT = '大安區';

export const TAIWAN_CITIES = [
  '台北市',
  '新北市',
  '基隆市',
  '桃園市',
  '新竹市',
  '新竹縣',
  '苗栗縣',
  '台中市',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義市',
  '嘉義縣',
  '台南市',
  '高雄市',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '台東縣',
  '澎湖縣',
  '金門縣',
  '連江縣',
];

export interface AIModel {
  name: string;
  id: string;
  version: string;
  category: string;
  isPro: boolean;
  isDefault: boolean;
}

/**
 * Google Gemini models available with a user-provided API key
 * (set in Settings -> General -> API Key). Always listed in the model
 * selector, even when the AFFiNE backend is unreachable.
 */
export const GEMINI_MODELS: AIModel[] = [
  {
    name: 'Gemini 3 Pro',
    id: 'gemini-3-pro-preview',
    version: '3 Pro',
    category: 'Gemini',
    isPro: false,
    isDefault: false,
  },
  {
    name: 'Gemini 3 Flash',
    id: 'gemini-3-flash-preview',
    version: '3 Flash',
    category: 'Gemini',
    isPro: false,
    isDefault: false,
  },
  {
    name: 'Gemini 2.5 Pro',
    id: 'gemini-2.5-pro',
    version: '2.5 Pro',
    category: 'Gemini',
    isPro: false,
    isDefault: false,
  },
  {
    name: 'Gemini 2.5 Flash',
    id: 'gemini-2.5-flash',
    version: '2.5 Flash',
    category: 'Gemini',
    isPro: false,
    isDefault: true,
  },
  {
    name: 'Gemini 2.5 Flash-Lite',
    id: 'gemini-2.5-flash-lite',
    version: '2.5 Flash-Lite',
    category: 'Gemini',
    isPro: false,
    isDefault: false,
  },
  {
    name: 'Gemini 2.0 Flash',
    id: 'gemini-2.0-flash',
    version: '2.0 Flash',
    category: 'Gemini',
    isPro: false,
    isDefault: false,
  },
];

export class AIModelService extends Service {
  modelId: Signal<string | undefined>;

  models: Signal<AIModel[]> = signal([]);

  private readonly modelId$ = LiveData.from(
    this.globalStateService.globalState.watch<string>(AI_MODEL_ID_KEY),
    undefined
  );

  constructor(
    private readonly globalStateService: GlobalStateService,
    private readonly gqlService: GraphQLService,
    private readonly subscriptionService: SubscriptionService
  ) {
    super();

    const { signal: modelId, cleanup } = createSignalFromObservable<
      string | undefined
    >(this.modelId$, undefined);
    this.modelId = modelId;
    this.disposables.push(cleanup);

    this.init().catch(err => {
      console.error(err);
    });
  }

  resetModel = () => {
    this.globalStateService.globalState.set(AI_MODEL_ID_KEY, undefined);
  };

  setModel = (modelId: string) => {
    const isSubscribed =
      this.subscriptionService.subscription.ai$.value?.status ===
      SubscriptionStatus.Active;
    const model = this.models.value.find(model => model.id === modelId);
    if (!isSubscribed && model?.isPro) {
      return;
    }
    this.globalStateService.globalState.set(AI_MODEL_ID_KEY, modelId);
  };

  private readonly init = async () => {
    await this.initModels();

    // subscribe to ai purchase status
    const sub = this.subscriptionService.subscription.ai$.subscribe(
      subscription => {
        const isSubscribed = subscription?.status === SubscriptionStatus.Active;
        const model = this.models.value.find(
          model => model.id === this.modelId.value
        );
        if (!isSubscribed && model?.isPro) {
          this.resetModel();
        }
      }
    );
    this.disposables.push(() => sub.unsubscribe());
  };

  /**
   * The model that will actually serve the next request: the explicitly
   * selected model if it exists, otherwise the default model. The selector
   * UI displays the default without persisting a selection, so senders
   * should use this instead of `modelId` directly.
   */
  get effectiveModelId(): string | undefined {
    const modelId = this.modelId.value;
    const models = this.models.value;
    const active = models.find(model => model.id === modelId);
    const fallback = models.find(model => model.isDefault);
    return (active ?? fallback)?.id ?? modelId;
  }

  /**
   * The user-provided Google Gemini API key, managed in
   * Settings -> General -> API Key.
   */
  get geminiApiKey(): string | undefined {
    return this.globalStateService.globalState.get<string>(
      GEMINI_API_KEY_STORAGE_KEY
    );
  }

  setGeminiApiKey = (apiKey: string | undefined) => {
    this.globalStateService.globalState.set(
      GEMINI_API_KEY_STORAGE_KEY,
      apiKey || undefined
    );
  };

  private readonly initModels = async (prompt?: string) => {
    // Gemini models are always available (BYO API key), even when the
    // AFFiNE backend is unreachable.
    this.models.value = GEMINI_MODELS;

    const promptName = prompt || 'Chat With AFFiNE AI';
    const models = await this.getModelsByPrompt(promptName).catch(() => null);
    if (models) {
      const { defaultModel, optionalModels, proModels } = models;
      const backendModels = optionalModels.map(model => {
        const [category] = model.name.split(' ');
        const version = model.name.slice(category.length + 1);
        return {
          name: model.name,
          id: model.id,
          version,
          category,
          isPro: proModels.some(proModel => proModel.id === model.id),
          isDefault: model.id === defaultModel,
        };
      });
      // the backend provides its own default model, so demote the
      // built-in Gemini default to avoid two defaults
      this.models.value = [
        ...backendModels,
        ...GEMINI_MODELS.map(model => ({ ...model, isDefault: false })),
      ];
    }
  };

  private readonly getModelsByPrompt = async (promptName: string) => {
    return this.gqlService
      .gql({
        query: getPromptModelsQuery,
        variables: { promptName },
      })
      .then(res => res.currentUser?.copilot?.models);
  };
}
