'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 9월 5일, 9월 6일 오후 8시 ~ 11시 (10분 단위 슬롯 생성)
const generateTimeSlots = (dateStr: string) => {
  const slots: string[] = [];
  for (let hour = 20; hour < 23; hour++) {
    for (let min = 0; min < 60; min += 10) {
      const startHour = String(hour).padStart(2, '0');
      const startMin = String(min).padStart(2, '0');
      
      let endHour = hour;
      let endMin = min + 10;
      if (endMin === 60) {
        endMin = 0;
        endHour += 1;
      }
      const endHourStr = String(endHour).padStart(2, '0');
      const endMinStr = String(endMin).padStart(2, '0');
      
      slots.push(`${dateStr} ${startHour}:${startMin}~${endHourStr}:${endMinStr}`);
    }
  }
  return slots;
};

const SEP_5_SLOTS = generateTimeSlots('9월 5일(금)');
const SEP_6_SLOTS = generateTimeSlots('9월 6일(토)');
const ALL_TIME_SLOTS = [...SEP_5_SLOTS, ...SEP_6_SLOTS];

export default function ApplicantPage() {
  const [name, setName] = useState('');
  const [prefs, setPrefs] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePrefChange = (index: number, value: string) => {
    const newPrefs = [...prefs];
    newPrefs[index] = value;
    setPrefs(newPrefs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('이름을 입력해주세요.');
    if (prefs.some((p) => !p)) return setError('1순위부터 6순위까지 모두 선택해주세요.');

    setLoading(true);
    const { error: dbError } = await supabase.from('applicants').insert([
      { name: name.trim(), preferences: prefs }
    ]);
    setLoading(false);

    if (dbError) {
      if (dbError.code === '23505') {
        setError('이미 등록된 이름입니다. 이름 뒤에 구분 단어를 붙여주세요. (예: 홍길동B)');
      } else {
        setError('제출 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: "'Noto Sans KR', sans-serif"
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          textAlign: 'center',
          maxWidth: '400px',
          width: '90%'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ color: '#333', marginBottom: '12px' }}>신청 완료!</h2>
          <p style={{ color: '#666', lineHeight: '1.6' }}>
            면접 시간 신청이 정상적으로 제출되었습니다.<br />결과는 차후 공지될 예정입니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '40px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: "'Noto Sans KR', sans-serif"
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '36px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#2d3748',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          동아리 면접 시간 신청
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#718096',
          marginBottom: '28px',
          textAlign: 'center'
        }}>
          원하시는 면접 시간대를 1순위부터 6순위까지 선택해 주세요.
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fff5f5',
            color: '#e53e3e',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            borderLeft: '4px solid #e53e3e'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              color: '#4a5568',
              marginBottom: '8px',
              fontSize: '15px'
            }}>
              지원자 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요 (예: 홍길동)"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{
            borderTop: '1px solid #edf2f7',
            paddingTop: '20px',
            marginBottom: '24px'
          }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              color: '#4a5568',
              marginBottom: '16px',
              fontSize: '15px'
            }}>
              희망 시간대 (1~6순위)
            </label>

            {prefs.map((selectedVal, idx) => {
              // 현재 순위 이외의 다른 순위에서 선택된 값들을 필터링하여 중복 선택 차단
              const otherSelectedValues = prefs.filter((_, pIdx) => pIdx !== idx);
              const availableSlots = ALL_TIME_SLOTS.filter(
                (slot) => !otherSelectedValues.includes(slot)
              );

              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <span style={{
                    width: '65px',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#4a5568'
                  }}>
                    {idx + 1}순위:
                  </span>
                  <select
                    value={selectedVal}
                    onChange={(e) => handlePrefChange(idx, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #e2e8f0',
                      fontSize: '14px',
                      color: selectedVal ? '#2d3748' : '#a0aec0',
                      backgroundColor: '#fff',
                      outline: 'none'
                    }}
                  >
                    <option value="">시간대를 선택하세요</option>
                    <optgroup label="📅 9월 5일(금) 오후 8:00 ~ 11:00">
                      {SEP_5_SLOTS.map((slot) => (
                        <option
                          key={slot}
                          value={slot}
                          disabled={!availableSlots.includes(slot)}
                        >
                          {slot.replace('9월 5일(금) ', '')}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📅 9월 6일(토) 오후 8:00 ~ 11:00">
                      {SEP_6_SLOTS.map((slot) => (
                        <option
                          key={slot}
                          value={slot}
                          disabled={!availableSlots.includes(slot)}
                        >
                          {slot.replace('9월 6일(토) ', '')}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: '#4c51bf',
              color: '#ffffff',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(76, 81, 191, 0.3)'
            }}
          >
            {loading ? '제출 중...' : '제출하기'}
          </button>
        </form>
      </div>
    </div>
  );
}