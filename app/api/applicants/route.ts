import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MAX_CAPACITY = 3;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readInterviewMeta(preferences: any) {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) return null;
  const meta = preferences._interview;
  return meta && typeof meta === 'object' ? meta : null;
}

function buildPreferences(oldPreferences: any, meta: any) {
  if (oldPreferences && typeof oldPreferences === 'object' && !Array.isArray(oldPreferences)) {
    return { ...oldPreferences, _interview: meta };
  }
  return { originalPreferences: oldPreferences ?? null, _interview: meta };
}

async function getApplicants() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('applicants')
    .select('id, name, preferences, created_at')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || [])
    .map((row: any) => {
      const meta = readInterviewMeta(row.preferences);
      if (!meta?.slotId) return null;

      return {
        id: row.id,
        studentId: String(meta.studentId || ''),
        name: row.name,
        slotId: String(meta.slotId),
        updatedAt: meta.updatedAt || row.created_at,
      };
    })
    .filter(Boolean);
}

export async function GET() {
  try {
    return NextResponse.json({ applicants: await getApplicants() });
  } catch (error: any) {
    console.error('GET /api/applicants:', error);
    return NextResponse.json(
      { error: error.message || '신청 내역을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const studentId = String(body.studentId || '').trim();
    const name = String(body.name || '').trim();
    const slotId = String(body.slotId || '').trim();

    if (!studentId || !name || !slotId) {
      return NextResponse.json(
        { error: '학번, 이름, 면접 시간대를 모두 입력해 주세요.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: rows, error: rowsError } = await supabase
      .from('applicants')
      .select('id, name, preferences, created_at');

    if (rowsError) throw rowsError;

    // 기존 신청자는 학번 메타데이터를 우선으로 찾고, 최초 신청이면 이름으로 기존 지원자와 연결합니다.
    let existing = (rows || []).find((row: any) => {
      const meta = readInterviewMeta(row.preferences);
      return meta?.studentId === studentId;
    });

    if (!existing) {
      existing = (rows || []).find((row: any) => row.name === name);
    }

    const currentInterviewRows = (rows || [])
      .map((row: any) => ({ row, meta: readInterviewMeta(row.preferences) }))
      .filter((x: any) => x.meta?.slotId);

    const count = currentInterviewRows.filter(
      (x: any) =>
        x.meta.slotId === slotId &&
        x.meta.studentId !== studentId
    ).length;

    if (count >= MAX_CAPACITY) {
      return NextResponse.json(
        { error: '선착순 마감된 시간대입니다. 다른 시간대를 선택해 주세요.' },
        { status: 409 }
      );
    }

    const meta = {
      studentId,
      slotId,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from('applicants')
        .update({
          name,
          preferences: buildPreferences(existing.preferences, meta),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('applicants')
        .insert({
          name,
          preferences: { _interview: meta },
        });

      if (error) throw error;
    }

    return NextResponse.json({ applicants: await getApplicants() });
  } catch (error: any) {
    console.error('POST /api/applicants:', error);
    return NextResponse.json(
      { error: error.message || '신청 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const rawId = body.id;
    const studentId = String(body.studentId || '').trim();
    const name = String(body.name || '').trim();

    const supabase = getSupabase();

    // applicants 행 자체는 삭제하지 않습니다.
    // 기존 지원/AI 배정 데이터는 유지하고 preferences._interview만 제거합니다.
    let target: any = null;

    // 1) DB id로 우선 찾기
    if (rawId !== undefined && rawId !== null && String(rawId).trim() !== '') {
      const { data, error } = await supabase
        .from('applicants')
        .select('id, name, preferences')
        .eq('id', String(rawId))
        .maybeSingle();

      if (error) throw error;
      target = data;
    }

    // 2) id로 못 찾으면 학번 + 이름으로 찾기
    if (!target && studentId) {
      const { data: rows, error } = await supabase
        .from('applicants')
        .select('id, name, preferences');

      if (error) throw error;

      target = (rows || []).find((row: any) => {
        const meta = readInterviewMeta(row.preferences);
        return (
          String(meta?.studentId || '') === studentId &&
          (!name || String(row.name || '') === name) &&
          !!meta?.slotId
        );
      });
    }

    if (!target) {
      return NextResponse.json(
        { error: '삭제할 면접 신청자를 찾지 못했습니다. 관리자 목록을 새로고침한 뒤 다시 시도해 주세요.' },
        { status: 404 }
      );
    }

    const oldPreferences =
      target.preferences &&
      typeof target.preferences === 'object' &&
      !Array.isArray(target.preferences)
        ? target.preferences
        : {};

    const { _interview, ...remainingPreferences } = oldPreferences;

    // applicants 행과 기존 지원 정보는 보존하고 면접 신청 정보만 삭제합니다.
    const { data: updated, error: updateError } = await supabase
      .from('applicants')
      .update({ preferences: remainingPreferences })
      .eq('id', String(target.id))
      .select('id, name, preferences')
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated) {
      return NextResponse.json(
        { error: '면접 신청 정보를 삭제하지 못했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: String(target.id),
      applicants: await getApplicants(),
    });
  } catch (error: any) {
    console.error('DELETE /api/applicants:', error);
    return NextResponse.json(
      { error: error.message || '신청 제거에 실패했습니다.' },
      { status: 500 }
    );
  }
}
