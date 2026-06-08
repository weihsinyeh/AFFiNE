import { streamGeminiChat } from '@affine/core/blocksuite/ai/runtime/request/gemini-direct';
import {
  DEFAULT_JOURNAL_MODEL_ID,
  GEMINI_API_KEY_STORAGE_KEY,
  GEMINI_JOURNAL_MODEL_STORAGE_KEY,
} from '@affine/core/modules/ai-button/services/models';
import { JournalService } from '@affine/core/modules/journal';
import { GlobalStateService } from '@affine/core/modules/storage';
import type { Store } from '@blocksuite/affine/store';
import { useLiveData, useService } from '@toeverything/infra';
import html2canvas from 'html2canvas';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 智慧AI提煉日記大綱（IG 分享工坊）— sidebar edition.
 * Moved here from the top of every journal doc; lives in the 5th sidebar
 * tab (replacing the old frame panel).
 */
export const EditorJournalAIPanel = ({ doc }: { doc: Store | null }) => {
  const globalState = useService(GlobalStateService).globalState;
  const journalService = useService(JournalService);
  const journalDateStr = useLiveData(
    journalService.journalDate$(doc?.id ?? '')
  );

  const [bgImage, setBgImage] = useState<string | null>(null);
  // AI 生成結果依文件暫存在瀏覽器 localStorage：重新整理／切換頁面後仍在，
  // 無痕模式關閉後自然消失
  const aiSummaryStorageKey = `JournalAISummary:${doc?.id ?? ''}`;
  const [aiSummary, setAiSummary] = useState<string[]>(
    () => globalState.get<string[]>(aiSummaryStorageKey) ?? []
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // 切換到別的文件時，載入該文件自己的暫存結果
  useEffect(() => {
    setAiSummary(globalState.get<string[]>(aiSummaryStorageKey) ?? []);
  }, [aiSummaryStorageKey, globalState]);

  const applyAiSummary = useCallback(
    (cards: string[]) => {
      setAiSummary(cards);
      globalState.set(aiSummaryStorageKey, cards);
    },
    [aiSummaryStorageKey, globalState]
  );

  // 💡 日記真實日期：優先用日記的日期標記，否則今天
  const getJournalTargetDate = useCallback(() => {
    if (journalDateStr) {
      const parsed = new Date(journalDateStr);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [journalDateStr]);

  const handleFetchAISummary = async () => {
    setIsGenerating(true);
    console.log('🚀 [IG分享工坊] 開始透過 Yjs 讀取全內文...');

    // 1. 直接從 BlockSuite 內存資料庫拉出最完整的全篇純文字
    let rawText = '';
    try {
      if (doc && typeof doc.getBlocksByFlavour === 'function') {
        const paragraphBlocks = doc.getBlocksByFlavour('affine:paragraph');
        const listBlocks = doc.getBlocksByFlavour('affine:list');
        rawText = [...paragraphBlocks, ...listBlocks]
          .map(block => block?.model?.text?.toString().trim() || '')
          .filter(t => t.length > 0)
          .join('\n');
      }
    } catch {
      console.warn('BlockSuite 內存提取失敗，自動切換至 DOM 備援濾鏡');
    }

    // 備援 DOM 擷取器
    if (!rawText) {
      const textElements = document.querySelectorAll(
        '[contenteditable="true"], .v-line, .v-text, p'
      );
      rawText = Array.from(textElements)
        .map(el => el.textContent || '')
        .map(t => t.trim())
        .filter(
          t =>
            !t.includes('affine-') &&
            !t.includes('分享工坊') &&
            !t.includes("Type '/'") &&
            t.length > 0
        )
        .join('\n');
    }

    if (!rawText || rawText.trim().length === 0) {
      setAiSummary([
        '📖 今天是個神祕的日子...',
        '✍️ 稍微在編輯器裡敲點字，就能一鍵生成專屬的 IG 限動大綱喔！',
      ]);
      setIsGenerating(false);
      return;
    }

    console.log('🎯 成功灌入 Gemini 的日記總文字：\n', rawText);

    // 2. 🚀 透過使用者的 Gemini API key 直連 Google，進行心情偵測與日記摘要
    try {
      const apiKey = globalState.get<string>(GEMINI_API_KEY_STORAGE_KEY);
      const journalModelId =
        globalState.get<string>(GEMINI_JOURNAL_MODEL_STORAGE_KEY) ??
        DEFAULT_JOURNAL_MODEL_ID;

      if (apiKey) {
        const aiPrompt = `你是一位精緻的生活雜誌資深編輯。請仔細閱讀以下日記內文，完成兩件事：
1. 「心情偵測」：用一句含 Emoji 的短句精準描述作者當天的整體心情（15 字以內）。
2. 「日記摘要」：用 1~2 句優雅流暢的話總結這篇日記的重點（50 字以內）。
另外再提煉 0~2 句適合放上 Instagram 限時動態的生活亮點短句。

【核心鐵律】
- 每一句都必須語意完整，嚴禁出現「...」或未完結的斷尾。
- 嚴格以標準 JSON 物件回傳，絕對不要包含任何 markdown 標籤（如 \`\`\`json）。格式範例：
{"mood":"😊 心情短句","summary":"日記摘要","highlights":["亮點一","亮點二"]}

日記內文如下：
${rawText}`;

        console.log(`🤖 正在用 ${journalModelId} 進行心情偵測與摘要提煉...`);
        let resultString = '';
        for await (const chunk of streamGeminiChat({
          apiKey,
          modelId: journalModelId,
          contents: [{ role: 'user', parts: [{ text: aiPrompt }] }],
        })) {
          resultString += chunk;
        }
        console.log('🤖 [Gemini 響應原始內容]：', resultString);

        const matchJson = resultString.match(/\{[\s\S]*\}/);
        if (matchJson) {
          const parsed = JSON.parse(matchJson[0]) as {
            mood?: string;
            summary?: string;
            highlights?: string[];
          };
          const cards = [
            parsed.mood,
            parsed.summary ? `📝 ${parsed.summary}` : undefined,
            ...(parsed.highlights ?? []).slice(0, 2),
          ].filter((card): card is string => !!card);
          if (cards.length > 0) {
            console.log('🎉 [Gemini 心情偵測＋摘要成功]', parsed);
            applyAiSummary(cards);
            setIsGenerating(false);
            return;
          }
        }
      } else {
        console.warn(
          '⚠️ 尚未設定 Gemini API key（Settings → General → API Key），改用本地備援分析'
        );
      }
    } catch (aiErr) {
      console.error('🛑 呼叫 Gemini API 失敗，改用本地備援分析:', aiErr);
    }

    // 3. 🛑 終極智慧安全備援防線（萬一官方大模型因連線或點數不足未回應時兜底，100%防死鎖）
    console.log('⚡ 啟動智慧備援代碼權鏡...');
    const textLower = rawText.toLowerCase();
    const allSentences = rawText
      .split(/[。\n!?]/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && !s.includes("Type '/'"));

    let scorePressure = 0;
    let scoreConfidence = 0;
    let scoreCoding = 0;
    if (
      textLower.includes('壓力') ||
      textLower.includes('悶') ||
      textLower.includes('累')
    )
      scorePressure += 2;
    if (
      textLower.includes('簡報') ||
      textLower.includes('presentation') ||
      textLower.includes('報告')
    )
      scorePressure += 1;
    if (
      textLower.includes('成功') ||
      textLower.includes('滿足') ||
      textLower.includes('信心') ||
      textLower.includes('好')
    )
      scoreConfidence += 2;
    if (
      textLower.includes('除錯') ||
      textLower.includes('debugging') ||
      textLower.includes('代碼') ||
      textLower.includes('code')
    )
      scoreCoding += 2;

    let detectedMood = '✨ 心情手札';
    if (scorePressure > scoreConfidence && scoreCoding > 0)
      detectedMood = '⏳ 頂著簡報壓力，在代碼裡激戰的一天';
    else if (scoreConfidence >= scorePressure && scoreCoding > 0)
      detectedMood = '💻 那些卡很久的 Bug 迎刃而解，信心點滿！';
    else if (scoreConfidence > scorePressure)
      detectedMood = '☀️ 內心感到格外充實與滿足的時刻';
    else if (scorePressure > 0)
      detectedMood = '☕ 稍微給疲憊的自己一個呼吸的留白';

    const dynamicSummary = [detectedMood];
    if (
      textLower.includes('資工') ||
      textLower.includes('csie') ||
      textLower.includes('台大') ||
      textLower.includes('ntu') ||
      textLower.includes('大氣')
    ) {
      dynamicSummary.push('📍 專注在學術作業與模型運行，跟複雜的系統硬碰硬');
    }
    if (textLower.includes('拉麵') || textLower.includes('公館')) {
      dynamicSummary.push('🍜 用一碗濃郁的拉麵犒賞今日的靈魂');
    } else if (textLower.includes('咖啡') || textLower.includes('美式')) {
      dynamicSummary.push('☕ 躲進安靜的咖啡廳，用冰美式沉澱繁雜思緒');
    }
    if (
      scoreConfidence > 0 &&
      (textLower.includes('投影片') ||
        textLower.includes('簡報') ||
        textLower.includes('報告'))
    ) {
      dynamicSummary.push('✨ 順利完成了小組報告投影片，信心滿滿迎接挑戰');
    }

    if (dynamicSummary.length === 1 && allSentences.length > 0) {
      const longestSentence = [...allSentences].sort(
        (a, b) => b.length - a.length
      )[0];
      const subStr = longestSentence.slice(0, 25);
      const lastComma = Math.max(
        subStr.lastIndexOf('，'),
        subStr.lastIndexOf('、')
      );
      const cleanSentence =
        lastComma > 5
          ? longestSentence.slice(0, lastComma)
          : longestSentence.slice(0, 24);
      dynamicSummary.push(`📌 ${cleanSentence}`);
    }

    applyAiSummary(dynamicSummary);
    setIsGenerating(false);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBgImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadForIG = async () => {
    if (!shareCardRef.current) return;
    const canvas = await html2canvas(shareCardRef.current, {
      useCORS: true,
      scale: 2,
    });
    const dataUrl = canvas.toDataURL('image/png');
    const targetDate = getJournalTargetDate();
    const localDateStr = targetDate
      .toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })
      .replace(/\//g, '-');

    const link = document.createElement('a');
    link.download = `AFFiNE-Journal-${localDateStr}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div
      className="ig-share-panel"
      data-testid="journal-ai-panel"
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <h4 style={{ margin: 0, color: '#E1306C', alignSelf: 'flex-start' }}>
        ✨ Instagram Story 分享工坊
      </h4>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignSelf: 'flex-start',
        }}
      >
        <button
          onClick={() => {
            handleFetchAISummary().catch(console.error);
          }}
          disabled={isGenerating}
          style={{
            padding: '8px 12px',
            background: '#0071e3',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {isGenerating
            ? 'Gemini 正在全篇語意提煉中...'
            : '🤖 智慧 AI 提煉日記大綱'}
        </button>

        <label
          style={{
            padding: '8px 12px',
            background: '#e8e8ed',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#1d1d1f',
          }}
        >
          📸 丟入 IG 背景照片
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </label>

        {aiSummary.length > 0 && (
          <button
            onClick={() => {
              handleDownloadForIG().catch(console.error);
            }}
            style={{
              padding: '8px 12px',
              background: '#E1306C',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            🚀 點我下載 IG 限動圖片
          </button>
        )}
      </div>

      {/* 🔮 IG 預覽卡片 */}
      {aiSummary.length > 0 && (
        <div
          ref={shareCardRef}
          style={{
            width: '315px',
            height: '560px',
            backgroundColor: bgImage ? 'transparent' : '#ffffff',
            backgroundImage: bgImage ? `url(${bgImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '45px 30px 40px 30px',
            color: '#1d1d1f',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          }}
        >
          {bgImage && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.4)',
                zIndex: 1,
              }}
            />
          )}

          {/* 🔝 上半部：標題區塊 */}
          <div style={{ zIndex: 2, textAlign: 'center', width: '100%' }}>
            <p
              style={{
                letterSpacing: '4px',
                fontSize: '11px',
                opacity: 0.8,
                margin: '0 0 5px 0',
                color: bgImage ? '#ffffff' : '#666',
                textShadow: bgImage ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              DAILY LOG
            </p>
            <h2
              style={{
                fontSize: '18px',
                margin: '0 0 25px 0',
                fontWeight: 600,
                color: bgImage ? '#ffffff' : '#111111',
                textShadow: bgImage ? '0 1px 3px rgba(0,0,0,0.6)' : 'none',
              }}
            >
              {getJournalTargetDate().toLocaleDateString('zh-TW', {
                timeZone: 'Asia/Taipei',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h2>
          </div>

          {/* 📂 中半部：明亮系珍珠白磨砂格子群組 */}
          <div
            style={{
              zIndex: 2,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '100%',
              flexGrow: 1,
              justifyContent: 'center',
            }}
          >
            {aiSummary.map((bullet, index) => (
              <div
                key={index}
                style={{
                  fontSize: aiSummary.length <= 2 ? '15px' : '14px',
                  lineHeight: '1.6',
                  background: bgImage
                    ? 'rgba(255, 255, 255, 0.78)'
                    : 'rgba(0, 0, 0, 0.03)',
                  backdropFilter: bgImage
                    ? 'blur(12px) saturate(140%)'
                    : 'none',
                  color: '#1d1d1f',
                  padding: aiSummary.length <= 2 ? '16px 20px' : '12px 16px',
                  borderRadius: '10px',
                  border: bgImage
                    ? '1px solid rgba(255, 255, 255, 0.4)'
                    : '1px solid rgba(0, 0, 0, 0.05)',
                  fontWeight: index === 0 ? 600 : 400,
                  letterSpacing: '0.5px',
                  boxShadow: bgImage
                    ? '0 8px 24px rgba(0, 0, 0, 0.06)'
                    : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {bullet}
              </div>
            ))}
          </div>

          {/* 🎨 下半部：設計師生活金句簽名 */}
          <div
            style={{
              zIndex: 2,
              textAlign: 'center',
              width: '100%',
              marginTop: '20px',
            }}
          >
            {aiSummary.length <= 2 && (
              <p
                style={{
                  fontSize: '11px',
                  fontStyle: 'italic',
                  color: bgImage
                    ? 'rgba(255, 255, 255, 0.85)'
                    : 'rgba(0, 0, 0, 0.6)',
                  textShadow: bgImage ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none',
                  margin: '0 0 25px 0',
                  letterSpacing: '1px',
                }}
              >
                “ 將當下的思緒，釀成明天的勇氣 ”
              </p>
            )}
            <p
              style={{
                fontSize: '10px',
                color: bgImage
                  ? 'rgba(255, 255, 255, 0.5)'
                  : 'rgba(0, 0, 0, 0.5)',
                textShadow: bgImage ? '0 1px 1px rgba(0, 0, 0, 0.4)' : 'none',
                letterSpacing: '2px',
                margin: 0,
              }}
            >
              via I²-Note Journal
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
