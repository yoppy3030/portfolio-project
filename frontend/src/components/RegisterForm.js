// 必要なライブラリやフックをインポート
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../RegisterForm.css"; // このコンポーネント専用のスタイルシート

// 新規登録フォームコンポーネント
export default function RegisterForm({ theme }) {
  const navigate = useNavigate(); // ページ遷移を制御するためのフック
  // フォームの入力値をまとめて管理するState
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password2: "", // パスワード確認用
    icon: null,      // アイコン画像（Base64形式で保持）
    profile: "",
    agree: false,    // 利用規約同意チェック
  });
  // パスワードの表示/非表示を切り替えるためのState
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

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
    const { name, value, type, checked, files } = e.target;
    
    // ファイル入力の場合の特別な処理
    if (type === "file" && files[0]) {
      // FileReaderを使って、選択された画像ファイルをBase64形式の文字列に変換
      const reader = new FileReader();
      reader.onload = (event) => {
        // 変換完了後、フォームのState（icon）を更新
        setForm(f => ({
          ...f,
          [name]: event.target.result
        }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      // テキスト入力やチェックボックスの場合
      setForm(f => ({
        ...f,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // フォームが送信されたとき（登録ボタンがクリックされたとき）に呼ばれる関数
  const handleSubmit = async (e) => {
    e.preventDefault(); // フォーム送信によるページの再読み込みを防ぐ

    // バリデーション（入力値のチェック）
    if (form.password !== form.password2) {
      alert("パスワードが一致しません");
      return; // 処理を中断
    }

    if (!form.agree) {
      alert("利用規約・プライバシーポリシーへの同意が必要です");
      return; // 処理を中断
    }

    try {
      // バックエンドの新規登録APIにリクエストを送信
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          iconUrl: form.icon, // Base64エンコードされたアイコン画像
          bio: form.profile
        })
      });

      const data = await res.json(); // レスポンスをJSONとして解析
      
      if (data.success) {
        // 登録に成功した場合
        alert("登録完了しました！ログインページに移動します。");
        navigate('/login'); // ログインページに遷移
      } else {
        // 登録に失敗した場合（ユーザー名の重複など）
        alert(`エラー: ${data.error || "不明なエラーが発生しました"}`);
      }
    } catch (error) {
      // サーバーとの通信自体に失敗した場合
      console.error("登録エラー:", error);
      alert("サーバーに接続できません。バックエンドサーバーが起動しているか、ネットワーク接続を確認してください。");
    }
  };

  // コンポーネントの描画部分
  return (
    <div className={`main-content ${theme}-theme`}>
      <div className="register-form-wrapper">
        <form className="register-form" onSubmit={handleSubmit}>
          <h2>新規登録</h2>
          {/* ユーザー名入力欄 */}
          <div className="input-row">
            <label htmlFor="name">ユーザー名</label>
            <input id="name" name="name" type="text" value={form.name} onChange={handleChange} required />
          </div>
          {/* メールアドレス入力欄 */}
          <div className="input-row">
            <label htmlFor="email">メールアドレス</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          {/* パスワード入力欄 */}
          <div className="input-row">
            <label htmlFor="password">パスワード</label>
            <div className="pw-input-wrapper">
              <input id="password" name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} required autoComplete="new-password" />
              <button type="button" className="pw-toggle" onClick={() => setShowPassword(sp => !sp)} aria-label={showPassword ? "非表示" : "表示"} tabIndex={-1}>
                {showPassword ? EyeOpen : EyeClosed}
              </button>
            </div>
          </div>
          {/* パスワード（確認用）入力欄 */}
          <div className="input-row">
            <label htmlFor="password2">パスワード再入力</label>
            <div className="pw-input-wrapper">
              <input id="password2" name="password2" type={showPassword2 ? "text" : "password"} value={form.password2} onChange={handleChange} required autoComplete="new-password" />
              <button type="button" className="pw-toggle" onClick={() => setShowPassword2(sp => !sp)} aria-label={showPassword2 ? "非表示" : "表示"} tabIndex={-1}>
                {showPassword2 ? EyeOpen : EyeClosed}
              </button>
            </div>
          </div>
          {/* アイコン画像選択 */}
          <div className="input-row">
            <label htmlFor="icon">アイコン画像</label>
            <input id="icon" name="icon" type="file" accept="image/*" onChange={handleChange} />
          </div>
          {/* 自己紹介入力欄 */}
          <div className="input-row">
            <label htmlFor="profile">自己紹介</label>
            <input id="profile" name="profile" type="text" value={form.profile} onChange={handleChange} />
          </div>
          {/* 利用規約同意チェックボックス */}
          <div className="checkbox-label">
            <input id="agree" name="agree" type="checkbox" checked={form.agree} onChange={handleChange} required />
            <label htmlFor="agree">利用規約・プライバシーポリシーに同意する（必須）</label>
          </div>
          {/* ボタン類 */}
          <div className="form-actions">
            <button type="submit">登録</button>
            <button type="button" onClick={() => window.history.back()}>戻る</button>
          </div>
        </form>
      </div>
    </div>
  );
}