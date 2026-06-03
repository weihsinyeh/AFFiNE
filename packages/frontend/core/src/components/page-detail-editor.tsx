import './page-detail-editor.css';

import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';

import type { AffineEditorContainer } from '../blocksuite/block-suite-editor';
import { BlockSuiteEditor } from '../blocksuite/block-suite-editor';
import { DocService } from '../modules/doc';
import { EditorService } from '../modules/editor';
import { EditorSettingService } from '../modules/editor-setting';
import * as styles from './page-detail-editor.css';

declare global {
  // oxlint-disable-next-line no-var
  var currentEditor: AffineEditorContainer | undefined;
}

export type OnLoadEditor = (
  editor: AffineEditorContainer
) => (() => void) | void;

export interface PageDetailEditorProps {
  onLoad?: OnLoadEditor;
  readonly?: boolean;
}

type DocMetaWithHeaderImage = {
  headerImage?: string;
  title?: string;
};

export const PageDetailEditor = ({
  onLoad,
  readonly,
}: PageDetailEditorProps) => {
  const editor = useService(EditorService).editor; 
  const mode = useLiveData(editor.mode$);
  const defaultOpenProperty = useLiveData(editor.defaultOpenProperty$);

  const doc = useService(DocService).doc;
  const docMeta = useLiveData(doc.meta$) as DocMetaWithHeaderImage | null;
  const pageWidth = useLiveData(doc.properties$.selector(p => p.pageWidth));

  const isSharedMode = editor.isSharedMode;
  const editorSetting = useService(EditorSettingService).editorSetting;
  const settings = useLiveData(
    editorSetting.settings$.selector(s => ({
      fontFamily: s.fontFamily,
      customFontFamily: s.customFontFamily,
      fullWidthLayout: s.fullWidthLayout,
    }))
  );
  const fullWidthLayout = pageWidth
    ? pageWidth === 'fullWidth'
    : settings.fullWidthLayout;

  // =================================================================
  // 📸 狀態與函式注入區（Demo 降維打擊完全體）
  // =================================================================
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // 💡 【Demo 專屬劇本欄位】
  // 萬一登入卡死、進不去 Journal 肚子裡時，直接在這裡輸入日記，Gemini 照樣完美抓取！
  const [demoInputText, setDemoInputText] = useState<string>(
    "今天下午大氣科學的數值模擬作業終於跑出漂亮的 Contour 圖了，真的超有成就感！不過晚上還要去跟同學討論氣候學的期末報告，心裡想著這筆氣象局的歷史資料好難撈。討論完一定要去公館吃一碗濃郁的拉麵犒賞今日的靈魂。"
  );

  // 🔑 【真・Gemini API 金鑰設定區】
  // 請記得一定要在這裡換上你在 Google AI Studio 申請到的 Key (AIzaSy...)
  const GEMINI_API_KEY = "貼上你的AIzaSy開頭的Gemini_API_KEY"; 

  // 固定顯示 2026年6月1日
  const getJournalTargetDate = () => {
    return new Date('2026-06-01');
  };

  const handleFetchAISummary = async () => {
    setIsGenerating(true);
    
    // 💡 核心科技：優先讀取我們手動輸入的 Demo 劇本文字！萬一劇本是空的，才去抓後台編輯器（雙保險）
    let rawText = demoInputText.trim();

    if (!rawText) {
      try {
        const blockSuiteDoc = editor?.doc?.blockSuiteDoc as any;
        if (blockSuiteDoc && typeof blockSuiteDoc.getBlocksByFlavour === 'function') {
          const paragraphBlocks = blockSuiteDoc.getBlocksByFlavour('affine:paragraph') || [];
          const listBlocks = blockSuiteDoc.getBlocksByFlavour('affine:list') || [];
          rawText = [...paragraphBlocks, ...listBlocks]
            .map(block => block?.model?.text?.toString().trim() || "")
            .filter(t => t.length > 0)
            .join('\n');
        }
      } catch (e) {
        console.log(e);
      }
    }

    if (!rawText) {
      setAiSummary([
        "📖 今天是個神祕的日子...",
        "✍️ 稍微在下方編輯器裡敲點字，就能一鍵生成專屬的 IG 限動大綱喔！"
      ]);
      setIsGenerating(false);
      return;
    }

    if (GEMINI_API_KEY && GEMINI_API_KEY !== "貼上你的AIzaSy開頭的Gemini_API_KEY") {
      try {
        const aiPrompt = `你是一個精緻的生活雜誌資深編輯。請仔細閱讀以下使用者打的全部日記內文，幫我精準提煉出一個反映整篇日記核心情緒的短標題（必須包含一個 Emoji），以及適合放上 Instagram 限時動態的生活重點大綱（根據內容豐富度與重要性，聰明提煉出 1 到 3 句即可，不需要硬湊）。
        
        【🔥 核心語意鐵律】：
        1. 每一句大綱都必須是「真正對全篇日記進行高階概括大綱」，不要直接複製原文。
        2. 每一句大綱必須是「語意完全完整、流暢能單獨成句」的優雅短句，嚴禁在半路或結尾出現任何「...」。
        3. 如果日記寫得很短，請回傳總共 1 到 2 個元素的簡短 JSON 陣列即可。
        4. 請嚴格以標準的 JSON 陣列字串格式回傳，不要包含 any markdown 標籤。格式範例：["情緒標題", "精緻大綱一", "精緻大綱二"]
        
        使用者的全部日記內文如下：\n${rawText}`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt }] }] })
        });

        const data = await response.json();
        const rawAiReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const matchJson = rawAiReply?.match(/\[.*\]/s);
        
        if (matchJson && matchJson[0]) {
          setAiSummary(JSON.parse(matchJson[0]));
        }
      } catch (apiErr) {
        console.error(apiErr);
      } finally {
        setIsGenerating(false);
      }
    } else {
      setIsGenerating(false);
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setBgImage(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadForIG = async () => {
    if (!shareCardRef.current) return;
    const canvas = await html2canvas(shareCardRef.current, { useCORS: true, scale: 2 });
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `AFFiNE-Journal-2026-06-01.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <>
      {/* --- 🚀 懸浮外掛面板：強制透過 position: fixed 固定在網頁左側最上層，死死壓住登入遮罩！ --- */}
      <div className="ig-share-panel" style={{ 
        position: 'fixed', 
        top: '20px', 
        left: '20px', 
        width: '360px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '20px', 
        background: '#ffffff', 
        borderRadius: '16px', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        border: '3px solid #E1306C', 
        zIndex: 999999, // 💡 終極高層級：突破宇宙天際，絕對不會被登入視窗擋住！
      }}>
        <h3 style={{ margin: '0 0 5px 0', color: '#E1306C', fontSize: '16px' }}>✨ Instagram Story 分享工坊</h3>
        <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#666' }}>🛡️ Demo 模式：已啟用獨立 API 密徑</p>
        
        {/* ✏️ 密徑輸入框：進不去 Journal 沒關係，我們直接在這邊打字！ */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px', color: '#1d1d1f' }}>
            ✍️ 請輸入今日日記內文 (Demo 劇本區)：
          </label>
          <textarea
            value={demoInputText}
            onChange={(e) => setDemoInputText(e.target.value)}
            style={{ 
              width: '100%', 
              height: '80px', 
              padding: '8px', 
              fontSize: '13px', 
              borderRadius: '8px', 
              border: '1px solid #ccc',
              resize: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={handleFetchAISummary}
            disabled={isGenerating}
            style={{ padding: '8px 12px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}
          >
            {isGenerating ? 'Gemini 正在全篇語意提煉中...' : '🤖 呼叫真・Gemini 提煉日記大綱'}
          </button>
          
          <label style={{ padding: '8px 12px', background: '#e8e8ed', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#1d1d1f' }}>
            📸 丟入背景照片
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </label>

          {aiSummary.length > 0 && (
            <button onClick={handleDownloadForIG} style={{ padding: '8px 12px', background: '#E1306C', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}>
              🚀 下載限動圖片
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
              padding: '45px 25px 40px 25px', 
              color: bgImage ? '#ffffff' : '#111111',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              margin: '0 auto'
            }}
          >
            {bgImage && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.4)', zIndex: 1 }} />}
            
            <div style={{ zIndex: 2, textAlign: 'center', width: '100%' }}>
              <p style={{ letterSpacing: '4px', fontSize: '11px', opacity: 0.8, margin: '0 0 5px 0' }}>DAILY LOG</p>
              <h2 style={{ fontSize: '18px', margin: '0 0 25px 0', fontWeight: 600 }}>2026年6月1日</h2>
            </div>
              
            <div style={{ 
              zIndex: 2, 
              textAlign: 'left', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px', 
              width: '100%',
              flexGrow: 1,                 
              justifyContent: 'center'     
            }}>
              {aiSummary.map((bullet, index) => (
                <div key={index} style={{ 
                  fontSize: aiSummary.length <= 2 ? '15px' : '14px', 
                  lineHeight: '1.6', 
                  background: bgImage ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.03)',
                  backdropFilter: bgImage ? 'blur(8px)' : 'none',
                  padding: aiSummary.length <= 2 ? '16px 20px' : '12px 16px', 
                  borderRadius: '10px',
                  border: bgImage ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.05)',
                  fontWeight: index === 0 ? 600 : 400, 
                  letterSpacing: '0.5px'
                }}>{bullet}</div>
              ))}
            </div>
              
            <div style={{ zIndex: 2, textAlign: 'center', width: '100%', marginTop: '20px' }}>
              {aiSummary.length <= 2 && (
                <p style={{ fontSize: '11px', fontStyle: 'italic', opacity: 0.6, margin: '0 0 25px 0', letterSpacing: '1px' }}>
                  “ 將當下的思緒，釀成明天的勇氣 ”
                </p>
              )}
              <p style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '2px', margin: 0 }}>
                via AFFiNE Journal
              </p>
            </div>
          </div>
        )}
      </div>

      {docMeta?.headerImage && (
        <img src={docMeta.headerImage} alt="Document header" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
      )}

      <BlockSuiteEditor
        className={clsx(styles.editor, { 'full-screen': !isSharedMode && fullWidthLayout, 'is-public': isSharedMode })}
        mode={mode}
        defaultOpenProperty={defaultOpenProperty}
        page={editor.doc.blockSuiteDoc}
        shared={isSharedMode}
        readonly={readonly}
        onEditorReady={onLoad}
      />
    </>
  );
};