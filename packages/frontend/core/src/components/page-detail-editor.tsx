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
  // 📸 狀態與函式注入區
  // =================================================================
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // 🔑 【真・Gemini API 金鑰設定區】
  const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ??
  '';

  // 提取日記真實日期的核心輔助函式
  const getJournalTargetDate = () => {
    const docTitle = docMeta?.title || (doc as any).meta?.title;
    if (docTitle && docTitle.trim().length > 0) {
      const parsedDate = new Date(docTitle);
      if (!isNaN(parsedDate.getTime())) return parsedDate;
    }
    const docMetaTime = (doc as any).meta?.updatedDate || (doc as any).meta?.createDate;
    if (docMetaTime) return new Date(docMetaTime);
    return new Date();
  };

  const handleFetchAISummary = async () => {
    // 🔍 聽診探針 1
    window.alert("🚀 【探針 1】按鈕點擊成功！開始擷取日記內容...");
    setIsGenerating(true);
    
    let rawText = "";

    // 1. 嘗試從 BlockSuite 內存中抽取核心純文字
    try {
      const blockSuiteDoc = editor?.doc?.blockSuiteDoc as any;
      if (blockSuiteDoc && typeof blockSuiteDoc.getBlocksByFlavour === 'function') {
        const paragraphBlocks = blockSuiteDoc.getBlocksByFlavour('affine:paragraph') || [];
        const listBlocks = blockSuiteDoc.getBlocksByFlavour('affine:list') || [];
        const allTextBlocks = [...paragraphBlocks, ...listBlocks];

        rawText = allTextBlocks
          .map(block => {
            const textModel = block?.model?.text;
            return textModel ? textModel.toString().trim() : "";
          })
          .filter(text => text.length > 0)
          .join('\n');
      }
    } catch (blockSuiteErr: any) {
      window.alert("⚠️ 內存讀取失敗，錯誤：" + blockSuiteErr?.message);
    }

    // 2. 備援防線：DOM 精準過濾
    if (!rawText) {
      try {
        const textElements = document.querySelectorAll(
          '[contenteditable="true"], .v-line, .v-text, p'
        );
        rawText = Array.from(textElements)
          .map(el => el.textContent || '')
          .map(t => t.trim())
          .filter(t => !t.includes('affine-') && !t.includes('分享工坊') && t.length > 1)
          .join('\n');
      } catch (domErr: any) {
        window.alert("⚠️ DOM 讀取失敗，錯誤：" + domErr?.message);
      }
    }

    // 🔍 聽診探針 2
    window.alert("🎯 【探針 2】日記文字擷取完畢！\n抓到的字數長度：" + rawText.length + " 字\n文字前20字：" + rawText.slice(0, 20));

    if (!rawText || rawText.trim().length === 0) {
      setAiSummary([
        "📖 今天是個神祕的日子...",
        "✍️ 稍微在下方編輯器裡敲點字，就能一鍵生成專屬的 IG 限動大綱喔！"
      ]);
      setIsGenerating(false);
      return;
    }

    // 3. 直連 Google 官方開發者 Gemini API 通道
    if (GEMINI_API_KEY) {
      try {
        const aiPrompt = `你是一個精緻的生活雜誌資深編輯。請仔細閱讀以下使用者打的全部日記內文，幫我精準提煉出一個反映整篇日記核心情緒的短標題（必須包含一個 Emoji），以及適合放上 Instagram 限時動態的生活重點大綱（根據內容豐富度與重要性，聰明提煉出 1 到 3 句即可，不需要硬湊）。
        【🔥 核心語意鐵律】：
        1. 每一句大綱都必須是「真正對全篇日記進行高階概括大綱」，不要直接複製原文。
        2. 每一句大綱必須是「語意完全完整、流暢能單獨成句」的優雅短句，嚴禁在半路或結尾出現任何「...」。
        3. 請嚴格以標準的 JSON 陣列字串格式回傳，格式範例：["情緒標題", "精緻大綱一", "精緻大綱二"]
        使用者的全部日記內文如下：\n${rawText}`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        // 🔍 聽診探針 3
        window.alert("🤖 【探針 3】準備發送 POST 請求給 Google Gemini 伺服器...");
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt }] }] })
        });

        const data = await response.json();
        
        if (data?.error) {
          window.alert("🛑 【Google API 拒絕請求】\n錯誤代碼：" + data.error.code + "\n原因：" + data.error.message);
          setIsGenerating(false);
          return;
        }

        const rawAiReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // 🔍 聽診探針 4
        window.alert("🎉 【探針 4】Gemini 成功響應！\n原始回傳內容：\n" + rawAiReply);

        const matchJson = rawAiReply?.match(/\[.*\]/s);
        if (matchJson && matchJson[0]) {
          const cleanArray = JSON.parse(matchJson[0]);
          setAiSummary(cleanArray);
        } else {
          window.alert("⚠️ 格式錯誤：AI 回傳的內容沒辦法轉成格子陣列");
        }
      } catch (apiErr: any) {
        window.alert("🛑 【連線爆發致命錯誤】原因：" + apiErr?.message);
      } finally {
        setIsGenerating(false);
      }
    } else {
      window.alert("🛑 【核心阻斷】Henry，你忘記在第 64 行配置你的 GEMINI_API_KEY 金鑰字串了！");
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
    
    const targetDate = getJournalTargetDate();
    const localDateStr = targetDate.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }).replace(/\//g, '-');
    
    const link = document.createElement('a');
    link.download = `AFFiNE-Journal-${localDateStr}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <>
      {/* --- 🚀 方案 A 強制外掛分享面板 --- */}
      <div className="ig-share-panel" style={{ padding: '20px', background: '#f5f5f7', borderRadius: '12px', marginBottom: '20px', border: '2px dashed #E1306C', zIndex: 9999, position: 'relative' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#E1306C' }}>✨ Instagram Story 分享工坊 (真・全內文動態適配版)</h4>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button 
            onClick={handleFetchAISummary}
            disabled={isGenerating}
            style={{ padding: '8px 12px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            {isGenerating ? 'Gemini 正在全篇語意提煉中...' : '🤖 呼叫真・Gemini 提煉日記大綱'}
          </button>
          
          <label style={{ padding: '8px 12px', background: '#e8e8ed', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', color: '#1d1d1f' }}>
            📸 丟入 IG 背景照片
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </label>

          {aiSummary.length > 0 && (
            <button onClick={handleDownloadForIG} style={{ padding: '8px 12px', background: '#E1306C', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              🚀 點我下載 IG 限動圖片
            </button>
          )}
        </div>

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
              color: bgImage ? '#ffffff' : '#111111',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
            }}
          >
            {bgImage && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.4)', zIndex: 1 }} />}
            
            <div style={{ zIndex: 2, textAlign: 'center', width: '100%' }}>
              <p style={{ letterSpacing: '4px', fontSize: '11px', opacity: 0.8, margin: '0 0 5px 0' }}>DAILY LOG</p>
              <h2 style={{ fontSize: '18px', margin: '0 0 25px 0', fontWeight: 600 }}>
                {(() => {
                  const targetDate = getJournalTargetDate();
                  return targetDate.toLocaleDateString('zh-TW', { 
                    timeZone: 'Asia/Taipei',
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric'
                  });
                })()}
              </h2>
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