import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MAX_CAPACITY = 3;

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getApplicants() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('interview_applications')
    .select('id, student_id, name, slot_id, updated_at')
    .order('slot_id', { ascending: true })
    .order('updated_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    slotId: row.slot_id,
    updatedAt: row.updated_at,
  }));
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

    const { data: existing, error: existingError } = await supabase
      .from('interview_applications')
      .select('id, student_id, name, slot_id')
      .eq('student_id', studentId)
      .eq('name', name)
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    let countQuery = supabase
      .from('interview_applications')
      .select('id', { count: 'exact', head: true })
      .eq('slot_id', slotId);

    if (existing?.id) {
      countQuery = countQuery.neq('id', existing.id);
    }

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    if ((count || 0) >= MAX_CAPACITY) {
      return NextResponse.json(
        { error: '선착순 마감된 시간대입니다. 다른 시간대를 선택해 주세요.' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    if (existing?.id) {
      const { error } = await supabase
        .from('interview_applications')
        .update({ slot_id: slotId, updated_at: now })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('interview_applications')
        .insert({
          student_id: studentId,
          name,
          slot_id: slotId,
          updated_at: now,
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
    // 관리자 화면에서 id가 전달되더라도, 현재 DB의 id 형식과 다르면
    // 학번 + 이름을 안전한 대체 키로 사용합니다.
    const rawId = body.id;
    const parsedId =
      rawId !== undefined && rawId !== null && String(rawId).trim() !== ''
        ? Number(rawId)
        : null;

    const studentId = String(body.studentId || '').trim();
    const name = String(body.name || '').trim();

    if ((parsedId === null || !Number.isFinite(parsedId)) && (!studentId || !name)) {
      return NextResponse.json(
        { error: '삭제할 신청자의 정보가 없습니다.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    let query = supabase
      .from('interview_applications')
      .delete();

    // 숫자형 DB id가 확실한 경우에만 id를 사용합니다.
    // 그렇지 않으면 관리자 화면에 표시된 학번 + 이름으로 삭제합니다.
    if (parsedId !== null && Number.isFinite(parsedId)) {
      query = query.eq('id', parsedId);
    } else {
      query = query.eq('student_id', studentId).eq('name', name);
    }

    const { data: deletedRows, error } = await query.select('id');

    if (error) throw error;

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json(
        { error: '삭제할 신청자를 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: deletedRows.length,
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
