import React, { useState } from "react";
import "../PasswordReset.css";

export default function PasswordReset() {
  const [form, setForm] = useState({
    email: "",
    verificationCode: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSendCode = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email })
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        // 開発環境では認証コードを表示
        if (data.code) {
          alert(`開発環境用認証コード: ${data.code}`);
        }
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch (error) {
      console.error("認証コード送信エラー:", error);
      alert("サーバーに接続できません");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      alert("パスワードが一致しません");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          verificationCode: form.verificationCode,
          newPassword: form.newPassword
        })
      });

      if (res.ok) {
        alert("パスワードが再設定されました");
        window.location.href = '/login';
      } else {
        alert("認証コードが間違っているか、期限切れです");
      }
    } catch (error) {
      console.error("パスワード再設定エラー:", error);
      alert("サーバーに接続できません");
    }
  };

  return (
    <div className="main-content">
      <div className="password-reset-wrapper">
        <h1 className="page-title">パスワード再設定</h1>
        <form className="password-reset-form" onSubmit={handleSubmit}>
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
          
          <div className="send-code-section">
            <button type="button" className="send-code-btn" onClick={handleSendCode}>
              認証コード送信
            </button>
          </div>

          <div className="input-row">
            <label htmlFor="verificationCode">認証コード</label>
            <input
              id="verificationCode"
              name="verificationCode"
              type="text"
              value={form.verificationCode}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-row">
            <label htmlFor="newPassword">新パスワード</label>
            <div className="pw-input-wrapper">
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                value={form.newPassword}
                onChange={handleChange}
                required
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
            <label htmlFor="confirmPassword">新パスワード確認</label>
            <div className="pw-input-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowConfirmPassword(sp => !sp)}
                aria-label={showConfirmPassword ? "非表示" : "表示"}
                tabIndex={-1}
              >
                {showConfirmPassword ? EyeOpen : EyeClosed}
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit">再設定する</button>
            <button type="button" onClick={() => window.history.back()}>戻る</button>
          </div>
        </form>
      </div>
    </div>
  );
}
