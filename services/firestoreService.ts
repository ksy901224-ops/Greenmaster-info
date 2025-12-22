
import { db, isMockMode } from "../firebaseConfig";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, Timestamp, onSnapshot, setDoc, writeBatch, QuerySnapshot, DocumentData } from "firebase/firestore";

export interface TodoItem {
  id?: string;
  text: string;
  author: string;
  isCompleted: boolean;
  createdAt: any;
}

const COLLECTION_NAME = "todos";

// --- MOCK SYSTEM FOR OFFLINE MODE ---
const listeners: Record<string, Set<(data: any[]) => void>> = {};
const seedingLocks: Record<string, boolean> = {};

const getLocalData = (key: string): any[] => {
  try {
    const item = localStorage.getItem(`gm_mock_${key}`);
    return item ? JSON.parse(item) : [];
  } catch (e) {
    return [];
  }
};

const setLocalData = (key: string, data: any[]) => {
  try {
    localStorage.setItem(`gm_mock_${key}`, JSON.stringify(data));
    notifyListeners(key, data);
  } catch (e) {
    console.error("Storage error:", e);
  }
};

const notifyListeners = (key: string, data: any[]) => {
  if (listeners[key]) {
    // CRITICAL: Use setImmediate-like behavior to break call stack for large dataset propagation
    setTimeout(() => {
      if (listeners[key]) {
        const uniqueData = Array.from(new Map(data.map(item => [item.id, item])).values());
        Array.from(listeners[key]).forEach(cb => cb(uniqueData));
      }
    }, 0);
  }
};

export const subscribeToCollection = (collectionName: string, callback: (data: any[]) => void) => {
  if (isMockMode || !db) {
    if (!listeners[collectionName]) listeners[collectionName] = new Set();
    listeners[collectionName].add(callback);
    const current = getLocalData(collectionName);
    setTimeout(() => callback(current), 0);
    return () => {
      if (listeners[collectionName]) listeners[collectionName].delete(callback);
    };
  }

  const q = query(collection(db, collectionName));
  return onSnapshot(q, (snapshot) => {
    const querySnapshot = snapshot as unknown as QuerySnapshot<DocumentData>;
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    callback(data);
  }, (error) => {
    console.error(`Error subscribing to ${collectionName}:`, error);
  });
};

export const saveDocument = async (collectionName: string, data: any) => {
  if (isMockMode || !db) {
    const items = getLocalData(collectionName);
    const existingIndex = items.findIndex((i: any) => i.id === data.id);
    let newItems;
    if (existingIndex >= 0) {
        newItems = [...items];
        newItems[existingIndex] = { ...newItems[existingIndex], ...data };
    } else {
        const newItem = { ...data, id: data.id || `mock-${collectionName}-${Date.now()}` };
        newItems = [...items, newItem];
    }
    setLocalData(collectionName, newItems);
    return;
  }

  try {
    if (data.id && !data.id.startsWith('temp-') && !data.id.startsWith('mock-')) {
       await setDoc(doc(db, collectionName, data.id), data, { merge: true });
    } else {
       const { id, ...rest } = data; 
       await addDoc(collection(db, collectionName), rest);
    }
  } catch (error) {
    console.error(`Error saving to ${collectionName}:`, error);
    throw error;
  }
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
  if (isMockMode || !db) {
    const items = getLocalData(collectionName);
    const updated = items.map((i: any) => i.id === id ? { ...i, ...data } : i);
    setLocalData(collectionName, updated);
    return;
  }

  try {
    await updateDoc(doc(db, collectionName, id), data);
  } catch (error) {
    console.error(`Error updating ${collectionName}/${id}:`, error);
    throw error;
  }
};

export const deleteDocument = async (collectionName: string, id: string) => {
  if (isMockMode || !db) {
    const items = getLocalData(collectionName);
    const filtered = items.filter((i: any) => i.id !== id);
    setLocalData(collectionName, filtered);
    return;
  }

  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.error(`Error deleting ${collectionName}/${id}:`, error);
    throw error;
  }
};

// ENHANCED SEEDING: Added 'force' parameter to overwrite local cache when code constants update
export const seedCollection = async (collectionName: string, dataArray: any[], force: boolean = false) => {
  if (seedingLocks[collectionName]) return;
  seedingLocks[collectionName] = true;

  if (isMockMode || !db) {
    const current = getLocalData(collectionName);
    if (current.length === 0 || force) {
        setLocalData(collectionName, dataArray);
        if (force) console.log(`[MockDB] Forced reset of ${collectionName} with ${dataArray.length} items.`);
    }
    seedingLocks[collectionName] = false;
    return;
  }

  try {
    // In Firebase mode, we don't easily 'force replace' entire collections due to cost/complexity.
    // We stick to 'add if empty' logic or explicit batch updates if needed.
    const CHUNK_SIZE = 250;
    for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
      const chunk = dataArray.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(data => {
        const docRef = data.id ? doc(db, collectionName, data.id) : doc(collection(db, collectionName));
        batch.set(docRef, data);
      });
      await batch.commit();
      console.log(`[Database Strengthened] Seeded ${i + chunk.length}/${dataArray.length} items to ${collectionName}`);
    }
  } catch (error) {
    console.error(`Database Seeding Error for ${collectionName}:`, error);
  } finally {
    seedingLocks[collectionName] = false;
  }
};

export const addTodo = async (text: string, author: string) => {
  if (isMockMode || !db) {
    const todos = getLocalData(COLLECTION_NAME);
    const newTodo = {
      id: `mock-todo-${Date.now()}`,
      text,
      author,
      isCompleted: false,
      createdAt: { seconds: Date.now() / 1000 }
    };
    setLocalData(COLLECTION_NAME, [newTodo, ...todos]);
    return;
  }
  await addDoc(collection(db, COLLECTION_NAME), { text, author, isCompleted: false, createdAt: Timestamp.now() });
};

export const updateTodo = async (id: string, updates: Partial<TodoItem>) => {
  if (isMockMode || !db) {
    const todos = getLocalData(COLLECTION_NAME);
    setLocalData(COLLECTION_NAME, todos.map((t: any) => t.id === id ? { ...t, ...updates } : t));
    return;
  }
  await updateDoc(doc(db, COLLECTION_NAME, id), updates);
};

export const deleteTodo = async (id: string) => {
  if (isMockMode || !db) {
    const todos = getLocalData(COLLECTION_NAME);
    setLocalData(COLLECTION_NAME, todos.filter((t: any) => t.id !== id));
    return;
  }
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};
