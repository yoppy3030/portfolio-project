// 必要なライブラリを読み込みます。
require('dotenv').config(); // .envファイルから環境変数を読み込むためのライブラリ
const express = require('express'); // Webフレームワーク
const mysql = require('mysql'); // MySQLデータベースと連携するためのライブラリ
const bcrypt = require('bcryptjs'); // パスワードをハッシュ化（暗号化）するためのライブラリ
const cors = require('cors'); // オリジン間リソース共有（CORS）を許可するためのミドルウェア
const crypto = require('crypto'); // 暗号化関連の機能を提供する標準ライブラリ
const jwt = require('jsonwebtoken'); // JSON Web Tokenを生成・検証するためのライブラリ
const helmet = require('helmet'); // HTTPヘッダーを適切に設定してセキュリティを向上させるミドルウェア
const rateLimit = require('express-rate-limit'); // APIへのリクエスト数を制限するミドルウェア（ブルートフォース攻撃対策）
const path = require('path'); // ファイルパスを操作するための標準ライブラリ
const multer = require('multer'); // ファイルアップロードを処理するためのミドルウェア

// Expressアプリケーションのインスタンスを作成
const app = express();

// BGMエントリの最大許容数
const MAX_BGM_ENTRIES = 30;

// 本番環境（'production'）の場合のみ、セキュリティヘッダーを設定する
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
}

// 全てのエンドポイントに対する基本的なレート制限を設定
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分間のウィンドウ
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 本番環境では15分間に100リクエストまで、それ以外は1000リクエストまで
  message: {
    success: false,
    error: 'リクエストが多すぎます。しばらく待ってから再試行してください。'
  }
});
app.use(limiter); // アプリケーションにレート制限を適用

// ログインエンドポイント専用の、より厳しいレート制限
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分間のウィンドウ
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 本番環境では15分間に5回の試行まで
  message: {
    success: false,
    error: 'ログイン試行回数が多すぎます。15分後に再試行してください。'
  }
});

// JSON形式のリクエストボディを解析できるようにする（上限10MB）
app.use(express.json({ limit: '10mb' }));
// URLエンコードされたリクエストボディを解析できるようにする（上限10mb）
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS設定: 指定したオリジンからのリクエストを許可する
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5001'].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // 許可するHTTPメソッド
  credentials: true // 認証情報（Cookieなど）の送信を許可
}));

// '/uploads'ディレクトリのファイルを静的ファイルとして提供する設定
app.use('/uploads', cors()); // 静的ファイルにもCORSを適用
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer（ファイルアップロード）の設定
const storage = multer.diskStorage({
  // ファイルの保存先を指定
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  // ファイル名を指定
  filename: function (req, file, cb) {
    // セキュリティのため、ファイル名から危険な文字をアンダースコアに置換
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9-._]/g, '_');
    // ファイル名の重複を避けるために、現在時刻のタイムスタンプを接頭辞として付与
    cb(null, Date.now() + '-' + sanitizedOriginalName);
  }
});

// 上記設定を使ってMulterのインスタンスを作成
const upload = multer({ storage: storage });

// JWTの署名に使う秘密鍵。環境変数から取得、なければ開発用の鍵を使う
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';

// データベース接続設定
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'portfolio_user',
  password: process.env.DB_PASSWORD || 'pfBuilder2025',
  database: process.env.DB_NAME || 'portfolio_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // 本番環境ではSSL接続を試みる
  connectionLimit: 10, // 接続プールの最大接続数
  acquireTimeout: 60000, // 接続取得のタイムアウト（ミリ秒）
  timeout: 60000, // クエリ実行のタイムアウト（ミリ秒）
  reconnect: true // 自動再接続を有効化
};

// MySQL接続プールを作成。これにより接続が効率的に管理される
const db = mysql.createPool(DB_CONFIG);

