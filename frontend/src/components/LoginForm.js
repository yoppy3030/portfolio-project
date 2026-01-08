import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../LoginForm.css";

// ログイン画面のコンポーネント
export default function LoginForm(props) {
  const navigate = useNavigate(); // ページ遷移用フック
  const location = useLocation(); // 現在のURLロケーション情報取得用フック

  // --- ステート（状態変数） ---
  // フォーム入力値（メール、パスワード、自動ログインフラグ）
  const [form, setForm] = useState({ email: "", password: "", autoLogin: false });
  // パスワードを表示するかどうかのフラグ
  const [showPassword, setShowPassword] = useState(false);

  // 目のアイコン
  const EyeOpen = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="12" rx="7" ry="5.5" stroke="#2196F3" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.3" fill="#2196F3" />
    </svg>
  );
  const EyeClosed = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="12" rx="7" ry="5.5" stroke="#bbb" strokeWidth="2" />
      <line x1="5" y1="19" x2="19" y2="5" stroke="#bbb" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.3" fill="#bbb" />
    </svg>
  );

  // 入力フォームの変更ハンドラ
  // inputタグの name 属性を使って、対応するステートを更新します
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  // ログインボタンが押された時の処理
  const handleSubmit = async (e) => {
    e.preventDefault(); // デフォルトのフォーム送信動作をキャンセル

    try {
      // サーバーのログインAPIへリクエストを送信
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          autoLogin: form.autoLogin
        })
      });

      const data = await res.json();

      if (data.success) {
        // ログイン成功時
        // 親コンポーネント（App.js）の onLogin 関数を呼び出して、ユーザー情報とトークンを渡します
        // ログイン前のページ（from）があればそこへ、なければウェルカムページへリダイレクトします
        if (props.onLogin) {
          const redirectTo = location.state?.from?.pathname || '/welcome';
          props.onLogin(data.user, data.token, form.autoLogin, redirectTo);
        }

        // フォームをリセット
        setForm({ email: "", password: "", autoLogin: false });

      } else {
        // ログイン失敗時
        alert(`エラー: ${data.error || "不明なエラーが発生しました"}`);
      }
    } catch (error) {
      console.error("ログインエラー:", error);
      alert("サーバーに接続できません。バックエンドサーバーが起動しているか、ネットワーク接続を確認してください。");
    }
  };

  return (
    <div className="main-content">
      <div className="login-form-wrapper">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>ログイン</h2>
          <div className="input-row">
            <label htmlFor="email">メールアドレスまたはユーザー名</label>
            <input
              id="email"
              name="email"
              type="text"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
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
                autoComplete="current-password"
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
          <div className="checkbox-label">
            <input
              type="checkbox"
              name="autoLogin"
              checked={form.autoLogin}
              onChange={handleChange}
              id="autoLogin"
            />
            <label htmlFor="autoLogin">次回から自動ログイン</label>
          </div>
          <div className="form-actions">
            <button type="submit">ログイン</button>
            <button type="button" onClick={() => window.history.back()}>戻る</button>
          </div>
          <div className="login-links">
            <p>パスワードを忘れた場合 <a href="/password-reset" className="link-text">［パスワード再発行］</a></p>
            <p>初めての方はこちら <a href="/register" className="text-btn">［新規登録］</a></p>
          </div>
        </form>
      </div>
    </div>
  );
}
