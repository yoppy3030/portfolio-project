// 必要なライブラリ（便利な道具）の読み込み
require('dotenv').config(); // .envファイルに書かれた秘密の鍵や設定（環境変数）を読み込みます
const express = require('express'); // サーバーを作るためのメインのフレームワーク
const mysql = require('mysql'); // データベース（MySQL）とやり取りするための道具
const bcrypt = require('bcryptjs'); // パスワードを暗号化（ハッシュ化）して安全に守るための道具
const cors = require('cors'); // 別の場所（フロントエンド）からのアクセスを許可するための道具
const crypto = require('crypto'); // 暗号などのセキュリティ機能を使うための道具
const jwt = require('jsonwebtoken'); // ログイン状態を管理する「トークン」を作るための道具
const helmet = require('helmet'); // アプリのセキュリティを強化する（ヘルメットをかぶるようなイメージ）
const rateLimit = require('express-rate-limit'); // アクセス回数を制限して、攻撃から守るための道具
const path = require('path'); // ファイルの場所（パス）を操作するための道具
const multer = require('multer'); // 画像などのファイルをアップロードするための道具

// Expressアプリを作成（これがサーバーの実体になります）
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

// リクエストの内容を読み取れるようにする設定（JSON形式とURLエンコード形式）
app.use(express.json({ limit: '10mb' })); // 画像なども送れるようにサイズ制限を緩和
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS（Cross-Origin Resource Sharing）の設定
// フロントエンド（Reactなど）が別のURLにある場合、許可しないと通信できません
app.use(cors({
  // 許可するオリジン（アクセス元）のURLリスト
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5001'].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // 許可する通信の種類
  credentials: true // クッキーや認証情報の送信を許可するかどうか
}));

// Serve uploaded files statically from the 'uploads' directory
app.use('/uploads', cors()); // Apply CORS for static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer設定（ファイルアップロード用）
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // ファイル名をサニタイズして、安全な文字のみを使用する
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9-._]/g, '_');
    // ファイル名の重複を避けるため、タイムスタンプを先頭に追加
    cb(null, Date.now() + '-' + sanitizedOriginalName);
  }
});

const upload = multer({ storage: storage });

// 環境変数から設定を取得
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';

// データベース（MySQL）への接続設定
// 環境変数（.env）から読み込みますが、無ければデフォルト値（||の後ろ）を使います
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost', // データベースの場所（自分のPCならlocalhost）
  user: process.env.DB_USER || 'portfolio_user', // データベースのユーザー名
  password: process.env.DB_PASSWORD || 'pfBuilder2025', // データベースのパスワード
  database: process.env.DB_NAME || 'portfolio_db', // データベースの名前
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // セキュリティ通信の設定（本番用）
  connectionLimit: 10, // 同時に接続できる最大数
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// MySQLデータベースへの接続（本番環境用プール）
const db = mysql.createPool(DB_CONFIG);

