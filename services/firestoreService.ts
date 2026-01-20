
import { db, isMockMode as configMockMode } from "../firebaseConfig";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, Timestamp, onSnapshot, setDoc, writeBatch, QuerySnapshot, DocumentData } from "firebase/firestore";

export interface TodoItem {
  id?: string;
  text: string;
  author: string;
  isCompleted: boolean;
  createdAt: any;
}

const COLLECTION_NAME = "todos";

// --- DYNAMIC MOCK SWITCH ---
// Allows the app to fallback to mock mode at runtime if Auth/DB fails
let forceMock = false;
export const setForceMock = (enable: boolean) => {
  forceMock = enable;
  console.log(`[FirestoreService] Force Mock Mode set to: ${enable}`);
};

const isMock = () => configMockMode || forceMock || !db;

// --- UTILITY: REMOVE UNDEFINED ---
// Firestore throws an error if a field is undefined. It must be null or omitted.
const sanitizeData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  } else if (data !== null && typeof data === 'object') {
    const newObj: any = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined) {
        newObj[key] = sanitizeData(value);
      } else {
        // Firestore does not accept undefined. We explicitly set it to null.
        newObj[key] = null; 
      }
    });
    return newObj;
  }
  return data;
};

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
  if (isMock()) {
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
    // Gracefully handle permission errors or offline errors
    if (error.code === 'permission-denied' || error.message.includes('permission')) {
        console.warn(`[Firestore] Permission denied for ${collectionName}. Subscription skipped.`);
    } else if (error.message.includes('offline') || error.code === 'unavailable') {
        console.warn(`[Firestore] Client is offline. Switching to mock for ${collectionName}.`);
        // We allow the UI to handle the mode switch, just suppress the crash here
    } else {
        console.error(`Error subscribing to ${collectionName}:`, error);
    }
  });
};

// MODIFIED: Returns the document ID (Promise<string>)
export const saveDocument = async (collectionName: string, rawData: any): Promise<string> => {
  const data = sanitizeData(rawData); // Sanitize before saving to fix 'undefined' error

  if (isMock()) {
    const items = getLocalData(collectionName);
    const id = data.id || `mock-${collectionName}-${Date.now()}`;
    const dataWithId = { ...data, id };
    
    const existingIndex = items.findIndex((i: any) => i.id === id);
    let newItems;
    if (existingIndex >= 0) {
        newItems = [...items];
        newItems[existingIndex] = { ...newItems[existingIndex], ...dataWithId };
    } else {
        newItems = [...items, dataWithId];
    }
    setLocalData(collectionName, newItems);
    return id;
  }

  try {
    if (data.id && !data.id.startsWith('temp-') && !data.id.startsWith('mock-')) {
       await setDoc(doc(db, collectionName, data.id), data, { merge: true });
       return data.id;
    } else {
       const { id, ...rest } = data; // Remove undefined/temp ID if present
       const docRef = await addDoc(collection(db, collectionName), rest);
       return docRef.id;
    }
  } catch (error: any) {
    if (error.message.includes("offline") || error.code === 'unavailable') {
        console.warn("Save failed due to offline. Saving locally instead.");
        // Fallback to local storage if offline
        const items = getLocalData(collectionName);
        const id = data.id || `offline-${Date.now()}`;
        setLocalData(collectionName, [...items, { ...data, id }]);
        return id;
    }
    console.error(`Error saving to ${collectionName}:`, error);
    throw error;
  }
};

export const updateDocument = async (collectionName: string, id: string, rawData: any) => {
  const data = sanitizeData(rawData); // Sanitize before updating

  if (isMock()) {
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
  if (isMock()) {
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

  if (isMock()) {
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
      chunk.forEach(rawItem => {
        const data = sanitizeData(rawItem);
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

/**
 * INTELLIGENT MERGE: Used for Import feature.
 * Appends new data and updates existing data by ID, preserving data not present in the import file.
 */
export const mergeCollectionData = async (collectionName: string, dataArray: any[]) => {
  if (isMock()) {
    const current = getLocalData(collectionName);
    // Create a map for fast lookup and merging
    const dataMap = new Map(current.map(item => [item.id, item]));
    
    dataArray.forEach(item => {
      const sanitized = sanitizeData(item);
      if (sanitized.id) {
        dataMap.set(sanitized.id, sanitized); // Overwrite/Add
      } else {
        // If no ID, generate one and add
        sanitized.id = `import-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        dataMap.set(sanitized.id, sanitized);
      }
    });
    
    setLocalData(collectionName, Array.from(dataMap.values()));
    console.log(`[MockDB] Merged ${dataArray.length} items into ${collectionName}.`);
    return;
  }

  // Firebase Live Mode Merge
  try {
    const CHUNK_SIZE = 250;
    for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
      const chunk = dataArray.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(rawItem => {
        const data = sanitizeData(rawItem);
        // Ensure ID exists
        if (!data.id) data.id = doc(collection(db, collectionName)).id;
        
        const docRef = doc(db, collectionName, data.id);
        // { merge: true } ensures we don't wipe fields not present in the new data
        batch.set(docRef, data, { merge: true });
      });
      await batch.commit();
      console.log(`[Database] Merged ${i + chunk.length}/${dataArray.length} items to ${collectionName}`);
    }
  } catch (error) {
    console.error(`Database Merge Error for ${collectionName}:`, error);
    throw error;
  }
};

export const addTodo = async (text: string, author: string) => {
  if (isMock()) {
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
  if (isMock()) {
    const todos = getLocalData(COLLECTION_NAME);
    setLocalData(COLLECTION_NAME, todos.map((t: any) => t.id === id ? { ...t, ...updates } : t));
    return;
  }
  await updateDoc(doc(db, COLLECTION_NAME, id), updates);
};

export const deleteTodo = async (id: string) => {
  if (isMock()) {
    const todos = getLocalData(COLLECTION_NAME);
    setLocalData(COLLECTION_NAME, todos.filter((t: any) => t.id !== id));
    return;
  }
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};
