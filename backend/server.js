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
const path = require('path');
const multer = require('multer');

const app = express();

// 最大BGMエントリ数
const MAX_BGM_ENTRIES = 30;

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

// Serve uploaded files statically from the 'uploads' directory
app.use('/uploads', cors()); // Apply CORS for static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// JWTトークン検証ミドルウェア (optional)
const tryAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Invalid token, but we don't want to block the request
      req.user = null;
      return next();
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

// --- 趣味(Hobbies)関連API ---

// 趣味テーブルのSQLスキーマ (要実行)
// CREATE TABLE hobbies (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   user_id INT NOT NULL,
//   name VARCHAR(255) NOT NULL,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
//   UNIQUE KEY user_hobby (user_id, name)
// );

// ユーザーの趣味リストを取得
app.get('/api/hobbies', authenticateToken, (req, res) => {
  const { id: userId } = req.user;

  db.query('SELECT id, name FROM hobbies WHERE user_id = ? ORDER BY name', [userId], (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '趣味の取得中にデータベースエラーが発生しました。' });
    }
    res.json({ success: true, hobbies: results });
  });
});

// 新しい趣味を追加
app.post('/api/hobbies', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, error: '趣味の名前は必須です。' });
  }

  db.query('INSERT INTO hobbies (user_id, name) VALUES (?, ?)', [userId, name.trim()], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, error: 'その趣味は既に追加されています。' });
      }
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '趣味の追加中にデータベースエラーが発生しました。' });
    }
    res.status(201).json({ success: true, message: '趣味が追加されました。', hobby: { id: result.insertId, name: name.trim() } });
  });
});

// 趣味を削除
app.delete('/api/hobbies/:hobbyId', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { hobbyId } = req.params;

  db.query('DELETE FROM hobbies WHERE id = ? AND user_id = ?', [hobbyId, userId], (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '趣味の削除中にデータベースエラーが発生しました。' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '趣味が見つからないか、削除する権限がありません。' });
    }
    res.json({ success: true, message: '趣味が削除されました。' });
  });
});

// --- プレイ済みゲーム(Played Games)関連API ---

// プレイ済みゲームテーブルのSQLスキーマ (要実行)
// CREATE TABLE played_games (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   user_id INT NOT NULL,
//   game_api_id VARCHAR(255) NOT NULL, // 外部APIのゲームID
//   title VARCHAR(255) NOT NULL,
//   image_url VARCHAR(2083),
//   rating INT, // 5段階評価など
//   comment TEXT,
//   playtime_hours DECIMAL(10, 2), // プレイ時間（時間単位）
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
//   UNIQUE KEY user_game (user_id, game_api_id)
// );
// 
// BGMテーブルのSQLスキーマ (要実行)
// CREATE TABLE game_bgms (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   played_game_id INT NOT NULL,
//   title VARCHAR(255),
//   url VARCHAR(2083) NOT NULL,
//   FOREIGN KEY (played_game_id) REFERENCES played_games(id) ON DELETE CASCADE
// );
// 
// played_gamesテーブルからbgm_urlカラムを削除する場合（既に追加した場合）:
// ALTER TABLE played_games DROP COLUMN bgm_url;
// 
// プレイ時間カラムを追加する場合（テーブルが既に存在する場合）:
// ALTER TABLE played_games ADD COLUMN playtime_hours DECIMAL(10, 2);

// --- 音楽鑑賞(Music Appreciation)関連API ---

// 音楽ジャンルテーブルのSQLスキーマ (要実行)
// CREATE TABLE music_genres (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   name VARCHAR(255) NOT NULL UNIQUE
// );
//
// ユーザー音楽設定テーブルのSQLスキーマ (要実行)
// CREATE TABLE user_music_preferences (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   user_id INT NOT NULL,
//   genre_id INT,
//   artist_name VARCHAR(255),
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
//   FOREIGN KEY (genre_id) REFERENCES music_genres(id) ON DELETE SET NULL,
//   UNIQUE KEY user_genre_artist (user_id, genre_id, artist_name)
// );
//
// 初期ジャンルデータの挿入例 (要実行)
// INSERT IGNORE INTO music_genres (name) VALUES
// ('クラシック'), ('洋楽'), ('J-POP'), ('軍歌'), ('国歌'), ('ロック'), ('ポップ'), ('ジャズ'), ('ヒップホップ'), ('R&B'), ('エレクトロニック'), ('フォーク'), ('カントリー'), ('ブルース'), ('メタル'), ('レゲエ'), ('ソウル'), ('ワールドミュージック'), ('アニメソング'), ('ゲーム音楽');

