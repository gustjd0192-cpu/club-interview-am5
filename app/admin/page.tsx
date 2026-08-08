'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Applicant {
  id?: number;
  name: string;
  preferences: string[];
  created_at?: string;
}

interface ScheduleItem {
  time_slot: string;
  assigned_applicants: string[];
}

export default function AdminPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // DB에서 제출된 신청자 목록 불러오기
  const fetchApplicants = async () => {
    setLoadingApplicants(true);
    const { data, error } = await supabase
      .from('applicants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('신청자 목록 로드 오류:', error);
      alert('신청자 목록을 불러오는 중 오류가 발생했습니다.');
    } else {
      setApplicants(data || []);
    }
    setLoadingApplicants(false);
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  // Gemini 자동 배정 요청
  const handleRunAssignment = async () => {
    if (applicants.length === 0) {
      alert('제출된 지원자가 없습니다. 먼저 지원자가 제출한 후 실행해 주세요.');
      return;
    }

    setAssignLoading(true);
    try {
      const res = await fetch('/api/assign', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        alert(`오류 발생: ${data.error || '배정에 실패했습니다.'}`);
        setAssignLoading(false);
        return;
      }

      if (data.schedule) {
        setSchedule(data.schedule);
      }
    } catch (err) {
      console.error(err);
      alert('서버 응답을 처리하는 중 오류가 발생했습니다.');
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f7fafc',
      padding: '40px 20px',
      fontFamily: "'Noto Sans KR', sans-serif"
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px'
      }}>
        {/* 상단 헤더 및 배정 버튼 */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '28px 32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c', margin: 0 }}>
              면접 시간표 관리자 시스템
            </h1>
            <p style={{ fontSize: '14px', color: '#718096', margin: '4px 0 0 0' }}>
              지원자들의 제출 내역을 확인하고 Gemini AI로 최적 시간표를 자동 배정합니다.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={fetchApplicants}
              disabled={loadingApplicants}
              style={{
                backgroundColor: '#edf2f7',
                color: '#2d3748',
                padding: '12px 18px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '600',
                fontSize: '14px',
                cursor: loadingApplicants ? 'not-allowed' : 'pointer'
              }}
            >
              {loadingApplicants ? '새로고침 중...' : '🔄 목록 새로고침'}
            </button>
            <button
              onClick={handleRunAssignment}
              disabled={assignLoading}
              style={{
                backgroundColor: '#319795',
                color: '#ffffff',
                padding: '12px 22px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: assignLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(49, 151, 149, 0.3)'
              }}
            >
              {assignLoading ? 'Gemini 자동 배정 중...' : '⚡ Gemini 자동 배정 실행'}
            </button>
          </div>
        </div>

        {/* 1. 제출된 지원자 목록 섹션 */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '28px 32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2d3748', margin: 0 }}>
              📋 제출된 지원자 현황 ({applicants.length}명)
            </h2>
          </div>

          {applicants.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#edf2f7', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', width: '120px', borderRadius: '8px 0 0 8px' }}>이름</th>
                    <th style={{ padding: '12px 16px' }}>지망 순위 (1순위 ~ 6순위)</th>
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((app, index) => (
                    <tr key={app.id || index} style={{ borderBottom: '1px solid #edf2f7' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#2b6cb0' }}>
                        {app.name}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {app.preferences.map((pref, pIdx) => (
                            <span key={pIdx} style={{
                              backgroundColor: pIdx === 0 ? '#ebf8ff' : '#f7fafc',
                              color: pIdx === 0 ? '#2b6cb0' : '#4a5568',
                              border: pIdx === 0 ? '1px solid #bee3f8' : '1px solid #e2e8f0',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}>
                              <b>{pIdx + 1}순위:</b> {pref || '미선택'}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0' }}>
              아직 제출된 지원자 데이터가 없습니다.
            </div>
          )}
        </div>

        {/* 2. Gemini 배정 결과 섹션 */}
        {schedule.length > 0 && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '28px 32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2d3748', marginBottom: '20px' }}>
              🎯 AI 자동 배정 최종 결과표
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e6fffa' }}>
                    <th style={{ padding: '12px 16px', color: '#234e52', borderRadius: '8px 0 0 8px' }}>
                      면접 시간 슬롯
                    </th>
                    <th style={{ padding: '12px 16px', color: '#234e52', borderRadius: '0 8px 8px 0' }}>
                      배정된 지원자 (최대 3명)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#2d3748' }}>
                        {item.time_slot}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {item.assigned_applicants.length > 0 ? (
                          item.assigned_applicants.map((name, nIdx) => (
                            <span key={nIdx} style={{
                              display: 'inline-block',
                              backgroundColor: '#e6fffa',
                              color: '#234e52',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              marginRight: '6px',
                              fontWeight: '500'
                            }}>
                              {name}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#cbd5e0', fontSize: '13px' }}>배정 인원 없음</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}