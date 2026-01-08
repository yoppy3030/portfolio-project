// frontend/src/utils/api.js

// ブラウザのストレージから認証トークンを取得するヘルパー関数
export function getToken() {
  return sessionStorage.getItem('token');
}

/**
 * APIリクエストをラップし、認証トークンの付与や認証エラーを共通処理する関数。
 *
 * @param {string} url - リクエスト先のURL
 * @param {RequestInit} options - fetchリクエストのオプション（method, bodyなど）
 * @param {Function} onAuthError - 認証エラー（401 Unauthorized, 403 Forbidden）が発生した際に呼び出すコールバック関数
 * @returns {Promise<Response>} fetchのレスポンスオブジェクトを返すPromise
 * @throws {Error} ネットワークエラーや認証エラーが発生した場合にエラーをスローする
 */
export async function apiFetch(url, options = {}, onAuthError) {
  // ブラウザのストレージから認証トークンを取得
  const token = getToken();

  // リクエストヘッダーを準備
  const headers = {
    'Content-Type': 'application/json', // デフォルトでJSON形式のデータを想定
    ...options.headers, // 呼び出し元で指定されたヘッダーで上書き
  };

  // トークンがあれば、Authorizationヘッダーに 'Bearer <token>' の形式で追加
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // fetch APIを使ってリクエストを送信
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // レスポンスのステータスコードが401または403の場合、認証エラーとして処理
    if (response.status === 401 || response.status === 403) {
      console.error('認証エラーが発生しました:', response.status);
      // 認証エラー用のコールバックが指定されていれば実行（例: ログアウト処理）
      if (onAuthError) {
        onAuthError();
      }
      // エラーをスローして、これ以上の処理を中断させる
      throw new Error('Authentication error: Token invalid or expired.');
    }

    // 正常なレスポンスを返す
    return response;
  } catch (error) {
    // ネットワークエラーなども含め、コンソールに出力して再スロー
    console.error('APIリクエストエラー:', error);
    throw error;
  }
}

/**
 * ポートフォリオの公開設定を更新するAPIを呼び出す
 * @param {number|string} portfolioId - ポートフォリオID
 * @param {boolean} isPublic - 公開状態にするか (true/false)
 * @returns {Promise<object>} APIからのレスポンスデータ
 */
export async function updatePortfolioPrivacy(portfolioId, isPublic) {
  const url = `http://localhost:5000/api/portfolios/${portfolioId}/privacy`;
  const options = {
    method: 'PUT',
    body: JSON.stringify({ is_public: isPublic }),
  };

  try {
    const response = await apiFetch(url, options);
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || data.message || 'Unknown error' };
    }
    return data;
  } catch (error) {
    console.error('ポートフォリオの公開設定更新に失敗:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ポートフォリオの公開設定を取得するAPIを呼び出す
 * @param {number|string} portfolioId - ポートフォリオID
 * @returns {Promise<object>} APIからのレスポンスデータ
 */
export async function getPortfolioPrivacy(portfolioId) {
  const url = `http://localhost:5000/api/portfolios/${portfolioId}/privacy`;
  try {
    const response = await apiFetch(url);
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || data.message || 'Unknown error' };
    }
    return data;
  } catch (error) {
    console.error('ポートフォリオの公開設定取得に失敗:', error);
    return { success: false, error: error.message };
  }
}

// 以下、同様に各APIエンドポイントを呼び出すためのヘルパー関数が定義されている

export async function getPortfolioByUsername(username) {
  const url = `http://localhost:5000/api/u/${username}`;
  try {
    const response = await fetch(url); // 公開エンドポイントなので認証不要
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Portfolio not found' };
    }
    return data;
  } catch (error) {
    console.error('ユーザー名によるポートフォリオ取得に失敗:', error);
    return { success: false, error: error.message };
  }
}

export async function checkUsernameAvailability(username) {
  const url = `http://localhost:5000/api/username/check/${username}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('ユーザー名の利用可能性チェックに失敗:', error);
    return { success: false, error: error.message };
  }
}

export async function setPortfolioUsername(username) {
  const url = 'http://localhost:5000/api/username';
  const options = {
    method: 'POST',
    body: JSON.stringify({ username }),
  };
  try {
    const response = await apiFetch(url, options); // 認証が必要
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to set username' };
    }
    return data;
  } catch (error) {
    console.error('ユーザー名の設定に失敗:', error);
    return { success: false, error: error.message };
  }
}

export async function getPortfolioUsername() {
  const url = 'http://localhost:5000/api/username';
  try {
    const response = await apiFetch(url); // 認証が必要
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to get username' };
    }
    return data;
  } catch (error) {
    console.error('ユーザー名の取得に失敗:', error);
    return { success: false, error: error.message };
  }
}

// --- 公開ページ用のAPI呼び出し ---
// これらは認証トークンを必要としないため、通常の `fetch` を使用する

export async function getPublicPortfolio(portfolioId) {
  const url = `http://localhost:5000/api/public/portfolios/${portfolioId}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to fetch public portfolio' };
    }
    return data;
  } catch (error) {
    console.error('公開ポートフォリオの取得に失敗:', error);
    return { success: false, error: error.message };
  }
}

export async function getPublicPortfolioByUsername(username) {
  const url = `http://localhost:5000/api/public/u/${username}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to fetch public portfolio by username' };
    }
    return data;
  } catch (error) {
    console.error('ユーザー名による公開ポートフォリオの取得に失敗:', error);
    return { success: false, error: error.message };
  }
}

export async function getPublicProject(projectId) {
  const url = `http://localhost:5000/api/public/projects/${projectId}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to fetch public project' };
    }
    return data;
  } catch (error) {
    console.error('公開プロジェクトの取得に失敗:', error);
    return { success: false, error: error.message };
  }
}

export async function getPublicHobbies(userId) {
  const url = `http://localhost:5000/api/public/hobbies/${userId}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to fetch public hobbies' };
    }
    return data;
  } catch (error) {
    console.error('公開趣味データの取得に失敗:', error);
    return { success: false, error: error.message };
  }
}

export async function getPublicPlayedGames(userId) {
  const url = `http://localhost:5000/api/public/played-games/${userId}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to fetch public played games' };
    }
    return data;
  } catch (error) {
    console.error('公開プレイ済みゲームの取得に失敗:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchMusicPreferences(userId, isPublic = false) {
  const url = isPublic
    ? `http://localhost:5000/api/public/user-music-preferences/${userId}`
    : 'http://localhost:5000/api/user-music-preferences';

  try {
    // isPublicフラグに応じて、認証あり(apiFetch)か認証なし(fetch)かを切り替える
    const response = isPublic ? await fetch(url) : await apiFetch(url);
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to fetch music preferences' };
    }
    return data;
  } catch (error) {
    console.error('音楽設定の取得に失敗:', error);
    return { success: false, error: error.message };
  }
}

export async function getPublicReadingData(userId) {
  const url = `http://localhost:5000/api/public/reading-data/${userId}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to fetch public reading data' };
    }
    return data;
  } catch (error) {
    console.error('公開読書データの取得に失敗:', error);
    return { success: false, error: error.message };
  }
}
