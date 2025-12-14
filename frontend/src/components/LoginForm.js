// 必要なライブラリやフックをインポート
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../LoginForm.css"; // このコンポーネント専用のスタイルシート

// ログインフォームコンポーネント
export default function LoginForm(props) {
  const navigate = useNavigate(); // ページ遷移を制御するためのフック
  const location = useLocation(); // 現在のURLや遷移元の情報を取得するためのフック
  // フォームの入力値をまとめて管理するState
  const [form, setForm] = useState({ email: "", password: "", autoLogin: false });
  // パスワードの表示/非表示を切り替えるためのState
  const [showPassword, setShowPassword] = useState(false);

  // パスワード表示用の「開いた目」のSVGアイコン
  const EyeOpen = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="12" rx="7" ry="5.5" stroke="#2196F3" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.3" fill="#2196F3" />
    </svg>
  );
  // パスワード非表示用の「閉じた目」のSVGアイコン
  const EyeClosed = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="12" rx="7" ry="5.5" stroke="#bbb" strokeWidth="2" />
      <line x1="5" y1="19" x2="19" y2="5" stroke="#bbb" strokeWidth="2"/>
      <circle cx="12" cy="12" r="2.3" fill="#bbb" />
    </svg>
  );

  // フォームの入力値が変更されたときに呼ばれる関数
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // フォームのStateを更新
    setForm(f => ({ 
      ...f, 
      [name]: type === "checkbox" ? checked : value // チェックボックスの場合はcheckedを、それ以外はvalueをセット
    }));
  };

  // フォームが送信されたとき（ログインボタンがクリックされたとき）に呼ばれる関数
  const handleSubmit = async (e) => {
    e.preventDefault(); // フォーム送信によるページの再読み込みを防ぐ

    try {
      // バックエンドのログインAPIにリクエストを送信
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          autoLogin: form.autoLogin
        })
      });

      const data = await res.json(); // レスポンスをJSONとして解析
      
      if (data.success) {
        // ログインに成功した場合
        // 親コンポーネント(App.js)から渡されたonLogin関数を実行して、ユーザー情報やトークンを渡す
        if (props.onLogin) {
          // ログイン後に遷移する先のパスを決定（遷移元があればそこへ、なければ/welcomeへ）
          const redirectTo = location.state?.from?.pathname || '/welcome';
          props.onLogin(data.user, data.token, form.autoLogin, redirectTo);
        }
        
        // フォームの入力値をリセット
        setForm({ email: "", password: "", autoLogin: false });
        
      } else {
        // ログインに失敗した場合
        alert(`エラー: ${data.error || "不明なエラーが発生しました"}`);
      }
    } catch (error) {
      // サーバーとの通信自体に失敗した場合
      console.error("ログインエラー:", error);
      alert("サーバーに接続できません。バックエンドサーバーが起動しているか、ネットワーク接続を確認してください。");
    }
  };

  // コンポーネントの描画部分
  return (
    <div className="main-content">
      <div className="login-form-wrapper">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>ログイン</h2>
          {/* メールアドレスまたはユーザー名入力欄 */}
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
          {/* パスワード入力欄 */}
          <div className="input-row">
            <label htmlFor="password">パスワード</label>
            <div className="pw-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"} // showPasswordの状態によってtypeを切り替え
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
              {/* パスワード表示/非表示切り替えボタン */}
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword(sp => !sp)}
                aria-label={showPassword ? "非表示" : "表示"}
                tabIndex={-1} // Tabキーでのフォーカス移動の対象外にする
              >
                {showPassword ? EyeOpen : EyeClosed}
              </button>
            </div>
          </div>
          {/* 自動ログインのチェックボックス */}
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
          {/* ボタン類 */}
          <div className="form-actions">
            <button type="submit">ログイン</button>
            <button type="button" onClick={() => window.history.back()}>戻る</button>
          </div>
          {/* リンク */}
          <div className="login-links">
            <p>パスワードを忘れた場合 <a href="/password-reset" className="link-text">［パスワード再発行］</a></p>
            <p>初めての方はこちら <a href="/register" className="text-btn">［新規登録］</a></p>
          </div>
        </form>
      </div>
    </div>
  );
}