// データベースへの接続を試み、成功・失敗をコンソールに出力
db.getConnection((err, connection) => {
  if (err) {
    console.error('データベース接続エラー:', err);
    process.exit(1); // 接続失敗時はアプリケーションを終了
  }
  console.log('データベースに接続しました');
  connection.release(); // プールに接続を返却
});

// JWTトークンを検証するミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']; // 'Authorization'ヘッダーを取得
  const token = authHeader && authHeader.split(' ')[1]; // 'Bearer <token>'形式からトークン部分を抽出

  if (!token) {
    // トークンがなければ401 Unauthorizedエラーを返す
    return res.status(401).json({ success: false, error: 'アクセストークンが必要です' });
  }

  // トークンを検証
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // トークンが無効なら403 Forbiddenエラーを返す
      return res.status(403).json({ success: false, error: '無効なトークンです' });
    }
    // 検証成功後、リクエストオブジェクトにユーザー情報を格納して次の処理へ
    req.user = user;
    next();
  });
};

// JWTトークンを検証するミドルウェア（トークンがなくてもエラーにしない）
const tryAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // トークンがなくても次の処理へ進む
    req.user = null;
    return next();
  }

  // トークンを検証
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // トークンが無効でもエラーにせず、ユーザー情報なしで次の処理へ
      req.user = null;
      return next();
    }
    // 検証成功後、リクエストオブジェクトにユーザー情報を格納
    req.user = user;
    next();
  });
};

// 期限切れの認証コードをデータベースから削除する関数
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

// 1時間ごとに`cleanupExpiredCodes`関数を実行
setInterval(cleanupExpiredCodes, 60 * 60 * 1000);

// ==================================================
// APIエンドポイント定義
// ==================================================

/**
 * @route   POST /api/register
 * @desc    新規ユーザー登録
 * @access  Public
 */
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, iconUrl, bio } = req.body;

    // 入力値のバリデーション
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: '必須フィールドが不足しています' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'パスワードは8文字以上で入力してください' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: '有効なメールアドレスを入力してください' });
    }

    // パスワードをハッシュ化
    const hash = await bcrypt.hash(password, 12);

    // メールアドレスまたはユーザー名が既に存在するかチェック
    db.query(
      'SELECT id FROM users WHERE email = ? OR name = ?',
      [email, name],
      (err, results) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
        }
        if (results.length > 0) {
          return res.status(409).json({ success: false, error: 'このメールアドレスまたはユーザー名は既に使用されています' });
        }

        // ユーザー情報をデータベースに挿入
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
              return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
            }
            res.json({ success: true, message: 'ユーザー登録が完了しました', userId: result.insertId });
          }
        );
      }
    );
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

/**
 * @route   POST /api/login
 * @desc    ユーザーログイン
 * @access  Public
 */
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, autoLogin } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'メールアドレスとパスワードを入力してください' });
    }

    // メールアドレスまたはユーザー名でユーザーを検索
    db.query(
      'SELECT id, name, email, password_hash, bio, iconUrl, email_notifications, feature_announcements, maintenance_info, language, theme FROM users WHERE email = ? OR name = ?',
      [email, email],
      async (err, results) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
        }
        if (results.length === 0) {
          return res.status(401).json({ success: false, error: 'メールアドレスまたはパスワードが正しくありません' });
        }

        const user = results[0];
        // 入力されたパスワードとハッシュ化されたパスワードを比較
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
          return res.status(401).json({ success: false, error: 'メールアドレスまたはパスワードが正しくありません' });
        }

        // JWTトークンを生成（自動ログインの場合は有効期限を30日に）
        const tokenExpiry = autoLogin ? '30d' : '1d';
        const token = jwt.sign(
          { id: user.id, email: user.email, name: user.name },
          JWT_SECRET,
          { expiresIn: tokenExpiry }
        );

        // レスポンスからパスワードハッシュを削除
        delete user.password_hash;

        res.json({ success: true, message: 'ログインしました', token: token, user: user });
      }
    );
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

