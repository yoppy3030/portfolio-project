// 必要なライブラリの読み込み
require('dotenv').config(); // 環境変数を読み込み
const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const helmet = require('helmet'); // セキュリティヘッダー用
const rateLimit = require('express-rate-limit'); // レート制限用

const app = express();

// 本番環境用のセキュリティ設定（開発環境では無効化）
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
}

// レート制限設定（開発環境では緩く設定）
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 本番環境では厳しく
  message: {
    success: false,
    error: 'リクエストが多すぎます。しばらく待ってから再試行してください。'
  }
});
app.use(limiter);

// ログイン用の厳しいレート制限
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 開発環境では緩く
  message: {
    success: false,
    error: 'ログイン試行回数が多すぎます。15分後に再試行してください。'
  }
});

app.use(express.json({ limit: '10mb' })); // リクエストサイズ制限
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5001'].filter(Boolean),
  credentials: true
}));

// 環境変数から設定を取得
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'portfolio_user',
  password: process.env.DB_PASSWORD || 'pfBuilder2025',
  database: process.env.DB_NAME || 'portfolio_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// MySQLデータベースへの接続（本番環境用プール）
const db = mysql.createPool(DB_CONFIG);

// データベース接続確認
db.getConnection((err, connection) => {
  if (err) {
    console.error('データベース接続エラー:', err);
    process.exit(1);
  }
  console.log('データベースに接続しました');
  connection.release();
});

// JWTトークン検証ミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'アクセストークンが必要です' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: '無効なトークンです' });
    }
    req.user = user;
    next();
  });
};

// 期限切れの認証コードを削除する関数
const cleanupExpiredCodes = () => {
  db.query(
    'DELETE FROM verification_codes WHERE expires_at < NOW()',
    (err) => {
      if (err) {
        console.error('期限切れ認証コード削除エラー:', err);
      }
    }
  );
};

// 定期的に期限切れの認証コードを削除（1時間ごと）
setInterval(cleanupExpiredCodes, 60 * 60 * 1000);

// 新規ユーザー登録API
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, iconUrl } = req.body;

    // 入力データの検証
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: '必須フィールドが不足しています' 
      });
    }

    // パスワード強度チェック
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'パスワードは8文字以上で入力してください'
      });
    }

    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '有効なメールアドレスを入力してください'
      });
    }

    // パスワードを安全なハッシュに変換
    const hash = await bcrypt.hash(password, 12); // 本番環境ではより高いラウンド数

    // ユーザーが既に存在するかチェック
    db.query(
      'SELECT id FROM users WHERE email = ? OR name = ?',
      [email, name],
      (err, results) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ 
            success: false, 
            error: 'データベースエラーが発生しました' 
          });
        }

        if (results.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'このメールアドレスまたはユーザー名は既に使用されています'
          });
        }

        // usersテーブルへINSERT
                db.query(
          'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
          [name, email, hash],
          (err, result) => {
            if (err) {
              console.error('データベースエラー:', err);
              return res.status(500).json({ 
                success: false, 
                error: 'データベースエラーが発生しました' 
              });
            }
            res.json({ 
              success: true, 
              message: 'ユーザー登録が完了しました',
              userId: result.insertId 
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ 
      success: false, 
      error: 'サーバーエラーが発生しました' 
    });
  }
});

// ログインAPI（レート制限適用）
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, autoLogin } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'メールアドレスとパスワードを入力してください' 
      });
    }

        db.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = ? OR name = ?',
      [email, email],
      async (err, results) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ 
            success: false, 
            error: 'データベースエラーが発生しました' 
          });
        }

        if (results.length === 0) {
          return res.status(401).json({ 
            success: false, 
            error: 'メールアドレスまたはパスワードが正しくありません' 
          });
        }

        const user = results[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
          return res.status(401).json({ 
            success: false, 
            error: 'メールアドレスまたはパスワードが正しくありません' 
          });
        }

        // JWTトークンを生成
        const tokenExpiry = autoLogin ? '30d' : '1d';
        const token = jwt.sign(
          { 
            id: user.id, 
            email: user.email,
            name: user.name 
          },
          JWT_SECRET,
          { expiresIn: tokenExpiry }
        );

        res.json({ 
          success: true, 
          message: 'ログインしました',
          token: token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            iconUrl: '/default-avatar.png'
          }
        });
      }
    );
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ 
      success: false, 
      error: 'サーバーエラーが発生しました' 
    });
  }
});

