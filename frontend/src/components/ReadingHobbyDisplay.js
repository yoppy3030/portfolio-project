import React, { useState, useEffect, useCallback } from 'react';
import './ReadingHobbyDisplay.css';

function ReadingHobbyDisplay() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setError('ログインしていません。');
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
        setError(data.error || '本のデータの取得に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  if (loading) {
    return <p>読書データを読み込み中...</p>;
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
                  <p className="book-card-rating">評価: {'★'.repeat(book.rating)}{'☆'.repeat(10 - book.rating)}</p>
                )}
                <p className="book-card-comment">{book.comment}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>登録されている本はありません。</p>
      )}
    </div>
  );
}

export default ReadingHobbyDisplay;