/**
 * @route   GET /api/verify-token
 * @desc    トークンを検証し、ユーザー情報を返す
 * @access  Private
 */
app.get('/api/verify-token', authenticateToken, (req, res) => {
    // authenticateTokenミドルウェアで検証済みのユーザーIDを使用
    db.query(
    'SELECT id, name, email, bio, iconUrl, email_notifications, feature_announcements, maintenance_info, language, theme FROM users WHERE id = ?',
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, error: 'ユーザーが見つかりません' });
      }
      res.json({ success: true, user: results[0] });
    }
  );
});

/**
 * @route   PUT /api/profile
 * @desc    ユーザープロフィールを更新
 * @access  Private
 */
app.put('/api/profile', authenticateToken, upload.single('icon'), (req, res) => {
  try {
    const { id } = req.user;
    const { name, bio } = req.body;

    // 更新するフィールドを動的に構築
    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (bio) fieldsToUpdate.bio = bio;
    if (req.file) {
      // ファイルがアップロードされた場合は、そのパスをiconUrlとして設定
      fieldsToUpdate.iconUrl = `/uploads/${req.file.filename}`;
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ success: false, error: '更新するフィールドがありません。' });
    }

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

        // 更新後の最新のユーザー情報を取得して返す
        db.query('SELECT id, name, email, bio, iconUrl, email_notifications, feature_announcements, maintenance_info, language, theme FROM users WHERE id = ?', [id], (err, results) => {
          if (err) {
            console.error('データベースエラー:', err);
            return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
          }
          if (results.length === 0) {
            return res.status(404).json({ success: false, error: '更新後のユーザー情報が見つかりません' });
          }
          res.json({ success: true, message: 'プロフィールが更新されました', user: results[0] });
        });
      }
    );
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

/**
 * @route   POST /api/change-password
 * @desc    パスワードを変更
 * @access  Private
 */
app.post('/api/change-password', authenticateToken, async (req, res) => {
  try {
    const { id } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: '現在のパスワードと新しいパスワードを入力してください' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: '新しいパスワードは8文字以上で入力してください' });
    }

    // 現在のパスワードが正しいか検証
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

      // 新しいパスワードをハッシュ化してデータベースを更新
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

/**
 * @route   PUT /api/notifications
 * @desc    通知設定を更新
 * @access  Private
 */
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

/**
 * @route   DELETE /api/account
 * @desc    アカウントを削除
 * @access  Private
 */
app.delete('/api/account', authenticateToken, async (req, res) => {
  try {
    const { id } = req.user;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'パスワードを入力してください' });
    }

    // パスワードを検証
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

      // ユーザーを削除
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

/**
 * @route   PUT /api/general-settings
 * @desc    一般設定（言語、テーマ）を更新
 * @access  Private
 */
app.put('/api/general-settings', authenticateToken, (req, res) => {
  try {
    const { id } = req.user;
    const { language, theme } = req.body;

    const fieldsToUpdate = {};
    if (language) fieldsToUpdate.language = language;
    if (theme) fieldsToUpdate.theme = theme;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ success: false, error: '更新するフィールドがありません。' });
    }

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

        // 更新後のユーザー情報を取得して返す
        db.query('SELECT id, name, email, bio, iconUrl, email_notifications, feature_announcements, maintenance_info, language, theme FROM users WHERE id = ?', [id], (err, results) => {
          if (err) {
            console.error('データベースエラー:', err);
            return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
          }
          if (results.length === 0) {
            return res.status(404).json({ success: false, error: '更新後のユーザー情報が見つかりません' });
          }
          res.json({ success: true, message: '一般設定が更新されました', user: { ...results[0] } });
        });
      }
    );
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

/**
 * @route   POST /api/upload
 * @desc    汎用的なファイルアップロード
 * @access  Private
 */
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'ファイルがアップロードされませんでした。' });
  }
  // クライアントがアクセスできるファイルパスを返す
  const filePath = `/uploads/${req.file.filename}`;
  res.json({ success: true, filePath: filePath });
});

