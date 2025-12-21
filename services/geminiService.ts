
// @google/genai service for intelligence processing
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { LogEntry, GolfCourse, Person, MaterialRecord } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Enhanced Multi-Entity Extraction with Granular Categorization
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
      제공된 문서를 정밀 분석하여 전략적 데이터베이스 형태로 변환하고, 문서 전체에 대한 인사이트를 제공하세요.

      [핵심 분석 요구사항]
      1. 골프장(Courses): 명칭, 지역, 주소, 규모(홀수)를 추출하고 '기존 목록([${courseListStr}])' 포함 여부를 판단하세요.
      2. 업무 일지(Logs): 분류체계(summary, details, strategy, risk, priority)에 맞춰 기술하세요.
      3. 인물(People): 성함, 직책, 소속, 우호도, 특이사항을 추출하세요.
      4. 문서 총괄 분석: 
         - documentSummary: 문서의 핵심 내용을 2-3문장으로 간결하게 요약.
         - documentDetailedReport: 추출된 데이터 포인트들의 연관성, 비즈니스적 시사점, 향후 대응 전략을 포함한 상세 보고서.

      반드시 제공된 JSON 스키마를 엄격히 준수하여 답변하세요.
    `
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: contentParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          documentSummary: { type: Type.STRING },
          documentDetailedReport: { type: Type.STRING },
          extractedCourses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                region: { type: Type.STRING },
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
                date: { type: Type.STRING },
                courseName: { type: Type.STRING },
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                details: { type: Type.STRING },
                strategy: { type: Type.STRING },
                risk: { type: Type.STRING },
                priority: { type: Type.NUMBER },
                department: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
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
                affinity: { type: Type.NUMBER },
                notes: { type: Type.STRING }
              }
            }
          }
        },
        required: ["extractedCourses", "extractedLogs", "extractedPeople", "documentSummary", "documentDetailedReport"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const createChatSession = (
  appContextData: { logs: LogEntry[], courses: GolfCourse[], people: Person[] }
): Chat => {
  const prunedLogs = appContextData.logs.slice(0, 50).map(l => ({ 
    d: l.date, c: l.courseName, t: l.title, content: l.content.substring(0, 200) 
  }));
  const prunedCourses = appContextData.courses.slice(0, 100).map(c => ({ 
    n: c.name, r: c.region, h: c.holes, t: c.type 
  }));
  const prunedPeople = appContextData.people.slice(0, 100).map(p => ({ 
    n: p.name, r: p.currentRole, c: p.currentCourseId, a: p.affinity
  }));

  const systemInstruction = `
    당신은 대한민국 골프장 업계의 최고 전략가 'GreenMaster AI'입니다.
    데이터에 기반하여 요약, 상세 설명, 리스크 및 기회 요인을 구분하여 답변하세요.
    [컨텍스트 데이터]
    - 골프장: ${JSON.stringify(prunedCourses)}
    - 인물: ${JSON.stringify(prunedPeople)}
    - 히스토리: ${JSON.stringify(prunedLogs)}
  `;

  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.4,
      thinkingConfig: { thinkingBudget: 32768 }
    },
  });
};

export const analyzeLogEntry = async (log: LogEntry): Promise<string> => {
  const prompt = `
    다음 업무 일지를 정밀 분석하여 비즈니스 인텔리전스 보고서를 작성하세요.
    [일지 정보]
    골프장: ${log.courseName}
    제목: ${log.title}
    내용: ${log.content}

    [작성 양식]
    1. **요약 (Summary)**: 이 일지의 핵심 쟁점을 단 한 문장으로 기술.
    2. **상세 분석 (Detailed Analysis)**: 일지 내용에 숨겨진 기술적/운영적 세부 사항 분석.
    3. **전략적 함의 (Strategic Implications)**: 당사 비즈니스에 미치는 영향 및 기회.
    4. **리스크 및 대응 (Risks & Actions)**: 주의해야 할 리스크와 즉각적인 후속 조치 제안.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 16384 } }
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
  const prunedLogs = logs.slice(0, 15).map(l => `${l.date}: ${l.title}`).join('\n');
  const prompt = `
    인물 프로파일링: ${person.name} (${person.currentRole}). 
    [관련 기록 히스토리]
    ${prunedLogs}
    
    위 데이터를 기반으로 다음을 분석하세요:
    - **전문성 평가**: 업무 스타일 및 전문 분야
    - **네트워크 가치**: 업계 내 영향력 및 연결 고리
    - **관계 리스크**: 우리 회사와의 우호도 변동성 및 주의사항
    - **접근 전략**: 이 인물과의 관계를 강화하기 위한 실질적인 행동 지침
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 32768 } }
  });
  return response.text;
};

export const generateCourseSummary = async (
  course: GolfCourse,
  logs: LogEntry[],
  people: Person[]
): Promise<string> => {
  const prunedLogs = logs.slice(0, 20).map(l => `[${l.date}] ${l.title}`).join(', ');
  const prunedPeople = people.slice(0, 15).map(p => `${p.name}(${p.currentRole}, 우호도:${p.affinity})`).join(' | ');
  const prompt = `
    골프장 종합 전략 진단: '${course.name}'. 
    - 현황: ${course.description} 
    - 인적 자산: ${prunedPeople} 
    - 히스토리 요약: ${prunedLogs}

    [작성 가이드]
    1. **운영 현황 진단**: 현재 골프장의 상태 및 주요 이슈 요약
    2. **인적 네트워크 분석**: 키맨(Key-man) 파악 및 영향력 분석
    3. **비즈니스 기회 (Opportunities)**: 당사가 파고들 수 있는 틈새 전략
    4. **향후 전망**: 업계 트렌드 대비 이 골프장의 포지셔닝
  `;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 32768 } }
  });
  return response.text;
};