// データベース接続確認とマイグレーションの実行
db.getConnection((err, connection) => {
  if (err) {
    console.error('データベース接続エラー:', err);
    return;
  }
  console.log('データベースに接続しました');
  connection.release();

  // マイグレーションをシーケンシャルに実行
  const runMigrations = async () => {
    const runQuery = (query) => new Promise((resolve) => {
      db.query(query, (err) => {
        // テーブル作成の警告は無視する
        if (err && err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_TABLE_EXISTS_ERROR') {
          console.log(`Migration warning for query "${query.substring(0, 30)}...":`, err.code);
        }
        resolve(); // 失敗しても次へ進む
      });
    });

    // Create Tables if not exists
    await runQuery(`
      CREATE TABLE IF NOT EXISTS reading_authors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY user_author (user_id, name)
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS reading_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        author_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL COMMENT 'manga, novel, technical, other',
        genre VARCHAR(100),
        publisher VARCHAR(255),
        image_url VARCHAR(512),
        rating INT CHECK (rating >= 1 AND rating <= 10),
        comment TEXT,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES reading_authors(id) ON DELETE CASCADE
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS anime_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        original_author VARCHAR(255),
        genre VARCHAR(100),
        synopsis TEXT,
        rating INT DEFAULT 0,
        review TEXT,
        image_url VARCHAR(512),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Ranking Items Columns
    await runQuery("ALTER TABLE ranking_items ADD COLUMN custom_title VARCHAR(255)");
    await runQuery("ALTER TABLE ranking_items ADD COLUMN custom_image_url VARCHAR(512)");

    // Reading Entries Columns Migrations
    // Ensure display_order exists (rename entry_order if it exists)
    await runQuery("ALTER TABLE reading_entries CHANGE entry_order display_order INT DEFAULT 0").catch(err => { });
    await runQuery("ALTER TABLE reading_entries ADD COLUMN display_order INT DEFAULT 0"); // If it didn't exist

    // Ensure image_url exists
    await runQuery("ALTER TABLE reading_entries ADD COLUMN image_url VARCHAR(512)");

    // Ensure publisher exists
    await runQuery("ALTER TABLE reading_entries ADD COLUMN publisher VARCHAR(255)");

    // Update Rating Constraint (1-5 -> 1-10)
    // Try to drop the old constraint (it might be named reading_entries_chk_1 or similar)
    // We use a general approach to add the new check if possible, or alter it.
    // simpler to just try replacing it.
    await runQuery("ALTER TABLE reading_entries DROP CHECK reading_entries_chk_1").catch(err => { });
    // Add new constraint
    // Note: If a constraint with the same name exists or if we dropped it, we can add a new one.
    // We'll give it a strict name to avoid ambiguity
    await runQuery("ALTER TABLE reading_entries ADD CONSTRAINT reading_entries_rating_chk CHECK (rating >= 1 AND rating <= 10)").catch(err => { });


    // Reading Authors Type (author vs genre)
    await runQuery("ALTER TABLE reading_authors ADD COLUMN type ENUM('author', 'genre') DEFAULT 'author'");

    // Update unique constraint to include type
    // Update unique constraint to include type
    // First try to drop the old index if it exists (ignoring error if it doesn't)
    await runQuery("DROP INDEX user_author ON reading_authors").catch(err => { });
    // Add new unique index including type
    await runQuery("ALTER TABLE reading_authors ADD UNIQUE KEY user_author_type (user_id, name, type)");

    // Ensure anime_id exists in ranking_items
    await runQuery("ALTER TABLE ranking_items ADD COLUMN anime_id INT");
    await runQuery("ALTER TABLE ranking_items ADD CONSTRAINT fk_ranking_anime FOREIGN KEY (anime_id) REFERENCES anime_entries(id) ON DELETE CASCADE").catch(err => { });

    console.log('All migrations executed.');
  };

  runMigrations();
});

// JWTトークン検証ミドルウェア
// 認証ミドルウェア：ログインしているかどうかをチェックする関門
// 'req' はリクエスト情報、'res' はレスポンス、'next' は次の処理へ進むための関数
const authenticateToken = (req, res, next) => {
  // リクエストのヘッダーから認証情報を取り出す
  const authHeader = req.headers['authorization'];
  // "Bearer <トークン>" という形式なので、スペースで区切ってトークン部分だけ取る
  const token = authHeader && authHeader.split(' ')[1];

  // トークンが無ければエラー（401: 認証が必要）
  if (!token) {
    return res.status(401).json({ success: false, error: 'アクセストークンが必要です' });
  }

  // トークンが正しいか検証する
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // 間違ったトークンならエラー（403: 禁止されています）
      return res.status(403).json({ success: false, error: '無効なトークンです' });
    }
    // 正しければ、リクエスト情報にユーザー情報を追加して、次の処理（APIの中身など）へ進む
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

// 管理者権限チェックミドルウェア
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'アクセストークンが必要です' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: '無効なトークンです' });
    }

    // 管理者メールアドレスをチェック
    const ADMIN_EMAIL = 'test.example3030@gmail.com';
    if (user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: '管理者権限が必要です' });
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
// ユーザーがフォームに入力した情報を受け取って、データベースに保存します
app.post('/api/register', upload.single('icon'), async (req, res) => {
  try {
    // リクエストの本文（body）からデータを取り出す
    const { name, email, password, bio } = req.body;
    // 画像がアップロードされていれば、そのURL（パス）を作る
    const iconUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // 入力チェック：名前、メール、パスワードが無い場合はエラー
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: '必須フィールドが不足しています'
      });
    }

    // パスワードの長さチェック
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'パスワードは8文字以上で入力してください'
      });
    }

    // メールアドレスの形式チェック（正規表現というルールを使います）
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '有効なメールアドレスを入力してください'
      });
    }

    // パスワードをそのまま保存するのは危険なので、暗号化（ハッシュ化）します
    const hash = await bcrypt.hash(password, 12);

    // ユーザーが既に登録されていないかデータベースをチェック
    db.query(
      'SELECT id FROM users WHERE email = ? OR name = ?', // ?はプレースホルダーと言い、後で変数が入ります（セキュリティ対策）
      [email, name],
      (err, results) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({
            success: false,
            error: 'データベースエラーが発生しました'
          });
        }

        // 既にデータが見つかった場合
        if (results.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'このメールアドレスまたはユーザー名は既に使用されています'
          });
        }

        // データベースに新しいユーザーを登録（INSERT）する準備
        let columns = ['name', 'email', 'password_hash'];
        let placeholders = ['?', '?', '?'];
        let values = [name, email, hash];

        // 画像や自己紹介がある場合は追加
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

        // SQLを実行して登録
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
            // 成功したらメッセージと新しいユーザーIDを返す
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

// ログインAPI
// メールアドレスとパスワードを受け取って、正しいか確認します
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, autoLogin } = req.body;

    // 入力チェック
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'メールアドレスとパスワードを入力してください'
      });
    }

    // データベースから、入力されたメールアドレスのユーザーを探す
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

        // ユーザーが見つからなかった場合
        if (results.length === 0) {
          return res.status(401).json({
            success: false,
            error: 'メールアドレスまたはパスワードが正しくありません'
          });
        }

        const user = results[0];
        // データベースのハッシュ化されたパスワードと、入力されたパスワードを比較する
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        // パスワードが間違っていた場合
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            error: 'メールアドレスまたはパスワードが正しくありません'
          });
        }

        // ログイン成功！
        // 「トークン」という身分証明書のようなものを発行します
        // これを持っていれば、次からパスワード無しでアクセスできます
        const tokenExpiry = autoLogin ? '30d' : '1d'; // 自動ログインなら30日、そうでなければ1日
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            name: user.name
          },
          JWT_SECRET,
          { expiresIn: tokenExpiry }
        );

        // クライアント（ブラウザ）にはパスワードハッシュを送らないように消す
        delete user.password_hash;

        // トークンとユーザー情報を返す
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
// フロントエンドが「今ログインしているのは誰？」と確認するために使います
app.get('/api/verify-token', authenticateToken, (req, res) => {
  // 認証済みのユーザーIDを使って、最新のユーザー情報をデータベースから取得
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

      // 万が一ユーザーが見つからない場合
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'ユーザーが見つかりません'
        });
      }

      // ユーザー情報を返す
      const user = results[0];
      res.json({
        success: true,
        user: user
      });
    }
  );
});

// プロフィール更新API (アイコンアップロード対応)
// 名前、自己紹介、アイコン画像を変更します
app.put('/api/profile', authenticateToken, upload.single('icon'), (req, res) => {
  try {
    const { id } = req.user; // ログイン中のユーザーID
    const { name, bio } = req.body; // 新しい名前と自己紹介

    // 更新するデータをまとめるためのオブジェクト
    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name; // 名前があれば追加
    if (bio) fieldsToUpdate.bio = bio;   // 自己紹介があれば追加

    // ファイル（画像）がアップロードされた場合、URLを保存するように追加
    if (req.file) {
      fieldsToUpdate.iconUrl = `/uploads/${req.file.filename}`;
    }

    // 何も変更するデータがない場合
    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        error: '更新するフィールドがありません。'
      });
    }

    // データベースを更新 (UPDATE)
    // "SET ?" の ? 部分に、fieldsToUpdateの中身（例: name='...', bio='...'）が自動的に入ります
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

        // 更新が成功したら、最新の情報をもう一度取得してフロントエンドに返す
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
// 現在のパスワードを確認した上で、新しいパスワードに変更します
app.post('/api/change-password', authenticateToken, async (req, res) => {
  try {
    const { id } = req.user;
    const { currentPassword, newPassword } = req.body;

    // 入力チェック
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

    // まず現在のパスワード（ハッシュ）をデータベースから取得
    db.query('SELECT password_hash FROM users WHERE id = ?', [id], async (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }

      if (results.length === 0) {
        return res.status(404).json({ success: false, error: 'ユーザーが見つかりません' });
      }

      const user = results[0];
      // 現在のパスワードが合っているか確認
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: '現在のパスワードが正しくありません' });
      }

      // 新しいパスワードを暗号化（ハッシュ化）
      const hash = await bcrypt.hash(newPassword, 12);

      // データベースのパスワードを更新
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
// メール通知や新機能のお知らせなどの設定を変更します
app.put('/api/notifications', authenticateToken, (req, res) => {
  try {
    const { id } = req.user;
    const { email_notifications, feature_announcements, maintenance_info } = req.body; // フロントエンドから送られてきた設定値

    // 更新するデータをまとめます
    const fieldsToUpdate = {
      email_notifications: email_notifications,
      feature_announcements: feature_announcements,
      maintenance_info: maintenance_info
    };

    // データベースを更新
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
// 重大な操作なので、慎重に行います
app.delete('/api/account', authenticateToken, async (req, res) => {
  try {
    const { id } = req.user;
    const { password } = req.body; // 安全のため、削除時にパスワードを再入力してもらいます

    if (!password) {
      return res.status(400).json({ success: false, error: 'パスワードを入力してください' });
    }

    // パスワード確認のためにDBからユーザー情報を取得
    db.query('SELECT password_hash FROM users WHERE id = ?', [id], async (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }

      if (results.length === 0) {
        return res.status(404).json({ success: false, error: 'ユーザーが見つかりません' });
      }

      const user = results[0];
      // パスワードが合っているかチェック
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: 'パスワードが正しくありません' });
      }

      // パスワードが合っていれば、ユーザーを削除（DELETE）
      // ユーザーIDに紐づく他のデータ（趣味、ゲーム記録など）も、データベースの設定（ON DELETE CASCADE）により自動的に消えることが多いです
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
// 言語設定（日/英）やテーマカラー（ライト/ダーク）などを保存します
app.put('/api/general-settings', authenticateToken, (req, res) => {
  try {
    const { id } = req.user;
    const { language, theme } = req.body;

    // 更新用のオブジェクトを作成
    const fieldsToUpdate = {};
    if (language) fieldsToUpdate.language = language;
    if (theme) fieldsToUpdate.theme = theme;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        error: '更新するフィールドがありません。'
      });
    }

    // DB更新
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

        // 更新後の情報を取得して、フロントエンドにすぐに反映できるようにします
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
            user: { ...results[0] }
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

// ファイルアップロードAPI
// エディタなどで画像をアップロードする時に使われます
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  // multerミドルウェアがファイルを処理して req.file に入れてくれます
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'ファイルがアップロードされませんでした。' });
  }

  // クライアントがアクセスできる画像のパス（URLの一部）を作って返します
  const filePath = `/uploads/${req.file.filename}`;

  res.json({ success: true, filePath: filePath });
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
// 「読書」「ゲーム」など、登録されている趣味の一覧を取得します
app.get('/api/hobbies', authenticateToken, (req, res) => {
  const { id: userId } = req.user;

  // データベースから、自分のユーザーIDに関連付けられた趣味を、名前順で取得
  db.query('SELECT id, name FROM hobbies WHERE user_id = ? ORDER BY name', [userId], (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '趣味の取得中にデータベースエラーが発生しました。' });
    }
    res.json({ success: true, hobbies: results });
  });
});

// 新しい趣味を追加
// 例: 「アニメ」「旅行」などを新しく追加する場合
app.post('/api/hobbies', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { name } = req.body;

  // 空文字の場合はエラー
  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, error: '趣味の名前は必須です。' });
  }

  // データベースに登録
  db.query('INSERT INTO hobbies (user_id, name) VALUES (?, ?)', [userId, name.trim()], (err, result) => {
    if (err) {
      // エラーコード 'ER_DUP_ENTRY' は「重複」を意味します
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, error: 'その趣味は既に追加されています。' });
      }
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '趣味の追加中にデータベースエラーが発生しました。' });
    }
    // 成功したら、追加された趣味の情報を返します
    res.status(201).json({ success: true, message: '趣味が追加されました。', hobby: { id: result.insertId, name: name.trim() } });
  });
});

// 趣味を削除
// 特定の趣味をリストから消します
app.delete('/api/hobbies/:hobbyId', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { hobbyId } = req.params; // URLの :hobbyId 部分を取得

  // 自分の趣味だけを削除できるように、user_id も条件に入れます
  db.query('DELETE FROM hobbies WHERE id = ? AND user_id = ?', [hobbyId, userId], (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '趣味の削除中にデータベースエラーが発生しました。' });
    }
    // affectedRows（影響を受けた行数）が0なら、削除できなかったということ
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
//
// image_urlカラムをMEDIUMTEXT型に変更する場合（Base64画像データを保存するため、最大16MBまで保存可能）:
// ALTER TABLE played_games MODIFY COLUMN image_url MEDIUMTEXT;

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
// ('クラシック'), ('洋楽'), ('J-POP'), ('軍歌'), ('国歌'), ('ロック'), ('ポップ'), ('ジャズ'), ('ヒップホップ'), ('R&B'), ('エレクトロニック'), ('フォーク'), ('カントリー'), ('ブルース'), ('メタル'), ('レゲエ'), ('ソウル'), ('ワールドミュージック'), ('アニメソング'), ('ゲーム音楽'), ('ボカロ');

// プレイ済みゲームのリストを取得
// タイトル、画像、評価、BGMなどの詳細情報を含めて取得します
app.get('/api/played-games', authenticateToken, (req, res) => {
  const { id: userId } = req.user;

  // 複雑なクエリ（SQL）ですが、ゲーム情報とそれに紐づくBGM情報をまとめて取ってきています
  // LEFT JOIN: ゲーム情報にBGM情報をくっつける（BGMがなくてもゲーム情報は取る）
  // GROUP_CONCAT: 複数のBGMを1つの文字列としてまとめる
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

    // データベースから取り出したデータの加工
    // 文字列として保存されている配列（JSON形式）を、プログラムで扱いやすい配列に戻します
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
          // BGMリストのnull排除（データベースの仕様による調整）
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

// 音楽ジャンルリストを取得（マスターデータ）
// 「J-POP」「ロック」などの選択肢を提供するためのAPI
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
// そのユーザーが「どんなジャンル」の「どのアーティスト」が好きか、そして「どの曲」がお気に入りかを取得します
app.get('/api/user-music-preferences', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;

  try {
    // 1. まず、ユーザーの音楽設定（ジャンルとアーティスト）を取得します
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

    // 設定がまだ何もなければ空のリストを返して終了
    if (preferences.length === 0) {
      return res.json({ success: true, preferences: [] });
    }

    // 2. 次に、それぞれの設定に関連付けられた「お気に入りの曲」をすべて取得します
    const preferenceIds = preferences.map(p => p.id); // 設定IDのリストを作る

    // ※ ここから少し複雑な処理：曲の順番（song_order）が登録されていない場合、自動的に番号を振る処理
    // （古いデータなどで順番が入っていない場合の対策です）
    for (const prefId of preferenceIds) {
      // 順番がない曲を探す
      const songsToInit = await new Promise((resolve, reject) => {
        db.query(
          'SELECT id FROM favorite_songs WHERE preference_id = ? AND song_order IS NULL ORDER BY created_at ASC',
          [prefId],
          (err, results) => {
            if (err) return reject(err);
            resolve(results);
          }
        );
      });

      if (songsToInit.length > 0) {
        // 現在の最大番号を調べて、その続きから番号を振っていく
        const maxOrderResult = await new Promise((resolve, reject) => {
          db.query(
            'SELECT COALESCE(MAX(song_order), -1) AS max_order FROM favorite_songs WHERE preference_id = ?',
            [prefId],
            (err, results) => {
              if (err) return reject(err);
              resolve(results);
            }
          );
        });

        let nextOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;

        // 一つずつ更新
        for (const song of songsToInit) {
          await new Promise((resolve, reject) => {
            db.query(
              'UPDATE favorite_songs SET song_order = ? WHERE id = ?',
              [nextOrder, song.id],
              (err, result) => {
                if (err) return reject(err);
                resolve(result);
              }
            );
          });
          nextOrder++;
        }
      }
    }

    // 3. 準備が整ったので、すべての曲を正しい順序で取得
    const songs = await new Promise((resolve, reject) => {
      const query = `
        SELECT id, preference_id, song_title, artist_name, youtube_url 
        FROM favorite_songs 
        WHERE preference_id IN (?)
        ORDER BY song_order ASC, created_at ASC
      `;
      db.query(query, [preferenceIds], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // 4. 取得した曲を、それぞれの音楽設定に割り振る（マッピング）
    const songsMap = new Map();
    songs.forEach(song => {
      if (!songsMap.has(song.preference_id)) {
        songsMap.set(song.preference_id, []);
      }
      songsMap.get(song.preference_id).push(song);
    });

    // 最終的なデータを作成：音楽設定の中に、songsというリストを入れる
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

// ユーザーの音楽設定（ジャンルやアーティスト）を追加
app.post('/api/user-music-preferences', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { genre_id, artist_name } = req.body;

  if (!genre_id && !artist_name) {
    return res.status(400).json({ success: false, error: 'ジャンルまたはアーティスト名は必須です。' });
  }

  // user_id, genre_id, artist_name の組み合わせで登録
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

// お気に入りの曲を追加
// 特定の設定（preferenceId）の下に、新しい曲を追加します
app.post('/api/music-preferences/:preferenceId/songs', authenticateToken, async (req, res) => {
  const { preferenceId } = req.params;
  const { id: userId } = req.user;
  const { song_title, artist_name, youtube_url } = req.body;

  if (!song_title) {
    return res.status(400).json({ success: false, error: '曲名は必須です。' });
  }

  try {
    // まず、その設定がこのユーザーのものであるかを確認（他人の設定には追加させない）
    const preferences = await new Promise((resolve, reject) => {
      db.query('SELECT id FROM user_music_preferences WHERE id = ? AND user_id = ?', [preferenceId, userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (preferences.length === 0) {
      return res.status(403).json({ success: false, error: 'この設定に曲を追加する権限がありません。' });
    }

    // 現在の曲順の一番最後に追加したいので、最大の song_order を取得します
    const maxOrderResult = await new Promise((resolve, reject) => {
      db.query(
        'SELECT COALESCE(MAX(song_order), -1) AS max_order FROM favorite_songs WHERE preference_id = ?',
        [preferenceId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });

    const nextOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;

    // 新しい曲をデータベースに挿入
    const newSong = {
      preference_id: preferenceId,
      song_title,
      artist_name: artist_name || null,
      youtube_url: youtube_url || null,
      song_order: nextOrder,
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

// 曲の順序を更新するAPI（:songIdより前に定義する必要がある）
app.put('/api/songs/reorder', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  const { songIds, preferenceId } = req.body;

  console.log('Reorder request received:', { songIds, preferenceId, userId, body: req.body });

  // Validate request
  if (!songIds || !Array.isArray(songIds)) {
    console.error('Invalid songIds:', songIds, 'Type:', typeof songIds);
    return res.status(400).json({ success: false, error: 'songIdsは配列である必要があります。' });
  }

  if (!preferenceId) {
    console.error('Missing preferenceId. Received:', req.body);
    return res.status(400).json({ success: false, error: 'preferenceIdが必要です。' });
  }

  if (songIds.length === 0) {
    return res.status(400).json({ success: false, error: 'songIdsが空です。' });
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
        // ユーザーがこの設定を所有しているか確認
        const [pref] = await new Promise((resolve, reject) => {
          connection.query(
            'SELECT id FROM user_music_preferences WHERE id = ? AND user_id = ?',
            [preferenceId, userId],
            (err, results) => {
              if (err) return reject(err);
              resolve(results);
            }
          );
        });

        if (!pref) {
          throw { status: 403, message: 'これらの曲を並び替える権限がありません。' };
        }

        // songIdsをループして順序を更新
        // songIdsが文字列の場合は数値に変換
        for (let i = 0; i < songIds.length; i++) {
          const songId = parseInt(songIds[i], 10);
          const order = i;

          if (isNaN(songId)) {
            throw { status: 400, message: `無効なsongId: ${songIds[i]}` };
          }

          await new Promise((resolve, reject) => {
            connection.query(
              'UPDATE favorite_songs SET song_order = ? WHERE id = ? AND preference_id = ?',
              [order, songId, preferenceId],
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
              console.error('コミットエラー:', err);
              res.status(500).json({ success: false, error: `曲の順序の更新中にデータベースエラーが発生しました: ${err.message}` });
            });
          }
          connection.release();
          console.log('Reorder successful:', { songIds, preferenceId });
          res.json({ success: true, message: '曲の順序が更新されました。' });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
          }
          console.error('トランザクションエラー:', error);
          res.status(500).json({ success: false, error: '曲の順序の更新中にデータベースエラーが発生しました。' });
        });
      }
    });
  });
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

// ユーザーのお気に入りの曲をすべて取得
app.get('/api/user-songs', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;

  try {
    const query = `
      SELECT fs.id, fs.song_title, fs.artist_name, fs.youtube_url
      FROM favorite_songs fs
      JOIN user_music_preferences ump ON fs.preference_id = ump.id
      WHERE ump.user_id = ?
      ORDER BY fs.song_title
    `;

    db.query(query, [userId], (err, songs) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'ユーザーの曲の取得中にデータベースエラーが発生しました。' });
      }
      res.json({ success: true, songs: songs });
    });

  } catch (err) {
    console.error('サーバーエラー:', err);
    res.status(500).json({ success: false, error: 'ユーザーの曲の取得中にサーバーエラーが発生しました。' });
  }
});

// 新しいプレイ済みゲームを追加
app.post('/api/played-games', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { game_api_id, title, image_url, platforms, genres, series, bgms } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'タイトルは必須です。' });
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


// ユーザーの登録作家リストを取得
app.get('/api/reading/authors', authenticateToken, (req, res) => {
  const { id: userId } = req.user;

  db.query('SELECT id, name, type FROM reading_authors WHERE user_id = ? ORDER BY name', [userId], (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '作家リストの取得中にデータベースエラーが発生しました。' });
    }
    res.json({ success: true, authors: results });
  });
});

// 新しい作家を追加
// 新しい作家を追加
app.post('/api/reading/authors', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { name, type } = req.body; // type: 'author' or 'genre'

  console.log('Adding new author/genre:', { name, type, userId }); // Debug log

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, error: '作家名は必須です。' });
  }

  const authorType = type || 'author';

  db.query('INSERT INTO reading_authors (user_id, name, type) VALUES (?, ?, ?)', [userId, name.trim(), authorType], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, error: 'その作家は既に追加されています。' });
      }
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '作家の追加中にデータベースエラーが発生しました。' });
    }
    console.log('Added successfully:', { id: result.insertId, name: name.trim(), type: authorType }); // Debug log
    res.status(201).json({ success: true, message: '作家が追加されました。', author: { id: result.insertId, name: name.trim(), type: authorType } });
  });
});

// 作家を削除
app.delete('/api/reading/authors/:authorId', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { authorId } = req.params;

  // Note: Deleting an author will cascade and delete all their books due to FOREIGN KEY constraints.
  db.query('DELETE FROM reading_authors WHERE id = ? AND user_id = ?', [authorId, userId], (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '作家の削除中にデータベースエラーが発生しました。' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '作家が見つからないか、削除する権限がありません。' });
    }
    res.json({ success: true, message: '作家が削除されました。' });
  });
});

// 読書記録のリストを取得（並び替えやフィルタリング対応）
// 登録されたすべての本（または特定の条件に合う本）を取得します
app.get('/api/reading-entries', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { sort, authorId } = req.query; // クエリパラメータから条件を取得

  // 基本のSQLクエリ：本と、その本の著作者情報を結合して取得
  let query = `
    SELECT re.*, ra.name as author_name 
    FROM reading_entries re
    JOIN reading_authors ra ON re.author_id = ra.id
    WHERE re.user_id = ?
  `;
  const params = [userId];

  // 特定の作家で絞り込む場合
  if (authorId) {
    query += ' AND re.author_id = ?';
    params.push(authorId);
  }

  // 並び替えの条件
  if (sort === 'rating_desc') {
    query += ' ORDER BY re.rating DESC, re.created_at DESC'; // 評価が高い順
  } else if (sort === 'rating_asc') {
    query += ' ORDER BY re.rating ASC, re.created_at DESC'; // 評価が低い順
  } else if (sort === 'latest') {
    query += ' ORDER BY re.created_at DESC'; // 新しい順
  } else if (sort === 'oldest') {
    query += ' ORDER BY re.created_at ASC'; // 古い順
  } else {
    // デフォルトは「本の順番（display_order）」順、かつ作成日順
    query += ' ORDER BY re.display_order ASC, re.created_at DESC';
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '読書記録の取得中にデータベースエラーが発生しました。' });
    }
    res.json({ success: true, entries: results });
  });
});

// 新しい本を追加
app.post('/api/reading-entries', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { title, author_id, type, genre, rating, comment } = req.body;

  if (!title || !author_id || !type) {
    return res.status(400).json({ success: false, error: 'タイトル、作家、種類は必須です。' });
  }

  // 現在のリストの最後に本を追加したいので、最大の並び順（display_order）を取得
  db.query('SELECT COALESCE(MAX(display_order), -1) as max_order FROM reading_entries WHERE user_id = ?', [userId], (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '順序の取得中にデータベースエラーが発生しました。' });
    }

    const nextOrder = results[0].max_order + 1;

    // データベースに新しい本を登録
    const query = 'INSERT INTO reading_entries (user_id, title, author_id, type, genre, rating, comment, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [userId, title, author_id, type, genre, rating, comment, nextOrder], (err, result) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: '読書記録の追加中にデータベースエラーが発生しました。' });
      }
      res.status(201).json({ success: true, message: '読書記録が追加されました。', entryId: result.insertId });
    });
  });
});

// 書籍の順序を更新
app.put('/api/reading/books/reorder', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  console.log('Received reorder request body:', req.body);
  const { books: orderedBooksWithOrder } = req.body; // orderedBooksWithOrderは { id, display_order } オブジェクトの配列
  console.log('orderedBooksWithOrder after destructuring:', orderedBooksWithOrder);

  if (!orderedBooksWithOrder || !Array.isArray(orderedBooksWithOrder) || orderedBooksWithOrder.length === 0) {
    return res.status(400).json({ success: false, error: '並び替える本のIDと順序のリストが必要です。' });
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
        for (let i = 0; i < orderedBooksWithOrder.length; i++) {
          const { id: bookId, display_order: newDisplayOrder } = orderedBooksWithOrder[i];

          if (bookId === undefined || newDisplayOrder === undefined) {
            throw { status: 400, message: `無効な書籍データが提供されました: ${JSON.stringify(orderedBooksWithOrder[i])}` };
          }

          await new Promise((resolve, reject) => {
            connection.query(
              'UPDATE reading_entries SET display_order = ? WHERE id = ? AND user_id = ?',
              [newDisplayOrder, bookId, userId],
              (err, result) => {
                if (err) return reject(err);
                if (result.affectedRows === 0) {
                  // ユーザーが所有していない本を更新しようとした場合、または本IDが存在しない場合
                  return reject({ status: 403, message: `本ID ${bookId} の更新権限がありません、または本が見つかりません。` });
                }
                resolve(result);
              }
            );
          });
        }

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              console.error('コミットエラー:', err);
              res.status(500).json({ success: false, error: `書籍の順序の更新中にデータベースエラーが発生しました: ${err.message}` });
            });
          }
          connection.release();
          res.json({ success: true, message: '書籍の順序が更新されました。' });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
          }
          console.error('トランザクションエラー:', error);
          res.status(500).json({ success: false, error: '書籍の順序の更新中にデータベースエラーが発生しました。' });
        });
      }
    });
  });
});

// 本の情報を更新
app.put('/api/reading/books/:bookId', authenticateToken, upload.single('image'), (req, res) => {
  const { id: userId } = req.user;
  const { bookId } = req.params;
  const { author_id, type, genre, title, comment, rating } = req.body;

  const fieldsToUpdate = {};
  if (author_id) fieldsToUpdate.author_id = author_id;
  if (type) fieldsToUpdate.type = type;
  if (genre) fieldsToUpdate.genre = genre;
  if (title) fieldsToUpdate.title = title;
  if (comment) fieldsToUpdate.comment = comment;
  if (rating) fieldsToUpdate.rating = rating;
  if (req.file) fieldsToUpdate.image_url = `/uploads/${req.file.filename}`;

  if (Object.keys(fieldsToUpdate).length === 0) {
    return res.status(400).json({ success: false, error: '更新するフィールドがありません。' });
  }

  db.query('UPDATE reading_entries SET ? WHERE id = ? AND user_id = ?', [fieldsToUpdate, bookId, userId], (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '書籍の更新中にデータベースエラーが発生しました。' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '書籍が見つからないか、更新する権限がありません。' });
    }
    res.json({ success: true, message: '本の内容が更新されました。' });
  });
});

// アニメデータの削除API
// IDを指定して、特定のアニメデータを削除します
app.delete('/api/anime-entries/:id', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const entryId = req.params.id;

  // まず削除対象の画像ファイル名を取得（削除するため）
  db.query('SELECT image_url, user_id FROM anime_entries WHERE id = ?', [entryId], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'データベースエラー' });
    if (results.length === 0) return res.status(404).json({ success: false, error: 'データが見つかりません' });

    // 他人のデータを勝手に消せないようにチェック
    if (results[0].user_id !== userId) return res.status(403).json({ success: false, error: '権限がありません' });

    const imageUrl = results[0].image_url;

    // データベースからレコードを削除
    db.query('DELETE FROM anime_entries WHERE id = ?', [entryId], (err) => {
      if (err) {
        console.error('Error deleting anime entry:', err);
        return res.status(500).json({ success: false, error: 'アニメの削除に失敗しました。' });
      }

      // 画像ファイルがあれば、サーバーからも削除してディスク容量を節約
      if (imageUrl) {
        const imagePath = path.join(__dirname, imageUrl);
        fs.unlink(imagePath, (err) => {
          if (err) console.error('Failed to delete image file:', err);
        });
      }

      res.json({ success: true, message: 'アニメが削除されました。' });
    });
  });
});

// --- バックアップと復元 (Backup & Restore) ---

// 共通のエクスポート（バックアップ作成）処理を行う関数
// 指定されたテーブルのデータをCSV形式に変換してダウンロードさせます
// 複数のテーブル（hobby, reading, music, anime）で同じロジックを使うため共通化
const handleExport = (req, res, tableName, filenamePrefix) => {
  const { id: userId } = req.user;

  // 指定されたテーブルから、このユーザーの全データを取得
  const query = `SELECT * FROM ${tableName} WHERE user_id = ?`;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error(`Export error for ${tableName}:`, err);
      return res.status(500).json({ success: false, error: 'データのエクスポートに失敗しました。' });
    }

    // CSV形式のヘッダー行を作成（キーのリスト）
    // JSON形式の結果が空の場合は空のCSVを返す回避策が必要だが、ここでは簡易的に実装
    if (results.length === 0) {
      // データがない場合は空の配列を返す（フロントエンドで処理）
      return res.json({ success: true, data: [] });
    }

    // json2csvライブラリなどが本来は便利だが、手動でJSONをCSV文字列に変換する場合：
    // 今回はフロントエンド側でJSONを受け取ってファイル保存する形を想定しているため
    // そのままJSONデータを返却します。
    // （もしファイルとして直接ダウンロードさせるなら res.attachment() などを使う）
    res.json({ success: true, data: results });
  });
};

// ゲーム記録のバックアップ
app.get('/api/backup/games', authenticateToken, (req, res) => {
  handleExport(req, res, 'played_games', 'games_backup');
});

// 読書記録のバックアップ
// 読書記録は reading_entries テーブル（または reading_entries）と reading_authors テーブルに分かれている場合があるため注意
// ここでは reading_entries を対象とします
app.get('/api/backup/reading', authenticateToken, (req, res) => {
  handleExport(req, res, 'reading_entries', 'reading_backup');
});

// 音楽設定のバックアップ
// music_preferences と music_songs の両方が必要になる可能性があります
// ここでは music_preferences (ジャンル/アーティスト設定) をエクスポート
app.get('/api/backup/music', authenticateToken, (req, res) => {
  handleExport(req, res, 'music_preferences', 'music_backup');
});

// アニメ記録のバックアップ
app.get('/api/backup/anime', authenticateToken, (req, res) => {
  handleExport(req, res, 'anime_entries', 'anime_backup');
});

app.post('/api/portfolios', authenticateToken, (req, res) => {
  try {
    const [availableItems, setAvailableItems] = useState([]);

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

// ポートフォリオ詳細取得API (Publicly accessible with visibility check)
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

      // Access Control: If not owner and not public, deny access
      if (!isOwner && !portfolio.is_public) {
        return res.status(403).json({ success: false, error: 'このポートフォリオは非公開です。' });
      }

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
            isOwner: isOwner,
            is_public: portfolio.is_public === 1 || portfolio.is_public === true // Ensure boolean
          }
        });
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// ポートフォリオの公開/非公開設定を更新するAPI
app.put('/api/portfolios/:portfolioId/visibility', authenticateToken, (req, res) => {
  const { portfolioId } = req.params;
  const { is_public } = req.body;
  const { id: userId } = req.user;

  if (typeof is_public !== 'boolean') {
    return res.status(400).json({ success: false, error: '無効な公開設定です。' });
  }

  // Check ownership and update
  db.query('UPDATE portfolios SET is_public = ? WHERE id = ? AND user_id = ?', [is_public, portfolioId, userId], (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '公開設定の更新中にデータベースエラーが発生しました。' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'ポートフォリオが見つからないか、更新する権限がありません。' });
    }
    res.json({ success: true, message: '公開設定が更新されました。' });
  });
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
            console.error('DELETE PORTFOLIO: Error checking ownership', err);
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
            });
          }
          if (results.length === 0) {
            console.warn('DELETE PORTFOLIO: User does not own portfolio or it does not exist', { portfolioId, userId });
            return connection.rollback(() => {
              connection.release();
              res.status(403).json({ success: false, error: 'このポートフォリオを削除する権限がありません。' });
            });
          }

          console.log(`DELETE PORTFOLIO: Ownership verified for portfolio ${portfolioId}. Deleting tags...`);
          // 2. Delete project tags
          connection.query('DELETE FROM project_tags WHERE project_id IN (SELECT id FROM projects WHERE portfolio_id = ?)', [portfolioId], (err, result) => {
            if (err) {
              console.error('DELETE PORTFOLIO: Error deleting project_tags', err);
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ success: false, error: 'プロジェクトタグの削除中にエラーが発生しました。' });
              });
            }
            console.log(`DELETE PORTFOLIO: Deleted tags. Deleting contents...`);

            // 3. Delete project contents
            connection.query('DELETE FROM project_contents WHERE project_id IN (SELECT id FROM projects WHERE portfolio_id = ?)', [portfolioId], (err, result) => {
              if (err) {
                console.error('DELETE PORTFOLIO: Error deleting project_contents', err);
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({ success: false, error: 'プロジェクトコンテンツの削除中にエラーが発生しました。' });
                });
              }
              console.log(`DELETE PORTFOLIO: Deleted contents. Deleting projects...`);

              // 4. Delete associated projects
              connection.query('DELETE FROM projects WHERE portfolio_id = ?', [portfolioId], (err, result) => {
                if (err) {
                  console.error('DELETE PORTFOLIO: Error deleting projects', err);
                  return connection.rollback(() => {
                    connection.release();
                    res.status(500).json({ success: false, error: 'プロジェクトの削除中にエラーが発生しました。' });
                  });
                }
                console.log(`DELETE PORTFOLIO: Deleted projects. Deleting portfolio...`);

                // 5. Delete the portfolio
                connection.query('DELETE FROM portfolios WHERE id = ?', [portfolioId], (err, result) => {
                  if (err) {
                    console.error('DELETE PORTFOLIO: Error deleting portfolio', err);
                    return connection.rollback(() => {
                      connection.release();
                      res.status(500).json({ success: false, error: 'ポートフォリオの削除中にエラーが発生しました。' });
                    });
                  }

                  if (result.affectedRows === 0) {
                    console.error('DELETE PORTFOLIO: Portfolio not found during final delete');
                    return connection.rollback(() => {
                      connection.release();
                      res.status(404).json({ success: false, error: 'ポートフォリオが見つかりません。' });
                    });
                  }

                  connection.commit(err => {
                    if (err) {
                      console.error('DELETE PORTFOLIO: Commit error', err);
                      return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
                      });
                    }
                    console.log(`DELETE PORTFOLIO: Success fully deleted portfolio ${portfolioId}`);
                    connection.release();
                    res.json({ success: true, message: 'ポートフォリオが正常に削除されました。' });
                  });
                });
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
          title: title !== undefined ? title : undefined,
          description: description !== undefined ? description : undefined,
          image_data: imageData !== undefined ? imageData : undefined,
          background_color: backgroundColor !== undefined ? backgroundColor : undefined,
          text_color: textColor !== undefined ? textColor : undefined,
          size: size !== undefined ? size : undefined,
          content: content !== undefined ? content : undefined,
          layout_w: layout_w !== undefined ? layout_w : undefined,
          layout_h: layout_h !== undefined ? layout_h : undefined,
          font_size: font_size !== undefined ? font_size : undefined,
          background_image: background_image !== undefined ? background_image : undefined,
          background_position: background_position !== undefined ? background_position : undefined,
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
// --- 読書管理機能関連API ---




// 著者の削除
app.delete('/api/reading/authors/:id', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { id: authorId } = req.params;

  db.query('DELETE FROM reading_authors WHERE id = ? AND user_id = ?', [authorId, userId], (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
    }
    res.json({ success: true, message: '著者が削除されました。' });
  });
});

// 本の取得
app.get('/api/reading/books', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { author_id } = req.query;

  let query = 'SELECT * FROM reading_entries WHERE user_id = ?';
  const params = [userId];

  if (author_id) {
    query += ' AND author_id = ?';
    params.push(author_id);
  }
  query += ' ORDER BY display_order ASC, id DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
    }
    res.json({ success: true, books: results });
  });
});

// 本の並び替え
app.put('/api/reading/books/reorder', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  const { books } = req.body; // [{ id, display_order }]

  if (!books || !Array.isArray(books)) {
    return res.status(400).json({ success: false, error: '無効なデータです。' });
  }

  try {
    for (const book of books) {
      await new Promise((resolve, reject) => {
        db.query('UPDATE reading_entries SET display_order = ? WHERE id = ? AND user_id = ?',
          [book.display_order, book.id, userId], (err) => {
            if (err) reject(err);
            else resolve();
          });
      });
    }
    res.json({ success: true, message: '並び順が更新されました。' });
  } catch (error) {
    console.error('並び替えエラー:', error);
    res.status(500).json({ success: false, error: '並び替え中にエラーが発生しました。' });
  }
});

// 本の追加
app.post('/api/reading/books', authenticateToken, upload.single('image'), (req, res) => {
  const { id: userId } = req.user;
  let { author_id, type, genre, title, comment, rating, publisher } = req.body;

  // Ensure parameters are not arrays
  if (Array.isArray(publisher)) publisher = publisher[0];
  if (Array.isArray(rating)) rating = rating[0];
  if (Array.isArray(genre)) genre = genre[0];
  if (Array.isArray(title)) title = title[0];
  if (Array.isArray(comment)) comment = comment[0];
  if (Array.isArray(type)) type = type[0];
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!author_id || !title) {
    return res.status(400).json({ success: false, error: '必須項目が不足しています。' });
  }

  // Handle rating: if 0 or invalid, set to null (because DB check constraint is 1-5)
  if (rating == 0 || rating === '0' || !rating) {
    rating = null;
  }

  db.query('SELECT MAX(display_order) as maxOrder FROM reading_entries WHERE user_id = ? AND author_id = ?', [userId, author_id], (err, results) => {
    const nextOrder = (results && results[0] && results[0].maxOrder !== null) ? results[0].maxOrder + 1 : 0;

    const query = `
      INSERT INTO reading_entries 
      (user_id, author_id, type, genre, title, comment, rating, publisher, image_url, display_order) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(query, [userId, author_id, type, genre, title, comment, rating, publisher, image_url, nextOrder], (err, result) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
      }
      res.json({ success: true, message: '本が追加されました。' });
    });
  });
});

