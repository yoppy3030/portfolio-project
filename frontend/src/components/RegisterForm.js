import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../RegisterForm.css";

export default function RegisterForm({ theme }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password2: "",
    icon: null,
    profile: "",
    agree: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

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
      <line x1="5" y1="19" x2="19" y2="5" stroke="#bbb" strokeWidth="2"/>
      <circle cx="12" cy="12" r="2.3" fill="#bbb" />
    </svg>
  );

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "file" && files[0]) {
      // ファイルをBase64に変換
      const reader = new FileReader();
      reader.onload = (event) => {
        setForm(f => ({
          ...f,
          [name]: event.target.result
        }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setForm(f => ({
        ...f,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // 登録ボタン押下時
    const handleSubmit = async (e) => {
    e.preventDefault();

    // バリデーション
    if (form.password !== form.password2) {
      alert("パスワードが一致しません");
      return;
    }

    if (!form.agree) {
      alert("利用規約・プライバシーポリシーへの同意が必要です");
      return;
    }

    try {
      // サーバ通信
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          iconUrl: form.icon // Base64エンコードされたアイコン
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert("登録完了しました！ログインページに移動します。");
        // ログインページに移動
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
          <div className="input-row">
            <label htmlFor="profile">プロフィール</label>
            <input
              id="profile"
              name="profile"
              type="text"
              value={form.profile}
              onChange={handleChange}
            />
          </div>
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
          <div className="form-actions">
            <button type="submit">登録</button>
            <button type="button" onClick={() => window.history.back()}>戻る</button>
          </div>
        </form>
      </div>
    </div>
  );
}
