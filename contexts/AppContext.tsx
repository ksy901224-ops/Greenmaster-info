
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { LogEntry, Department, GolfCourse, UserProfile, UserRole, UserStatus, Person, CareerRecord, ExternalEvent, AffinityLevel, SystemLog, FinancialRecord, MaterialRecord, GolfCoursePerson } from '../types';
import { MOCK_LOGS, MOCK_COURSES, MOCK_PEOPLE, MOCK_EXTERNAL_EVENTS, MOCK_FINANCIALS, MOCK_MATERIALS, DATA_VERSION } from '../constants';
import { subscribeToCollection, saveDocument, updateDocument, deleteDocument, seedCollection, setForceMock } from '../services/firestoreService';
import { auth, db, isMockMode } from '../firebaseConfig'; // db import needed
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AppContextType {
  user: UserProfile | null;
  allUsers: UserProfile[];
  login: (email: string, password?: string) => Promise<string | void>;
  register: (name: string, email: string, password: string, department: Department) => Promise<void>;
  logout: () => void;
  updateUserStatus: (userId: string, status: UserStatus) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  updateUserDepartment: (userId: string, department: Department) => void;
  updateUser: (userId: string, data: Partial<UserProfile>) => Promise<void>;
  createUserManually: (data: { name: string, email: string, department: Department, role: UserRole }) => Promise<void>;
  
  logs: LogEntry[];
  courses: GolfCourse[];
  people: Person[];
  externalEvents: ExternalEvent[];
  systemLogs: SystemLog[];
  financials: FinancialRecord[];
  materials: MaterialRecord[];

  addLog: (log: LogEntry) => void;
  updateLog: (log: LogEntry) => void;
  deleteLog: (id: string) => void;
  addCourse: (course: GolfCourse) => void;
  updateCourse: (course: GolfCourse) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  mergeCourses: (targetId: string, sourceIds: string[]) => Promise<void>;
  addPerson: (person: Person) => void;
  updatePerson: (person: Person) => void;
  deletePerson: (id: string) => void;
  addExternalEvent: (event: ExternalEvent) => void;
  
  addFinancial: (record: FinancialRecord) => void;
  updateFinancial: (record: FinancialRecord) => void;
  deleteFinancial: (id: string) => void;
  addMaterial: (record: MaterialRecord) => void;
  updateMaterial: (record: MaterialRecord) => void;
  deleteMaterial: (id: string) => void;

  refreshLogs: () => void;
  resetData: () => void;
  exportAllData: () => void;
  importAllData: (jsonData: any) => Promise<void>;
  isSimulatedLive: boolean;
  canUseAI: boolean;
  canViewFullData: boolean;
  isAdmin: boolean; 
  isSeniorOrAdmin: boolean; 
  // Routing
  currentPath: string;
  navigate: (path: string, state?: any) => void;
  routeParams: { id?: string };
  locationState: any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_ADMIN: UserProfile = {
  id: 'admin-01',
  name: '김관리 (System)',
  email: 'admin@greenmaster.com',
  role: UserRole.ADMIN, 
  department: Department.MANAGEMENT,
  avatar: 'https://ui-avatars.com/api/?name=Admin+Kim&background=0D9488&color=fff',
  status: 'APPROVED'
};

const parseAuthError = (code: string) => {
    switch (code) {
        case 'auth/invalid-email': return '유효하지 않은 이메일 형식입니다.';
        case 'auth/user-disabled': return '비활성화된 사용자입니다.';
        case 'auth/user-not-found': return '등록되지 않은 사용자입니다.';
        case 'auth/wrong-password': return '비밀번호가 일치하지 않습니다.';
        case 'auth/email-already-in-use': return '이미 사용 중인 이메일입니다.';
        case 'auth/weak-password': return '비밀번호는 6자 이상이어야 합니다.';
        case 'auth/operation-not-allowed': return '이메일/비밀번호 로그인이 설정되지 않았습니다. 관리자에게 문의하세요.';
        default: return '인증 오류가 발생했습니다. (' + code + ')';
    }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rawCourses, setRawCourses] = useState<GolfCourse[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('greenmaster_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');
  const [locationState, setLocationState] = useState<any>(null);
  const [routeParams, setRouteParams] = useState<{ id?: string }>({});
  
  // Auth state for Firebase
  const [isFirebaseReady, setIsFirebaseReady] = useState(isMockMode); 
  const [isOfflineMode, setIsOfflineMode] = useState(isMockMode);

  const isAdmin = user?.role === UserRole.ADMIN;
  const isSeniorOrAdmin = user?.role === UserRole.SENIOR || user?.role === UserRole.ADMIN;
  const isSimulatedLive = true; 

  const parsePath = (path: string) => {
    const courseMatch = path.match(/^\/courses\/([^/]+)$/);
    if (courseMatch) return { id: courseMatch[1] };
    const personMatch = path.match(/^\/people\/([^/]+)$/);
    if (personMatch) return { id: personMatch[1] };
    return {};
  };

  const navigate = (path: string, state?: any) => {
    setLocationState(state || null);
    window.location.hash = path;
    setCurrentPath(path);
    setRouteParams(parsePath(path));
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const path = window.location.hash.slice(1) || '/';
      setCurrentPath(path);
      setRouteParams(parsePath(path));
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const logActivity = (
      actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'APPROVE' | 'REJECT', 
      targetType: 'LOG' | 'COURSE' | 'PERSON' | 'USER' | 'FINANCE' | 'MATERIAL', 
      targetName: string,
      details?: string
  ) => {
      if (!user) return;
      const newLog: SystemLog = {
          id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: Date.now(),
          userId: user.id,
          userName: user.name,
          actionType,
          targetType,
          targetName,
          details
      };
      saveDocument('system_logs', newLog);
  };

  // --- AUTH INITIALIZATION ---
  useEffect(() => {
    if (!isMockMode && auth) {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                console.log("[Firebase] Auth State Changed: Logged In as", firebaseUser.uid);
                setIsFirebaseReady(true);
                
                // Firestore에서 사용자 프로필 정보 동기화
                try {
                    const docRef = doc(db, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        const userProfile = docSnap.data() as UserProfile;
                        if (userProfile.status === 'APPROVED') {
                            setUser(userProfile);
                            localStorage.setItem('greenmaster_user', JSON.stringify(userProfile));
                        } else {
                            // 승인되지 않은 경우 로그아웃 처리
                            console.warn("User login attempt rejected: Status is", userProfile.status);
                            setUser(null);
                            localStorage.removeItem('greenmaster_user');
                        }
                    } else {
                        console.warn("[Firebase] User authenticated but no profile found in Firestore.");
                    }
                } catch (e) {
                    console.error("[Firebase] Error fetching user profile:", e);
                }
            } else {
                console.log("[Firebase] Auth State Changed: Logged Out");
                setUser(null);
                localStorage.removeItem('greenmaster_user');
                setIsFirebaseReady(true);
            }
        });
        return () => unsubscribe();
    } else {
        setIsFirebaseReady(true);
    }
  }, []);

  // --- DATA MIGRATION CHECK ---
  useEffect(() => {
      const performMigration = async () => {
          const isMockStorage = localStorage.getItem('gm_mock_courses') !== null || true; 
          
          if (isMockStorage) {
              const currentVersion = localStorage.getItem('gm_data_version');
              if (currentVersion !== DATA_VERSION) {
                  localStorage.setItem('gm_data_version', DATA_VERSION);
              }
          }
      };
      performMigration();
  }, []);

  // --- SUBSCRIPTIONS ---
  useEffect(() => {
    // Only subscribe if:
    // 1. We are in Mock Mode or Offline Mode (using local data)
    // 2. OR We are in Live Mode (Firebase Ready) AND the user is authenticated.
    // This strict check prevents "Missing or insufficient permissions" errors.
    
    const canSubscribe = isMockMode || isOfflineMode || (isFirebaseReady && !!auth?.currentUser);

    if (!canSubscribe) {
        // Clear data when logged out or initializing to avoid stale UI
        setLogs([]);
        setRawCourses([]);
        setPeople([]);
        setExternalEvents([]);
        setSystemLogs([]);
        setFinancials([]);
        setMaterials([]);
        setAllUsers([]);
        return;
    }

    const unsubLogs = subscribeToCollection('logs', (data) => {
      if (data.length === 0 && (isMockMode || isOfflineMode)) { seedCollection('logs', MOCK_LOGS); return; } 
      setLogs(data as LogEntry[]);
    });

    const unsubCourses = subscribeToCollection('courses', (data) => {
      if (data.length === 0 && (isMockMode || isOfflineMode)) { seedCollection('courses', MOCK_COURSES); return; } 
      setRawCourses(data as GolfCourse[]);
    });

    const unsubPeople = subscribeToCollection('people', (data) => {
      if (data.length === 0 && (isMockMode || isOfflineMode)) { seedCollection('people', MOCK_PEOPLE); return; } 
      setPeople(data as Person[]);
    });

    const unsubEvents = subscribeToCollection('external_events', (data) => {
      if (data.length === 0 && (isMockMode || isOfflineMode)) { seedCollection('external_events', MOCK_EXTERNAL_EVENTS); return; } 
      setExternalEvents(data as ExternalEvent[]);
    });

    const unsubUsers = subscribeToCollection('users', (data) => {
      if (data.length === 0 && (isMockMode || isOfflineMode)) { seedCollection('users', [DEFAULT_ADMIN]); return; } 
      const fetchedUsers = data as UserProfile[];
      setAllUsers(fetchedUsers);
      
      // Update self if role changed
      if (user) {
          const updatedSelf = fetchedUsers.find(u => u.id === user.id);
          if (updatedSelf && JSON.stringify(updatedSelf) !== JSON.stringify(user)) {
              setUser(updatedSelf);
              localStorage.setItem('greenmaster_user', JSON.stringify(updatedSelf));
          }
      }
    });

    const unsubSystem = subscribeToCollection('system_logs', (data) => {
        const sorted = (data as SystemLog[]).sort((a, b) => b.timestamp - a.timestamp);
        setSystemLogs(sorted);
    });

    const unsubFin = subscribeToCollection('financials', (data) => {
      if (data.length === 0 && (isMockMode || isOfflineMode)) { seedCollection('financials', MOCK_FINANCIALS); return; }
      setFinancials(data as FinancialRecord[]);
    });

    const unsubMat = subscribeToCollection('materials', (data) => {
      if (data.length === 0 && (isMockMode || isOfflineMode)) { seedCollection('materials', MOCK_MATERIALS); return; }
      setMaterials(data as MaterialRecord[]);
    });

    return () => {
      unsubLogs(); unsubCourses(); unsubPeople(); unsubEvents(); unsubUsers(); unsubSystem(); unsubFin(); unsubMat();
    };
  }, [isFirebaseReady, isOfflineMode, user?.id]); // Re-run when user logs in/out

  // Enrich courses with associated people
  const courses = useMemo(() => {
    return rawCourses.map(course => {
      const associatedPeople: GolfCoursePerson[] = [];
      
      people.forEach(p => {
        if (p.currentCourseId === course.id) {
          associatedPeople.push({
            personId: p.id,
            name: p.name,
            role: p.currentRole,
            affinity: p.affinity,
            isCurrent: true
          });
        }
        p.careers.forEach(career => {
          if (career.courseId === course.id && p.currentCourseId !== course.id) {
            associatedPeople.push({
              personId: p.id,
              name: p.name,
              role: career.role,
              affinity: p.affinity,
              isCurrent: false
            });
          }
        });
      });
      
      return { ...course, associatedPeople };
    });
  }, [rawCourses, people]);

  // LOGIN FUNCTION - Updated for Real Firebase Auth with Robust Fallback
  const login = async (email: string, password?: string): Promise<string | void> => {
    if (isMockMode || isOfflineMode) {
        // Fallback Mock Login
        // Ensure we have at least the default admin if allUsers is empty
        let currentUsers = allUsers;
        if (currentUsers.length === 0) {
            currentUsers = [DEFAULT_ADMIN];
            setAllUsers(currentUsers); // seed state
        }

        const foundUser = currentUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        
        // Special case for default admin in forced mock mode if not found in array yet
        if (!foundUser && email.toLowerCase() === DEFAULT_ADMIN.email.toLowerCase()) {
             setUser(DEFAULT_ADMIN);
             localStorage.setItem('greenmaster_user', JSON.stringify(DEFAULT_ADMIN));
             logActivity('LOGIN', 'USER', 'System Login (Offline Admin)');
             return;
        }

        if (!foundUser) return '등록된 이메일이 아닙니다. (Mock Mode)';
        if (foundUser.status === 'PENDING') return '현재 관리자 승인 대기 중입니다.';
        if (foundUser.status === 'REJECTED') return '가입 요청이 거절되었거나 계정이 차단되었습니다.';
        setUser(foundUser);
        localStorage.setItem('greenmaster_user', JSON.stringify(foundUser));
        logActivity('LOGIN', 'USER', 'System Login');
        return;
    }

    if (!auth || !password) return '비밀번호를 입력해주세요.';

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const docRef = doc(db, 'users', userCredential.user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            if (profile.status === 'PENDING') {
                await signOut(auth);
                return '현재 관리자 승인 대기 중입니다.';
            }
            if (profile.status === 'REJECTED') {
                await signOut(auth);
                return '계정이 거절되었거나 차단되었습니다.';
            }
            logActivity('LOGIN', 'USER', profile.name, 'Firebase Auth Login');
        } else {
            return '사용자 프로필을 찾을 수 없습니다. 관리자에게 문의하세요.';
        }
    } catch (error: any) {
        console.error("Login failed:", error);
        
        // CRITICAL: Handle missing auth configuration (backend not ready) by switching to Offline Mode
        if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
            console.warn("⚠️ Authentication backend issue detected. Switching to Offline Mode.");
            setForceMock(true);
            setIsOfflineMode(true);
            
            // Retry login logic in offline mode immediately
            // We use the same logic as the top of this function
            let currentUsers = allUsers.length > 0 ? allUsers : [DEFAULT_ADMIN];
            const foundUser = currentUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
            
            if (foundUser) {
                 if (foundUser.status === 'PENDING') return '현재 관리자 승인 대기 중입니다.';
                 if (foundUser.status === 'REJECTED') return '가입 요청이 거절되었거나 계정이 차단되었습니다.';
                 setUser(foundUser);
                 localStorage.setItem('greenmaster_user', JSON.stringify(foundUser));
                 return; // Success
            } else if (email === DEFAULT_ADMIN.email) {
                 setUser(DEFAULT_ADMIN);
                 localStorage.setItem('greenmaster_user', JSON.stringify(DEFAULT_ADMIN));
                 return; // Success for admin
            }
            return '인증 서버가 설정되지 않았습니다. 오프라인 모드로 전환되었으나 계정을 찾을 수 없습니다.';
        }
        
        return parseAuthError(error.code);
    }
  };

  const register = async (name: string, email: string, password?: string, department: Department = Department.SALES) => {
    if (isMockMode || isOfflineMode) {
        if (allUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
            throw new Error('이미 등록된 이메일입니다.');
        }
        const newUser: UserProfile = {
          id: `user-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          name, email: email.trim(), role: UserRole.INTERMEDIATE, department,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          status: 'PENDING'
        };
        await saveDocument('users', newUser);
        return;
    }

    if (!auth || !password) throw new Error('비밀번호가 필요합니다.');

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser: UserProfile = {
            id: userCredential.user.uid,
            name,
            email: email.trim(),
            role: UserRole.INTERMEDIATE,
            department,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            status: 'PENDING' 
        };
        
        await setDoc(doc(db, 'users', newUser.id), newUser);
        await signOut(auth);
        
    } catch (error: any) {
        if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
             setForceMock(true);
             setIsOfflineMode(true);
             // Retry register in mock mode
             const newUser: UserProfile = {
                id: `user-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                name, email: email.trim(), role: UserRole.INTERMEDIATE, department,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                status: 'PENDING'
             };
             await saveDocument('users', newUser);
             return;
        }
        console.error("Registration failed:", error);
        throw new Error(parseAuthError(error.code));
    }
  };

  const createUserManually = async (data: { name: string, email: string, department: Department, role: UserRole }) => {
    if (!isAdmin) throw new Error('권한 관리 권한이 없습니다.');
    
    const newUser: UserProfile = {
      id: `user-manual-${Date.now()}`,
      ...data,
      email: data.email.trim(),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=0F172A&color=fff`,
      status: 'APPROVED'
    };
    await saveDocument('users', newUser);
    logActivity('CREATE', 'USER', data.name, `Admin created placeholder profile.`);
  };

  const logout = async () => {
    if (auth && !isMockMode && !isOfflineMode) {
        await signOut(auth);
    }
    setUser(null);
    localStorage.removeItem('greenmaster_user');
    navigate('/');
  };

  const updateUserStatus = async (userId: string, status: UserStatus) => {
    if (!isAdmin) return;
    await updateDocument('users', userId, { status });
    const target = allUsers.find(u => u.id === userId);
    logActivity(status === 'APPROVED' ? 'APPROVE' : 'REJECT', 'USER', target?.name || 'Unknown User', `Status changed to ${status}`);
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    if (!isAdmin) return;
    await updateDocument('users', userId, { role });
    const target = allUsers.find(u => u.id === userId);
    logActivity('UPDATE', 'USER', target?.name || 'Unknown User', `Role updated to ${role}`);
  };

  const updateUserDepartment = async (userId: string, department: Department) => {
    if (!isAdmin && user?.id !== userId) return;
    await updateDocument('users', userId, { department });
  };

  const updateUser = async (userId: string, data: Partial<UserProfile>) => {
    if (!isAdmin) {
        throw new Error("사용자 정보 수정 권한이 없습니다. 시스템 관리자에게 문의하세요.");
    }
    await updateDocument('users', userId, data);
    logActivity('UPDATE', 'USER', 'Profile', `Admin updated profile for user: ${userId}`);
  };

  const addLog = (log: LogEntry) => {
      saveDocument('logs', log);
      logActivity('CREATE', 'LOG', log.title, `${log.courseName} - ${log.department}`);
  };
  const updateLog = async (log: LogEntry) => {
      await updateDocument('logs', log.id, log);
      logActivity('UPDATE', 'LOG', log.title);
  };
  const deleteLog = (id: string) => {
      const target = logs.find(l => l.id === id);
      deleteDocument('logs', id);
      logActivity('DELETE', 'LOG', target?.title || 'Unknown Log');
  };

  const addCourse = (course: GolfCourse) => {
      saveDocument('courses', course);
      logActivity('CREATE', 'COURSE', course.name);
  };
  const updateCourse = async (course: GolfCourse) => {
      await updateDocument('courses', course.id, course);
      logActivity('UPDATE', 'COURSE', course.name);
  };
  const deleteCourse = async (id: string) => {
      const target = rawCourses.find(c => c.id === id);
      await deleteDocument('courses', id);
      logActivity('DELETE', 'COURSE', target?.name || 'Unknown Course');
  };

  const mergeCourses = async (targetId: string, sourceIds: string[]) => {
      if (!isAdmin) return;
      
      const targetCourse = rawCourses.find(c => c.id === targetId);
      if (!targetCourse) return;

      const sources = rawCourses.filter(c => sourceIds.includes(c.id));
      
      let combinedIssues = [...(targetCourse.issues || [])];
      let combinedDesc = targetCourse.description;
      
      sources.forEach(s => {
          if (s.issues) combinedIssues = [...combinedIssues, ...s.issues];
          if (s.description && !combinedDesc.includes(s.description)) {
              combinedDesc += `\n\n[Merged Info from ${s.name}]: ${s.description}`;
          }
      });
      combinedIssues = Array.from(new Set(combinedIssues));
      
      await updateCourse({ ...targetCourse, issues: combinedIssues, description: combinedDesc });

      const logsToMove = logs.filter(l => sourceIds.includes(l.courseId));
      for (const l of logsToMove) {
          await updateLog({ ...l, courseId: targetId, courseName: targetCourse.name });
      }

      const peopleCurrent = people.filter(p => p.currentCourseId && sourceIds.includes(p.currentCourseId));
      for (const p of peopleCurrent) {
          await updatePerson({ ...p, currentCourseId: targetId });
      }

      for (const p of people) {
          let modified = false;
          const newCareers = p.careers.map(c => {
              if (sourceIds.includes(c.courseId)) {
                  modified = true;
                  return { ...c, courseId: targetId, courseName: targetCourse.name };
              }
              return c;
          });
          if (modified) await updatePerson({ ...p, careers: newCareers });
      }

      const fins = financials.filter(f => sourceIds.includes(f.courseId));
      for (const f of fins) await updateFinancial({ ...f, courseId: targetId });
      
      const mats = materials.filter(m => sourceIds.includes(m.courseId));
      for (const m of mats) await updateMaterial({ ...m, courseId: targetId });

      for (const id of sourceIds) {
          await deleteCourse(id);
      }
      
      logActivity('UPDATE', 'COURSE', targetCourse.name, `Merged ${sourceIds.length} duplicates.`);
      alert(`병합 완료: ${sources.length}건의 데이터를 '${targetCourse.name}'으로 통합했습니다.`);
  };

  const addPerson = async (newPerson: Person) => {
    const normalize = (s: string) => s.trim().replace(/\s+/g, '').toLowerCase();
    const existing = people.find(p => normalize(p.name) === normalize(newPerson.name));
    if (existing) {
        await updateDocument('people', existing.id, { ...existing }); 
        logActivity('UPDATE', 'PERSON', existing.name, 'Merged duplicate entry');
    } else {
        await saveDocument('people', newPerson);
        logActivity('CREATE', 'PERSON', newPerson.name);
    }
  };

  const updatePerson = async (person: Person) => {
      await updateDocument('people', person.id, person);
      logActivity('UPDATE', 'PERSON', person.name);
  };
  const deletePerson = (id: string) => {
      const target = people.find(p => p.id === id);
      deleteDocument('people', id);
      logActivity('DELETE', 'PERSON', target?.name || 'Unknown Person');
  };

  const addExternalEvent = (event: ExternalEvent) => saveDocument('external_events', event);
  
  const addFinancial = (record: FinancialRecord) => {
    saveDocument('financials', record);
    logActivity('CREATE', 'FINANCE', `${record.year} 매출`, `Course ID: ${record.courseId}`);
  };
  const updateFinancial = async (record: FinancialRecord) => {
    await updateDocument('financials', record.id, record);
    logActivity('UPDATE', 'FINANCE', `${record.year} 매출`);
  };
  const deleteFinancial = (id: string) => {
    deleteDocument('financials', id);
    logActivity('DELETE', 'FINANCE', '매출 기록');
  };

  const addMaterial = (record: MaterialRecord) => {
    saveDocument('materials', record);
    logActivity('CREATE', 'MATERIAL', record.name, `${record.category} - ${record.quantity}${record.unit}`);
  };
  const updateMaterial = async (record: MaterialRecord) => {
    await updateDocument('materials', record.id, record);
    logActivity('UPDATE', 'MATERIAL', record.name);
  };
  const deleteMaterial = (id: string) => {
    const target = materials.find(m => m.id === id);
    deleteDocument('materials', id);
    logActivity('DELETE', 'MATERIAL', target?.name || '자재');
  };

  const refreshLogs = () => {
    console.log("Real-time synchronization active via Firestore listeners.");
  };

  const resetData = () => {
      if (window.confirm("모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  const exportAllData = () => {
    const dataToExport = {
      exportedAt: new Date().toISOString(),
      version: "1.0.4",
      user: { name: user?.name, email: user?.email, department: user?.department },
      collections: {
        logs,
        courses,
        people,
        financials,
        materials,
        externalEvents,
        systemLogs
      }
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GreenMaster_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    logActivity('UPDATE', 'USER', 'Data Export', 'User exported local data backup');
  };

  const importAllData = async (jsonData: any) => {
      if (!jsonData || !jsonData.collections) {
          throw new Error('유효하지 않은 백업 파일 형식입니다.');
      }
      
      const collections = jsonData.collections;
      const tasks = [];

      if (collections.logs) tasks.push(seedCollection('logs', collections.logs, true));
      if (collections.courses) tasks.push(seedCollection('courses', collections.courses, true));
      if (collections.people) tasks.push(seedCollection('people', collections.people, true));
      if (collections.financials) tasks.push(seedCollection('financials', collections.financials, true));
      if (collections.materials) tasks.push(seedCollection('materials', collections.materials, true));
      if (collections.externalEvents) tasks.push(seedCollection('external_events', collections.externalEvents, true));
      if (collections.systemLogs) tasks.push(seedCollection('system_logs', collections.systemLogs, true));

      await Promise.all(tasks);
      logActivity('UPDATE', 'USER', 'Data Import', 'User manually restored data from JSON backup');
  };

  const canUseAI = user?.role === UserRole.SENIOR || user?.role === UserRole.ADMIN;
  const canViewFullData = user?.role === UserRole.SENIOR || user?.role === UserRole.INTERMEDIATE || user?.role === UserRole.ADMIN;

  const value = {
    user, allUsers, login, register, logout, updateUserStatus, updateUserRole, updateUserDepartment, updateUser, createUserManually,
    logs, courses, people, externalEvents, systemLogs, financials, materials,
    addLog, updateLog, deleteLog,
    addCourse, updateCourse, deleteCourse, mergeCourses,
    addPerson, updatePerson, deletePerson,
    addExternalEvent,
    addFinancial, updateFinancial, deleteFinancial,
    addMaterial, updateMaterial, deleteMaterial,
    refreshLogs, resetData, exportAllData, importAllData, isSimulatedLive,
    canUseAI, canViewFullData, isAdmin, isSeniorOrAdmin,
    currentPath, navigate, routeParams, locationState
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