// 本の更新
app.put('/api/reading/books/:id', authenticateToken, upload.single('image'), (req, res) => {
  const { id: userId } = req.user;
  const { id: bookId } = req.params;
  const { type, genre, title, comment, rating, publisher } = req.body;

  let updates = [];
  let params = [];

  if (type) { updates.push('type = ?'); params.push(type); }
  if (genre) { updates.push('genre = ?'); params.push(genre); }
  if (title) { updates.push('title = ?'); params.push(title); }
  if (comment) { updates.push('comment = ?'); params.push(comment); }
  if (rating) { updates.push('rating = ?'); params.push(rating); }
  if (publisher) { updates.push('publisher = ?'); params.push(publisher); }
  if (req.file) { updates.push('image_url = ?'); params.push(`/uploads/${req.file.filename}`); }

  if (updates.length === 0) return res.status(400).json({ success: false, error: '更新データがありません。' });

  params.push(bookId);
  params.push(userId);

  const query = `UPDATE reading_entries SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;

  db.query(query, params, (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
    }
    res.json({ success: true, message: '本が更新されました。' });
  });
});

// 本の削除
app.delete('/api/reading/books/:id', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { id: bookId } = req.params;

  db.query('DELETE FROM reading_entries WHERE id = ? AND user_id = ?', [bookId, userId], (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
    }
    res.json({ success: true, message: '本が削除されました。' });
  });
});



// (Duplicate Anime endpoints removed)


// --- バックアップ機能関連API ---

// 1. ゲームのバックアップ
// エクスポート
app.get('/api/backup/games', authenticateToken, (req, res) => {
  const { id: userId } = req.user;

  try {
    const query = `
      SELECT 
        pg.*,
        CONCAT('[', GROUP_CONCAT(CASE WHEN bgm.id IS NOT NULL THEN JSON_OBJECT('title', bgm.title, 'url', bgm.url) ELSE NULL END), ']') as bgms_json
      FROM played_games pg
      LEFT JOIN game_bgms bgm ON pg.id = bgm.played_game_id
      WHERE pg.user_id = ?
      GROUP BY pg.id
    `;

    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
      }

      const games = results.map(game => ({
        ...game,
        platforms: game.platforms ? JSON.parse(game.platforms) : [],
        genres: game.genres ? JSON.parse(game.genres) : [],
        bgms: game.bgms_json ? JSON.parse(game.bgms_json).filter(b => b !== null) : [],
        bgms_json: undefined // 不要なフィールドを削除
      }));

      res.json({ success: true, games: games });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました。' });
  }
});

// インポート (Games)
app.post('/api/backup/games/import', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  const { games } = req.body;

  if (!games || !Array.isArray(games)) {
    return res.status(400).json({ success: false, error: '有効なゲームデータリストが必要です。' });
  }

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ success: false, error: 'データベース接続エラー' });

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ success: false, error: 'トランザクション開始エラー' });
      }

      try {
        let importedCount = 0;
        let skippedCount = 0;

        for (const game of games) {
          // 既存チェック (game_api_idを使用)
          const existing = await new Promise((resolve, reject) => {
            connection.query(
              'SELECT id FROM played_games WHERE user_id = ? AND game_api_id = ?',
              [userId, game.game_api_id],
              (err, results) => {
                if (err) return reject(err);
                resolve(results);
              }
            );
          });

          if (existing.length > 0) {
            skippedCount++;
            continue; // 重複時はスキップ
          }

          // ゲームの挿入
          const insertResult = await new Promise((resolve, reject) => {
            const gameData = {
              user_id: userId,
              game_api_id: game.game_api_id,
              title: game.title,
              image_url: game.image_url,
              rating: game.rating,
              comment: game.comment,
              playtime_hours: game.playtime_hours,
              platforms: JSON.stringify(game.platforms || []),
              genres: JSON.stringify(game.genres || []),
              series: game.series,
            };
            connection.query('INSERT INTO played_games SET ?', gameData, (err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
          });

          const newGameId = insertResult.insertId;

          // BGMの挿入
          if (game.bgms && game.bgms.length > 0) {
            const bgmValues = game.bgms.map(bgm => [newGameId, bgm.title || null, bgm.url]);
            await new Promise((resolve, reject) => {
              connection.query('INSERT INTO game_bgms (played_game_id, title, url) VALUES ?', [bgmValues], (err) => {
                if (err) return reject(err);
                resolve();
              });
            });
          }
          importedCount++;
        }

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ success: false, error: 'コミットエラー' });
            });
          }
          connection.release();
          res.json({ success: true, message: `${importedCount}件インポートしました（${skippedCount}件スキップ）。`, importedCount, skippedCount });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error('インポートエラー:', error);
          res.status(500).json({ success: false, error: 'インポート中にエラーが発生しました。' });
        });
      }
    });
  });
});

// 2. 読書のバックアップ
// エクスポート
app.get('/api/backup/reading', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;

  try {
    // 著者を取得
    const authors = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM reading_authors WHERE user_id = ?', [userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // 書籍を取得
    const books = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM reading_entries WHERE user_id = ?', [userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // 著者ごとに書籍をまとめる
    const authorsWithBooks = authors.map(author => ({
      ...author,
      books: books.filter(book => book.author_id === author.id)
    }));

    res.json({ success: true, readingData: authorsWithBooks });

  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました。' });
  }
});

// インポート (Reading)
app.post('/api/backup/reading/import', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  const { readingData } = req.body; // authors with books

  if (!readingData || !Array.isArray(readingData)) {
    return res.status(400).json({ success: false, error: '有効な読書データが必要です。' });
  }

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ success: false, error: 'データベース接続エラー' });

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ success: false, error: 'トランザクション開始エラー' });
      }

      try {
        let importedAuthors = 0;
        let importedBooks = 0;

        for (const author of readingData) {
          // 著者の既存チェック
          let authorId;
          const existingAuthor = await new Promise((resolve, reject) => {
            connection.query('SELECT id FROM reading_authors WHERE user_id = ? AND name = ?', [userId, author.name], (err, results) => {
              if (err) return reject(err);
              resolve(results);
            });
          });

          if (existingAuthor.length > 0) {
            authorId = existingAuthor[0].id;
          } else {
            // 著者を新規作成
            const result = await new Promise((resolve, reject) => {
              const authorType = author.type || 'author';
              connection.query('INSERT INTO reading_authors (user_id, name, type) VALUES (?, ?, ?)', [userId, author.name, authorType], (err, res) => {
                if (err) return reject(err);
                resolve(res);
              });
            });
            authorId = result.insertId;
            importedAuthors++;
          }

          // 書籍のインポート
          if (author.books && author.books.length > 0) {
            for (const book of author.books) {
              // 書籍の重複チェック (タイトル + 著者IDで簡易チェック)
              const existingBook = await new Promise((resolve, reject) => {
                connection.query(
                  'SELECT id FROM reading_entries WHERE user_id = ? AND author_id = ? AND title = ?',
                  [userId, authorId, book.title],
                  (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                  }
                );
              });

              if (existingBook.length === 0) {
                // 書籍を追加
                await new Promise((resolve, reject) => {
                  const bookData = {
                    user_id: userId,
                    author_id: authorId,
                    type: book.type,
                    genre: book.genre,
                    title: book.title,
                    image_url: book.image_url,
                    comment: book.comment,
                    rating: book.rating,
                    display_order: book.display_order // 既存のオーダー順を保持するか、あるいはリセットするか。ここではそのまま使う
                  };
                  // undefined を null に
                  Object.keys(bookData).forEach(k => bookData[k] === undefined && (bookData[k] = null));

                  connection.query('INSERT INTO reading_entries SET ?', bookData, (err, res) => {
                    if (err) return reject(err);
                    resolve(res);
                  });
                });
                importedBooks++;
              }
            }
          }
        }

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ success: false, error: 'コミットエラー' });
            });
          }
          connection.release();
          res.json({ success: true, message: `インポート完了: 作家 ${importedAuthors}名, 書籍 ${importedBooks}冊` });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error('インポートエラー:', error);
          res.status(500).json({ success: false, error: 'インポート中にエラーが発生しました。' });
        });
      }
    });
  });
});

// 3. 音楽のバックアップ
// エクスポート
app.get('/api/backup/music', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;

  try {
    // 設定（ジャンル/アーティスト）を取得
    const preferences = await new Promise((resolve, reject) => {
      // ジャンル名も含めて取得しておく
      const query = `
        SELECT ump.*, mg.name as genre_name
        FROM user_music_preferences ump
        LEFT JOIN music_genres mg ON ump.genre_id = mg.id
        WHERE ump.user_id = ?
      `;
      db.query(query, [userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // お気に入りの曲を取得
    const songs = await new Promise((resolve, reject) => {
      const query = `
        SELECT fs.* 
        FROM favorite_songs fs
        JOIN user_music_preferences ump ON fs.preference_id = ump.id
        WHERE ump.user_id = ?
      `;
      db.query(query, [userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // マージ
    const musicData = preferences.map(pref => ({
      ...pref,
      songs: songs.filter(s => s.preference_id === pref.id)
    }));

    res.json({ success: true, musicData: musicData });

  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました。' });
  }
});

// インポート (Music)
app.post('/api/backup/music/import', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  const { musicData } = req.body;

  if (!musicData || !Array.isArray(musicData)) {
    return res.status(400).json({ success: false, error: '有効な音楽データが必要です。' });
  }

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ success: false, error: 'データベース接続エラー' });

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ success: false, error: 'トランザクション開始エラー' });
      }

      try {
        let importedPrefs = 0;
        let importedSongs = 0;

        for (const pref of musicData) {
          // Genre IDの解決 (名前から解決するか、あるいはIDが一致すると仮定するか。
          // ジャンルテーブルはマスタ扱いだと思うので、IDが不変とは限らないが、今回は標準ジャンルなので名前マッチが安全かも)
          // ただ、エクスポート時に genre_id も genre_name も出している。
          // もし genre_name が null でないなら、名前でIDを探す。

          let targetGenreId = pref.genre_id;
          if (pref.genre_name) {
            const genreRes = await new Promise((resolve, reject) => {
              connection.query('SELECT id FROM music_genres WHERE name = ?', [pref.genre_name], (err, res) => {
                if (err) return reject(err);
                resolve(res);
              });
            });
            if (genreRes.length > 0) {
              targetGenreId = genreRes[0].id;
            }
            // なければ null (その他扱い)
          }

          // プリファレンスの重複チェック (user_id, genre_id, artist_name)
          // artist_name は null 許容
          let prefId;
          const existingPref = await new Promise((resolve, reject) => {
            const sql = 'SELECT id FROM user_music_preferences WHERE user_id = ? AND (genre_id = ? OR (genre_id IS NULL AND ? IS NULL)) AND (artist_name = ? OR (artist_name IS NULL AND ? IS NULL))';
            connection.query(sql, [userId, targetGenreId, targetGenreId, pref.artist_name, pref.artist_name], (err, res) => {
              if (err) return reject(err);
              resolve(res);
            });
          });

          if (existingPref.length > 0) {
            prefId = existingPref[0].id;
          } else {
            // 新規作成
            const resInsert = await new Promise((resolve, reject) => {
              connection.query(
                'INSERT INTO user_music_preferences (user_id, genre_id, artist_name) VALUES (?, ?, ?)',
                [userId, targetGenreId, pref.artist_name],
                (err, res) => {
                  if (err) return reject(err);
                  resolve(res);
                }
              );
            });
            prefId = resInsert.insertId;
            importedPrefs++;
          }

          // 曲のインポート
          if (pref.songs && pref.songs.length > 0) {
            for (const song of pref.songs) {
              // 曲の重複チェック (preference_id, song_title)
              const existingSong = await new Promise((resolve, reject) => {
                connection.query(
                  'SELECT id FROM favorite_songs WHERE preference_id = ? AND song_title = ?',
                  [prefId, song.song_title],
                  (err, res) => {
                    if (err) return reject(err);
                    resolve(res);
                  }
                );
              });

              if (existingSong.length === 0) {
                await new Promise((resolve, reject) => {
                  const songData = {
                    preference_id: prefId,
                    song_title: song.song_title,
                    artist_name: song.artist_name,
                    youtube_url: song.youtube_url,
                    song_order: song.song_order
                  };
                  Object.keys(songData).forEach(k => songData[k] === undefined && (songData[k] = null));

                  connection.query('INSERT INTO favorite_songs SET ?', songData, (err, res) => {
                    if (err) return reject(err);
                    resolve(res);
                  });
                });
                importedSongs++;
              }
            }
          }
        }

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ success: false, error: 'コミットエラー' });
            });
          }
          connection.release();
          res.json({ success: true, message: `インポート完了: 設定 ${importedPrefs}件, 曲 ${importedSongs}曲` });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error('インポートエラー:', error);
          res.status(500).json({ success: false, error: 'インポート中にエラーが発生しました。' });
        });
      }
    });
  });
});

// 4. ランキングのバックアップ
// エクスポート
app.get('/api/backup/rankings', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;

  try {
    // ランキング一覧を取得
    const rankings = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM rankings WHERE user_id = ?', [userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // 各ランキングのアイテムを取得して結合
    const rankingsWithItems = await Promise.all(rankings.map(async (ranking) => {
      // アイテムを取得
      const items = await new Promise((resolve, reject) => {
        db.query('SELECT * FROM ranking_items WHERE ranking_id = ? ORDER BY rank_order ASC', [ranking.id], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
      return { ...ranking, items };
    }));

    res.json({ success: true, rankingData: rankingsWithItems });

  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました。' });
  }
});

// インポート (Rankings)
app.post('/api/backup/rankings/import', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  const { rankingData } = req.body;

  if (!rankingData || !Array.isArray(rankingData)) {
    return res.status(400).json({ success: false, error: '有効なランキングデータが必要です。' });
  }

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ success: false, error: 'データベース接続エラー' });

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ success: false, error: 'トランザクション開始エラー' });
      }

      try {
        let importedRankings = 0;

        for (const ranking of rankingData) {
          // ランキングの重複チェック（タイトルとカテゴリ）
          // ※ 同じタイトルでも別物として扱いたい場合もあるかもしれないが、ここでは重複を避ける方針
          const existingRanking = await new Promise((resolve, reject) => {
            connection.query(
              'SELECT id FROM rankings WHERE user_id = ? AND title = ? AND category = ?',
              [userId, ranking.title, ranking.category],
              (err, res) => {
                if (err) return reject(err);
                resolve(res);
              }
            );
          });

          if (existingRanking.length === 0) {
            // ランキングを作成
            const resRanking = await new Promise((resolve, reject) => {
              connection.query(
                'INSERT INTO rankings (user_id, title, description, category) VALUES (?, ?, ?, ?)',
                [userId, ranking.title, ranking.description, ranking.category],
                (err, res) => {
                  if (err) return reject(err);
                  resolve(res);
                }
              );
            });
            const rankingId = resRanking.insertId;
            importedRankings++;

            // アイテムを追加
            if (ranking.items && ranking.items.length > 0) {
              const values = ranking.items.map(item => [
                rankingId,
                item.game_id || null, // IDは環境依存の可能性があるが今回はそのまま。整合性担保にはさらにロジックが必要だが簡易実装とする
                item.book_id || null,
                item.custom_title || null,
                item.custom_image_url || null,
                item.comment || '',
                item.rank_order
              ]);

              await new Promise((resolve, reject) => {
                connection.query(
                  'INSERT INTO ranking_items (ranking_id, game_id, book_id, custom_title, custom_image_url, comment, rank_order) VALUES ?',
                  [values],
                  (err) => {
                    if (err) return reject(err);
                    resolve();
                  }
                );
              });
            }
          }
        }

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ success: false, error: 'コミットエラー' });
            });
          }
          connection.release();
          res.json({ success: true, message: `インポート完了: ランキング ${importedRankings}件` });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error('インポートエラー:', error);
          res.status(500).json({ success: false, error: 'インポート中にエラーが発生しました。' });
        });
      }
    });
  });
});

// 5. アニメのバックアップ
// アニメ一覧取得
app.get('/api/anime', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  db.query('SELECT * FROM anime_entries WHERE user_id = ? ORDER BY title', [userId], (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
    }
    res.json({ success: true, anime: results });
  });
});

// アニメ追加
app.post('/api/anime', authenticateToken, upload.single('image'), (req, res) => {
  const { id: userId } = req.user;
  const { title, original_author, genre, synopsis, rating, review } = req.body;
  let image_url = null;
  if (req.file) {
    image_url = `/uploads/${req.file.filename}`;
  }

  if (!title) {
    return res.status(400).json({ success: false, error: 'タイトルは必須です。' });
  }

  const query = `
    INSERT INTO anime_entries (user_id, title, original_author, genre, synopsis, rating, review, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [userId, title, original_author, genre, synopsis, rating, review, image_url], (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '保存できませんでした。' });
    }
    res.json({ success: true, message: 'アニメを追加しました。', id: result.insertId });
  });
});

// アニメ更新
app.put('/api/anime/:id', authenticateToken, upload.single('image'), (req, res) => {
  const { id: userId } = req.user;
  const { id: animeId } = req.params;
  const { title, original_author, genre, synopsis, rating, review } = req.body;

  // まず既存のデータを取得して所有権確認
  db.query('SELECT image_url FROM anime_entries WHERE id = ? AND user_id = ?', [animeId, userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'DBエラー' });
    if (results.length === 0) return res.status(404).json({ success: false, error: 'アニメが見つかりません' });

    let image_url = results[0].image_url;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    const updateQuery = `
      UPDATE anime_entries
      SET title = ?, original_author = ?, genre = ?, synopsis = ?, rating = ?, review = ?, image_url = ?
      WHERE id = ? AND user_id = ?
    `;

    db.query(updateQuery, [title, original_author, genre, synopsis, rating, review, image_url, animeId, userId], (err, result) => {
      if (err) {
        console.error('更新エラー:', err);
        return res.status(500).json({ success: false, error: '更新できませんでした。' });
      }
      res.json({ success: true, message: 'アニメ情報を更新しました。' });
    });
  });
});

// アニメ削除
app.delete('/api/anime/:id', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { id: animeId } = req.params;

  db.query('DELETE FROM anime_entries WHERE id = ? AND user_id = ?', [animeId, userId], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: '削除エラー' });
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'アニメが見つかりません' });
    res.json({ success: true, message: 'アニメを削除しました。' });
  });
});

