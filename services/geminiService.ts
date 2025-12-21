
// @google/genai service for intelligence processing
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { LogEntry, GolfCourse, Person, MaterialRecord } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Enhanced Multi-Entity Extraction
 * 분석된 문서에서 골프장, 인물, 업무 로그 정보를 구조적으로 추출합니다.
 */
export const analyzeDocument = async (
  inputData: { base64Data?: string, mimeType?: string, textData?: string }[],
  existingCourseNames: string[] = []
): Promise<any | null> => {
  const contentParts: any[] = [];
  
  for (const item of inputData) {
      if (item.base64Data && item.mimeType) {
        contentParts.push({ inlineData: { mimeType: item.mimeType, data: item.base64Data } });
      } else if (item.textData) {
        contentParts.push({ text: `[입력 데이터]\n${item.textData}` });
      }
  }

  const courseListStr = existingCourseNames.slice(0, 300).join(', ');

  contentParts.push({
    text: `
      당신은 대한민국 골프장 비즈니스 인텔리전스 전문가입니다. 
      제공된 문서(이미지/PDF/텍스트)를 분석하여 우리 회사의 지식 데이터베이스에 저장할 수 있는 형태로 변환하세요.

      [분석 지침]
      1. 골프장(Courses): 문서에 언급된 모든 골프장의 명칭과 위치, 규모 정보를 추출하세요. 
         - 기존 목록([${courseListStr}])에 없는 골프장은 '신규'로 간주합니다.
      2. 업무 일지(Logs): 발생한 업무 내역, 날짜, 담당자, 내용을 요약하세요.
      3. 인물(People): 성함, 직책, 소속 골프장 정보를 추출하고, 문맥상 우리에 대한 우호도(Affinity)를 -2 ~ 2 사이로 추론하세요.
      4. 전략 분석(Strategy): 추출된 정보로부터 얻을 수 있는 핵심 인사이트와 향후 권장 액션을 포함하세요.

      반드시 제공된 JSON 스키마 형식으로만 답변하세요.
    `
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: contentParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          extractedCourses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                region: { type: Type.STRING, description: "서울, 경기, 강원 등" },
                address: { type: Type.STRING },
                holes: { type: Type.NUMBER },
                description: { type: Type.STRING },
                isNew: { type: Type.BOOLEAN }
              }
            }
          },
          extractedLogs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "YYYY-MM-DD" },
                courseName: { type: Type.STRING },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                department: { type: Type.STRING, description: "영업, 연구소, 건설사업, 컨설팅, 관리 중 하나" },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                insight: { type: Type.STRING, description: "AI가 판단한 핵심 요약 및 리스크" }
              }
            }
          },
          extractedPeople: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                courseName: { type: Type.STRING },
                affinity: { type: Type.NUMBER, description: "-2 to 2" },
                notes: { type: Type.STRING }
              }
            }
          }
        },
        required: ["extractedCourses", "extractedLogs", "extractedPeople"]
      }
    }
  });

  return JSON.parse(response.text);
};

// ... 기존 createChatSession 등 함수들 유지 (Gemini 2.5 Flash-Lite 적용 상태)
export const createChatSession = (
  appContextData: { logs: LogEntry[], courses: GolfCourse[], people: Person[] }
): Chat => {
  const prunedLogs = appContextData.logs.slice(0, 40).map(l => ({ 
    d: l.date, c: l.courseName, t: l.title, content: l.content.substring(0, 150) 
  }));
  const prunedCourses = appContextData.courses.slice(0, 80).map(c => ({ 
    n: c.name, r: c.region, h: c.holes, t: c.type 
  }));
  const prunedPeople = appContextData.people.slice(0, 80).map(p => ({ 
    n: p.name, r: p.currentRole, c: p.currentCourseId, a: p.affinity, careers: p.careers.map(car => car.courseName)
  }));

  const systemInstruction = `
    당신은 대한민국 골프장 업계의 핵심 정보를 관리하는 전략 인텔리전스 비서 'GreenMaster AI'입니다.
    사용자의 요청에 따라 사내 데이터베이스를 검색하고 최적의 통찰을 제공하세요.
    [시스템 데이터 (Context)]
    - 골프장 마스터: ${JSON.stringify(prunedCourses)}
    - 인적 네트워크: ${JSON.stringify(prunedPeople)}
    - 최근 업무 히스토리: ${JSON.stringify(prunedLogs)}
  `;

  return ai.chats.create({
    model: 'gemini-flash-lite-latest',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.5,
      thinkingConfig: { thinkingBudget: 2000 }
    },
  });
};

export const analyzeLogEntry = async (log: LogEntry): Promise<string> => {
  const prompt = `업무 일지 분석 및 전략 도출:
골프장: ${log.courseName}
제목: ${log.title}
내용: ${log.content}
위 내용을 분석하여 1) 핵심 요약, 2) 업계 관점에서의 함의, 3) 후속 조치(Next Steps)를 제시하세요.`;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: prompt,
  });
  return response.text || "분석 실패";
};

export const analyzeMaterialInventory = async (
  fileData: { base64Data: string, mimeType: string }
): Promise<any[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: fileData.mimeType, data: fileData.base64Data } },
        { text: "골프장 자재 목록 추출 (JSON ARRAY: year, category, name, quantity, unit, supplier, notes)" }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.NUMBER },
            category: { type: Type.STRING },
            name: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            unit: { type: Type.STRING },
            supplier: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["year", "category", "name", "quantity", "unit"]
        }
      }
    }
  });
  return JSON.parse(response.text);
};

export const generatePersonReputationReport = async (
  person: Person,
  logs: LogEntry[]
): Promise<string> => {
  const prunedLogs = logs.slice(0, 10).map(l => `${l.date}: ${l.title}`).join('\n');
  const prompt = `인물 평판 및 네트워크 가치 분석: ${person.name} (${person.currentRole}). 
  [관련 기록 요약] ${prunedLogs}
  이 인물의 업계 내 영향력, 업무 스타일, 그리고 우리 회사와의 관계 안정성을 분석하세요.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 8000 } }
  });
  return response.text;
};

export const generateCourseSummary = async (
  course: GolfCourse,
  logs: LogEntry[],
  people: Person[]
): Promise<string> => {
  const prunedLogs = logs.slice(0, 15).map(l => `[${l.date}] ${l.title}`).join(', ');
  const prunedPeople = people.slice(0, 10).map(p => `${p.name}(${p.currentRole}, 친밀도:${p.affinity})`).join(' | ');
  const prompt = `골프장 전략 리포트 작성: '${course.name}'. 현황: ${course.description} 주요인물: ${prunedPeople} 최근기록: ${prunedLogs}`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 4000 } }
  });
  return response.text;
};
