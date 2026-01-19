import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RGL, { WidthProvider } from 'react-grid-layout';
import HobbiesDisplay from './HobbiesDisplay';

import '../Portfolio.css';
import '../ShareModal.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// react-grid-layout: 要素をドラッグしたりサイズ変更したりするためのライブラリ
const GridLayout = WidthProvider(RGL);

// プロジェクトのカテゴリ定義
const CATEGORIES = ["dashboard", "learning", "school", "other"];

// ★ プロジェクト新規追加用のモーダルコンポーネント
// on_close: 閉じる時の関数, on_submit: 登録時の関数, t: 翻訳関数
function AddProjectModal({ on_close, on_submit, t }) {
  // --- ステート（状態変数）の定義 ---
  // title: プロジェクトのタイトル。初期値は空文字。
  const [title, setTitle] = useState('');
  // description: プロジェクトの説明文。
  const [description, setDescription] = useState('');
  // backgroundColor: カードの背景色。初期値は白 (#ffffff)。
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  // textColor: カードの文字色。初期値は黒 (#000000)。
  const [textColor, setTextColor] = useState('#000000');
  // fontSize: 文字サイズ。CSSの単位付き（16pxなど）で指定可能。
  const [fontSize, setFontSize] = useState('');
  // size: カードのサイズカテゴリ（small, medium, large）。レイアウト時の幅・高さに影響。
  const [size] = useState('medium');
  // tags: 選択されたタグの配列（dashboard, learning, school, other）。
  const [tags, setTags] = useState([]);
  // backgroundImage: 背景画像のURL。サーバー上のパスまたは外部URL。
  const [backgroundImage, setBackgroundImage] = useState('');
  // bgInputMethod: 背景画像の入力方法 ('url' または 'upload')。UIの切り替えに使用。
  const [bgInputMethod, setBgInputMethod] = useState('url');
  // bgFile: アップロード用に選択された画像ファイルオブジェクト。
  const [bgFile, setBgFile] = useState(null);
  // uploading: ファイルアップロード処理中かどうか。ボタンの無効化に使用。
  const [uploading, setUploading] = useState(false);
  // error: エラーメッセージ。表示が必要な場合にセットされる。
  const [error, setError] = useState('');

  // --- useEffect (副作用フック) ---
  // モーダルが表示された時に背景ページのスクロールを禁止し、閉じる時に元に戻す処理
  useEffect(() => {
    // コンポーネントがマウント（表示）された時：bodyのoverflowをhiddenにしてスクロール不可にする
    document.body.style.overflow = 'hidden';
    // クリーンアップ関数：コンポーネントがアンマウント（非表示）される時に実行される
    return () => {
      document.body.style.overflow = 'unset'; // スクロール設定を元に戻す
    };
  }, []); // 依存配列が空なので、マウント時とアンマウント時のみ実行される

  // 背景画像ファイルが選択された時の処理
  const handleBgFileChange = (e) => {
    // e.target.files[0] で選択された最初のファイルを取得
    setBgFile(e.target.files[0]);
    // ファイルを選択した場合は、以前に入力された画像URLと背景色をクリアする（排他制御）
    setBackgroundImage('');
    setBackgroundColor('');
  };

  // タグのチェックボックスが変更された時の処理
  const handleTagChange = (tag) => {
    setTags(prevTags =>
      prevTags.includes(tag)
        ? prevTags.filter(t => t !== tag) // 既にタグが含まれていれば削除（選択解除）
        : [...prevTags, tag] // 含まれていなければ追加（選択）
    );
  };

  // フォーム送信時の処理（プロジェクトの登録）
  const handleSubmit = async (e) => {
    e.preventDefault(); // フォームのデフォルト送信動作（ページリロード）をキャンセル
    if (!title) {
      // タイトルが未入力の場合は警告を出して処理を中断
      alert(t('portfolio_alert_project_title_required'));
      return;
    }
    setError('');

    let finalBackgroundImage = backgroundImage;
    let finalBackgroundColor = backgroundColor;

    // 1. 画像アップロードの場合の処理
    if (bgInputMethod === 'upload' && bgFile) {
      setUploading(true); // アップロード中フラグをON
      const formData = new FormData();
      formData.append('file', bgFile);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      try {
        // アップロードAPIを呼び出す
        const uploadRes = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }, // 認証トークンをヘッダーに付与
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          // アップロード成功時：返されたファイルパスを背景画像に設定
          finalBackgroundImage = `http://localhost:5000${uploadData.filePath}`;
          finalBackgroundColor = null; // 画像が優先されるため色はクリア
        } else {
          throw new Error(uploadData.error || t('portfolio_alert_bg_upload_failed'));
        }
      } catch (err) {
        setError(err.message);
        setUploading(false);
        return; // エラー時はここで終了
      } finally {
        setUploading(false); // アップロード処理終了
      }
    } else if (backgroundImage) {
      // 2. 画像URLが直接入力されている場合
      finalBackgroundColor = null; // 画像優先のため色はクリア
    } else if (backgroundColor) {
      // 3. 背景色のみ指定されている場合
      finalBackgroundImage = null; // 画像はクリア
    }

    // 登録するデータオブジェクトを作成
    const projectData = {
      title,
      description,
      textColor,
      font_size: fontSize,
      background_image: finalBackgroundImage,
      size,
      tags,
    };

    // 背景色が有効な場合のみプロパティに追加
    if (finalBackgroundColor !== null) {
      projectData.backgroundColor = finalBackgroundColor;
    }

    // 親コンポーネントから渡された on_submit 関数を実行してデータを渡す
    on_submit(projectData);
  };

  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_add_new_project_modal_title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('portfolio_label_title')}</label>
            <input type="text" value={title || ''} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_description')}</label>
            <textarea value={description || ''} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_tags')}</label>
            <div className="checkbox-group">
              {CATEGORIES.map(cat => (
                <div key={cat} className="checkbox-item">
                  <input type="checkbox" id={`tag-${cat}`} value={cat} checked={tags.includes(cat)} onChange={() => handleTagChange(cat)} />
                  <label htmlFor={`tag-${cat}`}>{t(`header_category_${cat}`)}</label>
                </div>
              ))}
            </div>
          </div>

          <h4>{t('portfolio_label_style')}</h4>
          <div className="form-group">
            <label>{t('portfolio_label_background_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
              <input type="color" value={backgroundColor} onChange={(e) => { setBackgroundColor(e.target.value); setBackgroundImage(''); setBgFile(null); }} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_text_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_font_size')}</label>
            <input type="text" value={fontSize || ''} onChange={(e) => setFontSize(e.target.value)} placeholder="例: 24px" />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_background_image')}</label>
            <div className="input-method-toggle">
              <button type="button" onClick={() => setBgInputMethod('url')} className={bgInputMethod === 'url' ? 'active' : ''}>{t('portfolio_label_url')}</button>
              <button type="button" onClick={() => setBgInputMethod('upload')} className={bgInputMethod === 'upload' ? 'active' : ''}>{t('portfolio_label_upload')}</button>
            </div>
            {bgInputMethod === 'upload' ? (
              <input type="file" onChange={handleBgFileChange} accept="image/*" />
            ) : (
              <input type="text" value={backgroundImage || ''} onChange={(e) => { setBackgroundImage(e.target.value); setBackgroundColor(''); }} placeholder={t('portfolio_placeholder_bg_image_url')} />
            )}
          </div>

          {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? t('portfolio_uploading') : t('portfolio_add_project_button')}</button>
            <button type="button" className="btn-secondary" onClick={on_close}>{t('portfolio_cancel_button')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ★ プロジェクト編集用のモーダルコンポーネント
// プロジェクトのデータを初期値としてセットして編集できるようにします
// ★ プロジェクト編集用のモーダルコンポーネント
// プロジェクトのデータを初期値としてセットして編集できるようにします
// project: 編集対象のプロジェクトデータ
function EditProjectModal({ project, on_close, on_submit, t }) {
  // --- ステート（状態変数） ---
  // 受け取った project のプロパティを初期値としてセットします
  const [title, setTitle] = useState(project.title || '');
  const [description, setDescription] = useState(project.description || '');
  const [backgroundColor, setBackgroundColor] = useState(project.background_color || '#ffffff');
  const [textColor, setTextColor] = useState(project.text_color || '#000000');
  const [fontSize, setFontSize] = useState(project.font_size || '');
  const [tags, setTags] = useState(project.tags || []);
  const [backgroundImage, setBackgroundImage] = useState(project.background_image || '');
  // 背景画像がURL入力かアップロードかを判定するためのステート
  const [bgInputMethod, setBgInputMethod] = useState('url');
  const [bgFile, setBgFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // モーダル表示中のスクロール制御
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // project プロップスが変更された場合に、フォームの入力値を最新のプロジェクトデータでリセットする
  useEffect(() => {
    setTitle(project.title || '');
    setDescription(project.description || '');
    setBackgroundColor(project.background_color || '#ffffff');
    setTextColor(project.text_color || '#000000');
    setFontSize(project.font_size || '');
    setTags(project.tags || []);
    setBackgroundImage(project.background_image || '');

    // 背景画像が http や data: で始まる場合はURLモード、それ以外（ファイルパスなど）も一旦URLモードとして扱うが
    // ここでは初期表示の判定ロジックを入れています
    const isUrl = project.background_image && (project.background_image.startsWith('http') || project.background_image.startsWith('data:'));
    setBgInputMethod(isUrl ? 'url' : 'upload');
  }, [project]); // project が変わるたびに実行

  const handleBgFileChange = (e) => {
    setBgFile(e.target.files[0]);
    setBackgroundImage(''); // Clear background image URL when a file is selected
    setBackgroundColor(''); // Clear background color when an image file is selected
  };

  const handleTagChange = (tag) => {
    setTags(prevTags =>
      prevTags.includes(tag)
        ? prevTags.filter(t => t !== tag)
        : [...prevTags, tag]
    );
  };

  // フォーム編集内容の保存処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let finalBackgroundImage = backgroundImage;
    let finalBackgroundColor = backgroundColor;

    // 画像アップロード処理（新規追加時と同様）
    if (bgInputMethod === 'upload' && bgFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', bgFile);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      try {
        const uploadRes = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          finalBackgroundImage = `http://localhost:5000${uploadData.filePath}`;
          finalBackgroundColor = null;
        } else {
          throw new Error(uploadData.error || t('portfolio_alert_bg_upload_failed'));
        }
      } catch (err) {
        setError(err.message);
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    } else if (backgroundImage) {
      finalBackgroundColor = null;
    } else if (backgroundColor) {
      finalBackgroundImage = null;
    }

    // 変更内容をオブジェクトにまとめ、on_submit で親コンポーネントに渡す
    // ...project で既存のプロパティを展開し、変更点だけ上書きする
    on_submit({
      ...project,
      title,
      description,
      backgroundColor: finalBackgroundColor,
      textColor,
      font_size: fontSize,
      background_image: finalBackgroundImage,
      tags
    });
  };

  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_edit_project_modal_title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('portfolio_label_title')}</label>
            <input type="text" value={title || ''} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_description')}</label>
            <textarea value={description || ''} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_tags')}</label>
            <div className="checkbox-group">
              {CATEGORIES.map(cat => (
                <div key={cat} className="checkbox-item">
                  <input type="checkbox" id={`tag-${cat}`} value={cat} checked={tags.includes(cat)} onChange={() => handleTagChange(cat)} />
                  <label htmlFor={`tag-${cat}`}>{t(`header_category_${cat}`)}</label>
                </div>
              ))}
            </div>
          </div>

          <h4>{t('portfolio_label_style')}</h4>
          <div className="form-group">
            <label>{t('portfolio_label_background_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
              <input type="color" value={backgroundColor} onChange={(e) => { setBackgroundColor(e.target.value); setBackgroundImage(''); setBgFile(null); }} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_text_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_font_size')}</label>
            <input type="text" value={fontSize || ''} onChange={(e) => setFontSize(e.target.value)} placeholder="例: 24px" />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_background_image')}</label>
            <div className="input-method-toggle">
              <button type="button" onClick={() => setBgInputMethod('url')} className={bgInputMethod === 'url' ? 'active' : ''}>{t('portfolio_label_url')}</button>
              <button type="button" onClick={() => setBgInputMethod('upload')} className={bgInputMethod === 'upload' ? 'active' : ''}>{t('portfolio_label_upload')}</button>
            </div>
            {bgInputMethod === 'upload' ? (
              <input type="file" onChange={handleBgFileChange} accept="image/*" />
            ) : (
              <input type="text" value={backgroundImage || ''} onChange={(e) => { setBackgroundImage(e.target.value); setBackgroundColor(''); }} placeholder={t('portfolio_placeholder_bg_image_url')} />
            )}
          </div>

          {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? t('portfolio_uploading') : t('portfolio_update_button')}</button>
            <button type="button" className="btn-secondary" onClick={on_close}>{t('portfolio_cancel_button')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ★ テキストブロック追加用のモーダル
// プロジェクト（作品）ではなく、メモや説明書きなどのテキストのみのブロックを追加します
// ★ テキストブロック追加用のモーダル
// プロジェクト（作品）ではなく、メモや説明書きなどのテキストのみのブロックを追加します
function AddTextModal({ on_close, on_submit, t }) {
  // --- ステート（状態変数） ---
  const [content, setContent] = useState(''); // テキスト内容
  const [backgroundColor, setBackgroundColor] = useState('#ffffff'); // 背景色
  const [textColor, setTextColor] = useState('#000000'); // 文字色
  const [fontSize, setFontSize] = useState(''); // 文字サイズ
  const [backgroundImage, setBackgroundImage] = useState(''); // 背景画像URL

  // 背景画像の入力モード管理
  const [bgInputMethod, setBgInputMethod] = useState('url');
  const [bgFile, setBgFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // モーダル表示中は背景スクロールを無効化
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleBgFileChange = (e) => {
    setBgFile(e.target.files[0]);
    setBackgroundImage(''); // ファイルが選択されたら画像URLをクリア
    setBackgroundColor(''); // 画像ファイルが選択されたら背景色をクリア
  };

  // 追加ボタンが押された時の処理
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      alert(t('portfolio_alert_text_content_required'));
      return;
    }
    setError('');

    let finalBackgroundImage = backgroundImage;
    let finalBackgroundColor = backgroundColor;

    // 画像アップロード処理
    if (bgInputMethod === 'upload' && bgFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', bgFile);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      try {
        const uploadRes = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          finalBackgroundImage = `http://localhost:5000${uploadData.filePath}`;
          finalBackgroundColor = '';
        } else {
          throw new Error(uploadData.error || t('portfolio_alert_bg_upload_failed'));
        }
      } catch (err) {
        setError(err.message);
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    } else if (backgroundImage) {
      finalBackgroundColor = '';
    } else if (backgroundColor) {
      finalBackgroundImage = '';
    }

    // テキストタイプとしてデータを送信
    on_submit({
      content,
      backgroundColor: finalBackgroundColor,
      textColor,
      font_size: fontSize,
      background_image: finalBackgroundImage,
      type: 'text'
    });
  };

  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_add_text_modal_title')}</h2>
        <form onSubmit={handleTextSubmit}>
          <div className="form-group">
            <label htmlFor="text-content">{t('portfolio_label_text_content')}</label>
            <textarea id="text-content" value={content} onChange={(e) => setContent(e.target.value)} rows="5" />
          </div>

          <h4>{t('portfolio_label_style')}</h4>
          <div className="form-group">
            <label htmlFor="text-bg-color">{t('portfolio_label_background_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
              <input id="text-bg-color" type="color" value={backgroundColor} onChange={(e) => { setBackgroundColor(e.target.value); setBackgroundImage(''); setBgFile(null); }} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="text-color">{t('portfolio_label_text_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
              <input id="text-color" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_font_size')}</label>
            <input type="text" value={fontSize || ''} onChange={(e) => setFontSize(e.target.value)} placeholder="例: 18px" />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_background_image')}</label>
            <div className="input-method-toggle">
              <button type="button" onClick={() => setBgInputMethod('url')} className={bgInputMethod === 'url' ? 'active' : ''}>{t('portfolio_label_url')}</button>
              <button type="button" onClick={() => setBgInputMethod('upload')} className={bgInputMethod === 'upload' ? 'active' : ''}>{t('portfolio_label_upload')}</button>
            </div>
            {bgInputMethod === 'upload' ? (
              <input type="file" onChange={handleBgFileChange} accept="image/*" />
            ) : (
              <input type="text" value={backgroundImage || ''} onChange={(e) => { setBackgroundImage(e.target.value); setBackgroundColor(''); }} placeholder={t('portfolio_placeholder_bg_image_url')} />
            )}
          </div>

          {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? t('portfolio_uploading') : t('portfolio_add_text_button')}</button>
            <button type="button" className="btn-secondary" onClick={on_close}>{t('portfolio_cancel_button')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ★ テキストブロック編集用のモーダル
// ★ テキストブロック編集用のモーダル
function EditTextModal({ project, on_close, on_submit, t }) {
  // --- ステート（状態変数） ---
  const [content, setContent] = useState(project.content || ''); // 現在のテキスト内容
  const [backgroundColor, setBackgroundColor] = useState(project.background_color || '#ffffff');
  const [textColor, setTextColor] = useState(project.text_color || '#000000');
  const [fontSize, setFontSize] = useState(project.font_size || '');
  const [backgroundImage, setBackgroundImage] = useState(project.background_image || '');

  // 背景画像の入力モード管理
  const [bgInputMethod, setBgInputMethod] = useState('url');
  const [bgFile, setBgFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // モーダル表示中はスクロールを無効化
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // projectプロパティが変更されたらフォームの値をリセット
  useEffect(() => {
    setContent(project.content || '');
    setBackgroundColor(project.background_color || '#ffffff');
    setTextColor(project.text_color || '#000000');
    setFontSize(project.font_size || '');
    setBackgroundImage(project.background_image || '');

    // URLかどうかの簡易判定
    const isUrl = project.background_image && (project.background_image.startsWith('http') || project.background_image.startsWith('data:'));
    setBgInputMethod(isUrl ? 'url' : 'upload');
  }, [project]);

  const handleBgFileChange = (e) => {
    setBgFile(e.target.files[0]);
    setBackgroundImage(''); // ファイルが選択されたら画像URLをクリア
    setBackgroundColor(''); // 画像ファイルが選択されたら背景色をクリア
  };

  // フォーム送信（更新）処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let finalBackgroundImage = backgroundImage;
    let finalBackgroundColor = backgroundColor;

    // 画像アップロード処理
    if (bgInputMethod === 'upload' && bgFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', bgFile);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      try {
        const uploadRes = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          finalBackgroundImage = `http://localhost:5000${uploadData.filePath}`;
          finalBackgroundColor = '';
        } else {
          throw new Error(uploadData.error || t('portfolio_alert_bg_upload_failed'));
        }
      } catch (err) {
        setError(err.message);
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    } else if (backgroundImage) {
      finalBackgroundColor = '';
    } else if (backgroundColor) {
      finalBackgroundImage = '';
    }

    // 更新データを親コンポーネントに送信
    on_submit({
      ...project,
      content,
      backgroundColor: finalBackgroundColor,
      textColor,
      font_size: fontSize,
      background_image: finalBackgroundImage,
    });
  };

  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_edit_text_modal_title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('portfolio_label_text_content')}</label>
            <textarea value={content || ''} onChange={(e) => setContent(e.target.value)} rows="5" />
          </div>

          <h4>{t('portfolio_label_style')}</h4>
          <div className="form-group">
            <label>{t('portfolio_label_background_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
              <input type="color" value={backgroundColor} onChange={(e) => { setBackgroundColor(e.target.value); setBackgroundImage(''); setBgFile(null); }} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_text_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_font_size')}</label>
            <input type="text" value={fontSize || ''} onChange={(e) => setFontSize(e.target.value)} placeholder="例: 18px" />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_background_image')}</label>
            <div className="input-method-toggle">
              <button type="button" onClick={() => setBgInputMethod('url')} className={bgInputMethod === 'url' ? 'active' : ''}>{t('portfolio_label_url')}</button>
              <button type="button" onClick={() => setBgInputMethod('upload')} className={bgInputMethod === 'upload' ? 'active' : ''}>{t('portfolio_label_upload')}</button>
            </div>
            {bgInputMethod === 'upload' ? (
              <input type="file" onChange={handleBgFileChange} accept="image/*" />
            ) : (
              <input type="text" value={backgroundImage || ''} onChange={(e) => { setBackgroundImage(e.target.value); setBackgroundColor(''); }} placeholder={t('portfolio_placeholder_bg_image_url')} />
            )}
          </div>

          {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? t('portfolio_uploading') : t('portfolio_update_button')}</button>
            <button type="button" className="btn-secondary" onClick={on_close}>{t('portfolio_cancel_button')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ★ ポートフォリオ共有用のモーダル
function ShareModal({ portfolioId, on_close, t }) {
  const [copied, setCopied] = useState(false); // コピー完了メッセージの表示管理
  // 現在のドメインとポートフォリオIDを組み合わせて共有用URLを生成
  const shareUrl = `${window.location.origin}/portfolio/${portfolioId}`;

  // クリップボードにURLをコピーする関数
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true); // コピー成功フラグON
      setTimeout(() => setCopied(false), 2000); // 2秒後にフラグOFF（メッセージを消す）
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  // モーダル表示中のスクロール制御
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="share-modal-backdrop" onClick={on_close}>
      <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_share_modal_title')}</h2>
        <div className="share-url-container">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="share-url-input"
          />
          <button onClick={copyToClipboard} className={`copy-button ${copied ? 'copied' : ''}`}>
            {copied ? t('portfolio_share_copied') : t('portfolio_share_copy')}
          </button>
        </div>
        <div className="share-modal-actions">
          <button onClick={on_close} className="share-modal-close-button">
            {t('portfolio_close_button')}
          </button>
        </div>
      </div>
    </div>
  );
}

const sizeToDimensions = (size) => {
  switch (size) {
    case 'small':
      return { w: 2, h: 2 };
    case 'medium':
      return { w: 4, h: 4 };
    case 'large':
      return { w: 6, h: 4 };
    default:
      return { w: 4, h: 4 };
  }
};

// ★ テキスト編集ブロック
// ダブルクリックで編集モードになり、テキストエリアを表示します
// ★ テキスト編集ブロック
// ダブルクリックで編集モードになり、テキストエリアを表示します
// project: ブロックのデータ, onContentUpdate: 更新時のコールバック, isEditMode: 全体が編集モードかどうか
function TextEditBlock({ project, onContentUpdate, onDelete, onEdit, isEditMode }) {
  const [isEditing, setIsEditing] = useState(false); // このブロックが現在編集中かどうか
  const [currentContent, setCurrentContent] = useState(project.content || ''); // 入力中のテキスト

  // ダブルクリック時の処理：編集モードならテキスト編集を開始
  const handleDoubleClick = () => {
    if (isEditMode) {
      setIsEditing(true);
    }
  };

  // フォーカスが外れた（Blur）時の処理：編集終了＆データ保存
  const handleBlur = () => {
    setIsEditing(false); // 編集モード終了
    // 内容に変更があれば親コンポーネントに更新を通知
    if (currentContent !== project.content) {
      onContentUpdate({ ...project, content: currentContent });
    }
  };

  // テキストエリアの入力変更処理
  const handleChange = (e) => {
    setCurrentContent(e.target.value);
  };

  const blockStyles = {
    padding: '10px',
    wordBreak: 'break-word',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  };

  if (project.background_image) {
    blockStyles.backgroundImage = `url(${project.background_image})`;
    blockStyles.backgroundSize = 'cover';
    blockStyles.backgroundPosition = 'center';
  } else if (project.background_color) {
    blockStyles.backgroundColor = project.background_color;
  }

  const textContainerStyles = {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    color: project.text_color, // Inherit text color
  };

  const textStyles = {
    margin: 0,
    fontSize: project.font_size || `${Math.min(Math.sqrt(project.layout_w * project.layout_h) * 8, 48)}px`
  };

  return (
    <div
      className="text-block"
      style={blockStyles}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing && isEditMode ? (
        <textarea
          value={currentContent}
          onChange={handleChange}
          onBlur={handleBlur}
          autoFocus
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: project.text_color,
            resize: 'none',
            outline: 'none',
            fontSize: project.font_size || `${Math.min(Math.sqrt(project.layout_w * project.layout_h) * 8, 48)}px`,
            fontFamily: 'inherit',
            textAlign: 'left',
            overflow: 'auto', // Added for scrolling in edit mode
          }}
        />
      ) : (
        <div style={textContainerStyles}>
          <p style={textStyles}>{currentContent}</p>
        </div>
      )}
      {isEditMode && (
        <div className="project-card-actions">
          <button className="project-action-icon" onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
            <i className="material-icons">edit</i>
          </button>
          <button className="project-action-icon delete-button" onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}>
            <i className="material-icons">delete</i>
          </button>
        </div>
      )}
    </div>
  );
}

const addPxIfNeeded = (value) => {
  if (!value) return null;
  if (String(value).match(/^[0-9.]+$/)) {
    return `${value}px`;
  }
  return value;
};

// ★ メインのポートフォリオ表示コンポーネント
// ポートフォリオのグリッドレイアウト、プロジェクトの追加・編集・削除、共有などの機能を提供します
export default function Portfolio({ onTemplateChange, portfolio, setPortfolio, fetchPortfolio, user }) {
  // URLパラメータ (:portfolioId) からポートフォリオIDを取得
  const { portfolioId } = useParams();
  const navigate = useNavigate(); // ページ遷移用フック

  // --- ステート（状態変数） ---
  const [showAddModal, setShowAddModal] = useState(false); // プロジェクト追加モーダルの表示/非表示
  const [showAddTextModal, setShowAddTextModal] = useState(false); // テキスト追加モーダルの表示/非表示
  const [editingProject, setEditingProject] = useState(null); // 現在編集中のプロジェクトデータ（nullなら編集なし）
  const [editingTextBlock, setEditingTextBlock] = useState(null); // 現在編集中のテキストブロックデータ
  const [isEditMode, setIsEditMode] = useState(false); // 編集モードが有効かどうか（所有者のみ切り替え可能）
  const [showShareModal, setShowShareModal] = useState(false); // 共有モーダルの表示/非表示
  const [isPublic, setIsPublic] = useState(false); // 公開設定のステート

  // 現在のログインユーザーが、このポートフォリオの作成者（所有者）であるかどうかを判定
  // 編集ボタンなどの表示制御に使用します
  const isOwner = user && portfolio && user.id === portfolio.user_id;

  const { t } = useTranslation(); // 翻訳フック

  // --- useEffect (副作用フック) ---
  // ポートフォリオデータや所有権が変更された時の処理
  useEffect(() => {
    if (portfolio) {
      if (onTemplateChange) {
        onTemplateChange(portfolio.template);
      }
      setIsPublic(portfolio.is_public);
    }
    // 所有者でない場合は強制的に閲覧モードにする（編集モードをOFF）
    if (!isOwner) {
      setIsEditMode(false);
    }
    // クリーンアップ：コンポーネントがアンマウントされる時にテンプレート設定をリセット
    return () => {
      if (onTemplateChange) {
        onTemplateChange(null);
      }
    };
  }, [portfolio, onTemplateChange, isOwner]);

  // デバッグ用: ポートフォリオデータの変更をログ出力
  useEffect(() => {
    if (portfolio) {
      console.log("Frontend received portfolio:", portfolio);
    }
  }, [portfolio]);

  // 新規プロジェクト（またはテキストブロック）を追加する処理
  const handleAddNewProject = async (projectData) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // サイズ（small/medium/large）からグリッド上の幅(w)と高さ(h)を計算
    const { w, h } = sizeToDimensions(projectData.size);
    // レイアウト情報をデータに追加
    const projectDataWithLayout = { ...projectData, layout_w: w, layout_h: h };

    try {
      // APIにPOSTリクエストを送信してデータを保存
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projectDataWithLayout),
      });

      const data = await response.json();
      if (data.success) {
        // 成功したらモーダルを閉じる
        if (projectData.type === 'text') {
          setShowAddTextModal(false);
        } else {
          setShowAddModal(false);
        }
        // ポートフォリオ全体を再取得して表示を更新
        fetchPortfolio();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert(t('portfolio_alert_add_item_failed'));
      console.error(err);
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
  };

  // プロジェクト（またはテキストブロック）の内容を更新する処理
  const handleUpdateProject = async (updatedData) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const projectId = updatedData.id;
    if (!projectId) {
      alert(t('portfolio_alert_missing_id'));
      console.error("Project ID is missing in updatedData.");
      return;
    }

    try {
      // PUTメソッドで更新リクエストを送信
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();
      if (data.success) {
        // テキスト以外の更新（プロジェクト編集など）の場合、編集状態を終了する
        if (updatedData.type !== 'text') {
          setEditingProject(null);
        }
        // ポートフォリオデータを再取得して画面を更新
        fetchPortfolio();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert(t('portfolio_alert_update_db_error'));
      console.error(err);
    }
  };

  // プロジェクト（アイテム）を削除する処理
  const handleDeleteProject = async (projectId) => {
    // 削除前の確認ダイアログ
    if (!window.confirm(t('portfolio_confirm_delete_project'))) {
      return;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      // DELETEメソッドで削除APIを呼び出し
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchPortfolio(); // 削除後に再読み込み
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert(t('portfolio_alert_delete_project_failed'));
      console.error(err);
    }
  };

  // レイアウト（配置・サイズ）が変更された時に呼ばれる関数
  // レイアウト（配置・サイズ）が変更された時に呼ばれる関数
  // useCallbackで関数をメモ化し、不要な再生成を防ぐ
  const handleLayoutChange = useCallback(async (layout) => {
    // 1. 楽観的更新 (Optimistic Update)
    // サーバーへの保存を待たずに、まずはReactの状態（画面）を更新して、ユーザーにキビキビした操作感を提供します
    if (portfolio && setPortfolio) {
      const updatedProjects = portfolio.projects.map(p => {
        // react-grid-layout から返ってくる layout 配列から、対応するIDの新しい位置・サイズを探す
        const layoutItem = layout.find(l => l.i === p.id.toString());
        if (layoutItem) {
          return {
            ...p,
            layout_x: layoutItem.x,
            layout_y: layoutItem.y,
            layout_w: layoutItem.w,
            layout_h: layoutItem.h,
          };
        }
        return p;
      });
      setPortfolio({ ...portfolio, projects: updatedProjects });
    }

    // 2. サーバーへの保存（永続化）
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ layout }),
      });
    } catch (err) {
      console.error('Failed to save layout:', err);
      alert(t('portfolio_alert_layout_save_failed'));
      // 保存に失敗した場合は、サーバーから正しいデータを再取得して、画面を元の状態に戻します
      fetchPortfolio();
    }
  }, [portfolio, setPortfolio, portfolioId, fetchPortfolio, t]);

  // ポートフォリオ全体を削除する処理
  const handleDeletePortfolio = async () => {
    if (!window.confirm(t('portfolio_confirm_delete_portfolio'))) {
      return;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        alert(t('portfolio_alert_portfolio_deleted'));
        // 削除後はポートフォリオ作成画面（またはトップページ）へ戻る
        navigate('/portfolio-builder');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert(t('portfolio_alert_portfolio_delete_failed'));
      console.error(err);
    }
  };

  // 公開/非公開の切り替え処理
  const handleVisibilityToggle = async () => {
    const newValue = !isPublic;
    setIsPublic(newValue); // 即座にUIを更新（楽観的更新）

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_public: newValue }),
      });

      const data = await response.json();
      if (!data.success) {
        setIsPublic(!newValue); // 失敗したら元に戻す
        alert(t('portfolio_alert_update_db_error', '設定の更新に失敗しました。'));
      }
    } catch (err) {
      setIsPublic(!newValue); // 失敗したら元に戻す
      console.error(err);
      alert(t('portfolio_alert_server_error', 'サーバーエラーが発生しました。'));
    }
  };

  const generateLayout = () => {
    if (!portfolio || !portfolio.projects) return [];
    return portfolio.projects.map(project => ({
      i: project.id.toString(),
      x: project.layout_x,
      y: project.layout_y,
      w: project.layout_w,
      h: project.layout_h,
    }));
  };

  if (!portfolio) return <div>{t('loading')}</div>;

  return (
    <div className="portfolio-container">
      <div className="portfolio-header">
        <h1>{portfolio.title}</h1>
        {isOwner && (
          <div className="portfolio-controls">
            <div className="visibility-toggle">
              <label className="switch-label">
                <span style={{ marginRight: '8px', fontWeight: 'bold', color: isPublic ? '#28a745' : '#6c757d' }}>
                  {isPublic ? t('portfolio_visibility_public', '公開') : t('portfolio_visibility_private', '非公開')}
                </span>
                <div className="switch">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={handleVisibilityToggle}
                  />
                  <span className="slider round"></span>
                </div>
              </label>
            </div>

            <div className={`edit-mode-toggle ${isEditMode ? 'active' : ''}`} onClick={() => setIsEditMode(!isEditMode)}>
              <i className="material-icons">{isEditMode ? 'edit_off' : 'edit'}</i>
              <span>{t('portfolio_edit_mode')}</span>
            </div>

            <div className={`edit-mode-toggle`} onClick={() => setShowShareModal(true)}>
              <i className="material-icons">share</i>
              <span>{t('portfolio_share_button')}</span>
            </div>

            {isEditMode && (
              <div className="portfolio-header-actions">
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                  <i className="material-icons">add</i> {t('portfolio_add_new_project')}
                </button>
                <button className="btn-primary" onClick={() => setShowAddTextModal(true)}>
                  <i className="material-icons">text_fields</i> {t('portfolio_add_text')}
                </button>
                <button className="btn-danger" onClick={handleDeletePortfolio}>
                  <i className="material-icons">delete</i>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <HobbiesDisplay isOwner={isOwner} portfolioId={portfolioId} />

      {showAddModal && <AddProjectModal on_close={() => setShowAddModal(false)} on_submit={handleAddNewProject} t={t} />}
      {showAddTextModal && <AddTextModal on_close={() => setShowAddTextModal(false)} on_submit={handleAddNewProject} t={t} />}
      {editingProject && <EditProjectModal project={editingProject} on_close={() => setEditingProject(null)} on_submit={handleUpdateProject} t={t} />}
      {editingTextBlock && <EditTextModal project={editingTextBlock} on_close={() => setEditingTextBlock(null)} on_submit={(updated) => { handleUpdateProject(updated); setEditingTextBlock(null); }} t={t} />}
      {showShareModal && <ShareModal portfolioId={portfolio.id} on_close={() => setShowShareModal(false)} t={t} />}

      {portfolio.projects && portfolio.projects.length > 0 ? (
        <GridLayout
          className="layout"
          layout={generateLayout()}
          cols={12}
          rowHeight={100}
          onResizeStop={handleLayoutChange}
          onDragStop={handleLayoutChange}
          isDraggable={isOwner && isEditMode}
          isResizable={isOwner && isEditMode}
          compactType={null}
          draggableCancel=".project-card-actions"
        >
          {portfolio.projects.map(project => {
            const cardStyles = {};
            if (project.background_image) {
              cardStyles.backgroundImage = `url(${project.background_image})`;
              cardStyles.backgroundPosition = 'center';
              cardStyles.backgroundSize = 'cover'; // Changed back to 'cover'
              cardStyles.backgroundRepeat = 'no-repeat';
            } else if (project.background_color) {
              cardStyles.backgroundColor = project.background_color;
            }



            const processedFontSize = addPxIfNeeded(project.font_size);

            const titleStyles = {
              color: project.text_color,
              fontSize: processedFontSize || `${Math.min(Math.sqrt((project.layout_w || 4) * (project.layout_h || 4)) * 8, 48)}px`
            };
            const descriptionStyles = {
              color: project.text_color,
              fontSize: processedFontSize ? `calc(${processedFontSize} * 0.7)` : `${Math.min(Math.sqrt((project.layout_w || 4) * (project.layout_h || 4)) * 4, 24)}px`
            };

            return (
              <div
                key={project.id.toString()}
                data-grid={{ x: project.layout_x, y: project.layout_y, w: project.layout_w, h: project.layout_h }}
              >
                {project.type === 'text' ? (
                  <TextEditBlock
                    project={project}
                    onContentUpdate={(updatedProject) => handleUpdateProject(updatedProject)}
                    onDelete={handleDeleteProject}
                    onEdit={(proj) => setEditingTextBlock(proj)}
                    isEditMode={isOwner && isEditMode}
                  />
                ) : (
                  <div
                    className={`project-card`}
                    style={{ ...cardStyles, height: '100%', position: 'relative' }}
                    onClick={() => !isEditMode && navigate(`/portfolio/${portfolioId}/project/${project.id}`)}
                  >
                    <div className="project-card-overlay"></div>
                    <div className="project-card-content" style={{ background: 'transparent', position: 'relative', zIndex: 2 }}>
                      <h3 style={titleStyles}>{project.title}</h3>
                      <p style={descriptionStyles}>{project.description}</p>
                    </div>

                    {project.tags && project.tags.length > 0 && (
                      <div className="project-card-tags">
                        {project.tags.map(tag => <span key={tag} className="project-tag">{t(`header_category_${tag}`)}</span>)}
                      </div>
                    )}

                    {isOwner && isEditMode && (
                      <div className="project-card-actions">
                        <button className="project-action-icon view-button" onClick={(e) => { e.stopPropagation(); navigate(`/portfolio/${portfolioId}/project/${project.id}`); }}>
                          <i className="material-icons">open_in_new</i>
                        </button>
                        <button className="project-action-icon" onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>
                          <i className="material-icons">edit</i>
                        </button>
                        <button className="project-action-icon delete-button" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                          <i className="material-icons">delete</i>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          }
          )}
        </GridLayout>
      ) : (
        <div className="no-projects-message">
          {isOwner && isEditMode ? (
            <p>{t('portfolio_no_projects_owner')}</p>
          ) : (
            <p>{t('portfolio_no_projects_viewer')}</p>
          )}
        </div>
      )}
    </div>
  );
}
