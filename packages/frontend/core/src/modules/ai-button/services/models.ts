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

/**
 * Districts per city for the recommendation location dropdowns.
 * Cities not listed here fall back to a free-text district input.
 */
export const TAIWAN_DISTRICTS: Record<string, string[]> = {
  台北市: [
    '中正區',
    '大同區',
    '中山區',
    '松山區',
    '大安區',
    '萬華區',
    '信義區',
    '士林區',
    '北投區',
    '內湖區',
    '南港區',
    '文山區',
  ],
  新北市: [
    '板橋區',
    '三重區',
    '中和區',
    '永和區',
    '新莊區',
    '新店區',
    '土城區',
    '蘆洲區',
    '樹林區',
    '汐止區',
    '鶯歌區',
    '三峽區',
    '淡水區',
    '瑞芳區',
    '五股區',
    '泰山區',
    '林口區',
    '深坑區',
    '石碇區',
    '坪林區',
    '三芝區',
    '石門區',
    '八里區',
    '平溪區',
    '雙溪區',
    '貢寮區',
    '金山區',
    '萬里區',
    '烏來區',
  ],
  基隆市: [
    '仁愛區',
    '信義區',
    '中正區',
    '中山區',
    '安樂區',
    '暖暖區',
    '七堵區',
  ],
  桃園市: [
    '桃園區',
    '中壢區',
    '平鎮區',
    '八德區',
    '楊梅區',
    '蘆竹區',
    '大溪區',
    '龍潭區',
    '龜山區',
    '大園區',
    '觀音區',
    '新屋區',
    '復興區',
  ],
  新竹市: ['東區', '北區', '香山區'],
  新竹縣: [
    '竹北市',
    '竹東鎮',
    '新埔鎮',
    '關西鎮',
    '湖口鄉',
    '新豐鄉',
    '芎林鄉',
    '橫山鄉',
    '北埔鄉',
    '寶山鄉',
    '峨眉鄉',
    '尖石鄉',
    '五峰鄉',
  ],
  苗栗縣: [
    '苗栗市',
    '頭份市',
    '竹南鎮',
    '後龍鎮',
    '通霄鎮',
    '苑裡鎮',
    '卓蘭鎮',
    '造橋鄉',
    '西湖鄉',
    '頭屋鄉',
    '公館鄉',
    '銅鑼鄉',
    '三義鄉',
    '大湖鄉',
    '獅潭鄉',
    '泰安鄉',
    '南庄鄉',
    '三灣鄉',
  ],
  台中市: [
    '中區',
    '東區',
    '南區',
    '西區',
    '北區',
    '北屯區',
    '西屯區',
    '南屯區',
    '太平區',
    '大里區',
    '霧峰區',
    '烏日區',
    '豐原區',
    '后里區',
    '石岡區',
    '東勢區',
    '和平區',
    '新社區',
    '潭子區',
    '大雅區',
    '神岡區',
    '大肚區',
    '沙鹿區',
    '龍井區',
    '梧棲區',
    '清水區',
    '大甲區',
    '外埔區',
    '大安區',
  ],
  彰化縣: [
    '彰化市',
    '員林市',
    '鹿港鎮',
    '和美鎮',
    '北斗鎮',
    '溪湖鎮',
    '田中鎮',
    '二林鎮',
    '線西鄉',
    '伸港鄉',
    '福興鄉',
    '秀水鄉',
    '花壇鄉',
    '芬園鄉',
    '大村鄉',
    '埔鹽鄉',
    '埔心鄉',
    '永靖鄉',
    '社頭鄉',
    '二水鄉',
    '田尾鄉',
    '埤頭鄉',
    '芳苑鄉',
    '大城鄉',
    '竹塘鄉',
    '溪州鄉',
  ],
  南投縣: [
    '南投市',
    '埔里鎮',
    '草屯鎮',
    '竹山鎮',
    '集集鎮',
    '名間鄉',
    '鹿谷鄉',
    '中寮鄉',
    '魚池鄉',
    '國姓鄉',
    '水里鄉',
    '信義鄉',
    '仁愛鄉',
  ],
  雲林縣: [
    '斗六市',
    '斗南鎮',
    '虎尾鎮',
    '西螺鎮',
    '土庫鎮',
    '北港鎮',
    '古坑鄉',
    '大埤鄉',
    '莿桐鄉',
    '林內鄉',
    '二崙鄉',
    '崙背鄉',
    '麥寮鄉',
    '東勢鄉',
    '褒忠鄉',
    '台西鄉',
    '元長鄉',
    '四湖鄉',
    '口湖鄉',
    '水林鄉',
  ],
  嘉義市: ['東區', '西區'],
  嘉義縣: [
    '太保市',
    '朴子市',
    '布袋鎮',
    '大林鎮',
    '民雄鄉',
    '溪口鄉',
    '新港鄉',
    '六腳鄉',
    '東石鄉',
    '義竹鄉',
    '鹿草鄉',
    '水上鄉',
    '中埔鄉',
    '竹崎鄉',
    '梅山鄉',
    '番路鄉',
    '大埔鄉',
    '阿里山鄉',
  ],
  台南市: [
    '中西區',
    '東區',
    '南區',
    '北區',
    '安平區',
    '安南區',
    '永康區',
    '歸仁區',
    '新化區',
    '左鎮區',
    '玉井區',
    '楠西區',
    '南化區',
    '仁德區',
    '關廟區',
    '龍崎區',
    '官田區',
    '麻豆區',
    '佳里區',
    '西港區',
    '七股區',
    '將軍區',
    '學甲區',
    '北門區',
    '新營區',
    '後壁區',
    '白河區',
    '東山區',
    '六甲區',
    '下營區',
    '柳營區',
    '鹽水區',
    '善化區',
    '大內區',
    '山上區',
    '新市區',
    '安定區',
  ],
};

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
