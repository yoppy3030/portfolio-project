// Reactの基本機能をインポート
import React, { useState } from "react";
// ページ遷移用のフック
import { useNavigate } from "react-router-dom";
// スタイルシート
import "../RegisterForm.css";

/**
 * 新規ユーザー登録フォームコンポーネント
 * 
 * ユーザー名、メールアドレス、パスワード、アイコン画像、自己紹介を入力して
 * 新しいアカウントを作成します。
 * 
 * @param {string} theme - 現在のテーマ（light/dark）
 */
export default function RegisterForm({ theme }) {
  // ページ遷移用の関数
  const navigate = useNavigate();

  // フォームの入力内容を管理する状態
  const [form, setForm] = useState({
    name: "",           // ユーザー名
    email: "",          // メールアドレス
    password: "",       // パスワード
    password2: "",      // パスワード確認用
    icon: null,         // アイコン画像ファイル
    profile: "",        // 自己紹介
    agree: false,       // 利用規約への同意
  });

  // パスワード表示/非表示の状態
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  // パスワード表示用の目のアイコン（開いた目）
  const EyeOpen = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="12" rx="7" ry="5.5" stroke="#2196F3" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.3" fill="#2196F3" />
    </svg>
  );

  // パスワード非表示用の目のアイコン（閉じた目）
  const EyeClosed = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="12" rx="7" ry="5.5" stroke="#bbb" strokeWidth="2" />
      <line x1="5" y1="19" x2="19" y2="5" stroke="#bbb" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.3" fill="#bbb" />
    </svg>
  );

  /**
   * フォームの入力値が変更されたときの処理
   * ファイル選択、チェックボックス、テキスト入力に対応
   */
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === "file" && files[0]) {
      // ファイル選択の場合: Fileオブジェクトを保存
      setForm(f => ({
        ...f,
        [name]: files[0]
      }));
    } else {
      // テキスト入力やチェックボックスの場合
      setForm(f => ({
        ...f,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  /**
   * 登録ボタンが押されたときの処理
   * バリデーション後、サーバーに登録リクエストを送信
   */
  const handleSubmit = async (e) => {
    e.preventDefault(); // ページリロードを防止

    // パスワード一致チェック
    if (form.password !== form.password2) {
      alert("パスワードが一致しません");
      return;
    }

    // 利用規約同意チェック
    if (!form.agree) {
      alert("利用規約・プライバシーポリシーへの同意が必要です");
      return;
    }

    try {
      // FormDataを作成（ファイルアップロード対応）
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('password', form.password);

      if (form.icon) {
        formData.append('icon', form.icon);
      }

      if (form.profile) {
        formData.append('bio', form.profile);
      }

      // サーバーに登録リクエストを送信
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        alert("登録完了しました！ログインページに移動します。");
        navigate('/login');
      } else {
        alert(`エラー: ${data.error || "不明なエラーが発生しました"}`);
      }
    } catch (error) {
      console.error("登録エラー:", error);
      alert("サーバーに接続できません。バックエンドサーバーが起動しているか、ネットワーク接続を確認してください。");
    }
  };

  return (
    <div className={`main-content ${theme}-theme`}>
      <div className="register-form-wrapper">
        <form className="register-form" onSubmit={handleSubmit}>
          <h2>新規登録</h2>

          {/* ユーザー名入力欄 */}
          <div className="input-row">
            <label htmlFor="name">ユーザー名</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* メールアドレス入力欄 */}
          <div className="input-row">
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* パスワード入力欄 */}
          <div className="input-row">
            <label htmlFor="password">パスワード</label>
            <div className="pw-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword(sp => !sp)}
                aria-label={showPassword ? "非表示" : "表示"}
                tabIndex={-1}
              >
                {showPassword ? EyeOpen : EyeClosed}
              </button>
            </div>
          </div>

          {/* パスワード確認入力欄 */}
          <div className="input-row">
            <label htmlFor="password2">パスワード再入力</label>
            <div className="pw-input-wrapper">
              <input
                id="password2"
                name="password2"
                type={showPassword2 ? "text" : "password"}
                value={form.password2}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword2(sp => !sp)}
                aria-label={showPassword2 ? "非表示" : "表示"}
                tabIndex={-1}
              >
                {showPassword2 ? EyeOpen : EyeClosed}
              </button>
            </div>
          </div>

          {/* アイコン画像選択欄 */}
          <div className="input-row">
            <label htmlFor="icon">アイコン画像</label>
            <input
              id="icon"
              name="icon"
              type="file"
              accept="image/*"
              onChange={handleChange}
            />
          </div>

          {/* 自己紹介入力欄 */}
          <div className="input-row">
            <label htmlFor="profile">自己紹介</label>
            <input
              id="profile"
              name="profile"
              type="text"
              value={form.profile}
              onChange={handleChange}
            />
          </div>

          {/* 利用規約同意チェックボックス */}
          <div className="checkbox-label">
            <input
              id="agree"
              name="agree"
              type="checkbox"
              checked={form.agree}
              onChange={handleChange}
              required
            />
            <label htmlFor="agree">利用規約・プライバシーポリシーに同意する（必須）</label>
          </div>

          {/* ボタンエリア */}
          <div className="form-actions">
            <button type="submit">登録</button>
            <button type="button" onClick={() => window.history.back()}>戻る</button>
          </div>
        </form>
      </div>
    </div>
  );
}
