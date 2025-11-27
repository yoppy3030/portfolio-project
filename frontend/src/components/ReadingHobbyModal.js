import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './ReadingHobbyModal.css';

// Star rating display component
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

// Star rating input component
const StarInput = ({ rating, setRating }) => {
  const totalStars = 10;
  return (
    <div className="star-input">
      {[...Array(totalStars)].map((_, i) => {
        const ratingValue = i + 1;
        return (
          <span
            key={i}
            className={`star ${ratingValue <= rating ? 'filled' : ''}`}
            onClick={() => setRating(ratingValue)}
          >
            ★
          </span>
        );
      })}
    </div>
  );
};


const bookTypes = [
  "小説",
  "ライトノベル",
  "漫画",
  "エッセイ",
  "ノンフィクション",
  "詩集",
  "伝記",
  "教科書",
  "参考書",
  "ビジネス書",
  "自己啓発書",
  "テクニカル書",
  "パンフレット",
  "ライフスタイル本（料理本、旅行本など）",
  "学術書",
  "カタログ",
  "マンガ雑誌",
  "雑誌（一般誌、専門誌）",
  "事典・辞典",
  "写真集",
  "その他"
];

function ReadingHobbyModal({ onClose, isOwner }) {
  const [authors, setAuthors] = useState([]);
  const [books, setBooks] = useState([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booksLoading, setBooksLoading] = useState(false);
  const [error, setError] = useState('');
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newBookData, setNewBookData] = useState({
    type: '小説',
    genre: '',
    title: '',
    comment: '',
    rating: 0,
    image: null
  });
  const [editingBookId, setEditingBookId] = useState(null);
  const [editBookData, setEditBookData] = useState(null);

  const getToken = () => localStorage.getItem('token');

  const fetchAuthors = useCallback(async () => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/reading/authors', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        setAuthors(data.authors);
      } else {
        setError(data.error || '作家リストの取得に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

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
      if (data.success) {
        // Assuming the backend returns books sorted by display_order
        setBooks(data.books);
      } else {
        setError(data.error || '書籍リストの取得に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    } finally {
      setBooksLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks(selectedAuthorId);
  }, [selectedAuthorId, fetchBooks]);

  const handleAddAuthor = async () => {
    if (!newAuthorName.trim()) return;
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/reading/authors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ name: newAuthorName })
      });
      const data = await response.json();
      if (data.success) {
        setNewAuthorName('');
        fetchAuthors();
      } else {
        setError(data.error || '作家の追加に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };

  const handleDeleteAuthor = async (authorId) => {
    if (!window.confirm('この作家を削除しますか？ この作家に関連するすべての本も削除されます。')) return;
    setError('');
    try {
      const response = await fetch(`http://localhost:5000/api/reading/authors/${authorId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        if (selectedAuthorId === authorId) {
          setSelectedAuthorId(null);
        }
        fetchAuthors();
      } else {
        setError(data.error || '作家の削除に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };

  const handleNewBookChange = (e) => {
    const { name, value } = e.target;
    setNewBookData(prev => ({ ...prev, [name]: value }));
  };
  
  const setNewBookRating = (rating) => {
    setNewBookData(prev => ({ ...prev, rating }));
  };

  const handleImageChange = (e) => {
    setNewBookData(prev => ({ ...prev, image: e.target.files[0] }));
  };

  const handleAddBook = async () => {
    if (!selectedAuthorId || !newBookData.title || !newBookData.type) {
      setError('作家が選択されていないか、タイトルや種類が入力されていません。');
      return;
    }
    setError('');

    const formData = new FormData();
    formData.append('author_id', selectedAuthorId);
    formData.append('type', newBookData.type);
    formData.append('genre', newBookData.genre);
    formData.append('title', newBookData.title);
    formData.append('comment', newBookData.comment);
    formData.append('rating', newBookData.rating);
    if (newBookData.image) {
      formData.append('image', newBookData.image);
    }

    try {
      const response = await fetch('http://localhost:5000/api/reading/books', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        fetchBooks(selectedAuthorId);
        setNewBookData({ type: '小説', genre: '', title: '', comment: '', rating: 0, image: null });
      } else {
        setError(data.error || '本の追加に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('この本を削除しますか？')) return;
    setError('');
    try {
      const response = await fetch(`http://localhost:5000/api/reading/books/${bookId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        fetchBooks(selectedAuthorId);
      } else {
        setError(data.error || '本の削除に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };

  const handleStartEdit = (book) => {
    setEditingBookId(book.id);
    setEditBookData({ ...book, image: null, rating: book.rating || 0 });
  };

  const handleCancelEdit = () => {
    setEditingBookId(null);
    setEditBookData(null);
  };

  const handleEditBookChange = (e) => {
    const { name, value } = e.target;
    setEditBookData(prev => ({ ...prev, [name]: value }));
  };

  const setEditBookRating = (rating) => {
    setEditBookData(prev => ({ ...prev, rating }));
  };

  const handleEditImageChange = (e) => {
    setEditBookData(prev => ({ ...prev, image: e.target.files[0] }));
  };

  const handleUpdateBook = async (bookId) => {
    if (!editBookData.title || !editBookData.type) {
      setError('タイトルや種類は必須です。');
      return;
    }
    setError('');

    const formData = new FormData();
    Object.keys(editBookData).forEach(key => {
        formData.append(key, editBookData[key]);
    });

    try {
      const response = await fetch(`http://localhost:5000/api/reading/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        fetchBooks(selectedAuthorId);
        handleCancelEdit();
      } else {
        setError(data.error || '本の更新に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };

  const updateBookOrder = async (orderedBooks) => {
    try {
      const response = await fetch('http://localhost:5000/api/reading/books/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ books: orderedBooks.map(b => ({ id: b.id, display_order: b.display_order })) })
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || '順序の更新に失敗しました。');
        // Optionally revert the state change
        fetchBooks(selectedAuthorId);
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
      fetchBooks(selectedAuthorId);
    }
  };

  const handleOnDragEnd = (result) => {
    if (!result.destination) return;

    console.log('Books before reorder:', books);
    const items = Array.from(books);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedBooks = items.map((book, index) => ({
      ...book,
      display_order: index,
    }));

    console.log('Books after reorder (frontend state):', updatedBooks);

    setBooks(updatedBooks);
    updateBookOrder(updatedBooks);
  };

  return (
    <div className="reading-hobby-modal-backdrop" onClick={onClose}>
      <div className="modal-content reading-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>読書記録を管理</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          {error && <p className="error-message">{error}</p>}
          
          <div className="reading-hobby-manager">
            <div className="author-management-section">
              <h4>作家の管理</h4>
              <div className="add-author-form">
                <input
                  type="text"
                  value={newAuthorName}
                  onChange={(e) => setNewAuthorName(e.target.value)}
                  placeholder="新しい作家名"
                />
                <button onClick={handleAddAuthor}>作家を追加</button>
              </div>
              <div className="author-list">
                {loading ? <p>読み込み中...</p> : (
                  authors.map(author => (
                    <div 
                      key={author.id} 
                      className={`author-item ${selectedAuthorId === author.id ? 'selected' : ''}`}
                      onClick={() => setSelectedAuthorId(author.id)}
                    >
                      <span>{author.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteAuthor(author.id); }} className="btn-danger-outline">削除</button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="book-management-section">
              <h4>本の管理</h4>
              {selectedAuthorId ? (
                <>
                  <div className="add-book-form">
                    <h5>新しい本を追加</h5>
                    <select name="type" value={newBookData.type} onChange={handleNewBookChange}>
                      {bookTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <input type="text" name="title" placeholder="タイトル" value={newBookData.title} onChange={handleNewBookChange} />
                    <input type="text" name="genre" placeholder="ジャンル (例: SF, ミステリー)" value={newBookData.genre} onChange={handleNewBookChange} />
                    <div className="rating-input-container">
                      <label>評価:</label>
                      <StarInput rating={newBookData.rating} setRating={setNewBookRating} />
                    </div>
                    <textarea name="comment" placeholder="コメント" value={newBookData.comment} onChange={handleNewBookChange}></textarea>
                    <input type="file" name="image" onChange={handleImageChange} />
                    <button onClick={handleAddBook}>追加</button>
                  </div>
                  <hr />
                  {booksLoading ? <p>本を読み込み中...</p> : (
                    <DragDropContext onDragEnd={handleOnDragEnd}>
                      <Droppable droppableId="books">
                        {(provided) => (
                          <div className="book-list" {...provided.droppableProps} ref={provided.innerRef}>
                            {books.map((book, index) => (
                              <Draggable key={book.id} draggableId={String(book.id)} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="book-item-wrapper"
                                  >
                                    {editingBookId === book.id ? (
                                      <div className="edit-book-form">
                                        <h5>本を編集</h5>
                                        <select name="type" value={editBookData.type} onChange={handleEditBookChange}>
                                          {bookTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                        </select>
                                        <input type="text" name="title" placeholder="タイトル" value={editBookData.title} onChange={handleEditBookChange} />
                                        <input type="text" name="genre" placeholder="ジャンル" value={editBookData.genre} onChange={handleEditBookChange} />
                                        <div className="rating-input-container">
                                          <label>評価:</label>
                                          <StarInput rating={editBookData.rating} setRating={setEditBookRating} />
                                        </div>
                                        <textarea name="comment" placeholder="コメント" value={editBookData.comment} onChange={handleEditBookChange}></textarea>
                                        <input type="file" name="image" onChange={handleEditImageChange} />
                                        <div className="edit-actions">
                                          <button onClick={() => handleUpdateBook(book.id)}>保存</button>
                                          <button onClick={handleCancelEdit}>キャンセル</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="book-item">
                                        {book.image_url && <img src={`http://localhost:5000${book.image_url}`} alt={book.title} />}
                                        <div className="book-info">
                                          <h5>{book.title}</h5>
                                          <p>種類: {book.type}</p>
                                          <p>ジャンル: {book.genre}</p>
                                          <div className="rating-display">
                                            <span>評価: </span>
                                            {book.rating ? <StarRating rating={book.rating} /> : '未評価'}
                                          </div>
                                          <p>{book.comment}</p>
                                        </div>
                                        <div className="book-actions">
                                          <button className="btn-secondary-outline" onClick={() => handleStartEdit(book)}>編集</button>
                                          <button className="btn-danger-outline" onClick={() => handleDeleteBook(book.id)}>削除</button>
                                        </div>
                                      </div>
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
                  )}
                </>
              ) : (
                <p>作家を選択すると、ここに本が表示されます。</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ReadingHobbyModal;