// エクスポート
app.get('/api/backup/anime', authenticateToken, (req, res) => {
  const { id: userId } = req.user;

  db.query('SELECT * FROM anime_entries WHERE user_id = ?', [userId], (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
    }
    res.json({ success: true, animeData: results });
  });
});

// インポート (Anime)
app.post('/api/backup/anime/import', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  const { animeData } = req.body;

  if (!animeData || !Array.isArray(animeData)) {
    return res.status(400).json({ success: false, error: '有効なアニメデータが必要です。' });
  }

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ success: false, error: 'データベース接続エラー' });

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ success: false, error: 'トランザクション開始エラー' });
      }

      try {
        let importedCount = 0;
        let skippedCount = 0;

        for (const item of animeData) {
          // 重複チェック (タイトルが同じものはスキップとする)
          const existing = await new Promise((resolve, reject) => {
            connection.query('SELECT id FROM anime_entries WHERE user_id = ? AND title = ?', [userId, item.title], (err, results) => {
              if (err) return reject(err);
              resolve(results);
            });
          });

          if (existing.length > 0) {
            skippedCount++;
            continue;
          }

          await new Promise((resolve, reject) => {
            const data = {
              user_id: userId,
              title: item.title,
              original_author: item.original_author,
              genre: item.genre,
              synopsis: item.synopsis,
              rating: item.rating,
              review: item.review,
              image_url: item.image_url,
              created_at: item.created_at ? new Date(item.created_at) : new Date()
            };
            // Remove undefined/null keys if necessary, but DB handles nulls usually

            connection.query('INSERT INTO anime_entries SET ?', data, (err, res) => {
              if (err) return reject(err);
              resolve(res);
            });
          });
          importedCount++;
        }

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ success: false, error: 'コミットエラー' });
            });
          }
          connection.release();
          res.json({ success: true, message: `インポート完了: ${importedCount}件 (スキップ: ${skippedCount}件)` });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error('インポートエラー:', error);
          res.status(500).json({ success: false, error: 'インポート中にエラーが発生しました。' });
        });
      }
    });
  });
});



