
// @google/genai service for intelligence processing
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, GolfCourse, Person, MaterialRecord } from '../types';

// Use process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Enhanced Document Analysis for Batch and Strategy
export const analyzeDocument = async (
  inputData: { base64Data?: string, mimeType?: string, textData?: string }[],
  existingCourseNames: string[] = []
): Promise<any[] | null> => {
  const contentParts: any[] = [];
  
  for (const item of inputData) {
      if (item.base64Data && item.mimeType) {
        contentParts.push({ inlineData: { mimeType: item.mimeType, data: item.base64Data } });
      } else if (item.textData) {
        contentParts.push({ text: `[입력 데이터]\n${item.textData}` });
      }
  }

  // Prune course list to top 200 for prompt optimization
  const courseListStr = existingCourseNames.slice(0, 200).join(', ');

  contentParts.push({
    text: `
      당신은 대한민국 골프장 비즈니스 인텔리전스 전문가입니다.
      제공된 파일(PDF, 이미지, 텍스트)을 분석하여 구조화된 데이터로 추출하세요.

      [골프장 식별 및 매칭 강화 지침]
      1. 현재 시스템 주요 마스터 DB 목록 (일부): [${courseListStr}]
      2. 문서에 나타난 골프장 이름이 마스터 DB의 이름과 부분 일치하거나 유사하다면 반드시 마스터 DB의 '정확한 명칭'으로 통일하세요.
      3. 목록에 없는 새로운 골프장인 경우에만 추출된 이름을 그대로 사용하고 'course_info'를 작성하세요.

      [전략적 분석 강화]
      4. 'summary_report'에는 상황 분석 및 우리 회사 비즈니스에 미칠 잠재적 기회나 위협을 포함하세요.
      5. 'tags'는 업계 표준 용어를 5개 이상 포함하세요.

      반드시 JSON 배열([]) 형식으로 출력하세요.
    `
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: contentParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            date: { type: Type.STRING },
            department: { type: Type.STRING },
            courseName: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary_report: { type: Type.STRING },
            course_info: {
                type: Type.OBJECT,
                properties: {
                    address: { type: Type.STRING },
                    holes: { type: Type.NUMBER },
                    type: { type: Type.STRING }
                },
                nullable: true
            }
          },
          required: ["title", "content", "date", "department", "courseName", "tags", "summary_report"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};

// Course Strategy Summary Enhancement
export const generateCourseSummary = async (
  course: GolfCourse,
  logs: LogEntry[],
  people: Person[]
): Promise<string> => {
  // Prune logs and people for summary content
  const prunedLogs = logs.slice(0, 15).map(l => `[${l.date}] ${l.title}`).join(', ');
  const prunedPeople = people.slice(0, 10).map(p => `${p.name}(${p.currentRole}, 친밀도:${p.affinity})`).join(' | ');

  const prompt = `
    당신은 골프장 운영 컨설턴트입니다. '${course.name}' 골프장에 대한 데이터 분석 리포트를 작성하세요.
    
    데이터 요약:
    - 지역/규모: ${course.region} / ${course.holes}홀
    - 현황: ${course.description}
    - 최근 일지 요약: ${prunedLogs}
    - 주요 인물: ${prunedPeople}

    요구사항:
    1. **현황 진단**: 현재 코스 및 운영 상태를 진단하세요.
    2. **관계 전략**: 주요 인물들과의 친밀도를 바탕으로 한 비즈니스 접근법을 제시하세요.
    3. **Action Plan**: 향후 핵심 업무 3가지를 제시하세요.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  return response.text;
};

// Search App with AI Streaming - PRUNED CONTEXT TO PREVENT STACK OVERFLOW
export const searchAppWithAIStream = async (
  query: string, 
  appContextData: { logs: LogEntry[], courses: GolfCourse[], people: Person[] },
  onChunk: (text: string) => void
): Promise<void> => {
  // Prune context to avoid Maximum Call Stack errors and token limits
  // Only send the most recent 30 logs and top 50 courses
  const prunedLogs = (appContextData.logs || []).slice(0, 30).map(l => ({ 
    d: l.date, 
    c: l.courseName, 
    t: l.title, 
    content: l.content.substring(0, 100) 
  }));
  
  const prunedCourses = (appContextData.courses || []).slice(0, 50).map(c => ({ 
    n: c.name, 
    r: c.region, 
    h: c.holes 
  }));
  
  const prunedPeople = (appContextData.people || []).slice(0, 20).map(p => ({ 
    n: p.name, 
    r: p.currentRole, 
    a: p.affinity 
  }));

  let contextString = "";
  try {
      contextString = JSON.stringify({ 
          logs: prunedLogs, 
          courses: prunedCourses, 
          people: prunedPeople 
      });
  } catch (e) {
      contextString = "Context could not be stringified due to size or complexity.";
  }
  
  const prompt = `당신은 GreenMaster 시스템의 AI 비서입니다. 다음 데이터를 바탕으로 사용자의 질문에 답하세요.
  [Context (Pruned)]: ${contextString}
  [Question]: "${query}"
  답변은 한국어로, 출처(날짜, 골프장명)를 명시하여 친절하게 작성하세요.`;

  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  for await (const chunk of responseStream) {
    if (chunk.text) onChunk(chunk.text);
  }
};

export const analyzeLogEntry = async (log: LogEntry): Promise<string> => {
  const prompt = `
    당신은 골프장 관리 전문가입니다. 다음 일지를 분석하세요.
    제목: ${log.title}
    내용: ${log.content.substring(0, 1000)}
    골프장: ${log.courseName}
  `;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
        { text: "골프장 자재 목록 추출 (JSON ARRAY)" }
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
  // Prune logs related to person
  const prunedLogs = logs.slice(0, 10).map(l => `${l.date}: ${l.title}`).join('\n');
  const prompt = `인물 평판 보고서: ${person.name} (${person.currentRole}). 관련 기록 요약:\n${prunedLogs}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });
  return response.text;
};
