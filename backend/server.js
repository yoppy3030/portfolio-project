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
const bodyParser = require('body-parser'); // body-parserをインポート

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

app.use(bodyParser.json({ limit: '10mb' })); // express.json()の代わりにbodyParser.json()を使用
app.use(bodyParser.urlencoded({ extended: true })); // urlencodedを追加

app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5001'].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // メソッドを明示的に許可
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
    const { name, email, password, iconUrl, bio } = req.body;

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
                let columns = ['name', 'email', 'password_hash'];
        let placeholders = ['?', '?', '?'];
        let values = [name, email, hash];

        if (iconUrl) {
          columns.push('iconUrl');
          placeholders.push('?');
          values.push(iconUrl);
        }

        if (bio) {
          columns.push('bio');
          placeholders.push('?');
          values.push(bio);
        }

        db.query(
          `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
          values,
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
      'SELECT id, name, email, password_hash, bio, iconUrl, email_notifications, feature_announcements, maintenance_info, language, theme FROM users WHERE email = ? OR name = ?',
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

        // パスワードハッシュを削除してからユーザー情報を返す
        delete user.password_hash;

        res.json({ 
          success: true, 
          message: 'ログインしました',
          token: token,
          user: user
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
    'SELECT id, name, email, bio, iconUrl, email_notifications, feature_announcements, maintenance_info, language, theme FROM users WHERE id = ?',
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
        user: user
      });
    }
  );
});

// プロフィール更新API
app.put('/api/profile', authenticateToken, (req, res) => {
  try {
    const { id } = req.user;
    const { name, bio, iconUrl } = req.body;

    // 更新するフィールドを動的に構築
    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (bio) fieldsToUpdate.bio = bio;
    if (iconUrl) fieldsToUpdate.iconUrl = iconUrl;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        error: '更新するフィールドがありません。'
      });
    }

    db.query(
      'UPDATE users SET ? WHERE id = ?',
      [fieldsToUpdate, id],
      (err, result) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ 
            success: false, 
            error: 'データベースエラーが発生しました' 
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ 
            success: false, 
            error: 'ユーザーが見つかりません' 
          });
        }

        // 更新後のユーザー情報を取得して返す
        db.query('SELECT id, name, email, bio, iconUrl, email_notifications, feature_announcements, maintenance_info, language, theme FROM users WHERE id = ?', [id], (err, results) => {
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
                error: '更新後のユーザー情報が見つかりません'
            });
          }
          res.json({ 
            success: true, 
            message: 'プロフィールが更新されました',
            user: results[0]
          });
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

// パスワード変更API
app.post('/api/change-password', authenticateToken, async (req, res) => {
  try {
    const { id } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: '現在のパスワードと新しいパスワードを入力してください' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: '新しいパスワードは8文字以上で入力してください'
      });
    }

    db.query('SELECT password_hash FROM users WHERE id = ?', [id], async (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }

      if (results.length === 0) {
        return res.status(404).json({ success: false, error: 'ユーザーが見つかりません' });
      }

      const user = results[0];
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: '現在のパスワードが正しくありません' });
      }

      const hash = await bcrypt.hash(newPassword, 12);

      db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id], (err, result) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
        }

        res.json({ success: true, message: 'パスワードが変更されました' });
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// 通知設定更新API
app.put('/api/notifications', authenticateToken, (req, res) => {
  try {
    const { id } = req.user;
    const { email_notifications, feature_announcements, maintenance_info } = req.body;

    const fieldsToUpdate = {
      email_notifications: email_notifications,
      feature_announcements: feature_announcements,
      maintenance_info: maintenance_info
    };

    db.query(
      'UPDATE users SET ? WHERE id = ?',
      [fieldsToUpdate, id],
      (err, result) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, error: 'ユーザーが見つかりません' });
        }

        res.json({ success: true, message: '通知設定が更新されました' });
      }
    );
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// アカウント削除API
app.delete('/api/account', authenticateToken, async (req, res) => {
  try {
    const { id } = req.user;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'パスワードを入力してください' });
    }

    db.query('SELECT password_hash FROM users WHERE id = ?', [id], async (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }

      if (results.length === 0) {
        return res.status(404).json({ success: false, error: 'ユーザーが見つかりません' });
      }

      const user = results[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: 'パスワードが正しくありません' });
      }

      db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
        }

        res.json({ success: true, message: 'アカウントが削除されました' });
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// 一般設定更新API
app.put('/api/general-settings', authenticateToken, (req, res) => {
  try {
    const { id } = req.user;
    const { language, theme } = req.body;

    const fieldsToUpdate = {};
    if (language) fieldsToUpdate.language = language;
    if (theme) fieldsToUpdate.theme = theme;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        error: '更新するフィールドがありません。'
      });
    }

    db.query(
      'UPDATE users SET ? WHERE id = ?',
      [fieldsToUpdate, id],
      (err, result) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({
            success: false,
            error: 'データベースエラーが発生しました'
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            error: 'ユーザーが見つかりません'
          });
        }

        // 更新後のユーザー情報を取得して返す
        db.query('SELECT id, name, email, bio, iconUrl, email_notifications, feature_announcements, maintenance_info, language, theme FROM users WHERE id = ?', [id], (err, results) => {
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
                error: '更新後のユーザー情報が見つかりません'
            });
          }
          res.json({
            success: true,
            message: '一般設定が更新されました',
            user: results[0]
          });
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

// 新規ポートフォリオ作成API
// Required table schema for 'portfolios' table:
// CREATE TABLE portfolios (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   user_id INT NOT NULL,
//   title VARCHAR(255) NOT NULL,
//   template VARCHAR(255) NOT NULL,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
// );
app.post('/api/portfolios', authenticateToken, (req, res) => {
  try {
    const { id: userId } = req.user;
    const { title, template } = req.body;

    if (!title || !template) {
      return res.status(400).json({
        success: false,
        error: 'タイトルとテンプレートは必須です。'
      });
    }

    db.query(
      'INSERT INTO portfolios (user_id, title, template) VALUES (?, ?, ?)',
      [userId, title, template],
      (err, result) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({
            success: false,
            error: 'ポートフォリオの作成中にデータベースエラーが発生しました。'
          });
        }

        const newPortfolioId = result.insertId;
        res.status(201).json({
          success: true,
          message: 'ポートフォリオが正常に作成されました。',
          portfolio: {
            id: newPortfolioId,
            user_id: userId,
            title: title,
            template: template
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

// ポートフォリオ詳細取得API
app.get('/api/portfolios/:portfolioId', authenticateToken, (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { id: userId } = req.user;

    // First, get portfolio details and verify ownership
    db.query('SELECT * FROM portfolios WHERE id = ? AND user_id = ?', [portfolioId, userId], (err, portfolioResults) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }

      if (portfolioResults.length === 0) {
        return res.status(404).json({ success: false, error: 'ポートフォリオが見つからないか、アクセス権がありません。' });
      }

      const portfolio = portfolioResults[0];

      // Next, get projects for this portfolio
      db.query('SELECT * FROM projects WHERE portfolio_id = ? ORDER BY project_order ASC', [portfolioId], (err, projectResults) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'プロジェクトの取得中にデータベースエラーが発生しました。' });
        }

        portfolio.projects = projectResults;
        res.json({ success: true, portfolio: portfolio });
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// 新規プロジェクト追加API
// Required table schema for 'projects' table:
// CREATE TABLE projects (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   portfolio_id INT NOT NULL,
//   title VARCHAR(255) NOT NULL,
//   description TEXT,
//   image_data LONGTEXT,
//   background_color VARCHAR(7),
//   project_url VARCHAR(2083),
//   github_url VARCHAR(2083),
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
// );
// NOTE FOR DATABASE MIGRATION:
// The 'projects' table needs new columns for 'size' and 'text_color'.
// Run the following SQL commands on your database:
// ALTER TABLE projects ADD COLUMN size VARCHAR(20) NOT NULL DEFAULT 'medium';
// ALTER TABLE projects ADD COLUMN text_color VARCHAR(7) DEFAULT '#000000';
app.post('/api/portfolios/:portfolioId/projects', authenticateToken, (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { id: userId } = req.user;
    const { title, description, imageData, backgroundColor, size } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'プロジェクトタイトルは必須です。' });
    }

    // Verify the user owns the portfolio they are adding a project to
    db.query('SELECT id FROM portfolios WHERE id = ? AND user_id = ?', [portfolioId, userId], (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }
      if (results.length === 0) {
        return res.status(403).json({ success: false, error: 'このポートフォリオにプロジェクトを追加する権限がありません。' });
      }

      // Get the current max project_order for this portfolio
      db.query('SELECT MAX(project_order) as max_order FROM projects WHERE portfolio_id = ?', [portfolioId], (err, orderResults) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
        }

        const newOrder = (orderResults[0].max_order || 0) + 1;

        const newProject = {
          portfolio_id: portfolioId,
          title: title,
          description: description || null,
          image_data: imageData || null,
          background_color: backgroundColor || null,
          project_order: newOrder,
          size: size || 'medium'
        };

        db.query('INSERT INTO projects SET ?', newProject, (err, result) => {
          if (err) {
            console.error('データベースエラー:', err);
            return res.status(500).json({ success: false, error: 'プロジェクトの作成中にデータベースエラーが発生しました。' });
          }
          res.status(201).json({ success: true, message: 'プロジェクトが追加されました', projectId: result.insertId });
        });
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// Get a single project
app.get('/api/portfolios/:portfolioId/projects/:projectId', authenticateToken, (req, res) => {
  try {
    const { portfolioId, projectId } = req.params;
    const { id: userId } = req.user;

    // First, verify the user owns the portfolio
    db.query('SELECT id FROM portfolios WHERE id = ? AND user_id = ?', [portfolioId, userId], (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }
      if (results.length === 0) {
        return res.status(403).json({ success: false, error: 'このポートフォリオにアクセスする権限がありません。' });
      }

      // Now, get the project
      db.query('SELECT * FROM projects WHERE id = ? AND portfolio_id = ?', [projectId, portfolioId], (err, projectResults) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'プロジェクトの取得中にデータベースエラーが発生しました。' });
        }

        if (projectResults.length === 0) {
          return res.status(404).json({ success: false, error: 'プロジェクトが見つかりません。' });
        }

        res.json({ success: true, project: projectResults[0] });
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// Update a project
app.put('/api/portfolios/:portfolioId/projects/:projectId', authenticateToken, (req, res) => {
  console.log(`[UPDATE] Received request for portfolio ${req.params.portfolioId}, project ${req.params.projectId}`);
  console.log('[UPDATE] Request body:', req.body);
  try {
    const { portfolioId, projectId } = req.params;
    const { id: userId } = req.user;
    const { title, description, imageData, backgroundColor, textColor, size } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'プロジェクトタイトルは必須です。' });
    }

    // First, verify the user owns the portfolio
    db.query('SELECT id FROM portfolios WHERE id = ? AND user_id = ?', [portfolioId, userId], (err, results) => {
      if (err) {
        console.error('[UPDATE] Owner verification DB error:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }
      if (results.length === 0) {
        console.log('[UPDATE] Owner verification failed.');
        return res.status(403).json({ success: false, error: 'このポートフォリオにアクセスする権限がありません。' });
      }

      const updatedProject = {
        title: title,
        description: description || null,
        image_data: imageData || null,
        background_color: backgroundColor || null,
        text_color: textColor || null,
        size: size || 'medium'
      };
      console.log('[UPDATE] Object to be updated:', updatedProject);

      db.query('UPDATE projects SET ? WHERE id = ? AND portfolio_id = ?', [updatedProject, projectId, portfolioId], (err, result) => {
        if (err) {
          console.error('[UPDATE] Database query error:', err);
          return res.status(500).json({ success: false, error: 'プロジェクトの更新中にデータベースエラーが発生しました。' });
        }

        console.log('[UPDATE] Query result:', result);

        if (result.affectedRows === 0) {
          console.log('[UPDATE] No rows were affected.');
          return res.status(404).json({ success: false, error: 'プロジェクトが見つかりません。' });
        }

        console.log('[UPDATE] Successfully updated.');
        res.json({ success: true, message: 'プロジェクトが更新されました' });
      });
    });
  } catch (error) {
    console.error('[UPDATE] Server error:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// Delete a project
app.delete('/api/portfolios/:portfolioId/projects/:projectId', authenticateToken, (req, res) => {
  try {
    const { portfolioId, projectId } = req.params;
    const { id: userId } = req.user;

    // First, verify the user owns the portfolio
    db.query('SELECT id FROM portfolios WHERE id = ? AND user_id = ?', [portfolioId, userId], (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }
      if (results.length === 0) {
        return res.status(403).json({ success: false, error: 'このポートフォリオにアクセスする権限がありません。' });
      }

      db.query('DELETE FROM projects WHERE id = ? AND portfolio_id = ?', [projectId, portfolioId], (err, result) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'プロジェクトの削除中にデータベースエラーが発生しました。' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, error: 'プロジェクトが見つかりません。' });
        }

        res.json({ success: true, message: 'プロジェクトが削除されました' });
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// Reorder projects API
app.put('/api/portfolios/:portfolioId/reorder-projects', authenticateToken, (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { id: userId } = req.user;
    const { projectOrder } = req.body; // Expect an array of project IDs in the new order

    if (!projectOrder || !Array.isArray(projectOrder) || projectOrder.some(id => id === null || id === undefined)) {
      return res.status(400).json({ success: false, error: '有効なプロジェクトIDの配列が必要です。' });
    }

    // Verify the user owns the portfolio
    db.query('SELECT id FROM portfolios WHERE id = ? AND user_id = ?', [portfolioId, userId], (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }
      if (results.length === 0) {
        return res.status(403).json({ success: false, error: 'このポートフォリオにアクセスする権限がありません。' });
      }

      // Use a transaction to ensure all updates succeed or none do
      db.getConnection((err, connection) => {
        if (err) {
          console.error('データベース接続エラー:', err);
          return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
        }

        connection.beginTransaction(async (err) => {
          if (err) {
            connection.release();
            console.error('トランザクション開始エラー:', err);
            return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
          }

          try {
            for (let i = 0; i < projectOrder.length; i++) {
              const projectId = projectOrder[i];
              const newOrder = i;
              await new Promise((resolve, reject) => {
                connection.query(
                  'UPDATE projects SET project_order = ? WHERE id = ? AND portfolio_id = ?',
                  [newOrder, projectId, portfolioId],
                  (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                  }
                );
              });
            }

            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  console.error('トランザクションコミットエラー:', err);
                  res.status(500).json({ success: false, error: 'プロジェクトの順序の更新中にデータベースエラーが発生しました。' });
                });
              }
              connection.release();
              res.json({ success: true, message: 'プロジェクトの順序が更新されました' });
            });
          } catch (updateError) {
            connection.rollback(() => {
              connection.release();
              console.error('プロジェクト順序更新エラー:', updateError);
              res.status(500).json({ success: false, error: 'プロジェクトの順序の更新中にデータベースエラーが発生しました。' });
            });
          }
        });
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// ユーザーの既存ポートフォリオ確認API
app.get('/api/user/portfolio', authenticateToken, (req, res) => {
  try {
    const { id: userId } = req.user;

    db.query('SELECT id FROM portfolios WHERE user_id = ? LIMIT 1', [userId], (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }

      if (results.length > 0) {
        res.json({ success: true, portfolioId: results[0].id });
      } else {
        res.status(404).json({ success: false, message: 'ポートフォリオが見つかりません。' });
      }
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
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