// --- システム管理 (Maintenance & Notifications) ---

// メンテナンス状態の取得 (Public)
app.get('/api/maintenance-status', (req, res) => {
  db.query('SELECT maintenance_mode, maintenance_message, scheduled_end_time FROM system_settings WHERE id = 1', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      // エラー時はメンテナンスモードではないと仮定、またはエラーを返す
      return res.json({ success: false, error: 'Database error' });
    }
    if (results.length > 0) {
      const settings = results[0];
      res.json({
        success: true,
        isMaintenanceMode: settings.maintenance_mode === 1, // Boolean変換
        maintenanceMessage: settings.maintenance_message,
        scheduledEnd: settings.scheduled_end_time
      });
    } else {
      // レコードがない場合
      res.json({ success: true, isMaintenanceMode: false });
    }
  });
});

// メンテナンスモード設定の更新 (Admin Only)
app.post('/api/admin/maintenance-mode', authenticateToken, (req, res) => {
  const { id: userId, email } = req.user;
  const { isMaintenanceMode, maintenanceMessage, scheduledEnd } = req.body;

  // 簡易的な管理者チェック (実際の運用ではロール管理を推奨)
  if (email !== 'test.example3030@gmail.com') {
    return res.status(403).json({ success: false, error: '権限がありません。' });
  }

  const query = `
    UPDATE system_settings
    SET maintenance_mode = ?, maintenance_message = ?, scheduled_end_time = ?
    WHERE id = 1
  `;

  db.query(query, [isMaintenanceMode, maintenanceMessage, scheduledEnd], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, error: '更新に失敗しました。' });
    }
    res.json({ success: true, message: 'メンテナンスモードが更新されました。' });
  });
});