// --- 趣味(Hobbies)関連API ---

/**
 * @route   GET /api/hobbies
 * @desc    ユーザーの趣味リストを取得
 * @access  Private
 */
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

/**
 * @route   POST /api/hobbies
 * @desc    新しい趣味を追加
 * @access  Private
 */
app.post('/api/hobbies', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, error: '趣味の名前は必須です。' });
  }

  db.query('INSERT INTO hobbies (user_id, name) VALUES (?, ?)', [userId, name.trim()], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') { // 重複エラーの場合
        return res.status(409).json({ success: false, error: 'その趣味は既に追加されています。' });
      }
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '趣味の追加中にデータベースエラーが発生しました。' });
    }
    res.status(201).json({ success: true, message: '趣味が追加されました。', hobby: { id: result.insertId, name: name.trim() } });
  });
});

/**
 * @route   DELETE /api/hobbies/:hobbyId
 * @desc    趣味を削除
 * @access  Private
 */
app.delete('/api/hobbies/:hobbyId', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { hobbyId } = req.params;

  db.query('DELETE FROM hobbies WHERE id = ? AND user_id = ?', [hobbyId, userId], (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '趣味の削除中にデータベースエラーが発生しました。' });
    }
    if (result.affectedRows === 0) { // 削除対象がなかった場合
      return res.status(404).json({ success: false, error: '趣味が見つからないか、削除する権限がありません。' });
    }
    res.json({ success: true, message: '趣味が削除されました。' });
  });
});

// --- プレイ済みゲーム(Played Games)関連API ---

/**
 * @route   GET /api/played-games
 * @desc    ユーザーのプレイ済みゲームリストを取得
 * @access  Private
 */
app.get('/api/played-games', authenticateToken, (req, res) => {
  const { id: userId } = req.user;

  // ゲーム情報と、それに関連するBGM情報を結合して取得するクエリ
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

    // データベースから取得したJSON文字列をオブジェクトの配列にパースする
    const playedGamesWithParsedData = results.map(game => ({
      ...game,
      platforms: game.platforms ? JSON.parse(game.platforms) : [],
      genres: game.genres ? JSON.parse(game.genres) : [],
      series: game.series || null,
      bgms: game.bgms ? JSON.parse(game.bgms).filter(b => b !== null) : [],
    }));

    res.json({ success: true, playedGames: playedGamesWithParsedData });
  });
});

// --- 音楽鑑賞(Music Appreciation)関連API ---

/**
 * @route   GET /api/music-genres
 * @desc    登録されている音楽ジャンルのリストを取得
 * @access  Public
 */
app.get('/api/music-genres', (req, res) => {
  db.query('SELECT id, name FROM music_genres ORDER BY name', (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '音楽ジャンルの取得中にデータベースエラーが発生しました。' });
    }
    res.json({ success: true, genres: results });
  });
});

/**
 * @route   GET /api/user-music-preferences
 * @desc    ユーザーの音楽設定（好きなジャンル・アーティスト）と関連する曲を取得
 * @access  Private
 */
