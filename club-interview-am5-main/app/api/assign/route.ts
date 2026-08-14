import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: '환경변수(.env.local) 설정이 누락되었습니다.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // DB에서 전체 신청 내역 조회
    const { data: applicants, error: dbError } = await supabase
      .from('applicants')
      .select('name, preferences');

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      return NextResponse.json(
        { error: 'DB 데이터를 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!applicants || applicants.length === 0) {
      return NextResponse.json(
        { error: '신청한 지원자가 없습니다.', schedule: [] },
        { status: 200 }
      );
    }

    const prompt = `
당신은 동아리 면접 시간표 자동 배정 시스템입니다.
제공된 지원자 목록과 우선순위를 바탕으로 최적의 시간표를 배정해주세요.

[배정 제약 조건]
1. 한 슬롯당 정원은 최대 3명입니다.
2. 각 지원자는 반드시 정확히 1개의 시간 슬롯에 배정되어야 합니다.
3. 최대한 가급적 많은 지원자가 높은 순위(1순위 > 2순위 > ... > 6순위)에 배정되도록 하세요.

[신청 데이터]
${JSON.stringify(applicants, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            schedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time_slot: { type: Type.STRING },
                  assigned_applicants: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ['time_slot', 'assigned_applicants']
              }
            }
          },
          required: ['schedule']
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      return NextResponse.json(
        { error: 'Gemini 응답이 비어있습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(JSON.parse(responseText));
  } catch (e: any) {
    console.error('API Error:', e);
    return NextResponse.json(
      { error: e.message || '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}