// メンテナンス通知の送信 (Admin Only)
app.post('/api/admin/send-maintenance-notification', authenticateToken, (req, res) => {
  const { email } = req.user;
  const { subject, message, scheduledEnd } = req.body;

  if (email !== 'test.example3030@gmail.com') {
    return res.status(403).json({ success: false, error: '権限がありません。' });
  }

  // ここで実際にメール送信処理を行う (Nodemailerなどを使用)
  // 今回はモックとしてログ出力のみ
  console.log(`[Email Sending] Type: Maintenance, Subject: ${subject}, Message: ${message}, End: ${scheduledEnd}`);

  // 成功を返す
  res.json({ success: true, message: 'メンテナンス通知を送信しました（シミュレーション）。' });
});

// 新機能通知の送信 (Admin Only)
app.post('/api/admin/send-feature-notification', authenticateToken, (req, res) => {
  const { email } = req.user;
  const { subject, message } = req.body;

  if (email !== 'test.example3030@gmail.com') {
    return res.status(403).json({ success: false, error: '権限がありません。' });
  }

  console.log(`[Email Sending] Type: Feature, Subject: ${subject}, Message: ${message}`);

  res.json({ success: true, message: '新機能通知を送信しました（シミュレーション）。' });
});


// --- ランキング(Ranking)関連API ---

