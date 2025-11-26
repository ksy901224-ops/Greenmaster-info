import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LogEntry, Department, GolfCourse, UserProfile, UserRole, UserStatus, Person } from '../types';
import { MOCK_LOGS, MOCK_COURSES, MOCK_PEOPLE } from '../constants';

interface AppContextType {
  user: UserProfile | null;
  allUsers: UserProfile[];
  login: (email: string) => Promise<string | void>; // Returns error string if failed
  register: (name: string, email: string, department: Department) => Promise<void>;
  logout: () => void;
  updateUserStatus: (userId: string, status: UserStatus) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  logs: LogEntry[];
  courses: GolfCourse[];
  people: Person[];
  addLog: (log: LogEntry) => void;
  updateLog: (log: LogEntry) => void;
  deleteLog: (id: string) => void;
  addCourse: (course: GolfCourse) => void;
  updateCourse: (course: GolfCourse) => void;
  addPerson: (person: Person) => void;
  updatePerson: (person: Person) => void;
  refreshLogs: () => void;
  isSimulatedLive: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Default Admin for bootstrapping
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
  // --- Authentication State ---
  
  // 1. Current Logged In User
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('greenmaster_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // 2. All Registered Users (Simulated Database)
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    const savedAllUsers = localStorage.getItem('greenmaster_all_users');
    return savedAllUsers ? JSON.parse(savedAllUsers) : [DEFAULT_ADMIN];
  });

  // Persist allUsers
  useEffect(() => {
    localStorage.setItem('greenmaster_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  const login = async (email: string): Promise<string | void> => {
    // Find user by email
    const foundUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
      return '등록된 이메일이 아닙니다. 회원가입을 진행해주세요.';
    }

    if (foundUser.status === 'PENDING') {
      return '계정이 승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다.';
    }

    if (foundUser.status === 'REJECTED') {
      return '승인이 거절된 계정입니다. 관리자에게 문의하세요.';
    }

    setUser(foundUser);
    localStorage.setItem('greenmaster_user', JSON.stringify(foundUser));
  };

  const register = async (name: string, email: string, department: Department) => {
    // Check duplicate
    if (allUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('이미 등록된 이메일입니다.');
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name,
      email,
      role: UserRole.USER, // Default to USER. Admin must promote them.
      department,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      status: 'PENDING' // Default status
    };

    setAllUsers(prev => [...prev, newUser]);
    // Do NOT log them in automatically.
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('greenmaster_user');
  };

  // --- Admin User Management ---
  const updateUserStatus = (userId: string, status: UserStatus) => {
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    // If updating self, update session
    if (user && user.id === userId) {
        const updatedSelf = { ...user, role };
        setUser(updatedSelf);
        localStorage.setItem('greenmaster_user', JSON.stringify(updatedSelf));
    }
  };

  // --- Data State ---
  // Initialize logs from localStorage or fallback to MOCK_LOGS
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const savedLogs = localStorage.getItem('greenmaster_logs');
    return savedLogs ? JSON.parse(savedLogs) : MOCK_LOGS;
  });

  // Initialize courses from localStorage or fallback to MOCK_COURSES
  const [courses, setCourses] = useState<GolfCourse[]>(() => {
    const savedCourses = localStorage.getItem('greenmaster_courses');
    return savedCourses ? JSON.parse(savedCourses) : MOCK_COURSES;
  });

  // Initialize people from localStorage or fallback to MOCK_PEOPLE
  const [people, setPeople] = useState<Person[]>(() => {
    const savedPeople = localStorage.getItem('greenmaster_people');
    return savedPeople ? JSON.parse(savedPeople) : MOCK_PEOPLE;
  });
  
  const [isSimulatedLive] = useState(true);

  // Persist logs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('greenmaster_logs', JSON.stringify(logs));
  }, [logs]);

  // Persist courses to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('greenmaster_courses', JSON.stringify(courses));
  }, [courses]);

  // Persist people to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('greenmaster_people', JSON.stringify(people));
  }, [people]);

  const addCourse = (newCourse: GolfCourse) => {
    setCourses(prev => {
      // Check for duplicates (normalize names by removing spaces)
      const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();
      const exists = prev.some(c => normalize(c.name) === normalize(newCourse.name));
      
      if (exists) {
        return prev;
      }
      return [...prev, newCourse];
    });
  };

  const updateCourse = (updatedCourse: GolfCourse) => {
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
  };

  const addPerson = (newPerson: Person) => {
    setPeople(prev => [...prev, newPerson]);
  };

  const updatePerson = (updatedPerson: Person) => {
    setPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
  };

  const addLog = (newLog: LogEntry) => {
    // Robust Course Name association
    let resolvedCourseName = newLog.courseName;
    
    // If courseName is missing but we have an ID, try to find it
    if ((!resolvedCourseName || resolvedCourseName === '미지정') && newLog.courseId) {
         const found = courses.find(c => c.id === newLog.courseId);
         if (found) resolvedCourseName = found.name;
    }

    // If we still don't have a name, default to '미지정'
    if (!resolvedCourseName) resolvedCourseName = '미지정';

    const processedLog = {
      ...newLog,
      courseName: resolvedCourseName
    };
    setLogs(prevLogs => [processedLog, ...prevLogs]);
  };

  const updateLog = (updatedLog: LogEntry) => {
    setLogs(prevLogs => prevLogs.map(log => log.id === updatedLog.id ? updatedLog : log));
  };

  const deleteLog = (id: string) => {
    setLogs(prevLogs => prevLogs.filter(log => log.id !== id));
  };

  const refreshLogs = () => {
    const savedLogs = localStorage.getItem('greenmaster_logs');
    if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
    }
    const savedCourses = localStorage.getItem('greenmaster_courses');
    if (savedCourses) {
        setCourses(JSON.parse(savedCourses));
    }
    const savedPeople = localStorage.getItem('greenmaster_people');
    if (savedPeople) {
        setPeople(JSON.parse(savedPeople));
    }
  };

  // Simulate "Other people inputting data" (Shared View Simulation)
  useEffect(() => {
    if (!isSimulatedLive) return;

    // Randomly inject a log from a "colleague" every 60-120 seconds to show "Shared" aspect
    const interval = setInterval(() => {
      const randomChance = Math.random();
      if (randomChance > 0.7) { // 30% chance every interval
        const mockAuthors = ['김대리', '이과장', '박팀장', '최이사'];
        const randomAuthor = mockAuthors[Math.floor(Math.random() * mockAuthors.length)];
        
        // Find a random course to attach to
        const randomCourse = courses[Math.floor(Math.random() * courses.length)] || courses[0];

        // Only add if there are courses
        if (randomCourse) {
            const newMockLog: LogEntry = {
            id: `auto-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            author: randomAuthor,
            department: Department.CONSTRUCTION,
            courseName: randomCourse.name,
            courseId: randomCourse.id,
            title: `[실시간] ${randomAuthor} 현장 보고`,
            content: '타 부서에서 방금 공유된 실시간 현장 상황입니다. 공유 프로그램을 통해 자동 동기화되었습니다.',
            tags: ['공유', '실시간']
            };
            // addLog(newMockLog); // Commented out to avoid polluting list during demo
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isSimulatedLive, courses]);

  return (
    <AppContext.Provider value={{ 
        user, 
        allUsers,
        login, 
        register, 
        logout, 
        updateUserStatus,
        updateUserRole,
        logs, 
        courses, 
        people,
        addLog, 
        updateLog, 
        deleteLog, 
        addCourse, 
        updateCourse,
        addPerson,
        updatePerson,
        refreshLogs, 
        isSimulatedLive 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};