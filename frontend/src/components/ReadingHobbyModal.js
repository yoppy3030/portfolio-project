import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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

const bookTypeKeys = [
  "novel", "lightNovel", "manga", "essay", "nonFiction", "poetry", "biography",
  "textbook", "referenceBook", "businessBook", "selfHelpBook", "technicalBook",
  "pamphlet", "lifestyleBook", "academicBook", "catalog", "mangaMagazine",
  "magazine", "encyclopedia", "photoBook", "other"
];

function ReadingHobbyModal({ onClose, isOwner }) {
  const { t } = useTranslation();
  const [authors, setAuthors] = useState([]);
  const [books, setBooks] = useState([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booksLoading, setBooksLoading] = useState(false);
  const [error, setError] = useState('');
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newBookData, setNewBookData] = useState({
    type: 'novel',
    genre: '',
    title: '',
    comment: '',
    rating: 0,
    image: null
  });
  const [editingBookId, setEditingBookId] = useState(null);
  const [editBookData, setEditBookData] = useState(null);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

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
        setError(data.error || t('readingHobby.modal.fetchAuthorsError'));
      }
    } catch (err) {
      setError(t('readingHobby.modal.serverConnectionError'));
    } finally {
      setLoading(false);
    }
  }, [isOwner, t]);

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
        setBooks(data.books);
      } else {
        setError(data.error || t('readingHobby.modal.fetchBooksError'));
      }
    } catch (err) {
      setError(t('readingHobby.modal.serverConnectionError'));
    } finally {
      setBooksLoading(false);
    }
  }, [t]);

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
        setError(data.error || t('readingHobby.modal.addAuthorError'));
      }
    } catch (err) {
      setError(t('readingHobby.modal.serverConnectionError'));
    }
  };

  const handleDeleteAuthor = async (authorId) => {
    if (!window.confirm(t('readingHobby.modal.confirmDeleteAuthor'))) return;
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
        setError(data.error || t('readingHobby.modal.deleteAuthorError'));
      }
    } catch (err) {
      setError(t('readingHobby.modal.serverConnectionError'));
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
      setError(t('readingHobby.modal.addBookValidationError'));
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
        setNewBookData({ type: 'novel', genre: '', title: '', comment: '', rating: 0, image: null });
      } else {
        setError(data.error || t('readingHobby.modal.addBookError'));
      }
    } catch (err) {
      setError(t('readingHobby.modal.serverConnectionError'));
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm(t('readingHobby.modal.confirmDeleteBook'))) return;
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
        setError(data.error || t('readingHobby.modal.deleteBookError'));
      }
    } catch (err) {
      setError(t('readingHobby.modal.serverConnectionError'));
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
      setError(t('readingHobby.modal.updateBookValidationError'));
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
        setError(data.error || t('readingHobby.modal.updateBookError'));
      }
    } catch (err) {
      setError(t('readingHobby.modal.serverConnectionError'));
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
        setError(data.error || t('readingHobby.modal.reorderError'));
        fetchBooks(selectedAuthorId);
      }
    } catch (err) {
      setError(t('readingHobby.modal.serverConnectionError'));
      fetchBooks(selectedAuthorId);
    }
  };

  const handleOnDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(books);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedBooks = items.map((book, index) => ({
      ...book,
      display_order: index,
    }));

    setBooks(updatedBooks);
    updateBookOrder(updatedBooks);
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
            <div className="author-management-section">
              <h4>{t('readingHobby.modal.authorManagementTitle')}</h4>
              <div className="add-author-form">
                <input
                  type="text"
                  value={newAuthorName}
                  onChange={(e) => setNewAuthorName(e.target.value)}
                  placeholder={t('readingHobby.modal.newAuthorPlaceholder')}
                />
                <button onClick={handleAddAuthor}>{t('readingHobby.modal.addAuthorButton')}</button>
              </div>
              <div className="author-list">
                {loading ? <p>{t('readingHobby.modal.loading')}</p> : (
                  authors.map(author => (
                    <div 
                      key={author.id} 
                      className={`author-item ${selectedAuthorId === author.id ? 'selected' : ''}`}
                      onClick={() => setSelectedAuthorId(author.id)}
                    >
                      <span>{author.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteAuthor(author.id); }} className="btn-danger-outline">{t('readingHobby.modal.deleteButton')}</button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="book-management-section">
              <h4>{t('readingHobby.modal.bookManagementTitle')}</h4>
              {selectedAuthorId ? (
                <>
                  <div className="add-book-form">
                    <h5>{t('readingHobby.modal.addBookTitle')}</h5>
                    <select name="type" value={newBookData.type} onChange={handleNewBookChange}>
                      {bookTypeKeys.map(key => <option key={key} value={key}>{t(`readingHobby.bookTypes.${key}`)}</option>)}
                    </select>
                    <input type="text" name="title" placeholder={t('readingHobby.modal.bookTitlePlaceholder')} value={newBookData.title} onChange={handleNewBookChange} />
                    <input type="text" name="genre" placeholder={t('readingHobby.modal.bookGenrePlaceholder')} value={newBookData.genre} onChange={handleNewBookChange} />
                    <div className="rating-input-container">
                      <label>{t('readingHobby.modal.ratingLabel')}</label>
                      <StarInput rating={newBookData.rating} setRating={setNewBookRating} />
                    </div>
                    <textarea name="comment" placeholder={t('readingHobby.modal.commentPlaceholder')} value={newBookData.comment} onChange={handleNewBookChange}></textarea>
                    <input type="file" name="image" onChange={handleImageChange} />
                    <button onClick={handleAddBook}>{t('readingHobby.modal.addButton')}</button>
                  </div>
                  <hr />
                  {booksLoading ? <p>{t('readingHobby.modal.loadingBooks')}</p> : (
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
                                        <h5>{t('readingHobby.modal.editBookTitle')}</h5>
                                        <select name="type" value={editBookData.type} onChange={handleEditBookChange}>
                                          {bookTypeKeys.map(key => <option key={key} value={key}>{t(`readingHobby.bookTypes.${key}`)}</option>)}
                                        </select>
                                        <input type="text" name="title" placeholder={t('readingHobby.modal.bookTitlePlaceholder')} value={editBookData.title} onChange={handleEditBookChange} />
                                        <input type="text" name="genre" placeholder={t('readingHobby.modal.bookGenrePlaceholder')} value={editBookData.genre} onChange={handleEditBookChange} />
                                        <div className="rating-input-container">
                                          <label>{t('readingHobby.modal.ratingLabel')}</label>
                                          <StarInput rating={editBookData.rating} setRating={setEditBookRating} />
                                        </div>
                                        <textarea name="comment" placeholder={t('readingHobby.modal.commentPlaceholder')} value={editBookData.comment} onChange={handleEditBookChange}></textarea>
                                        <input type="file" name="image" onChange={handleEditImageChange} />
                                        <div className="edit-actions">
                                          <button onClick={() => handleUpdateBook(book.id)}>{t('readingHobby.modal.saveButton')}</button>
                                          <button onClick={handleCancelEdit}>{t('readingHobby.modal.cancelButton')}</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="book-item">
                                        {book.image_url && <img src={`http://localhost:5000${book.image_url}`} alt={book.title} />}
                                        <div className="book-info">
                                          <h5>{book.title}</h5>
                                          <p>{t('readingHobby.modal.typeLabel')} {t(`readingHobby.bookTypes.${book.type}`)}</p>
                                          <p>{t('readingHobby.modal.genreLabel')} {book.genre}</p>
                                          <div className="rating-display">
                                            <span>{t('readingHobby.modal.ratingLabel')} </span>
                                            {book.rating ? <StarRating rating={book.rating} /> : t('readingHobby.modal.notRated')}
                                          </div>
                                          <p>{book.comment}</p>
                                        </div>
                                        <div className="book-actions">
                                          <button className="btn-secondary-outline" onClick={() => handleStartEdit(book)}>{t('readingHobby.modal.editButton')}</button>
                                          <button className="btn-danger-outline" onClick={() => handleDeleteBook(book.id)}>{t('readingHobby.modal.deleteButton')}</button>
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
