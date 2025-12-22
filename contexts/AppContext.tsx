
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { LogEntry, Department, GolfCourse, UserProfile, UserRole, UserStatus, Person, CareerRecord, ExternalEvent, AffinityLevel, SystemLog, FinancialRecord, MaterialRecord, GolfCoursePerson } from '../types';
import { MOCK_LOGS, MOCK_COURSES, MOCK_PEOPLE, MOCK_EXTERNAL_EVENTS, MOCK_FINANCIALS, MOCK_MATERIALS, DATA_VERSION } from '../constants';
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

  const isAdmin = user?.role === UserRole.ADMIN;
  const isSeniorOrAdmin = user?.role === UserRole.SENIOR || user?.role === UserRole.ADMIN;
  const isSimulatedLive = true; // Use this variable to determine mock mode in context logic

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

  // --- DATA MIGRATION CHECK ---
  // Ensure that if the code version changes (new Mock Data), the local storage is updated.
  useEffect(() => {
      const performMigration = async () => {
          // Check if we are running in a mode that uses local storage (mock mode)
          // We rely on the `isSimulatedLive` flag or a safe check on `localStorage`.
          // Here we assume if 'gm_mock_courses' exists, we are in mock mode.
          const isMockStorage = localStorage.getItem('gm_mock_courses') !== null || true; // Force check for safety
          
          if (isMockStorage) {
              const currentVersion = localStorage.getItem('gm_data_version');
              if (currentVersion !== DATA_VERSION) {
                  console.log(`[Migration] Detected version change from ${currentVersion} to ${DATA_VERSION}. Updating mock data...`);
                  
                  // Force re-seed courses because the user specifically requested 569 new items replacing the old ones.
                  await seedCollection('courses', MOCK_COURSES, true);
                  
                  // Update version
                  localStorage.setItem('gm_data_version', DATA_VERSION);
                  
                  // Reload to ensure all components have fresh data
                  window.location.reload();
              }
          }
      };
      performMigration();
  }, []);

  useEffect(() => {
    const unsubLogs = subscribeToCollection('logs', (data) => {
      if (data.length === 0) { seedCollection('logs', MOCK_LOGS); return; } 
      setLogs(data as LogEntry[]);
    });

    const unsubCourses = subscribeToCollection('courses', (data) => {
      if (data.length === 0) { seedCollection('courses', MOCK_COURSES); return; } 
      setRawCourses(data as GolfCourse[]);
    });

    const unsubPeople = subscribeToCollection('people', (data) => {
      if (data.length === 0) { seedCollection('people', MOCK_PEOPLE); return; } 
      setPeople(data as Person[]);
    });

    const unsubEvents = subscribeToCollection('external_events', (data) => {
      if (data.length === 0) { seedCollection('external_events', MOCK_EXTERNAL_EVENTS); return; } 
      setExternalEvents(data as ExternalEvent[]);
    });

    const unsubUsers = subscribeToCollection('users', (data) => {
      if (data.length === 0) { seedCollection('users', [DEFAULT_ADMIN]); return; } 
      const fetchedUsers = data as UserProfile[];
      setAllUsers(fetchedUsers);
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
      if (data.length === 0) { seedCollection('financials', MOCK_FINANCIALS); return; }
      setFinancials(data as FinancialRecord[]);
    });

    const unsubMat = subscribeToCollection('materials', (data) => {
      if (data.length === 0) { seedCollection('materials', MOCK_MATERIALS); return; }
      setMaterials(data as MaterialRecord[]);
    });

    return () => {
      unsubLogs(); unsubCourses(); unsubPeople(); unsubEvents(); unsubUsers(); unsubSystem(); unsubFin(); unsubMat();
    };
  }, [user?.id]); 

  // Enrich courses with associated people
  const courses = useMemo(() => {
    return rawCourses.map(course => {
      const associatedPeople: GolfCoursePerson[] = [];
      
      people.forEach(p => {
        // Current relationship
        if (p.currentCourseId === course.id) {
          associatedPeople.push({
            personId: p.id,
            name: p.name,
            role: p.currentRole,
            affinity: p.affinity,
            isCurrent: true
          });
        }
        
        // Past relationships (careers)
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

  const login = async (email: string): Promise<string | void> => {
    const foundUser = allUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!foundUser) return '등록된 이메일이 아닙니다. 회원가입을 진행해주세요.';
    if (foundUser.status === 'PENDING') return '현재 관리자 승인 대기 중입니다.';
    if (foundUser.status === 'REJECTED') return '가입 요청이 거절되었거나 계정이 차단되었습니다.';
    setUser(foundUser);
    localStorage.setItem('greenmaster_user', JSON.stringify(foundUser));
    logActivity('LOGIN', 'USER', 'System Login');
  };

  const register = async (name: string, email: string, department: Department) => {
    if (allUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
        throw new Error('이미 등록된 이메일입니다. 로그인해주세요.');
    }
    const newUser: UserProfile = {
      id: `user-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      name, email: email.trim(), role: UserRole.INTERMEDIATE, department,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      status: 'PENDING'
    };
    await saveDocument('users', newUser);
  };

  const createUserManually = async (data: { name: string, email: string, department: Department, role: UserRole }) => {
    if (!isAdmin) throw new Error('권한 관리 권한이 없습니다.');
    if (allUsers.some(u => u.email.toLowerCase() === data.email.trim().toLowerCase())) {
        throw new Error('이미 존재하는 이메일입니다.');
    }
    const newUser: UserProfile = {
      id: `user-manual-${Date.now()}`,
      ...data,
      email: data.email.trim(),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=0F172A&color=fff`,
      status: 'APPROVED'
    };
    await saveDocument('users', newUser);
    logActivity('CREATE', 'USER', data.name, `Admin created user with role: ${data.role}`);
  };

  const logout = () => {
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
      
      // 1. Merge Issues & Description
      let combinedIssues = [...(targetCourse.issues || [])];
      let combinedDesc = targetCourse.description;
      
      sources.forEach(s => {
          if (s.issues) combinedIssues = [...combinedIssues, ...s.issues];
          if (s.description && !combinedDesc.includes(s.description)) {
              combinedDesc += `\n\n[Merged Info from ${s.name}]: ${s.description}`;
          }
      });
      // Unique issues
      combinedIssues = Array.from(new Set(combinedIssues));
      
      await updateCourse({ ...targetCourse, issues: combinedIssues, description: combinedDesc });

      // 2. Re-link Logs
      const logsToMove = logs.filter(l => sourceIds.includes(l.courseId));
      for (const l of logsToMove) {
          await updateLog({ ...l, courseId: targetId, courseName: targetCourse.name });
      }

      // 3. Re-link People (Current)
      const peopleCurrent = people.filter(p => p.currentCourseId && sourceIds.includes(p.currentCourseId));
      for (const p of peopleCurrent) {
          await updatePerson({ ...p, currentCourseId: targetId });
      }

      // 4. Re-link People (Careers)
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

      // 5. Financials & Materials
      const fins = financials.filter(f => sourceIds.includes(f.courseId));
      for (const f of fins) await updateFinancial({ ...f, courseId: targetId });
      
      const mats = materials.filter(m => sourceIds.includes(m.courseId));
      for (const m of mats) await updateMaterial({ ...m, courseId: targetId });

      // 6. Delete Sources
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
    refreshLogs, resetData, exportAllData, isSimulatedLive,
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
