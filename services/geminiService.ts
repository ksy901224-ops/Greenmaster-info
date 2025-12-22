
// @google/genai service for intelligence processing
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { LogEntry, GolfCourse, Person, MaterialRecord } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Enhanced Multi-Entity Extraction with Confidence Scores
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

  contentParts.push({
    text: `
      당신은 대한민국 골프장 비즈니스 인텔리전스 전문가입니다. 
      제공된 문서를 정밀 분석하여 전략적 데이터베이스 형태로 변환하고, 문서 전체에 대한 인사이트를 제공하세요.
      
      [출력 언어 및 품질 가이드라인]
      1. 모든 분석 결과(요약, 리포트, 상세 설명 등)는 반드시 한국어로 작성하세요.
      2. 문체는 정중하고 전문적인 비즈니스 문체를 사용하세요 (예: ~함, ~임 대신 ~입니다, ~함이 바람직합니다 등).
      3. 전문 용어는 업계에서 통용되는 정확한 표현을 사용하세요.

      [핵심 분석 및 강화 요구사항]
      1. 골프장(Courses): 명칭, 지역, 규모 외에 '추출 근거(reason)'와 기존 DB 존재 여부 예측을 수행하세요.
      2. 업무 일지(Logs): 단순 요약이 아닌 '비즈니스 기회/리스크'를 명확히 구분하고, 중요도(priority)를 1~5로 산정하세요.
      3. 인물(People): 성함, 직책 외에 문맥에서 파악된 '성향/특징'을 추출하세요.
      4. 모든 추출 항목에는 'confidence(0.0~1.0)' 점수를 부여하여 사용자가 신뢰도를 판단하게 하세요.

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
                confidence: { type: Type.NUMBER },
                reason: { type: Type.STRING }
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
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                confidence: { type: Type.NUMBER }
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
                notes: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
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
    모든 답변은 전문적이고 정중한 한국어로 작성하세요.
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
    다음 업무 일지를 정밀 분석하여 비즈니스 인텔리전스 보고서를 전문적인 한국어로 작성하세요.
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

export const generateCourseRelationshipIntelligence = async (
  course: GolfCourse,
  people: Person[],
  logs: LogEntry[]
): Promise<string> => {
  const staffInfo = people.map(p => `- ${p.name} (${p.currentRole}, 우호도: ${p.affinity}): ${p.notes}`).join('\n');
  const prunedLogs = logs.slice(0, 30).map(l => `[${l.date}] ${l.author}: ${l.title} - ${l.content.substring(0, 100)}...`).join('\n');
  
  const prompt = `
    골프장 '${course.name}'의 인적 네트워크 및 관계 리스크 정밀 분석 리포트를 비즈니스 한국어로 작성하세요.
    
    [입력 데이터]
    - 골프장 현황: ${course.description}
    - 현재 소속 인원:\n${staffInfo}
    - 관련 업무 이력 히스토리:\n${prunedLogs}

    [분석 요청 사항]
    1. **핵심 이해관계자 (Key-Men) 파악**: 의사결정에 결정적 영향을 미치는 인물 및 이들과의 연결 고리 분석.
    2. **관계 건전성 진단**: 당사와의 전체적인 우호도 추이 및 협력 수준 평가.
    3. **잠재적 인적 리스크**: 비우호적 인물, 최근의 소속 변경, 업무 일지에서 발견된 갈등 징후 포착.
    4. **전략적 관계 강화 가이드**: 향후 비즈니스 확장을 위해 누구에게, 어떻게 접근해야 하는지 실질적인 행동 지침 제안.

    전문적이고 통찰력 있는 '인텔리전스 보고서' 형식으로 한국어로 작성하세요.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 32768 } }
  });
  return response.text;
};

export const analyzeMaterialInventory = async (
  fileData: { base64Data: string, mimeType: string }
): Promise<any[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: fileData.mimeType, data: fileData.base64Data } },
        { text: "골프장 자재 목록 추출 (JSON ARRAY: year, category, name, quantity, unit, supplier, notes). 결과물의 문자열은 모두 한국어로 작성하세요." }
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
    
    위 데이터를 기반으로 다음을 분석하여 전문적인 한국어로 출력하세요:
    - **전문성 평가**: 업무 스타일 및 전문 분야
    - **네트워크 가치**: 업계 내 영향력 및 연결 고리
    - **관계 리스크**: 우리 회사와의 우호도 변동성 및 주의사항
    - **접근 전략**: 이 인물과의 관계를 강화하기 위한 실질적인 행동 지침
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingBudget: 32768 }
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
    모든 항목을 논리적이고 정제된 한국어로 작성하세요.
    1. **운영 현황 진단**: 현재 골프장의 상태 및 주요 이슈 요약
    2. **인적 네트워크 분석**: 키맨(Key-man) 파악 및 영향력 분석
    3. **비즈니스 기회 (Opportunities)**: 당사가 파고들 수 있는 틈새 전략
    4. **향후 전망**: 업계 트렌드 대비 이 골프장의 포지셔닝
  `;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingBudget: 32768 }
  });
  return response.text;
};