// トークン検証API
app.get('/api/verify-token', authenticateToken, (req, res) => {
    db.query(
    'SELECT id, name, email FROM users WHERE id = ?',
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'データベースエラーが発生しました' 
        });
      }

      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'ユーザーが見つかりません' 
        });
      }

      const user = results[0];
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          iconUrl: '/default-avatar.png'
        }
      });
    }
  );
});

// 認証コード送信API
app.post('/api/send-verification-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'メールアドレスを入力してください' 
      });
    }

    db.query(
      'SELECT id, email FROM users WHERE email = ?',
      [email],
      (err, results) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ 
            success: false, 
            error: 'データベースエラーが発生しました' 
          });
        }

        if (results.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: 'メールアドレスが見つかりません' 
          });
        }

        const code = crypto.randomInt(100000, 999999).toString();
        
        db.query(
          'UPDATE verification_codes SET used = TRUE WHERE email = ? AND used = FALSE',
          [email],
          (err) => {
            if (err) {
              console.error('既存認証コード無効化エラー:', err);
            }
          }
        );

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        db.query(
          'INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)',
          [email, code, expiresAt],
          (err) => {
            if (err) {
              console.error('認証コード保存エラー:', err);
              return res.status(500).json({ 
                success: false, 
                error: '認証コードの保存に失敗しました' 
              });
            }

            // 本番環境では実際のメール送信を実装
            if (process.env.NODE_ENV === 'production') {
              // メール送信処理（実装が必要）
              console.log(`本番環境: 認証コード ${code} を ${email} に送信`);
            } else {
              console.log(`開発環境: 認証コード ${code} を ${email} に送信`);
            }

            res.json({ 
              success: true, 
              message: '認証コードを送信しました'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ 
      success: false, 
      error: 'サーバーエラーが発生しました' 
    });
  }
});

// パスワード再設定API
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, verificationCode, newPassword } = req.body;

    if (!email || !verificationCode || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: '必須フィールドが不足しています' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'パスワードは8文字以上で入力してください'
      });
    }

    db.query(
      'SELECT id, code FROM verification_codes WHERE email = ? AND code = ? AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, verificationCode],
      async (err, results) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ 
            success: false, 
            error: 'データベースエラーが発生しました' 
          });
        }

        if (results.length === 0) {
          return res.status(400).json({ 
            success: false, 
            error: '認証コードが正しくないか、期限切れです' 
          });
        }

        const hash = await bcrypt.hash(newPassword, 12);

        db.query(
          'UPDATE users SET password_hash = ? WHERE email = ?',
          [hash, email],
          (err, result) => {
            if (err) {
              console.error('データベースエラー:', err);
              return res.status(500).json({ 
                success: false, 
                error: 'データベースエラーが発生しました' 
              });
            }

            db.query(
              'UPDATE verification_codes SET used = TRUE WHERE email = ? AND code = ?',
              [email, verificationCode],
              (err) => {
                if (err) {
                  console.error('認証コード使用済みマークエラー:', err);
                }
              }
            );

            res.json({ 
              success: true, 
              message: 'パスワードが再設定されました' 
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ 
      success: false, 
      error: 'サーバーエラーが発生しました' 
    });
  }
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.error('未処理エラー:', err);
  res.status(500).json({
    success: false,
    error: 'サーバーエラーが発生しました'
  });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'エンドポイントが見つかりません'
  });
});

const PORT = process.env.PORT || 5000;

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました`);
  console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
  console.log('APIエンドポイント:');
  console.log('  - 新規登録: POST /api/register');
  console.log('  - ログイン: POST /api/login');
  console.log('  - トークン検証: GET /api/verify-token');
  console.log('  - 認証コード送信: POST /api/send-verification-code');
  console.log('  - パスワード再設定: POST /api/reset-password');
});
