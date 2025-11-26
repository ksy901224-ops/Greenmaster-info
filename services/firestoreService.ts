
import { db } from "../firebaseConfig";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from "firebase/firestore";

export interface TodoItem {
  id?: string;
  text: string;
  author: string;
  isCompleted: boolean;
  createdAt: any;
}

const COLLECTION_NAME = "todos";

// 1. Create (사용자: 할 일 추가)
export const addTodo = async (text: string, author: string) => {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      text,
      author,
      isCompleted: false,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error adding document: ", error);
    throw error;
  }
};

// 2. Read (관리자: 모든 할 일 가져오기)
export const getAllTodos = async (): Promise<TodoItem[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TodoItem[];
  } catch (error) {
    console.error("Error getting documents: ", error);
    return [];
  }
};

// 3. Update (관리자: 할 일 수정/완료처리)
export const updateTodo = async (id: string, updates: Partial<TodoItem>) => {
  try {
    const todoRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(todoRef, updates);
  } catch (error) {
    console.error("Error updating document: ", error);
    throw error;
  }
};

// 4. Delete (관리자: 할 일 삭제)
export const deleteTodo = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("Error deleting document: ", error);
    throw error;
  }
};
