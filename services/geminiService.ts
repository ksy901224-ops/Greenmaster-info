
// @google/genai service for intelligence processing
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, GolfCourse, Person, MaterialRecord } from '../types';

// Use process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Enhanced Document Analysis for Master DB Syncing and Strategic Extraction
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

  // Prune course list to top 200 for prompt size stability
  const courseListStr = existingCourseNames.slice(0, 200).join(', ');

  contentParts.push({
    text: `
      당신은 대한민국 골프장 비즈니스 인텔리전스 전문가입니다.
      제공된 텍스트/파일(PDF, 이미지)을 분석하여 구조화된 정보를 추출하세요.

      [분석 가이드라인]
      1. 핵심 요약(Summary): 바쁜 결정권자를 위해 2~3문장으로 아주 간결하게 핵심만 요약하세요.
      2. 상세 내용(Detailed Content): 문서에 포함된 구체적인 수치, 날짜, 인물 발언, 공사 현황 등을 누락 없이 상세하게 기술하세요.
      3. 정보 추출: 골프장 이름, 주소, 홀 수, 운영 형태를 정확히 매칭하세요.
      4. 전략 분석: '이슈'와 '기회' 요인을 전문적인 시각에서 도출하세요.

      반드시 아래 JSON 스키마를 엄격히 준수하여 JSON 배열([]) 형식으로만 출력하세요.
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
            courseName: { type: Type.STRING },
            date: { type: Type.STRING },
            department: { type: Type.STRING },
            title: { type: Type.STRING },
            content: { type: Type.STRING, description: "문서에서 추출된 원본에 가까운 상세 텍스트" },
            summary_report: { type: Type.STRING, description: "핵심 요약 (2~3문장)" },
            detailed_analysis: { type: Type.STRING, description: "문서 내용에 대한 심층 분석 및 상세 기술" },
            course_info: {
                type: Type.OBJECT,
                properties: {
                    address: { type: Type.STRING },
                    holes: { type: Type.NUMBER },
                    type: { type: Type.STRING }
                },
                required: ["address", "holes", "type"]
            },
            strategic_analysis: {
                type: Type.OBJECT,
                properties: {
                    issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                    opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["issues", "opportunities"]
            },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            contact_person: { type: Type.STRING }
          },
          required: ["courseName", "title", "summary_report", "detailed_analysis", "course_info", "strategic_analysis"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};

// ... 이하 기존 함수 유지 (generateCourseSummary, searchAppWithAIStream 등)
export const generateCourseSummary = async (
  course: GolfCourse,
  logs: LogEntry[],
  people: Person[]
): Promise<string> => {
  const prunedLogs = logs.slice(0, 15).map(l => `[${l.date}] ${l.title}`).join(', ');
  const prunedPeople = people.slice(0, 10).map(p => `${p.name}(${p.currentRole}, 친밀도:${p.affinity})`).join(' | ');

  const prompt = `
    당신은 골프장 운영 컨설턴트입니다. '${course.name}' 골프장에 대한 데이터 분석 리포트를 작성하세요.
    요구사항: 1. 현황 요약 2. 상세 진단 3. 향후 전략
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  return response.text;
};

export const searchAppWithAIStream = async (
  query: string, 
  appContextData: { logs: LogEntry[], courses: GolfCourse[], people: Person[] },
  onChunk: (text: string) => void
): Promise<void> => {
  const prompt = `GreenMaster AI 비서입니다. [Question]: "${query}"`;
  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  for await (const chunk of responseStream) {
    if (chunk.text) onChunk(chunk.text);
  }
};

export const analyzeLogEntry = async (log: LogEntry): Promise<string> => {
  const prompt = `일지 분석: 요약, 리스크, 권장 액션 순으로 리포트를 작성하세요. 내용: ${log.content}`;
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
        { text: "골프장 자재 목록 추출" }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const generatePersonReputationReport = async (
  person: Person,
  logs: LogEntry[]
): Promise<string> => {
  const prompt = `인물 평판 분석: ${person.name}`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });
  return response.text;
};
