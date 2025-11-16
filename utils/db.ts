import type { Note } from '../types';

const DB_NAME = 'EugeneAIChefDB';
const DB_VERSION = 1;
const NOTES_STORE_NAME = 'notes';

let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (db) {
        return resolve(true);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject(false);
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(NOTES_STORE_NAME)) {
        dbInstance.createObjectStore(NOTES_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const getNotes = (): Promise<Note[]> => {
    return new Promise((resolve, reject) => {
        if (!db) {
            console.warn('DB not initialized yet, returning empty array.');
            return resolve([]);
        }
        try {
            const transaction = db.transaction(NOTES_STORE_NAME, 'readonly');
            const store = transaction.objectStore(NOTES_STORE_NAME);
            const request = store.getAll();

            request.onerror = () => {
                console.error('Error getting notes from DB');
                reject([]);
            };
            
            request.onsuccess = () => {
                // Sort notes by creation date, newest first
                const sortedNotes = request.result.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                resolve(sortedNotes);
            };

        } catch (error) {
            console.error("Error creating transaction to get notes:", error);
            reject([]);
        }
    });
};

export const saveNote = (note: Note): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB not initialized');
        try {
            const transaction = db.transaction(NOTES_STORE_NAME, 'readwrite');
            const store = transaction.objectStore(NOTES_STORE_NAME);
            const request = store.put(note);

            request.onerror = () => {
                console.error('Error saving note to DB');
                reject();
            };
            
            transaction.oncomplete = () => {
                resolve();
            };
        } catch (error) {
            console.error("Error creating transaction to save note:", error);
            reject(error);
        }
    });
};

export const deleteNoteFromDB = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB not initialized');
        try {
            const transaction = db.transaction(NOTES_STORE_NAME, 'readwrite');
            const store = transaction.objectStore(NOTES_STORE_NAME);
            const request = store.delete(id);

            request.onerror = () => {
                console.error('Error deleting note from DB');
                reject();
            };

            transaction.oncomplete = () => {
                resolve();
            };
        } catch (error) {
            console.error("Error creating transaction to delete note:", error);
            reject(error);
        }
    });
};