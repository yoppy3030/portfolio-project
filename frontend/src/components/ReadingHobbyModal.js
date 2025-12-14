// 必要なライブラリやコンポーネントをインポート
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'; // ドラッグ&ドロップ機能
import './ReadingHobbyModal.css';

// --- 子コンポーネント定義 ---

// 星評価の表示用コンポーネント
const StarRating = ({ rating }) => {
  const totalStars = 10;
  const fullStars = Math.floor(rating);
  const emptyStars = totalStars - fullStars;
  return (
    <div className="star-rating">
      {[...Array(fullStars)].map((_, i) => <span key={`full-${i}`} className="star filled">★</span>)}
      {[...Array(emptyStars)].map((_, i) => <span key={`empty-${i}`} className="star">☆</span>)}
    </div>
  );
};

// 星評価の入力用コンポーネント
const StarInput = ({ rating, setRating }) => {
  const totalStars = 10;
  return (
    <div className="star-input">
      {[...Array(totalStars)].map((_, i) => {
        const ratingValue = i + 1;
        return (
          <span key={i} className={`star ${ratingValue <= rating ? 'filled' : ''}`} onClick={() => setRating(ratingValue)}>
            ★
          </span>
        );
      })}
    </div>
  );
};

// 本の種別リスト（多言語対応キー）
const bookTypeKeys = [ "novel", "lightNovel", "manga", "essay", /* ... */ "other" ];

// --- メインコンポーネント ---
function ReadingHobbyModal({ onClose, isOwner }) {
  const { t } = useTranslation(); // 多言語対応
  // State管理
  const [authors, setAuthors] = useState([]); // 作家リスト
  const [books, setBooks] = useState([]); // 選択中の作家の書籍リスト
  const [selectedAuthorId, setSelectedAuthorId] = useState(null); // 選択中の作家ID
  const [loading, setLoading] = useState(false); // 作家リストの読み込み状態
  const [booksLoading, setBooksLoading] = useState(false); // 書籍リストの読み込み状態
  const [error, setError] = useState(''); // エラーメッセージ
  const [newAuthorName, setNewAuthorName] = useState(''); // 新規追加する作家名
  const [newBookData, setNewBookData] = useState({ /* ... */ }); // 新規追加する本のデータ
  const [editingBookId, setEditingBookId] = useState(null); // 編集中の本のID
  const [editBookData, setEditBookData] = useState(null); // 編集中の本のデータ

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // 作家リストをバックエンドから取得する関数
  const fetchAuthors = useCallback(async () => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/reading/authors', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) setAuthors(data.authors);
      else setError(data.error || t('readingHobby.modal.fetchAuthorsError'));
    } catch (err) {
      setError(t('readingHobby.modal.serverConnectionError'));
    } finally {
      setLoading(false);
    }
  }, [isOwner, t]);

  // コンポーネントマウント時に作家リストを取得
  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  // 特定の作家の書籍リストをバックエンドから取得する関数
  const fetchBooks = useCallback(async (authorId) => {
    if (!authorId) {
      setBooks([]);
      return;
    }
    setBooksLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/reading/books?author_id=${authorId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) setBooks(data.books);
      else setError(data.error || t('readingHobby.modal.fetchBooksError'));
    } catch (err) {
      setError(t('readingHobby.modal.serverConnectionError'));
    } finally {
      setBooksLoading(false);
    }
  }, [t]);

  // 選択中の作家が変わったら、その作家の書籍リストを取得
  useEffect(() => {
    fetchBooks(selectedAuthorId);
  }, [selectedAuthorId, fetchBooks]);

  // 新しい作家を追加する処理
  const handleAddAuthor = async () => {
    if (!newAuthorName.trim()) return;
    // ... APIを呼び出して作家を追加し、リストを再取得 ...
  };

  // 作家を削除する処理
  const handleDeleteAuthor = async (authorId) => {
    if (!window.confirm(t('readingHobby.modal.confirmDeleteAuthor'))) return;
    // ... APIを呼び出して作家を削除し、リストを再取得 ...
  };

  // 新しい本を追加する処理
  const handleAddBook = async () => {
    if (!selectedAuthorId || !newBookData.title || !newBookData.type) {
      setError(t('readingHobby.modal.addBookValidationError'));
      return;
    }
    const formData = new FormData(); // 画像ファイルを含むためFormDataを使用
    // ... formDataにデータを詰める ...
    try {
      await fetch('http://localhost:5000/api/reading/books', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      // ... 成功したら書籍リストを再取得 ...
    } catch (err) { /* ... */ }
  };

  // 本を削除する処理
  const handleDeleteBook = async (bookId) => {
    if (!window.confirm(t('readingHobby.modal.confirmDeleteBook'))) return;
    // ... APIを呼び出して本を削除し、リストを再取得 ...
  };

  // 本の編集を開始する処理
  const handleStartEdit = (book) => {
    setEditingBookId(book.id);
    setEditBookData({ ...book, image: null, rating: book.rating || 0 });
  };

  // 本の編集をキャンセルする処理
  const handleCancelEdit = () => {
    setEditingBookId(null);
    setEditBookData(null);
  };

  // 本の情報を更新する処理
  const handleUpdateBook = async (bookId) => {
    // ... APIを呼び出して本を更新し、リストを再取得 ...
  };

  // 書籍の表示順を更新する処理
  const updateBookOrder = async (orderedBooks) => {
    try {
      await fetch('http://localhost:5000/api/reading/books/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ books: orderedBooks.map(b => ({ id: b.id, display_order: b.display_order })) })
      });
    } catch (err) { /* ... */ }
  };

  // ドラッグ&ドロップ終了時の処理
  const handleOnDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(books);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    const updatedBooks = items.map((book, index) => ({ ...book, display_order: index }));
    setBooks(updatedBooks); // UIを即時更新
    updateBookOrder(updatedBooks); // バックエンドに順序を保存
  };

  return (
    <div className="reading-hobby-modal-backdrop" onClick={onClose}>
      <div className="modal-content reading-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('readingHobby.modal.title')}</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          {error && <p className="error-message">{error}</p>}
          <div className="reading-hobby-manager">
            {/* 左ペイン：作家の管理 */}
            <div className="author-management-section">
              <h4>{t('readingHobby.modal.authorManagementTitle')}</h4>
              {/* ... 作家追加フォームと作家リスト ... */}
            </div>
            {/* 右ペイン：書籍の管理 */}
            <div className="book-management-section">
              <h4>{t('readingHobby.modal.bookManagementTitle')}</h4>
              {selectedAuthorId ? (
                <>
                  {/* ... 書籍追加フォーム ... */}
                  <hr />
                  {/* 書籍リスト（ドラッグ&ドロップ可能） */}
                  <DragDropContext onDragEnd={handleOnDragEnd}>
                    <Droppable droppableId="books">
                      {(provided) => (
                        <div className="book-list" {...provided.droppableProps} ref={provided.innerRef}>
                          {books.map((book, index) => (
                            <Draggable key={book.id} draggableId={String(book.id)} index={index}>
                              {(provided) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                  {editingBookId === book.id ? (
                                    {/* ... 編集フォーム ... */}
                                  ) : (
                                    {/* ... 書籍情報表示 ... */}
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </>
              ) : (
                <p>{t('readingHobby.modal.selectAuthorPrompt')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReadingHobbyModal;