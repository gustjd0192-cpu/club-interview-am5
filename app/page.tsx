'use client';

import React, { useState, useEffect } from 'react';

const MAX_CAPACITY = 3; // 각 슬롯당 선착순 3명

const generateInitialTimeSlots = () => {
  const slots: string[] = [];
  let hour = 20;
  let minute = 0;

  while (hour < 23 || (hour === 23 && minute === 0)) {
    const timeString = `오후 ${hour > 12 ? hour - 12 : hour}:${minute === 0 ? '00' : minute}`;
    slots.push(timeString);
    minute += 10;
    if (minute >= 60) {
      hour += 1;
      minute = 0;
    }
  }

  const result: any[] = [];
  slots.forEach((time, idx) => {
    result.push({ id: `sep5_${idx}`, date: '9월 5일 (토)', time, title: `9/5(토) ${time}` });
  });
  slots.forEach((time, idx) => {
    result.push({ id: `sep6_${idx}`, date: '9월 6일 (일)', time, title: `9/6(일) ${time}` });
  });

  return result;
};

const DEFAULT_OPTIONS = generateInitialTimeSlots();

export default function StudentPage() {
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [isIdentified, setIsIdentified] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [mySlotId, setMySlotId] = useState<string | null>(null);
  const [activeDateTab, setActiveDateTab] = useState<'9월 5일 (토)' | '9월 6일 (일)'>('9월 5일 (토)');
  const [message, setMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = () => {
    const saved = localStorage.getItem('gustjd_survey_data_v2');
    if (saved) {
      try {
        setAllSubmissions(JSON.parse(saved));
      } catch (e) {}
    }
  };

  const saveSubmissions = (updated: any[]) => {
    setAllSubmissions(updated);
    localStorage.setItem('gustjd_survey_data_v2', JSON.stringify(updated));
  };

  // 슬롯별 현재 신청인원 수 계산
  const getSlotApplicantCount = (slotId: string) => {
    return allSubmissions.filter(s => s.slotId === slotId).length;
  };

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !name.trim()) {
      alert('학번과 이름을 입력해 주세요.');
      return;
    }

    loadSubmissions();
    const existing = allSubmissions.find(
      sub => sub.studentId === studentId.trim() && sub.name === name.trim()
    );

    if (existing) {
      setMySlotId(existing.slotId);
      setSelectedSlotId(existing.slotId);
      setMessage({ type: 'info', text: '기존 신청 내역을 확인했습니다.' });
    } else {
      setMySlotId(null);
      setSelectedSlotId(null);
      setMessage({ type: 'success', text: '신청하실 시간대를 선택해 주세요.' });
    }
    setIsIdentified(true);
  };

  const handleSelectSlot = (slotId: string) => {
    const count = getSlotApplicantCount(slotId);
    
    if (slotId !== mySlotId && count >= MAX_CAPACITY) {
      alert('선착순 마감된 시간대입니다. 다른 시간대를 선택해 주세요.');
      return;
    }
    setSelectedSlotId(slotId);
  };

  const handleSubmit = () => {
    if (!selectedSlotId) {
      alert('면접 시간대를 선택해 주세요.');
      return;
    }

    const saved = localStorage.getItem('gustjd_survey_data_v2');
    const currentSubmissions = saved ? JSON.parse(saved) : [];
    
    const count = currentSubmissions.filter((s: any) => s.slotId === selectedSlotId && !(s.studentId === studentId.trim() && s.name === name.trim())).length;

    if (count >= MAX_CAPACITY) {
      alert('방금 해당 시간대가 선착순 마감되었습니다. 다른 시간대를 선택해 주세요.');
      loadSubmissions();
      return;
    }

    const newRecord = {
      studentId: studentId.trim(),
      name: name.trim(),
      slotId: selectedSlotId,
      updatedAt: new Date().toLocaleString('ko-KR')
    };

    const updatedList = currentSubmissions.filter(
      (sub: any) => !(sub.studentId === studentId.trim() && sub.name === name.trim())
    );
    updatedList.push(newRecord);

    saveSubmissions(updatedList);
    setMySlotId(selectedSlotId);
    setMessage({ type: 'success', text: '면접 시간 신청이 성공적으로 완료되었습니다!' });
  };

  const handleCancel = () => {
    if (!confirm('신청을 취소하시겠습니까?')) return;

    const updatedList = allSubmissions.filter(
      sub => !(sub.studentId === studentId.trim() && sub.name === name.trim())
    );
    saveSubmissions(updatedList);
    setMySlotId(null);
    setSelectedSlotId(null);
    setMessage({ type: 'info', text: '신청이 취소되었습니다.' });
  };

  const filteredOptions = DEFAULT_OPTIONS.filter(o => o.date === activeDateTab);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased">
      {/* 헤더 */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-blue-500/20">
            09
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight">동아리 면접 시간 신청 (선착순)</h1>
            <p className="text-xs text-slate-500">각 타임슬롯당 선착순 3명 제한 (9/5 토, 9/6 일)</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-6">
        {message && (
          <div className={`p-4 rounded-xl text-xs font-semibold border ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            message.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* 1. 본인 확인 */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">1. 본인 확인</h2>
          <form onSubmit={handleIdentify} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="학번 (예: 20241234)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="sm:col-span-2 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="이름 (예: 홍길동)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:col-span-2 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="sm:col-span-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-sm">
              확인
            </button>
          </form>
        </div>

        {/* 2. 시간대 선택 */}
        {isIdentified && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-1">2. 면접 시간 선택</h2>
              <p className="text-xs text-slate-500">원하시는 시간대를 선택해 주세요. (각 칸당 3명 선착순)</p>
            </div>

            {/* 날짜 탭 */}
            <div className="flex border-b border-slate-200 space-x-6">
              {(['9월 5일 (토)', '9월 6일 (일)'] as const).map(date => (
                <button
                  key={date}
                  onClick={() => setActiveDateTab(date)}
                  className={`pb-3 text-xs font-bold border-b-2 transition ${
                    activeDateTab === date ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  📅 {date}
                </button>
              ))}
            </div>

            {/* 타임 슬롯 Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredOptions.map(opt => {
                const currentCount = getSlotApplicantCount(opt.id);
                const isFull = currentCount >= MAX_CAPACITY;
                const isSelected = selectedSlotId === opt.id;
                const isMyCurrent = mySlotId === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectSlot(opt.id)}
                    className={`p-3.5 rounded-xl border text-center transition cursor-pointer relative ${
                      isMyCurrent
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500'
                        : isSelected
                        ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-600'
                        : isFull
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.time}</div>
                    
                    <div className="mt-2 text-[11px]">
                      {isFull ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-600 font-bold">마감 (3/3)</span>
                      ) : (
                        <span className={`font-semibold ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                          {currentCount} / {MAX_CAPACITY}석
                        </span>
                      )}
                    </div>

                    {isMyCurrent && (
                      <span className="absolute -top-2 -right-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
                        내 신청
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 하단 신청/취소 버튼 */}
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              {mySlotId && (
                <button
                  onClick={handleCancel}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold px-5 py-2.5 rounded-xl transition"
                >
                  신청 취소
                </button>
              )}
              <button
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-7 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20"
              >
                {mySlotId ? '시간 변경하기' : '선택 완료'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}