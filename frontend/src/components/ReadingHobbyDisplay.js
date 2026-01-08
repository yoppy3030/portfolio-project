import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './ReadingHobbyDisplay.css';

// 読書記録（書籍リスト）を表示する一覧コンポーネント
function ReadingHobbyDisplay() {
  const { t } = useTranslation(); // 翻訳フック
  // --- ステート（状態変数） ---
  const [books, setBooks] = useState([]); // 書籍リスト
  const [loading, setLoading] = useState(true); // 読み込み中フラグ
  const [error, setError] = useState(''); // エラーメッセージ

  // サーバーから書籍リストを取得する関数
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setError(t('readingHobby.display.notLoggedIn'));
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/reading/books', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setBooks(data.books);
      } else {
        setError(data.error || t('readingHobby.display.fetchBooksError'));
      }
    } catch (err) {
      setError(t('readingHobby.display.serverConnectionError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  if (loading) {
    return <p>{t('readingHobby.display.loading')}</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  return (
    <div className="reading-hobby-display">
      {books.length > 0 ? (
        <div className="books-grid">
          {books.map(book => (
            <div key={book.id} className="book-card">
              <img
                src={book.image_url ? `http://localhost:5000${book.image_url}` : 'https://via.placeholder.com/150x220.png?text=No+Image'}
                alt={book.title}
                className="book-card-image"
              />
              <div className="book-card-content">
                <h5 className="book-card-title">{book.title}</h5>
                <p className="book-card-author">{book.author_name}</p>
                {book.rating && (
                  <p className="book-card-rating">{t('readingHobby.display.ratingLabel')}{'★'.repeat(book.rating)}{'☆'.repeat(10 - book.rating)}</p>
                )}
                <p className="book-card-comment">{book.comment}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>{t('readingHobby.display.noBooks')}</p>
      )}
    </div>
  );
}

export default ReadingHobbyDisplay;