app.get('/api/user-music-preferences', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;

  try {
    // 1. ユーザーの音楽設定（ジャンル・アーティスト）を取得
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
    
    // 2a. (データ補正) 曲の表示順(song_order)が設定されていない曲に順序を割り振る
    for (const prefId of preferenceIds) {
      const songsToInit = await new Promise((resolve, reject) => {
        db.query('SELECT id FROM favorite_songs WHERE preference_id = ? AND song_order IS NULL ORDER BY created_at ASC', [prefId], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
      
      if (songsToInit.length > 0) {
        const maxOrderResult = await new Promise((resolve, reject) => {
          db.query('SELECT COALESCE(MAX(song_order), -1) AS max_order FROM favorite_songs WHERE preference_id = ?', [prefId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
        });
        let nextOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;
        
        for (const song of songsToInit) {
          await new Promise((resolve, reject) => {
            db.query('UPDATE favorite_songs SET song_order = ? WHERE id = ?', [nextOrder++, song.id], (err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
          });
        }
      }
    }
    
    // 2b. 表示順にソートして曲を取得
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

/**
 * @route   POST /api/user-music-preferences
 * @desc    新しい音楽設定（ジャンル・アーティスト）を追加
 * @access  Private
 */
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

/**
 * @route   DELETE /api/user-music-preferences/:preferenceId
 * @desc    音楽設定を削除
 * @access  Private
 */
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

/**
 * @route   POST /api/music-preferences/:preferenceId/songs
 * @desc    特定の音楽設定にお気に入りの曲を追加
 * @access  Private
 */
app.post('/api/music-preferences/:preferenceId/songs', authenticateToken, async (req, res) => {
  const { preferenceId } = req.params;
  const { id: userId } = req.user;
  const { song_title, artist_name, youtube_url } = req.body;

  if (!song_title) {
    return res.status(400).json({ success: false, error: '曲名は必須です。' });
  }

  try {
    // この設定がユーザーのものであることを確認
    const preferences = await new Promise((resolve, reject) => {
      db.query('SELECT id FROM user_music_preferences WHERE id = ? AND user_id = ?', [preferenceId, userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (preferences.length === 0) {
      return res.status(403).json({ success: false, error: 'この設定に曲を追加する権限がありません。' });
    }

    // 新しい曲の表示順を決定（現在の最大値+1）
    const maxOrderResult = await new Promise((resolve, reject) => {
      db.query('SELECT COALESCE(MAX(song_order), -1) AS max_order FROM favorite_songs WHERE preference_id = ?', [preferenceId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
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

/**
 * @route   DELETE /api/songs/:songId
 * @desc    お気に入りの曲を削除
 * @access  Private
 */
app.delete('/api/songs/:songId', authenticateToken, async (req, res) => {
  const { songId } = req.params;
  const { id: userId } = req.user;

  try {
    // ユーザーがこの曲の所有者であることを確認
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

    // 曲を削除
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

/**
 * @route   PUT /api/songs/reorder
 * @desc    お気に入りの曲の表示順を更新
 * @access  Private
 */
app.put('/api/songs/reorder', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  const { songIds, preferenceId } = req.body;

  // リクエストのバリデーション
  if (!songIds || !Array.isArray(songIds) || !preferenceId) {
    return res.status(400).json({ success: false, error: 'songIds(配列)とpreferenceIdが必要です。' });
  }
  if (songIds.length === 0) {
    return res.json({ success: true, message: '更新対象の曲がありません。' });
  }

  // データベース接続とトランザクション開始
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
        // ユーザーがこの設定の所有者か確認
        const [pref] = await new Promise((resolve, reject) => {
          connection.query('SELECT id FROM user_music_preferences WHERE id = ? AND user_id = ?', [preferenceId, userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
        });

        if (!pref) {
          throw { status: 403, message: 'これらの曲を並び替える権限がありません。' };
        }

        // 受け取ったsongIdsの順序で、各曲のsong_orderを更新
        for (let i = 0; i < songIds.length; i++) {
          const songId = parseInt(songIds[i], 10);
          const order = i;
          
          if (isNaN(songId)) {
            throw { status: 400, message: `無効なsongId: ${songIds[i]}` };
          }
          
          await new Promise((resolve, reject) => {
            connection.query('UPDATE favorite_songs SET song_order = ? WHERE id = ? AND preference_id = ?', [order, songId, preferenceId], (err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
          });
        }

        // トランザクションをコミット
        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ success: false, error: `曲の順序の更新中にデータベースエラーが発生しました: ${err.message}` });
            });
          }
          connection.release();
          res.json({ success: true, message: '曲の順序が更新されました。' });
        });

      } catch (error) {
        // エラー発生時はロールバック
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

/**
 * @route   PUT /api/songs/:songId
 * @desc    お気に入りの曲情報を更新
 * @access  Private
 */
app.put('/api/songs/:songId', authenticateToken, async (req, res) => {
  const { songId } = req.params;
  const { id: userId } = req.user;
  const { song_title, artist_name, youtube_url } = req.body;

  if (!song_title) {
    return res.status(400).json({ success: false, error: '曲名は必須です。' });
  }

  try {
    // 所有権の確認
    const songs = await new Promise((resolve, reject) => {
      const query = `
        SELECT fs.id FROM favorite_songs fs
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

    // 曲情報を更新
    const updatedSong = { song_title, artist_name: artist_name || null, youtube_url: youtube_url || null };
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

/**
 * @route   GET /api/user-songs
 * @desc    ユーザーのお気に入りの曲をすべて取得
 * @access  Private
 */
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

/**
 * @route   POST /api/played-games
 * @desc    新しいプレイ済みゲームを追加
 * @access  Private
 */
app.post('/api/played-games', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { game_api_id, title, image_url, platforms, genres, series, bgms } = req.body;

  // バリデーション
  if (!game_api_id || !title) {
    return res.status(400).json({ success: false, error: 'ゲームIDとタイトルは必須です。' });
  }
  if (bgms !== undefined && !Array.isArray(bgms)) {
    return res.status(400).json({ success: false, error: 'BGMは配列である必要があります。' });
  }
  if (bgms && bgms.length > MAX_BGM_ENTRIES) {
    return res.status(400).json({ success: false, error: `登録できるBGMの数は${MAX_BGM_ENTRIES}個までです。` });
  }

  // トランザクション開始
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
        // 1. played_gamesテーブルにゲームを挿入
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

/**
 * @route   PUT /api/played-games/:playedGameId
 * @desc    プレイ済みゲームの情報（評価、コメント、BGMなど）を更新
 * @access  Private
 */
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

    // トランザクション開始
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
                // 1. played_gamesテーブルの基本情報を更新
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

                // 2. BGM情報を更新 (bgmsがリクエストに含まれている場合のみ)
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

/**
 * @route   DELETE /api/played-games/:playedGameId
 * @desc    プレイ済みゲームを削除
 * @access  Private
 */
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

// --- 読書(Reading)関連API ---

/**
 * @route   GET /api/reading/authors
 * @desc    ユーザーが登録した作家のリストを取得
 * @access  Private
 */
app.get('/api/reading/authors', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  db.query('SELECT id, name FROM reading_authors WHERE user_id = ? ORDER BY name', [userId], (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '作家リストの取得中にデータベースエラーが発生しました。' });
    }
    res.json({ success: true, authors: results });
  });
});

/**
 * @route   POST /api/reading/authors
 * @desc    新しい作家を追加
 * @access  Private
 */
app.post('/api/reading/authors', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, error: '作家名は必須です。' });
  }

  db.query('INSERT INTO reading_authors (user_id, name) VALUES (?, ?)', [userId, name.trim()], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, error: 'その作家は既に追加されています。' });
      }
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '作家の追加中にデータベースエラーが発生しました。' });
    }
    res.status(201).json({ success: true, message: '作家が追加されました。', author: { id: result.insertId, name: name.trim() } });
  });
});

/**
 * @route   DELETE /api/reading/authors/:authorId
 * @desc    作家を削除（関連する書籍も自動的に削除される）
 * @access  Private
 */
app.delete('/api/reading/authors/:authorId', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { authorId } = req.params;

  // 注意: 外部キー制約(ON DELETE CASCADE)により、作家を削除すると関連する書籍もすべて削除されます。
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

/**
 * @route   GET /api/reading/books
 * @desc    ユーザーが登録した書籍のリストを取得
 * @access  Private
 */
app.get('/api/reading/books', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { author_id } = req.query; // クエリパラメータで作家IDを指定可能

  let query = `
    SELECT b.*, a.name as author_name 
    FROM reading_books b
    JOIN reading_authors a ON b.author_id = a.id
    WHERE b.user_id = ?
  `;
  const params = [userId];

  if (author_id) {
    query += ' AND b.author_id = ?';
    params.push(author_id);
  }

  query += ' ORDER BY b.display_order ASC, b.created_at DESC'; // 表示順でソート

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '書籍リストの取得中にデータベースエラーが発生しました。' });
    }
    res.json({ success: true, books: results });
  });
});

/**
 * @route   POST /api/reading/books
 * @desc    新しい本を追加
 * @access  Private
 */
app.post('/api/reading/books', authenticateToken, upload.single('image'), (req, res) => {
  const { id: userId } = req.user;
  const { author_id, type, genre, title, comment, rating } = req.body;

  if (!author_id || !type || !title) {
    return res.status(400).json({ success: false, error: '作家、種類、タイトルは必須です。' });
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
        // 新しい本の表示順を決定
        const maxOrderResult = await new Promise((resolve, reject) => {
          connection.query('SELECT COALESCE(MAX(display_order), -1) AS max_order FROM reading_books WHERE user_id = ? AND author_id = ?', [userId, author_id], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
        });
        const nextOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;

        const newBook = {
          user_id: userId,
          author_id,
          type,
          genre,
          title,
          comment,
          rating,
          image_url: req.file ? `/uploads/${req.file.filename}` : null,
          display_order: nextOrder
        };

        const result = await new Promise((resolve, reject) => {
          connection.query('INSERT INTO reading_books SET ?', newBook, (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ success: false, error: `書籍の追加中にデータベースエラーが発生しました: ${err.message}` });
            });
          }
          connection.release();
          res.status(201).json({ success: true, message: '本が追加されました。', book: { id: result.insertId, ...newBook } });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error('トランザクションエラー:', error);
          res.status(500).json({ success: false, error: '書籍の追加中にデータベースエラーが発生しました。' });
        });
      }
    });
  });
});

/**
 * @route   PUT /api/reading/books/reorder
 * @desc    書籍の表示順を更新
 * @access  Private
 */
app.put('/api/reading/books/reorder', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  const { books: orderedBooksWithOrder } = req.body;

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
        // 受け取った配列の順序でdisplay_orderを更新
        for (const book of orderedBooksWithOrder) {
          const { id: bookId, display_order: newDisplayOrder } = book;

          if (bookId === undefined || newDisplayOrder === undefined) {
            throw { status: 400, message: `無効な書籍データ: ${JSON.stringify(book)}` };
          }

          await new Promise((resolve, reject) => {
            connection.query('UPDATE reading_books SET display_order = ? WHERE id = ? AND user_id = ?', [newDisplayOrder, bookId, userId], (err, result) => {
              if (err) return reject(err);
              if (result.affectedRows === 0) {
                return reject({ status: 403, message: `本ID ${bookId} の更新権限がありません、または本が見つかりません。` });
              }
              resolve(result);
            });
          });
        }

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
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

/**
 * @route   PUT /api/reading/books/:bookId
 * @desc    本の情報を更新
 * @access  Private
 */
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

  db.query('UPDATE reading_books SET ? WHERE id = ? AND user_id = ?', [fieldsToUpdate, bookId, userId], (err, result) => {
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

/**
 * @route   DELETE /api/reading/books/:bookId
 * @desc    本を削除
 * @access  Private
 */
app.delete('/api/reading/books/:bookId', authenticateToken, (req, res) => {
  const { id: userId } = req.user;
  const { bookId } = req.params;

  db.query('DELETE FROM reading_books WHERE id = ? AND user_id = ?', [bookId, userId], (err, result) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ success: false, error: '書籍の削除中にデータベースエラーが発生しました。' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '書籍が見つからないか、削除する権限がありません。' });
    }
    res.json({ success: true, message: '本が削除されました。' });
  });
});

// --- ポートフォリオとプロジェクト関連API ---

/**
 * @route   POST /api/portfolios
 * @desc    新しいポートフォリオを作成
 * @access  Private
 */
app.post('/api/portfolios', authenticateToken, (req, res) => {
  try {
    const { id: userId } = req.user;
    const { title, template } = req.body;

    if (!title || !template) {
      return res.status(400).json({ success: false, error: 'タイトルとテンプレートは必須です。' });
    }

    db.query('INSERT INTO portfolios (user_id, title, template) VALUES (?, ?, ?)', [userId, title, template], (err, result) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ success: false, error: 'ポートフォリオの作成中にデータベースエラーが発生しました。' });
      }
      const newPortfolioId = result.insertId;
      res.status(201).json({ success: true, message: 'ポートフォリオが正常に作成されました。', portfolio: { id: newPortfolioId, user_id: userId, title: title, template: template } });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

/**
 * @route   GET /api/portfolios/:portfolioId
 * @desc    ポートフォリオ詳細（プロジェクト含む）を取得
 * @access  Public (所有者かどうかのフラグ付き)
 */
app.get('/api/portfolios/:portfolioId', tryAuthenticateToken, (req, res) => {
  try {
    const { portfolioId } = req.params;
    const loggedInUserId = req.user ? req.user.id : null;

    // 1. ポートフォリオの詳細を取得
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

      // 2. このポートフォリオに属するプロジェクトを取得
      const projectsQuery = `
        SELECT p.*, p.font_size, p.background_image, GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ',') AS tags
        FROM projects p
        LEFT JOIN project_tags pt ON p.id = pt.project_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.portfolio_id = ?
        GROUP BY p.id
        ORDER BY p.project_order ASC
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
        
        // 3. ポートフォリオデータと所有者フラグを返す
        res.json({ success: true, portfolio: { ...portfolio, isOwner: isOwner } });
      });
    });
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

/**
 * @route   DELETE /api/portfolios/:portfolioId
 * @desc    ポートフォリオを削除（関連プロジェクトも削除）
 * @access  Private
 */
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
          return res.status(500).json({ success: false, error: 'データベースエラーが発生しました' });
        }

        // 1. 所有権を確認
        connection.query('SELECT id FROM portfolios WHERE id = ? AND user_id = ?', [portfolioId, userId], (err, results) => {
          if (err) {
            return connection.rollback(() => { connection.release(); res.status(500).json({ success: false, error: 'データベースエラーが発生しました' }); });
          }
          if (results.length === 0) {
            return connection.rollback(() => { connection.release(); res.status(403).json({ success: false, error: 'このポートフォリオを削除する権限がありません。' }); });
          }

          // 2. 関連するプロジェクトを削除
          connection.query('DELETE FROM projects WHERE portfolio_id = ?', [portfolioId], (err, result) => {
            if (err) {
              return connection.rollback(() => { connection.release(); res.status(500).json({ success: false, error: 'プロジェクトの削除中にエラーが発生しました。' }); });
            }

            // 3. ポートフォリオ本体を削除
            connection.query('DELETE FROM portfolios WHERE id = ?', [portfolioId], (err, result) => {
              if (err) {
                return connection.rollback(() => { connection.release(); res.status(500).json({ success: false, error: 'ポートフォリオの削除中にエラーが発生しました。' }); });
              }
              if (result.affectedRows === 0) {
                return connection.rollback(() => { connection.release(); res.status(404).json({ success: false, error: 'ポートフォリオが見つかりません。' }); });
              }

              connection.commit(err => {
                if (err) {
                  return connection.rollback(() => { connection.release(); res.status(500).json({ success: false, error: 'データベースエラーが発生しました' }); });
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

/**
 * @route   POST /api/projects
 * @desc    新しいプロジェクトを追加
 * @access  Private
 */
// ... (The rest of the file continues with project-related APIs)