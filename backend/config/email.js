// メール送信設定（本番環境用）
const nodemailer = require('nodemailer');

// メール送信設定
const transporter = nodemailer.createTransporter({
  service: 'gmail', // または他のメールサービス
  auth: {
    user: process.env.EMAIL_USER, // 環境変数から取得
    pass: process.env.EMAIL_PASSWORD // 環境変数から取得
  }
});

// 認証コード送信関数
const sendVerificationCode = async (email, code) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'パスワード再設定の認証コード',
      html: `
        <h2>パスワード再設定</h2>
        <p>以下の認証コードを入力してください：</p>
        <h3 style="color: #2196F3;">${code}</h3>
        <p>この認証コードは10分間有効です。</p>
        <p>心当たりがない場合は、このメールを無視してください。</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`認証コードを ${email} に送信しました`);
  } catch (error) {
    console.error('メール送信エラー:', error);
    throw error;
  }
};

module.exports = { sendVerificationCode };