// ランキングテーブルのSQLスキーマ (要実行)
// CREATE TABLE rankings (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   user_id INT NOT NULL,
//   title VARCHAR(255) NOT NULL,
//   description TEXT,
//   category ENUM('game', 'reading') NOT NULL,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
// );

// ランキングアイテムテーブルのSQLスキーマ (要実行)
// CREATE TABLE ranking_items (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   ranking_id INT NOT NULL,
//   game_id INT,
//   book_id INT,
//   comment TEXT,
//   rank_order INT NOT NULL,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (ranking_id) REFERENCES rankings(id) ON DELETE CASCADE,
//   FOREIGN KEY (game_id) REFERENCES played_games(id) ON DELETE CASCADE,
//   FOREIGN KEY (book_id) REFERENCES reading_entries(id) ON DELETE CASCADE
// );

// ランキング一覧を取得 (トップ3アイテム付き)
app.get('/api/rankings', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { category } = req.query;

  let query = 'SELECT * FROM rankings WHERE user_id = ?';
  const params = [userId];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  query += ' ORDER BY created_at DESC';

  db.query(query, params, async (err, rankings) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: 'データベースエラーが発生しました。' });
    }

    // 各ランキングのトップ3アイテムを取得
    const rankingsWithItems = await Promise.all(rankings.map(async (ranking) => {
      let itemQuery = '';
      if (ranking.category === 'game') {
        itemQuery = `
          SELECT ri.comment, ri.rank_order, COALESCE(pg.title, ri.custom_title) as title, COALESCE(pg.image_url, ri.custom_image_url) as image_url
          FROM ranking_items ri
          LEFT JOIN played_games pg ON ri.game_id = pg.id
          WHERE ri.ranking_id = ?
          ORDER BY ri.rank_order ASC
        `;
      } else if (ranking.category === 'anime') {
        itemQuery = `
          SELECT ri.comment, ri.rank_order, COALESCE(ae.title, ri.custom_title) as title, COALESCE(ae.image_url, ri.custom_image_url) as image_url
          FROM ranking_items ri
          LEFT JOIN anime_entries ae ON ri.anime_id = ae.id
          WHERE ri.ranking_id = ?
          ORDER BY ri.rank_order ASC
        `;
      } else {
        itemQuery = `
          SELECT ri.comment, ri.rank_order, COALESCE(rb.title, ri.custom_title) as title, COALESCE(rb.image_url, ri.custom_image_url) as image_url
          FROM ranking_items ri
          LEFT JOIN reading_entries rb ON ri.book_id = rb.id
          WHERE ri.ranking_id = ?
          ORDER BY ri.rank_order ASC
        `;
      }

      const items = await new Promise((resolve) => {
        db.query(itemQuery, [ranking.id], (err, results) => {
          if (err) resolve([]); // エラー時は空配列
          else resolve(results);
        });
      });

      return { ...ranking, items };
    }));

    res.json({ success: true, rankings: rankingsWithItems });
  });
});

// ランキング詳細（アイテム含む）を取得
app.get('/api/rankings/:rankingId', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { rankingId } = req.params;

  db.query('SELECT * FROM rankings WHERE id = ? AND user_id = ?', [rankingId, userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'データベースエラー' });
    if (results.length === 0) return res.status(404).json({ success: false, error: 'ランキングが見つかりません' });

    const ranking = results[0];

    // アイテムを取得（ゲーム情報または書籍情報を結合）
    let itemQuery = '';
    if (ranking.category === 'game') {
      itemQuery = `
        SELECT ri.*, COALESCE(pg.title, ri.custom_title) as title, COALESCE(pg.image_url, ri.custom_image_url) as image_url, pg.playtime_hours, pg.rating as item_rating
        FROM ranking_items ri
        LEFT JOIN played_games pg ON ri.game_id = pg.id
        WHERE ri.ranking_id = ?
        ORDER BY ri.rank_order ASC
          `;
    } else if (ranking.category === 'anime') {
      itemQuery = `
        SELECT ri.*, COALESCE(ae.title, ri.custom_title) as title, COALESCE(ae.image_url, ri.custom_image_url) as image_url, ae.rating as item_rating, ae.genre
        FROM ranking_items ri
        LEFT JOIN anime_entries ae ON ri.anime_id = ae.id
        WHERE ri.ranking_id = ?
        ORDER BY ri.rank_order ASC
      `;
    } else {
      itemQuery = `
        SELECT ri.*, COALESCE(rb.title, ri.custom_title) as title, COALESCE(rb.image_url, ri.custom_image_url) as image_url, rb.rating as item_rating, ra.name as author_name, rb.publisher
        FROM ranking_items ri
        LEFT JOIN reading_entries rb ON ri.book_id = rb.id
        LEFT JOIN reading_authors ra ON rb.author_id = ra.id
        WHERE ri.ranking_id = ?
        ORDER BY ri.rank_order ASC
      `;
    }

    db.query(itemQuery, [rankingId], (err, items) => {
      if (err) return res.status(500).json({ success: false, error: 'アイテム取得エラー' });
      ranking.items = items;
      res.json({ success: true, ranking });
    });
  });
});

// ランキングを作成
app.post('/api/rankings', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { title, description, category } = req.body;

  if (!title || !category) {
    return res.status(400).json({ success: false, error: 'タイトルとカテゴリは必須です。' });
  }

  db.query(
    'INSERT INTO rankings (user_id, title, description, category) VALUES (?, ?, ?, ?)',
    [userId, title, description, category],
    (err, result) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'ランキング作成エラー' });
      }
      res.status(201).json({ success: true, message: 'ランキングを作成しました', rankingId: result.insertId });
    }
  );
});

// ランキング基本情報を更新 (タイトル、説明、カテゴリ)
app.put('/api/rankings/:rankingId', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { rankingId } = req.params;
  const { title, description, category } = req.body;

  if (!title || !category) {
    return res.status(400).json({ success: false, error: 'タイトルとカテゴリは必須です。' });
  }

  // まず所有権確認
  db.query('SELECT id FROM rankings WHERE id = ? AND user_id = ?', [rankingId, userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'DBエラー' });
    if (results.length === 0) return res.status(404).json({ success: false, error: 'ランキングが見つかりません' });

    db.query(
      'UPDATE rankings SET title = ?, description = ?, category = ? WHERE id = ?',
      [title, description, category, rankingId],
      (err, result) => {
        if (err) {
          console.error('更新エラー:', err);
          return res.status(500).json({ success: false, error: '更新エラー' });
        }
        res.json({ success: true, message: 'ランキング情報を更新しました' });
      }
    );
  });
});

// ランキングを削除
app.delete('/api/rankings/:rankingId', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { rankingId } = req.params;

  db.query('DELETE FROM rankings WHERE id = ? AND user_id = ?', [rankingId, userId], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: '削除エラー' });
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'ランキングが見つかりません' });
    res.json({ success: true, message: 'ランキングを削除しました' });
  });
});

// ランキングアイテムを一括更新（追加・削除・並び替え）
app.put('/api/rankings/:rankingId/items', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { rankingId } = req.params;
  const { items } = req.body; // Array of { id (optional), game_id/book_id, comment, rank_order }

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, error: '有効なアイテムリストが必要です' });
  }

  // まず所有権確認
  db.query('SELECT category FROM rankings WHERE id = ? AND user_id = ?', [rankingId, userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'DBエラー' });
    if (results.length === 0) return res.status(404).json({ success: false, error: 'ランキングが見つかりません' });
    const category = results[0].category;

    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ success: false, error: 'DB接続エラー' });

      connection.beginTransaction(async (err) => {
        if (err) {
          connection.release();
          return res.status(500).json({ success: false, error: 'トランザクション開始エラー' });
        }

        try {
          // 既存アイテムを全削除して入れ直すのが一番簡単だが、IDを保持したい場合はUPDATE/INSERT/DELETEを使い分ける。
          // ここでは簡易実装として「全削除→挿入」を行いますが、もし既存IDに紐づくデータがあれば別のアプローチが必要。
          // 今回はranking_itemsに外部からの依存はないので全削除でOK。

          await new Promise((resolve, reject) => {
            connection.query('DELETE FROM ranking_items WHERE ranking_id = ?', [rankingId], (err) => {
              if (err) return reject(err);
              resolve();
            });
          });

          if (items.length > 0) {
            const values = items.map((item, index) => [
              rankingId,
              (category === 'game' && item.item_id) ? item.item_id : null,
              (category === 'reading' && item.item_id) ? item.item_id : null,
              (category === 'anime' && item.item_id) ? item.item_id : null, // Add anime_id
              item.custom_title || null,
              item.custom_image_url || null,
              item.comment,
              index // 並び順は配列のインデックスを使用
            ]);

            await new Promise((resolve, reject) => {
              connection.query(
                'INSERT INTO ranking_items (ranking_id, game_id, book_id, anime_id, custom_title, custom_image_url, comment, rank_order) VALUES ?',
                [values],
                (err) => {
                  if (err) return reject(err);
                  resolve();
                }
              );
            });
          }

          connection.commit((err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ success: false, error: 'コミットエラー' });
              });
            }
            connection.release();
            res.json({ success: true, message: 'ランキングを更新しました' });
          });

        } catch (error) {
          connection.rollback(() => {
            connection.release();
            console.error('更新エラー:', error);
            res.status(500).json({ success: false, error: '更新中にエラーが発生しました' });
          });
        }
      });
    });
  });
});

// サーバー起動
// 指定されたポート（またはデフォルト5000番）でサーバーを待ち受け状態にします
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`サーバーがポート${PORT} で起動しました`);
  console.log(`Database host: ${process.env.DB_HOST} `);
});


