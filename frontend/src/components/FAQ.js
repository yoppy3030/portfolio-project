
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../FAQ.css';

function FAQ() {
  const navigate = useNavigate();

  return (
    <div className="faq-container">
      <button onClick={() => navigate(-1)} className="back-button">戻る</button>
      <h1>FAQ・ヘルプ</h1>

      <section>
        <h2>1. サービス全般や仕組みについて</h2>
        <details>
          <summary>サービスやアプリの概要</summary>
          <p>このサービスは、あなたのポートフォリオを簡単に作成、管理、公開できるアプリケーションです。</p>
        </details>
        <details>
          <summary>登録・ログイン・退会・パスワード再発行の方法</summary>
          <p>
            <strong>登録:</strong> トップページの「新規登録」からアカウントを作成できます。<br />
            <strong>ログイン:</strong> トップページの「ログイン」から登録した情報でログインできます。<br />
            <strong>退会:</strong> 設定ページの「アカウント削除」から退会手続きが可能です。<br />
            <strong>パスワード再発行:</strong> ログインページの「パスワードをお忘れですか？」から再発行手続きを行ってください。
          </p>
        </details>
        <details>
          <summary>利用環境（推奨デバイス・対応ブラウザなど）</summary>
          <p>PCでの利用を推奨しています。最新版のGoogle ChromeまたはFirefoxブラウザで最適に動作します。</p>
        </details>
      </section>

      <section>
        <h2>2. 基本機能の使い方</h2>
        <details>
          <summary>作品の追加・編集・削除</summary>
          <p>ダッシュボードから作品の追加、編集、削除が可能です。</p>
        </details>
        <details>
          <summary>画像/ファイルのアップロードや変更</summary>
          <p>作品の編集ページから、画像や関連ファイルをアップロード・変更できます。</p>
        </details>
        <details>
          <summary>公開/非公開の切り替え</summary>
          <p>各作品の編集ページで、公開・非公開を切り替えることができます。</p>
        </details>
        <details>
          <summary>作品一覧・検索・絞り込みの方法</summary>
          <p>ダッシュボードの検索バーやフィルタ機能をご利用ください。</p>
        </details>
      </section>

      <section>
        <h2>3. トラブル時の対処法</h2>
        <details>
          <summary>ログインできない</summary>
          <p>メールアドレスとパスワードが正しいかご確認ください。パスワードを忘れた場合は、パスワードの再発行をお試しください。</p>
        </details>
        <details>
          <summary>画像アップロードできない</summary>
          <p>ファイルのサイズや形式が要件を満たしているかご確認ください。問題が解決しない場合は、サポートまでご連絡ください。</p>
        </details>
        <details>
          <summary>作品が消えた/見つからない</summary>
          <p>誤って削除していないか、また検索フィルタが有効になっていないかご確認ください。</p>
        </details>
        <details>
          <summary>動作がおかしい時（キャッシュクリアなど）</summary>
          <p>ブラウザのキャッシュをクリアしてから、再度お試しください。それでも改善しない場合は、サポートにご連絡ください。</p>
        </details>
      </section>

      <section>
        <h2>4. セキュリティや個人情報</h2>
        <details>
          <summary>データの安全性</summary>
          <p>お客様のデータは暗号化され、安全に保管されています。</p>
        </details>
        <details>
          <summary>プライバシーポリシー</summary>
          <p>プライバシーポリシーのページで詳細をご確認いただけます。</p>
        </details>
        <details>
          <summary>情報削除・退会手順</summary>
          <p>設定ページからアカウントの削除を行うことで、関連する全ての情報が削除されます。</p>
        </details>
      </section>

      <section>
        <h2>5. サポートの連絡先</h2>
        <details>
          <summary>問い合わせ窓口（メール、フォームなど）</summary>
          <p>お問い合わせは、<a href="mailto:support@example.com">support@example.com</a> までメールでご連絡ください。</p>
        </details>
        <details>
          <summary>営業時間</summary>
          <p>平日10:00〜18:00 (土日祝日を除く)</p>
        </details>
        <details>
          <summary>連絡時に必要な情報（ユーザーIDなど）</summary>
          <p>お問い合わせの際は、ご登録のメールアドレスとユーザーIDをお知らせください。</p>
        </details>
      </section>

      <section>
        <h2>6. その他 よくある質問</h2>
        <details>
          <summary>よく受ける質問まとめ</summary>
          <p>随時更新予定です。</p>
        </details>
        <details>
          <summary>便利な使い方やTIPS</summary>
          <p>ブログやTipsページで紹介しています。</p>
        </details>
        <details>
          <summary>アップデートや新機能について</summary>
          <p>お知らせページやメールマガジンでご案内します。</p>
        </details>
      </section>
    </div>
  );
}

export default FAQ;
