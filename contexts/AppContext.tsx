
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LogEntry, Department, GolfCourse, UserProfile, UserRole, UserStatus, Person, CareerRecord, ExternalEvent, AffinityLevel } from '../types';
import { MOCK_LOGS, MOCK_COURSES, MOCK_PEOPLE, MOCK_EXTERNAL_EVENTS } from '../constants';
import { subscribeToCollection, saveDocument, updateDocument, deleteDocument, seedCollection } from '../services/firestoreService';

interface AppContextType {
  user: UserProfile | null;
  allUsers: UserProfile[];
  login: (email: string) => Promise<string | void>;
  register: (name: string, email: string, department: Department) => Promise<void>;
  logout: () => void;
  updateUserStatus: (userId: string, status: UserStatus) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  updateUserDepartment: (userId: string, department: Department) => void;
  updateUser: (userId: string, data: Partial<UserProfile>) => Promise<void>;
  logs: LogEntry[];
  courses: GolfCourse[];
  people: Person[];
  externalEvents: ExternalEvent[];
  addLog: (log: LogEntry) => void;
  updateLog: (log: LogEntry) => void;
  deleteLog: (id: string) => void;
  addCourse: (course: GolfCourse) => void;
  updateCourse: (course: GolfCourse) => void;
  deleteCourse: (id: string) => void; 
  addPerson: (person: Person) => void;
  updatePerson: (person: Person) => void;
  deletePerson: (id: string) => void;
  addExternalEvent: (event: ExternalEvent) => void;
  refreshLogs: () => void;
  isSimulatedLive: boolean;
  canUseAI: boolean;
  canViewFullData: boolean;
  isAdmin: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Default Admin for bootstrapping
const DEFAULT_ADMIN: UserProfile = {
  id: 'admin-01',
  name: '김관리 (System)',
  email: 'admin@greenmaster.com',
  role: UserRole.SENIOR, 
  department: Department.MANAGEMENT,
  avatar: 'https://ui-avatars.com/api/?name=Admin+Kim&background=0D9488&color=fff',
  status: 'APPROVED'
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- Data State (Now driven by Firestore) ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [courses, setCourses] = useState<GolfCourse[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>([]);
  
  // Auth state also synced from Firestore 'users' collection
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('greenmaster_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // --- Firestore Subscriptions ---
  useEffect(() => {
    // 1. Logs
    const unsubLogs = subscribeToCollection('logs', (data) => {
      if (data.length === 0) { 
        // Auto-seed if empty to match "screen I see now"
        seedCollection('logs', MOCK_LOGS); 
      } else { 
        setLogs(data as LogEntry[]); 
      }
    });

    // 2. Courses
    const unsubCourses = subscribeToCollection('courses', (data) => {
      if (data.length === 0) { 
        seedCollection('courses', MOCK_COURSES); 
      } else { 
        setCourses(data as GolfCourse[]); 
      }
    });

    // 3. People
    const unsubPeople = subscribeToCollection('people', (data) => {
      if (data.length === 0) { 
        seedCollection('people', MOCK_PEOPLE); 
      } else { 
        setPeople(data as Person[]); 
      }
    });

    // 4. Events
    const unsubEvents = subscribeToCollection('external_events', (data) => {
      if (data.length === 0) { 
        seedCollection('external_events', MOCK_EXTERNAL_EVENTS); 
      } else { 
        setExternalEvents(data as ExternalEvent[]); 
      }
    });

    // 5. Users
    const unsubUsers = subscribeToCollection('users', (data) => {
      if (data.length === 0) { 
        seedCollection('users', [DEFAULT_ADMIN]); 
      } else { 
        const fetchedUsers = data as UserProfile[];
        setAllUsers(fetchedUsers);
        
        // Real-time update of current user permission
        if (user) {
            const updatedSelf = fetchedUsers.find(u => u.id === user.id);
            if (updatedSelf) {
                // Check if critical fields changed before updating state/localStorage to avoid loops
                if(JSON.stringify(updatedSelf) !== JSON.stringify(user)) {
                    setUser(updatedSelf);
                    localStorage.setItem('greenmaster_user', JSON.stringify(updatedSelf));
                }
            } else {
                // User deleted from DB?
                // Optional: Force logout if user no longer exists in DB
            }
        }
      }
    });

    return () => {
      unsubLogs(); unsubCourses(); unsubPeople(); unsubEvents(); unsubUsers();
    };
  }, [user?.id]); // Depend on user.id to ensure self-update logic works

  // --- Auth Actions ---
  const login = async (email: string): Promise<string | void> => {
    // Force a fresh check against allUsers state which is kept in sync
    const foundUser = allUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    
    if (!foundUser) return '등록된 이메일이 아닙니다. 회원가입을 진행해주세요.';
    
    if (foundUser.status === 'PENDING') {
        return '현재 관리자 승인 대기 중입니다. 승인이 완료되면 이메일로 알림이 발송됩니다.';
    }
    
    if (foundUser.status === 'REJECTED') {
        return '가입 요청이 거절되었거나 계정이 차단되었습니다. 관리자에게 문의하세요.';
    }

    setUser(foundUser);
    localStorage.setItem('greenmaster_user', JSON.stringify(foundUser));
  };

  const register = async (name: string, email: string, department: Department) => {
    // Check local state first for immediate feedback
    if (allUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
        throw new Error('이미 등록된 이메일입니다. 로그인해주세요.');
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      name,
      email: email.trim(),
      role: UserRole.INTERMEDIATE, // Default Role
      department,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      status: 'PENDING'
    };
    
    // Save to Firestore
    await saveDocument('users', newUser);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('greenmaster_user');
  };

  const updateUserStatus = async (userId: string, status: UserStatus) => {
    await updateDocument('users', userId, { status });
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    await updateDocument('users', userId, { role });
  };

  const updateUserDepartment = async (userId: string, department: Department) => {
    await updateDocument('users', userId, { department });
  };

  // General Update User Function
  const updateUser = async (userId: string, data: Partial<UserProfile>) => {
    await updateDocument('users', userId, data);
  };

  // --- CRUD Actions (Now using Firestore) ---
  
  // Enhanced: Prevent duplicate logs
  const addLog = (log: LogEntry) => {
      // Check for identical logs (same date, title, and course) to prevent duplicate uploads
      const isDuplicate = logs.some(existing => 
          existing.date === log.date && 
          existing.title === log.title && 
          existing.courseId === log.courseId
      );

      if (isDuplicate) {
          console.warn('Duplicate log detected. Skipping save.');
          return; // Skip saving
      }
      saveDocument('logs', log);
  };

  const updateLog = (log: LogEntry) => updateDocument('logs', log.id, log);
  const deleteLog = (id: string) => deleteDocument('logs', id);

  // Enhanced: Smart Course Merging
  const addCourse = async (course: GolfCourse) => {
      const normalize = (s: string) => s.trim().replace(/\s+/g, '').toLowerCase();
      const existing = courses.find(c => normalize(c.name) === normalize(course.name));

      if (existing) {
          // Merge Logic: Use new data if existing is empty/default
          const merged: GolfCourse = {
              ...existing,
              address: (existing.address.length < 5 && course.address.length > 5) ? course.address : existing.address,
              holes: existing.holes || course.holes,
              type: existing.type || course.type,
              grassType: existing.grassType || course.grassType,
              // Merge issues array without duplicates
              issues: Array.from(new Set([...(existing.issues || []), ...(course.issues || [])])).filter(i => i.trim() !== '')
          };
          
          await updateDocument('courses', existing.id, merged);
          console.log(`Merged duplicate course: ${existing.name}`);
      } else {
          await saveDocument('courses', course);
      }
  };

  const updateCourse = (course: GolfCourse) => updateDocument('courses', course.id, course);
  const deleteCourse = (id: string) => deleteDocument('courses', id);

  // Smart Person Add (Enhanced Deduplication & Merging)
  const addPerson = async (newPerson: Person) => {
    const normalize = (s: string) => s.trim().replace(/\s+/g, '').toLowerCase();
    const existing = people.find(p => normalize(p.name) === normalize(newPerson.name));

    if (existing) {
        // --- Merge Logic ---
        
        // 1. Careers: Merge new careers into existing ones, avoiding duplicates
        const existingCareers = existing.careers || [];
        const newCareersToAdd = (newPerson.careers || []).filter(nc => {
            // Check if this career already exists in the history (matching course and role)
            return !existingCareers.some(ec => 
                ec.courseId === nc.courseId && normalize(ec.role) === normalize(nc.role)
            );
        });
        
        let mergedCareers = [...existingCareers, ...newCareersToAdd];

        // 2. Archive Current Role if Changed
        // If the new data says they are somewhere else, move old current role to career history
        const isRoleChanged = newPerson.currentCourseId && (newPerson.currentCourseId !== existing.currentCourseId);
        if (isRoleChanged && existing.currentCourseId) {
             const oldCourse = courses.find(c => c.id === existing.currentCourseId);
             mergedCareers.unshift({ // Add to top as most recent history
                 courseId: existing.currentCourseId,
                 courseName: oldCourse?.name || 'Unknown Course',
                 role: existing.currentRole,
                 startDate: existing.currentRoleStartDate || '',
                 endDate: new Date().toISOString().split('T')[0],
                 description: 'Auto-archived upon merge with new data'
             });
        }

        // 3. Construct Merged Person
        const merged: Person = {
            ...existing,
            // Keep existing phone if new one is empty, otherwise update
            phone: (newPerson.phone && newPerson.phone.length > 3) ? newPerson.phone : existing.phone,
            
            // Update role/course if new info is provided
            currentRole: newPerson.currentRole || existing.currentRole,
            currentCourseId: newPerson.currentCourseId || existing.currentCourseId,
            currentRoleStartDate: newPerson.currentRoleStartDate || existing.currentRoleStartDate,
            
            // Prefer non-neutral affinity if available
            affinity: newPerson.affinity !== 0 ? newPerson.affinity : existing.affinity,
            
            // Append notes instead of overwriting
            notes: existing.notes + (newPerson.notes && !existing.notes.includes(newPerson.notes) ? `\n\n[통합됨]: ${newPerson.notes}` : ''),
            
            careers: mergedCareers
        };
        
        await updateDocument('people', existing.id, merged);
        console.log(`Merged duplicate person: ${existing.name}`);
    } else {
        await saveDocument('people', newPerson);
    }
  };

  const updatePerson = (person: Person) => updateDocument('people', person.id, person);
  
  // New Delete Person Function
  const deletePerson = (id: string) => deleteDocument('people', id);

  const addExternalEvent = (event: ExternalEvent) => saveDocument('external_events', event);
  const refreshLogs = () => {}; // No-op, sync is automatic

  const isSimulatedLive = true;
  const canUseAI = user?.role === UserRole.SENIOR || user?.role === UserRole.ADMIN;
  const canViewFullData = user?.role === UserRole.SENIOR || user?.role === UserRole.INTERMEDIATE || user?.role === UserRole.ADMIN;
  const isAdmin = user?.role === UserRole.SENIOR || user?.role === UserRole.ADMIN;

  const value = {
    user, allUsers, login, register, logout, updateUserStatus, updateUserRole, updateUserDepartment, updateUser,
    logs, courses, people, externalEvents,
    addLog, updateLog, deleteLog,
    addCourse, updateCourse, deleteCourse,
    addPerson, updatePerson, deletePerson, // Export deletePerson
    addExternalEvent, refreshLogs, isSimulatedLive,
    canUseAI, canViewFullData, isAdmin
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
