import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSQLiteContext } from 'expo-sqlite';
import type { Book } from '@/types';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { DEFAULT_WALLETS } from '@/constants/wallets';

const ACTIVE_BOOK_KEY = 'active_book_id';

interface BookContextType {
  books: Book[];
  activeBook: Book | null;
  setActiveBook: (id: number) => void;
  createBook: (name: string, icon?: string, color?: string) => Promise<number>;
  updateBook: (id: number, data: Partial<Pick<Book, 'name' | 'icon' | 'color'>>) => Promise<void>;
  deleteBook: (id: number) => Promise<void>;
}

const BookContext = createContext<BookContextType | null>(null);

export function BookProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBookState] = useState<Book | null>(null);

  const loadBooks = useCallback(async () => {
    const rows = await db.getAllAsync<Book>(
      'SELECT * FROM books WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
    );
    setBooks(rows);
    return rows;
  }, [db]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await loadBooks();
        if (!mounted) return;
        const savedId = await AsyncStorage.getItem(ACTIVE_BOOK_KEY);
        const saved = savedId ? rows.find((b) => String(b.id) === savedId) : undefined;
        setActiveBookState(saved ?? rows[0] ?? null);
      } catch {
        if (mounted) setActiveBookState(null);
      }
    })();
    return () => { mounted = false; };
  }, [loadBooks]);

  const setActiveBook = useCallback(async (id: number) => {
    const book = books.find((b) => b.id === id) ?? null;
    setActiveBookState(book);
    await AsyncStorage.setItem(ACTIVE_BOOK_KEY, String(id)).catch(() => {});
  }, [books]);

  const createBook = useCallback(async (name: string, icon = 'book-outline', color = '#6366F1') => {
    const maxOrder = await db.getFirstAsync<{ max: number }>(
      'SELECT MAX(sort_order) as max FROM books'
    );
    const sortOrder = (maxOrder?.max || 0) + 1;
    let newId = 0;
    await db.withTransactionAsync(async () => {
      const res = await db.runAsync(
        'INSERT INTO books (name, icon, color, sort_order) VALUES (?, ?, ?, ?)',
        [name, icon, color, sortOrder]
      );
      newId = res.lastInsertRowId;
      for (const cat of DEFAULT_CATEGORIES) {
        await db.runAsync(
          'INSERT INTO categories (name, type, icon, color, sort_order, book_id) VALUES (?, ?, ?, ?, ?, ?)',
          [cat.name, cat.type, cat.icon, cat.color, cat.sort_order, newId]
        );
      }
      for (const wallet of DEFAULT_WALLETS) {
        await db.runAsync(
          'INSERT INTO wallets (name, balance, icon, color, book_id) VALUES (?, ?, ?, ?, ?)',
          [wallet.name, wallet.balance, wallet.icon, wallet.color, newId]
        );
      }
    });
    await loadBooks();
    return newId;
  }, [db, loadBooks]);

  const updateBook = useCallback(async (id: number, data: Partial<Pick<Book, 'name' | 'icon' | 'color'>>) => {
    await db.runAsync(
      'UPDATE books SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color) WHERE id = ?',
      [data.name ?? null, data.icon ?? null, data.color ?? null, id]
    );
    await loadBooks();
  }, [db, loadBooks]);

  const deleteBook = useCallback(async (id: number) => {
    if (books.length <= 1) return;
    const isActive = activeBook?.id === id;
    await db.withTransactionAsync(async () => {
      const childDeletes = [
        'DELETE FROM transaction_tags WHERE book_id = ?',
        'DELETE FROM transaction_attachments WHERE book_id = ?',
        'DELETE FROM goal_contributions WHERE book_id = ?',
        'DELETE FROM debt_payments WHERE book_id = ?',
        'DELETE FROM transactions WHERE book_id = ?',
        'DELETE FROM budgets WHERE book_id = ?',
        'DELETE FROM recurring_transactions WHERE book_id = ?',
        'DELETE FROM savings_goals WHERE book_id = ?',
        'DELETE FROM bill_reminders WHERE book_id = ?',
        'DELETE FROM debts WHERE book_id = ?',
        'DELETE FROM subscriptions WHERE book_id = ?',
        'DELETE FROM assets WHERE book_id = ?',
        'DELETE FROM liabilities WHERE book_id = ?',
        'DELETE FROM net_worth_snapshots WHERE book_id = ?',
        'DELETE FROM tags WHERE book_id = ?',
        'DELETE FROM wallets WHERE book_id = ?',
        'DELETE FROM categories WHERE book_id = ?',
      ];
      for (const sql of childDeletes) await db.runAsync(sql, [id]);
      await db.runAsync('DELETE FROM books WHERE id = ?', [id]);
    });
    if (isActive) {
      const remaining = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM books WHERE is_active = 1 ORDER BY sort_order ASC, id ASC LIMIT 1'
      );
      if (remaining) await setActiveBook(remaining.id);
    }
    await loadBooks();
  }, [db, loadBooks, books.length, activeBook, setActiveBook]);

  const value = useMemo<BookContextType>(() => ({
    books,
    activeBook,
    setActiveBook,
    createBook,
    updateBook,
    deleteBook,
  }), [books, activeBook, setActiveBook, createBook, updateBook, deleteBook]);

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  );
}

export function useBook(): BookContextType {
  const ctx = useContext(BookContext);
  if (!ctx) {
    throw new Error('useBook must be used within a BookProvider');
  }
  return ctx;
}