app.get('/api/played-games', authenticateToken, (req, res) => {
  const { id: userId } = req.user;

  const query = `
    SELECT 
      pg.id, pg.game_api_id, pg.title, pg.image_url, pg.rating, pg.comment, pg.playtime_hours, pg.platforms, pg.genres, pg.series, pg.created_at,
      CONCAT('[', GROUP_CONCAT(CASE WHEN bgm.id IS NOT NULL THEN JSON_OBJECT('id', bgm.id, 'title', bgm.title, 'url', bgm.url) ELSE NULL END), ']') as bgms
    FROM played_games pg
    LEFT JOIN game_bgms bgm ON pg.id = bgm.played_game_id
    WHERE pg.user_id = ?
    GROUP BY pg.id
    ORDER BY pg.created_at DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: 'プレイ済みゲームの取得中にデータベースエラーが発生しました。' });
    }

    const playedGamesWithParsedData = results.map(game => ({
      ...game,
      platforms: (() => {
        try {
          return game.platforms ? JSON.parse(game.platforms) : [];
        } catch (e) {
          console.error("Error parsing platforms JSON:", e);
          return [];
        }
      })(),
      genres: (() => {
        try {
          return game.genres ? JSON.parse(game.genres) : [];
        } catch (e) {
          console.error("Error parsing genres JSON:", e);
          return [];
        }
      })(),
      series: game.series || null,
      bgms: (() => {
        try {
          return game.bgms ? JSON.parse(game.bgms).filter(b => b !== null) : [];
        } catch (e) {
          console.error("Error parsing bgms JSON:", e);
          return [];
        }
      })(),
    }));

    res.json({ success: true, playedGames: playedGamesWithParsedData });
  });
});

// 音楽ジャンルリストを取得
app.get('/api/music-genres', (req, res) => {
  db.query('SELECT id, name FROM music_genres ORDER BY name', (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '音楽ジャンルの取得中にデータベースエラーが発生しました。' });
    }
    res.json({ success: true, genres: results });
  });
});

// ユーザーの音楽設定リストを取得
app.get('/api/user-music-preferences', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;

  try {
    // 1. ユーザーの音楽設定を取得
    const preferences = await new Promise((resolve, reject) => {
      const query = `
        SELECT ump.id, ump.artist_name, mg.name AS genre_name, mg.id AS genre_id
        FROM user_music_preferences ump
        LEFT JOIN music_genres mg ON ump.genre_id = mg.id
        WHERE ump.user_id = ?
        ORDER BY mg.name, ump.artist_name
      `;
      db.query(query, [userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (preferences.length === 0) {
      return res.json({ success: true, preferences: [] });
    }

    // 2. 関連するお気に入りの曲をすべて取得
    const preferenceIds = preferences.map(p => p.id);
    const songs = await new Promise((resolve, reject) => {
      const query = `
        SELECT id, preference_id, song_title, artist_name, youtube_url 
        FROM favorite_songs 
        WHERE preference_id IN (?)
        ORDER BY created_at ASC
      `;
      db.query(query, [preferenceIds], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // 3. 曲を各設定にマッピング
    const songsMap = new Map();
    songs.forEach(song => {
      if (!songsMap.has(song.preference_id)) {
        songsMap.set(song.preference_id, []);
      }
      songsMap.get(song.preference_id).push(song);
    });

    const preferencesWithSongs = preferences.map(pref => ({
      ...pref,
      songs: songsMap.get(pref.id) || []
    }));

    res.json({ success: true, preferences: preferencesWithSongs });

  } catch (err) {
    console.error('データベースエラー:', err);
    res.status(500).json({ success: false, error: 'ユーザーの音楽設定の取得中にデータベースエラーが発生しました。' });
  }
});

// ユーザーの音楽設定を追加
app.post('/api/user-music-preferences', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { genre_id, artist_name } = req.body;

  if (!genre_id && !artist_name) {
    return res.status(400).json({ success: false, error: 'ジャンルまたはアーティスト名は必須です。' });
  }

  db.query('INSERT INTO user_music_preferences (user_id, genre_id, artist_name) VALUES (?, ?, ?)', [userId, genre_id || null, artist_name || null], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, error: 'その音楽設定は既に追加されています。' });
      }
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '音楽設定の追加中にデータベースエラーが発生しました。' });
    }
    res.status(201).json({ success: true, message: '音楽設定が追加されました。', preference: { id: result.insertId, genre_id, artist_name } });
  });
});

// ユーザーの音楽設定を削除
app.delete('/api/user-music-preferences/:preferenceId', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { preferenceId } = req.params;

  db.query('DELETE FROM user_music_preferences WHERE id = ? AND user_id = ?', [preferenceId, userId], (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '音楽設定の削除中にデータベースエラーが発生しました。' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '音楽設定が見つからないか、削除する権限がありません。' });
    }
    res.json({ success: true, message: '音楽設定が削除されました。' });
  });
});

// Add a favorite song to a preference
app.post('/api/music-preferences/:preferenceId/songs', authenticateToken, async (req, res) => {
  const { preferenceId } = req.params;
  const { id: userId } = req.user;
  const { song_title, artist_name, youtube_url } = req.body;

  if (!song_title) {
    return res.status(400).json({ success: false, error: '曲名は必須です。' });
  }

  try {
    // Verify ownership of the preference
    const preferences = await new Promise((resolve, reject) => {
      db.query('SELECT id FROM user_music_preferences WHERE id = ? AND user_id = ?', [preferenceId, userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (preferences.length === 0) {
      return res.status(403).json({ success: false, error: 'この設定に曲を追加する権限がありません。' });
    }

    // Insert the new song
    const newSong = {
      preference_id: preferenceId,
      song_title,
      artist_name: artist_name || null,
      youtube_url: youtube_url || null,
    };

    const result = await new Promise((resolve, reject) => {
      db.query('INSERT INTO favorite_songs SET ?', newSong, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    res.status(201).json({ success: true, message: '曲が追加されました。', songId: result.insertId });

  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: '曲の追加中にサーバーエラーが発生しました。' });
  }
});

// Delete a favorite song
app.delete('/api/songs/:songId', authenticateToken, async (req, res) => {
  const { songId } = req.params;
  const { id: userId } = req.user;

  try {
    // Verify ownership by joining through preferences and users table
    const songs = await new Promise((resolve, reject) => {
      const query = `
        SELECT fs.id
        FROM favorite_songs fs
        JOIN user_music_preferences ump ON fs.preference_id = ump.id
        WHERE fs.id = ? AND ump.user_id = ?
      `;
      db.query(query, [songId, userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (songs.length === 0) {
      return res.status(403).json({ success: false, error: 'この曲を削除する権限がありません。' });
    }

    // Delete the song
    await new Promise((resolve, reject) => {
      db.query('DELETE FROM favorite_songs WHERE id = ?', [songId], (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return reject(new Error('Song not found'));
        resolve(result);
      });
    });

    res.json({ success: true, message: '曲が削除されました。' });

  } catch (error) {
    console.error('サーバーエラー:', error);
    if (error.message === 'Song not found') {
        return res.status(404).json({ success: false, error: '曲が見つかりません。' });
    }
    res.status(500).json({ success: false, error: '曲の削除中にサーバーエラーが発生しました。' });
  }
});

// Update a favorite song
app.put('/api/songs/:songId', authenticateToken, async (req, res) => {
  const { songId } = req.params;
  const { id: userId } = req.user;
  const { song_title, artist_name, youtube_url } = req.body;

  if (!song_title) {
    return res.status(400).json({ success: false, error: '曲名は必須です。' });
  }

  try {
    // Verify ownership
    const songs = await new Promise((resolve, reject) => {
      const query = `
        SELECT fs.id
        FROM favorite_songs fs
        JOIN user_music_preferences ump ON fs.preference_id = ump.id
        WHERE fs.id = ? AND ump.user_id = ?
      `;
      db.query(query, [songId, userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (songs.length === 0) {
      return res.status(403).json({ success: false, error: 'この曲を編集する権限がありません。' });
    }

    // Update the song
    const updatedSong = {
      song_title,
      artist_name: artist_name || null,
      youtube_url: youtube_url || null,
    };

    await new Promise((resolve, reject) => {
      db.query('UPDATE favorite_songs SET ? WHERE id = ?', [updatedSong, songId], (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return reject(new Error('Song not found'));
        resolve(result);
      });
    });

    res.json({ success: true, message: '曲が更新されました。' });

  } catch (error) {
    console.error('サーバーエラー:', error);
    if (error.message === 'Song not found') {
        return res.status(404).json({ success: false, error: '曲が見つかりません。' });
    }
    res.status(500).json({ success: false, error: '曲の更新中にサーバーエラーが発生しました。' });
  }
});

// 新しいプレイ済みゲームを追加
app.post('/api/played-games', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { game_api_id, title, image_url, platforms, genres, series, bgms } = req.body;

  if (!game_api_id || !title) {
    return res.status(400).json({ success: false, error: 'ゲームIDとタイトルは必須です。' });
  }
  if (bgms !== undefined && !Array.isArray(bgms)) {
    return res.status(400).json({ success: false, error: 'BGMは配列である必要があります。' });
  }
  if (bgms && bgms.length > MAX_BGM_ENTRIES) {
    return res.status(400).json({ success: false, error: `登録できるBGMの数は${MAX_BGM_ENTRIES}個までです。` });
  }

  db.getConnection((err, connection) => {
    if (err) {
      console.error('データベース接続エラー:', err);
      return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
    }

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ success: false, error: 'トランザクションの開始に失敗しました。' });
      }

      try {
        // 1. played_games テーブルにゲームを挿入
        const newGame = {
          user_id: userId,
          game_api_id,
          title,
          image_url,
          platforms: platforms ? JSON.stringify(platforms) : null,
          genres: genres ? JSON.stringify(genres) : null,
          series: series || null,
        };

        const result = await new Promise((resolve, reject) => {
          connection.query('INSERT INTO played_games SET ?', newGame, (err, result) => {
            if (err) {
              if (err.code === 'ER_DUP_ENTRY') return reject(new Error('GAME_ALREADY_EXISTS'));
              return reject(err);
            }
            resolve(result);
          });
        });
        const newPlayedGameId = result.insertId;

        // 2. BGMリストを挿入 (存在する場合)
        if (bgms && bgms.length > 0) {
          const bgmValues = bgms.map(bgm => [newPlayedGameId, bgm.title || null, bgm.url]);
          await new Promise((resolve, reject) => {
            connection.query('INSERT INTO game_bgms (played_game_id, title, url) VALUES ?', [bgmValues], (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
        }

        // 3. トランザクションをコミット
        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ success: false, error: '追加のコミットに失敗しました。' });
            });
          }
          connection.release();
          res.status(201).json({ success: true, message: 'ゲームがライブラリに追加されました。', playedGame: { id: newPlayedGameId, ...newGame } });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          if (error.message === 'GAME_ALREADY_EXISTS') {
            return res.status(409).json({ success: false, error: 'そのゲームは既に追加されています。' });
          }
          console.error('トランザクションエラー:', error);
          res.status(500).json({ success: false, error: 'ゲームの追加中にデータベースエラーが発生しました。' });
        });
      }
    });
  });
});

// プレイ済みゲームを更新 (評価、コメント、プレイ時間、シリーズ、BGM)
app.put('/api/played-games/:playedGameId', authenticateToken, (req, res) => {
    const { id: userId } = req.user;
    const { playedGameId } = req.params;
    const { rating, comment, playtime_hours, series, bgms } = req.body;

    // バリデーション
    if (rating !== undefined && rating !== null && (parseInt(rating, 10) < 1 || parseInt(rating, 10) > 10)) {
        return res.status(400).json({ success: false, error: '評価は1から10の間、または未設定である必要があります。' });
    }
    if (bgms !== undefined && !Array.isArray(bgms)) {
        return res.status(400).json({ success: false, error: 'BGMは配列である必要があります。' });
    }
    if (bgms && bgms.length > MAX_BGM_ENTRIES) {
        return res.status(400).json({ success: false, error: `登録できるBGMの数は${MAX_BGM_ENTRIES}個までです。` });
    }

    db.getConnection((err, connection) => {
        if (err) {
            console.error('データベース接続エラー:', err);
            return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
        }

        connection.beginTransaction(async (err) => {
            if (err) {
                connection.release();
                return res.status(500).json({ success: false, error: 'トランザクションの開始に失敗しました。' });
            }

            try {
                // 1. played_games テーブルの基本情報を更新
                const fieldsToUpdate = {};
                if ('rating' in req.body) fieldsToUpdate.rating = rating === null || rating === '' ? null : parseInt(rating, 10);
                if ('comment' in req.body) fieldsToUpdate.comment = comment === null || comment === '' ? null : comment;
                if ('playtime_hours' in req.body) fieldsToUpdate.playtime_hours = playtime_hours === null || playtime_hours === '' ? null : parseFloat(playtime_hours);
                if ('series' in req.body) fieldsToUpdate.series = series === null || series === '' ? null : series;

                if (Object.keys(fieldsToUpdate).length > 0) {
                    await new Promise((resolve, reject) => {
                        connection.query('UPDATE played_games SET ? WHERE id = ? AND user_id = ?', [fieldsToUpdate, playedGameId, userId], (err, result) => {
                            if (err) return reject(err);
                            if (result.affectedRows === 0) return reject(new Error('GAME_NOT_FOUND'));
                            resolve(result);
                        });
                    });
                }

                // 2. BGM情報を更新 (指定されている場合のみ)
                if (bgms) {
                    // 2a. 既存のBGMをすべて削除
                    await new Promise((resolve, reject) => {
                        connection.query('DELETE FROM game_bgms WHERE played_game_id = ?', [playedGameId], (err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                    });

                    // 2b. 新しいBGMリストを挿入
                    if (bgms.length > 0) {
                        const bgmValues = bgms.map(bgm => [playedGameId, bgm.title || null, bgm.url]);
                        await new Promise((resolve, reject) => {
                            connection.query('INSERT INTO game_bgms (played_game_id, title, url) VALUES ?', [bgmValues], (err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        });
                    }
                }

                // 3. トランザクションをコミット
                connection.commit((err) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            res.status(500).json({ success: false, error: '更新のコミットに失敗しました。' });
                        });
                    }
                    connection.release();
                    res.json({ success: true, message: 'ゲーム情報が更新されました。' });
                });

            } catch (error) {
                connection.rollback(() => {
                    connection.release();
                    if (error.message === 'GAME_NOT_FOUND') {
                        return res.status(404).json({ success: false, error: 'ゲームが見つからないか、更新する権限がありません。' });
                    }
                    console.error('トランザクションエラー:', error);
                    res.status(500).json({ success: false, error: 'ゲーム情報の更新中にデータベースエラーが発生しました。' });
                });
            }
        });
    });
});

// プレイ済みゲームを削除
app.delete('/api/played-games/:playedGameId', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { playedGameId } = req.params;

  db.query('DELETE FROM played_games WHERE id = ? AND user_id = ?', [playedGameId, userId], (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: 'ゲームの削除中にデータベースエラーが発生しました。' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'ゲームが見つからないか、削除する権限がありません。' });
    }
    res.json({ success: true, message: 'ゲームがライブラリから削除されました。' });
  });
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

// ポートフォリオ詳細取得API (Publicly accessible)
app.get('/api/portfolios/:portfolioId', tryAuthenticateToken, (req, res) => {
  try {
    const { portfolioId } = req.params;
    const loggedInUserId = req.user ? req.user.id : null;

    // First, get portfolio details
    db.query('SELECT * FROM portfolios WHERE id = ?', [portfolioId], (err, portfolioResults) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }

      if (portfolioResults.length === 0) {
        return res.status(404).json({ success: false, error: 'ポートフォリオが見つかりません。' });
      }

      const portfolio = portfolioResults[0];
      const isOwner = loggedInUserId === portfolio.user_id;

      // Next, get projects for this portfolio
      const projectsQuery = `
        SELECT
          p.*,
          p.font_size,
          p.background_image,
          GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ',') AS tags
        FROM
          projects p
        LEFT JOIN
          project_tags pt ON p.id = pt.project_id
        LEFT JOIN
          tags t ON pt.tag_id = t.id
        WHERE
          p.portfolio_id = ?
        GROUP BY
          p.id
        ORDER BY
          p.project_order ASC
      `;

      db.query(projectsQuery, [portfolioId], (err, projectResults) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'プロジェクトの取得中にデータベースエラーが発生しました。' });
        }

        const projectsWithData = projectResults.map(p => ({
          ...p,
          tags: p.tags ? p.tags.split(',') : [],
          layout_x: p.layout_x,
          layout_y: p.layout_y,
          layout_w: p.layout_w,
          layout_h: p.layout_h,
        }));

        portfolio.projects = projectsWithData;
        
        // Return portfolio data with ownership flag
        res.json({ 
          success: true, 
          portfolio: {
            ...portfolio,
            isOwner: isOwner 
          }
        });
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// ポートフォリオ削除API
app.delete('/api/portfolios/:portfolioId', authenticateToken, (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { id: userId } = req.user;

    db.getConnection((err, connection) => {
      if (err) {
        console.error('データベース接続エラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }

      connection.beginTransaction(err => {
        if (err) {
          connection.release();
          console.error('トランザクション開始エラー:', err);
          return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
        }

        // 1. Verify ownership
        connection.query('SELECT id FROM portfolios WHERE id = ? AND user_id = ?', [portfolioId, userId], (err, results) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              console.error('データベースエラー:', err);
              res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
            });
          }
          if (results.length === 0) {
            return connection.rollback(() => {
              connection.release();
              res.status(403).json({ success: false, error: 'このポートフォリオを削除する権限がありません。' });
            });
          }

          // 2. Delete associated projects
          connection.query('DELETE FROM projects WHERE portfolio_id = ?', [portfolioId], (err, result) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                console.error('データベースエラー:', err);
                res.status(500).json({ success: false, error: 'プロジェクトの削除中にエラーが発生しました。' });
              });
            }

            // 3. Delete the portfolio
            connection.query('DELETE FROM portfolios WHERE id = ?', [portfolioId], (err, result) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  console.error('データベースエラー:', err);
                  res.status(500).json({ success: false, error: 'ポートフォリオの削除中にエラーが発生しました。' });
                });
              }

              if (result.affectedRows === 0) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(404).json({ success: false, error: 'ポートフォリオが見つかりません。' });
                });
              }

              connection.commit(err => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    console.error('トランザクションコミットエラー:', err);
                    res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
                  });
                }
                connection.release();
                res.json({ success: true, message: 'ポートフォリオが正常に削除されました。' });
              });
            });
          });
        });
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
// ALTER TABLE projects ADD COLUMN font_size VARCHAR(50);
// ALTER TABLE projects ADD COLUMN background_image VARCHAR(2083);
app.post('/api/portfolios/:portfolioId/projects', authenticateToken, (req, res) => {
  const { portfolioId } = req.params;
  const { id: userId } = req.user;
  const { title, description, imageData, backgroundColor, textColor, type, content, tags, size, layout_w, layout_h, font_size, background_image } = req.body;

  if (type !== 'text' && !title) {
    return res.status(400).json({ success: false, error: 'プロジェクトタイトルは必須です。' });
  }

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
        // 1. Verify ownership
        const portfolios = await new Promise((resolve, reject) => {
          connection.query('SELECT id FROM portfolios WHERE id = ? AND user_id = ?', [portfolioId, userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
        });

        if (portfolios.length === 0) {
          throw { status: 403, message: 'このポートフォリオにプロジェクトを追加する権限がありません。' };
        }

        // 2. Get project order
        const orderResults = await new Promise((resolve, reject) => {
          connection.query('SELECT MAX(project_order) as max_order FROM projects WHERE portfolio_id = ?', [portfolioId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
        });
        const newOrder = (orderResults[0].max_order || 0) + 1;

        // 3. Insert new project
        const newProject = {
          portfolio_id: portfolioId,
          title: title || '',
          description: description || null,
          image_data: imageData || null,
          background_color: background_image ? null : (backgroundColor || null),
          text_color: textColor || null,
          project_order: newOrder,
          type: type || 'project',
          content: content || null,
          size: size || 'medium',
          layout_w: layout_w || 4,
          layout_h: layout_h || 4,
          font_size: font_size || null,
          background_image: background_image || null,
        };

        const projectInsertResult = await new Promise((resolve, reject) => {
          connection.query('INSERT INTO projects SET ?', newProject, (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
        const newProjectId = projectInsertResult.insertId;

        // 4. Handle tags
        if (tags && tags.length > 0) {
          for (const tagName of tags) {
            // Find or create tag
            let tagId;
            const tagResults = await new Promise((resolve, reject) => {
              connection.query('SELECT id FROM tags WHERE name = ?', [tagName], (err, results) => {
                if (err) return reject(err);
                resolve(results);
              });
            });

            if (tagResults.length > 0) {
              tagId = tagResults[0].id;
            } else {
              const newTagResult = await new Promise((resolve, reject) => {
                connection.query('INSERT INTO tags SET ?', { name: tagName }, (err, result) => {
                  if (err) return reject(err);
                  resolve(result);
                });
              });
              tagId = newTagResult.insertId;
            }

            // Associate tag with project
            await new Promise((resolve, reject) => {
              connection.query('INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)', [newProjectId, tagId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
              });
            });
          }
        }

        // 5. Commit transaction
        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              throw err;
            });
          }
          connection.release();
          res.status(201).json({ success: true, message: 'プロジェクトが追加されました', projectId: newProjectId });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
          }
          console.error('トランザクションエラー:', error);
          res.status(500).json({ success: false, error: 'プロジェクトの作成中にデータベースエラーが発生しました。' });
        });
      }
    });
  });
});

// Get a single project (publicly accessible)
app.get('/api/public/projects/:projectId', tryAuthenticateToken, (req, res) => {
  try {
    const { projectId } = req.params;
    const loggedInUserId = req.user ? req.user.id : null;

    // Get project details and owner user_id
    const projectQuery = `
      SELECT p.*, pf.user_id
      FROM projects p
      JOIN portfolios pf ON p.portfolio_id = pf.id
      WHERE p.id = ?
    `;

    db.query(projectQuery, [projectId], (err, projectResults) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }

      if (projectResults.length === 0) {
        return res.status(404).json({ success: false, error: 'プロジェクトが見つかりません。' });
      }

      const project = projectResults[0];
      const isOwner = loggedInUserId === project.user_id;

      // Get all content blocks for the project
      db.query('SELECT * FROM project_contents WHERE project_id = ? ORDER BY content_order ASC', [projectId], (err, contentResults) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'コンテンツブロックの取得中にデータベースエラーが発生しました。' });
        }

        project.contents = contentResults;
        
        res.json({
          success: true, 
          project: {
            ...project,
            isOwner: isOwner
          }
        });
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// Get a single project with its content blocks
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

      // Now, get the project details
      db.query('SELECT * FROM projects WHERE id = ? AND portfolio_id = ?', [projectId, portfolioId], (err, projectResults) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'プロジェクトの取得中にデータベースエラーが発生しました。' });
        }

        if (projectResults.length === 0) {
          return res.status(404).json({ success: false, error: 'プロジェクトが見つかりません。' });
        }

        const project = projectResults[0];

        // Then, get all content blocks for the project
        db.query('SELECT * FROM project_contents WHERE project_id = ? ORDER BY content_order ASC', [projectId], (err, contentResults) => {
          if (err) {
            console.error('データベースエラー:', err);
            return res.status(500).json({ success: false, error: 'コンテンツブロックの取得中にデータベースエラーが発生しました。' });
          }

          project.contents = contentResults;
          res.json({ success: true, project: project });
        });
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// Update a project
app.put('/api/portfolios/:portfolioId/projects/:projectId', authenticateToken, (req, res) => {
  const { portfolioId, projectId } = req.params;
  const { id: userId } = req.user;
  const { title, description, imageData, backgroundColor, textColor, content, size, type, tags, layout_w, layout_h, font_size, background_image, background_position } = req.body;

  if (type !== 'text' && !title) {
    return res.status(400).json({ success: false, error: 'プロジェクトタイトルは必須です。' });
  }

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
        // 1. Verify ownership
        const portfolios = await new Promise((resolve, reject) => {
          connection.query('SELECT id FROM portfolios WHERE id = ? AND user_id = ?', [portfolioId, userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
        });

        if (portfolios.length === 0) {
          throw { status: 403, message: 'このポートフォリオを更新する権限がありません。' };
        }

        // 2. Update the project itself
        const updatedProject = {
          title: title || null,
          description: description || null,
          image_data: imageData || null,
          background_color: backgroundColor || null,
          text_color: textColor || null,
          size: size || null,
          content: content || null,
          layout_w: layout_w,
          layout_h: layout_h,
          font_size: font_size || null,
          background_image: background_image || null,
          background_position: background_position || null,
        };
        // Remove undefined properties so they don't null out existing values
        Object.keys(updatedProject).forEach(key => updatedProject[key] === undefined && delete updatedProject[key]);

        console.log('Received project update request for projectId:', projectId, 'with body:', req.body);
        console.log('Constructed updatedProject object:', updatedProject);

        if (Object.keys(updatedProject).length > 0) {
            await new Promise((resolve, reject) => {
                connection.query('UPDATE projects SET ? WHERE id = ? AND portfolio_id = ?', [updatedProject, projectId, portfolioId], (err, result) => {
                    if (err) return reject(err);
                    console.log('Project update query result:', result);
                    // Note: affectedRows can be 0 if the data is the same. We only error if the project is not found.
                    // A more robust check might be needed if no-op updates are a concern.
                    resolve(result);
                });
            });
        }

        // 3. Handle tags if they are provided
        if (tags !== undefined) {
          // First, delete existing tags for the project
          await new Promise((resolve, reject) => {
            connection.query('DELETE FROM project_tags WHERE project_id = ?', [projectId], (err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
          });

          // Then, add new tags if any
          if (tags.length > 0) {
            for (const tagName of tags) {
              let tagId;
              const tagResults = await new Promise((resolve, reject) => {
                connection.query('SELECT id FROM tags WHERE name = ?', [tagName], (err, results) => {
                  if (err) return reject(err);
                  resolve(results);
                });
              });

              if (tagResults.length > 0) {
                tagId = tagResults[0].id;
              } else {
                const newTagResult = await new Promise((resolve, reject) => {
                  connection.query('INSERT INTO tags SET ?', { name: tagName }, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                  });
                });
                tagId = newTagResult.insertId;
              }

              await new Promise((resolve, reject) => {
                connection.query('INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)', [projectId, tagId], (err, result) => {
                  if (err) return reject(err);
                  resolve(result);
                });
              });
            }
          }
        }

        // 4. Commit transaction
        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              throw err;
            });
          }
          connection.release();
          res.json({ success: true, message: 'プロジェクトが更新されました' });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
          }
          console.error('トランザクションエラー:', error);
          res.status(500).json({ success: false, error: 'プロジェクトの更新中にデータベースエラーが発生しました。', details: error.message });
        });
      }
    });
  });
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

// NOTE FOR DATABASE MIGRATION:
// The 'projects' table needs new columns for layout.
// Run the following SQL commands on your database:
// ALTER TABLE projects ADD COLUMN layout_x INT DEFAULT 0;
// ALTER TABLE projects ADD COLUMN layout_y INT DEFAULT 0;
// ALTER TABLE projects ADD COLUMN layout_w INT DEFAULT 1;
// ALTER TABLE projects ADD COLUMN layout_h INT DEFAULT 1;

// Update project layouts API
app.put('/api/portfolios/:portfolioId/layout', authenticateToken, (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { id: userId } = req.user;
    const { layout } = req.body; // Expect an array of layout objects

    if (!layout || !Array.isArray(layout)) {
      return res.status(400).json({ success: false, error: '有効なレイアウト配列が必要です。' });
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
            for (const item of layout) {
              const { i, x, y, w, h } = item;
              const projectId = i;
              await new Promise((resolve, reject) => {
                connection.query(
                  'UPDATE projects SET layout_x = ?, layout_y = ?, layout_w = ?, layout_h = ? WHERE id = ? AND portfolio_id = ?',
                  [x, y, w, h, projectId, portfolioId],
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
                  res.status(500).json({ success: false, error: 'レイアウトの更新中にデータベースエラーが発生しました。' });
                });
              }
              connection.release();
              res.json({ success: true, message: 'レイアウトが更新されました' });
            });
          } catch (updateError) {
            connection.rollback(() => {
              connection.release();
              console.error('レイアウト更新エラー:', updateError);
              res.status(500).json({ success: false, error: 'レイアウトの更新中にデータベースエラーが発生しました。' });
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

// --- Content Block APIs ---

// Add a new content block to a project
app.post('/api/projects/:projectId/contents', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { id: userId } = req.user;
    const { type, content, layout_w, layout_h, block_style, text_color, font_size, background_color, background_image } = req.body;

    // 1. Verify ownership of the project
    const projects = await new Promise((resolve, reject) => {
      db.query('SELECT p.id FROM projects p JOIN portfolios pf ON p.portfolio_id = pf.id WHERE p.id = ? AND pf.user_id = ?', [projectId, userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (projects.length === 0) {
      return res.status(403).json({ success: false, error: 'このプロジェクトにコンテンツを追加する権限がありません。' });
    }

    // 2. Get the new order for the content block
    const orderResults = await new Promise((resolve, reject) => {
      db.query('SELECT MAX(content_order) as max_order FROM project_contents WHERE project_id = ?', [projectId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
    const newOrder = (orderResults[0].max_order || 0) + 1;

    // 3. Insert the new content block
    const newContent = {
      project_id: projectId,
      type: type || 'text',
      content: content || '',
      layout_w: layout_w || 4,
      layout_h: layout_h || 2,
      content_order: newOrder,
      block_style: block_style || 'p',
      text_color: text_color || null,
      font_size: font_size || null,
      background_color: background_color || null,
      background_image: background_image || null,
    };

    db.query('INSERT INTO project_contents SET ?', newContent, (err, result) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'コンテンツブロックの作成中にデータベースエラーが発生しました。' });
      }
      res.status(201).json({ success: true, message: 'コンテンツブロックが追加されました', contentId: result.insertId, newContent });
    });

  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// Update a content block
app.put('/api/contents/:contentId', authenticateToken, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { id: userId } = req.user;
    const { content, block_style, text_color, font_size, background_color, background_image } = req.body;

    // 1. Verify ownership through project and portfolio
    const contents = await new Promise((resolve, reject) => {
        const query = `
            SELECT pc.id 
            FROM project_contents pc
            JOIN projects p ON pc.project_id = p.id
            JOIN portfolios pf ON p.portfolio_id = pf.id
            WHERE pc.id = ? AND pf.user_id = ?
        `;
      db.query(query, [contentId, userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (contents.length === 0) {
      return res.status(403).json({ success: false, error: 'このコンテンツを更新する権限がありません。' });
    }

    // 2. Build the update query dynamically
    const fieldsToUpdate = {};
    if (content !== undefined) fieldsToUpdate.content = content;
    if (block_style !== undefined) fieldsToUpdate.block_style = block_style;
    if (text_color !== undefined) fieldsToUpdate.text_color = text_color;
    if (font_size !== undefined) fieldsToUpdate.font_size = font_size;
    if (background_color !== undefined) fieldsToUpdate.background_color = background_color;
    if (background_image !== undefined) fieldsToUpdate.background_image = background_image;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ success: false, error: '更新するフィールドがありません。' });
    }

    // 3. Update the content block
    db.query('UPDATE project_contents SET ? WHERE id = ?', [fieldsToUpdate, contentId], (err, result) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'コンテンツブロックの更新中にデータベースエラーが発生しました。' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'コンテンツブロックが見つかりません。' });
      }
      res.json({ success: true, message: 'コンテンツブロックが更新されました' });
    });

  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// Delete a content block
app.delete('/api/contents/:contentId', authenticateToken, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { id: userId } = req.user;

    // 1. Verify ownership
    const contents = await new Promise((resolve, reject) => {
        const query = `
            SELECT pc.id 
            FROM project_contents pc
            JOIN projects p ON pc.project_id = p.id
            JOIN portfolios pf ON p.portfolio_id = pf.id
            WHERE pc.id = ? AND pf.user_id = ?
        `;
      db.query(query, [contentId, userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (contents.length === 0) {
      return res.status(403).json({ success: false, error: 'このコンテンツを削除する権限がありません。' });
    }

    // 2. Delete the content
    db.query('DELETE FROM project_contents WHERE id = ?', [contentId], (err, result) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'コンテンツブロックの削除中にデータベースエラーが発生しました。' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'コンテンツブロックが見つかりません。' });
      }
      res.json({ success: true, message: 'コンテンツブロックが削除されました' });
    });

  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// Update content block layouts for a project
app.put('/api/projects/:projectId/contents/layout', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { id: userId } = req.user;
    const { layout } = req.body; // Expect an array of layout objects [{ i, x, y, w, h }]

    if (!layout || !Array.isArray(layout)) {
      return res.status(400).json({ success: false, error: '有効なレイアウト配列が必要です。' });
    }

    // 1. Verify ownership of the project
    const projects = await new Promise((resolve, reject) => {
      db.query('SELECT p.id FROM projects p JOIN portfolios pf ON p.portfolio_id = pf.id WHERE p.id = ? AND pf.user_id = ?', [projectId, userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (projects.length === 0) {
      return res.status(403).json({ success: false, error: 'このプロジェクトのレイアウトを更新する権限がありません。' });
    }

    // 2. Update layouts in a transaction
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
          for (const item of layout) {
            const { i, x, y, w, h } = item;
            const contentId = i;
            await new Promise((resolve, reject) => {
              connection.query(
                'UPDATE project_contents SET layout_x = ?, layout_y = ?, layout_w = ?, layout_h = ? WHERE id = ? AND project_id = ?',
                [x, y, w, h, contentId, projectId],
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
                throw err;
              });
            }
            connection.release();
            res.json({ success: true, message: 'レイアウトが更新されました' });
          });
        } catch (updateError) {
          connection.rollback(() => {
            connection.release();
            console.error('レイアウト更新エラー:', updateError);
            res.status(500).json({ success: false, error: 'レイアウトの更新中にデータベースエラーが発生しました。' });
          });
        }
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
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'メールアドレスは必須です。' });
  }

  try {
    // ユーザーが存在するか確認
    db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, error: 'このメールアドレスは登録されていません。' });
      }

      const userId = results[0].id;
      const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6桁のランダムな英数字
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15分後に失効

      // 既存のコードを削除
      db.query('DELETE FROM verification_codes WHERE user_id = ?', [userId], (err) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
        }

        // 新しいコードを挿入
        db.query(
          'INSERT INTO verification_codes (user_id, code, expires_at) VALUES (?, ?, ?)',
          [userId, code, expiresAt],
          async (err, result) => {
            if (err) {
              console.error('データベースエラー:', err);
              return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
            }

            // メール送信
            try {
              await sendVerificationEmail(email, code);
              res.json({ success: true, message: '認証コードを記載したメールを送信しました。' });
            } catch (emailError) {
              console.error('メール送信エラー:', emailError);
              res.status(500).json({ success: false, error: 'メールの送信に失敗しました。' });
            }
          }
        );
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました。' });
  }
});

// パスワードリセットAPI
app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, error: 'すべてのフィールドは必須です。' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: '新しいパスワードは8文字以上で入力してください。' });
  }

  try {
    // 認証コードを検証
    db.query(
      'SELECT vc.user_id FROM verification_codes vc JOIN users u ON vc.user_id = u.id WHERE u.email = ? AND vc.code = ? AND vc.expires_at > NOW()',
      [email, code],
      async (err, results) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
        }
        if (results.length === 0) {
          return res.status(400).json({ success: false, error: '認証コードが正しくないか、有効期限が切れています。' });
        }

        const userId = results[0].user_id;
        const hash = await bcrypt.hash(newPassword, 12);

        // パスワードを更新
        db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId], (err, updateResult) => {
          if (err) {
            console.error('データベースエラー:', err);
            return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
          }

          // 使用済みの認証コードを削除
          db.query('DELETE FROM verification_codes WHERE user_id = ?', [userId], (err) => {
            if (err) {
              console.error('データベースエラー:', err);
              // ここではエラーを返さず、処理を続行する
            }
          });

          res.json({ success: true, message: 'パスワードが正常にリセットされました。' });
        });
      }
    );
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました。' });
  }
});

// ファイルアップロードAPI
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // ファイル名が重複しないようにタイムスタンプと元の拡張子を付与
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Error: File upload only supports the following filetypes - ' + filetypes));
  }
});

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'ファイルがアップロードされませんでした。' });
  }
  // Construct the full URL to the file
  const filePath = `/uploads/${req.file.filename}`;
  res.json({ success: true, message: 'ファイルがアップロードされました。', filePath: filePath });
});

// サーバーの起動
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました`);
});
