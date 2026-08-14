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
    result.push({ id: `sep5_${idx}`, date: '9월 5일 (토)', time, title: '9월 5일 (토) ' + time });
  });
  slots.forEach((time, idx) => {
    result.push({ id: `sep6_${idx}`, date: '9월 6일 (일)', time, title: '9월 6일 (일) ' + time });
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
  
  // 신청 완료 상태 관리
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [confirmedSlotTitle, setConfirmedSlotTitle] = useState('');

  useEffect(() => {
    loadSubmissions();
    const interval = window.setInterval(loadSubmissions, 3000);
    return () => window.clearInterval(interval);
  }, []);

  const loadSubmissions = async () => {
    try {
      const response = await fetch('/api/applicants', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '신청 내역을 불러오지 못했습니다.');
      setAllSubmissions(result.applicants || []);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: '신청 현황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  };

  const getSlotApplicantCount = (slotId: string) => {
    return allSubmissions.filter(s => s.slotId === slotId).length;
  };

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !name.trim()) {
      alert('학번과 이름을 입력해 주세요.');
      return;
    }

    try {
      const response = await fetch('/api/applicants', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '신청 내역을 불러오지 못했습니다.');

      const submissions = result.applicants || [];
      setAllSubmissions(submissions);

      const existing = submissions.find(
        (sub: any) => sub.studentId === studentId.trim() && sub.name === name.trim()
      );

      if (existing) {
        setIsIdentified(true);
        setMySlotId(existing.slotId);
        setSelectedSlotId(existing.slotId);
        const slotObj = DEFAULT_OPTIONS.find(o => o.id === existing.slotId);
        if (slotObj) {
          setConfirmedSlotTitle(slotObj.title);
          setIsSubmittedSuccess(true);
        }
      } else {
        setMySlotId(null);
        setSelectedSlotId(null);
        setMessage({ type: 'success', text: '신청하실 시간대를 선택해 주세요.' });
        setIsIdentified(true);
      }
    } catch (error) {
      console.error(error);
      alert('신청 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleSelectSlot = (slotId: string) => {
    const count = getSlotApplicantCount(slotId);
    
    if (slotId !== mySlotId && count >= MAX_CAPACITY) {
      alert('선착순 마감된 시간대입니다. 다른 시간대를 선택해 주세요.');
      return;
    }
    setSelectedSlotId(slotId);
  };

  const handleSubmit = async () => {
    if (!selectedSlotId) {
      alert('면접 시간대를 선택해 주세요.');
      return;
    }

    try {
      const response = await fetch('/api/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId.trim(),
          name: name.trim(),
          slotId: selectedSlotId,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        alert(result.error || '신청 저장에 실패했습니다.');
        await loadSubmissions();
        return;
      }

      const slotObj = DEFAULT_OPTIONS.find(o => o.id === selectedSlotId);
      setMySlotId(selectedSlotId);
      setConfirmedSlotTitle(slotObj ? slotObj.title : '');
      setAllSubmissions(result.applicants || []);
      setIsSubmittedSuccess(true);
      setMessage(null);
    } catch (error) {
      console.error(error);
      alert('서버와 통신하는 중 오류가 발생했습니다.');
    }
  };

  const handleCancel = async () => {
    if (!confirm('신청을 취소하시겠습니까?')) return;

    try {
      const response = await fetch('/api/applicants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId.trim(), name: name.trim() }),
      });
      const result = await response.json();

      if (!response.ok) {
        alert(result.error || '신청 취소에 실패했습니다.');
        return;
      }

      setAllSubmissions(result.applicants || []);
      setMySlotId(null);
      setSelectedSlotId(null);
      setIsSubmittedSuccess(false);
      setIsIdentified(true);
      setMessage({ type: 'info', text: '신청이 취소되었습니다. 다시 선택해 주세요.' });
    } catch (error) {
      console.error(error);
      alert('서버와 통신하는 중 오류가 발생했습니다.');
    }
  };

  const filteredOptions = DEFAULT_OPTIONS.filter(o => o.date === activeDateTab);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-blue-500/20">
            09
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight">동아리 면접 시간 신청</h1>
            <p className="text-xs text-slate-500">선착순 면접 시간 예약</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-8">
        {/* 신청 완료 화면 */}
        {isSubmittedSuccess ? (
          <div className="max-w-md mx-auto my-8 bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl">
              🎉
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">신청이 완료되었습니다!</h2>
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{name}</span> ({studentId}) 지원자님
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 my-4">
              <span className="text-xs text-slate-400 block mb-1">선택하신 면접 시간</span>
              <span className="text-base font-bold text-blue-600">{confirmedSlotTitle}</span>
            </div>

            <p className="text-sm font-semibold text-slate-700">
              좋은 결과 있길 바랍니다! ✨
            </p>

            <div className="pt-4 border-t border-slate-100 flex justify-center gap-3">
              <button
                onClick={() => setIsSubmittedSuccess(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
              >
                시간 변경하기
              </button>
              <button
                onClick={handleCancel}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
              >
                신청 취소
              </button>
            </div>
          </div>
        ) : (
          /* 기존 신청 폼 화면 */
          <div className="space-y-6">
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

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    onClick={handleSubmit}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-7 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20"
                  >
                    신청 완료
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}