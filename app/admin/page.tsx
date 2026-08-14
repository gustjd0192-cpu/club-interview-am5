'use client';

import React, { useState, useEffect } from 'react';

const ADMIN_PASSWORD = '4791'; // 변경된 관리자 비밀번호
const MAX_CAPACITY = 3;

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

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [adminDateTab, setAdminDateTab] = useState<'9월 5일 (토)' | '9월 6일 (일)'>('9월 5일 (토)');
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = window.setInterval(loadSubmissions, 3000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated]);

  const loadSubmissions = async () => {
    try {
      const response = await fetch('/api/applicants', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '신청 내역을 불러오지 못했습니다.');
      setAllSubmissions(result.applicants || []);
    } catch (error) {
      console.error(error);
      alert('신청 내역을 불러오지 못했습니다.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setInputPassword('');
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  const removeApplicant = async (applicant: any) => {
    const studentId = String(applicant.studentId || '');
    const name = String(applicant.name || '');

    if (!confirm(`${name} (${studentId}) 님의 신청을 제거하시겠습니까?`)) return;

    try {
      const response = await fetch('/api/applicants', {
        method: 'DELETE',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || '신청 제거에 실패했습니다.');
        await loadSubmissions();
        return;
      }

      // 서버가 실제 DB 삭제 후 다시 조회한 목록만 화면에 반영
      setAllSubmissions(result.applicants || []);
    } catch (error) {
      console.error(error);
      alert('서버와 통신하는 중 오류가 발생했습니다.');
      await loadSubmissions();
    }
  };

  const downloadCSV = () => {
    if (allSubmissions.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    let csvContent = "\uFEFF학번,이름,신청시간,신청일시\n";
    allSubmissions.forEach(sub => {
      const opt = DEFAULT_OPTIONS.find(o => o.id === sub.slotId);
      const timeTitle = opt ? opt.title : '-';
      csvContent += `"${sub.studentId}","${sub.name}","${timeTitle}","${sub.updatedAt}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `면접신청현황_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOptions = DEFAULT_OPTIONS.filter(o => o.date === adminDateTab);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-lg">
              🔒
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900">면접 관리자 센터</h1>
              <p className="text-xs text-slate-500">시간대별 신청자 관리 및 개별 취소</p>
            </div>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-semibold"
            >
              로그아웃
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {!isAuthenticated ? (
          <div className="max-w-sm mx-auto my-12 bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-center space-y-4">
            <h2 className="text-base font-bold text-slate-900">관리자 인증</h2>
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <input
                type="password"
                placeholder="비밀번호 입력"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-slate-800"
              />
              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2.5 rounded-xl shadow-sm"
              >
                확인
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900">신청 현황 관리</h2>
                <p className="text-xs text-slate-500 mt-1">총 신청 인원: <span className="font-bold text-blue-600">{allSubmissions.length}명</span></p>
              </div>
              <button
                onClick={downloadCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
              >
                📊 CSV 다운로드
              </button>
            </div>

            <div className="flex border-b border-slate-200 space-x-6">
              {(['9월 5일 (토)', '9월 6일 (일)'] as const).map(date => (
                <button
                  key={date}
                  onClick={() => setAdminDateTab(date)}
                  className={`pb-3 text-xs font-bold border-b-2 transition ${
                    adminDateTab === date ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-400'
                  }`}
                >
                  📅 {date}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOptions.map(opt => {
                const applicants = allSubmissions.filter(s => s.slotId === opt.id);
                const isFull = applicants.length >= MAX_CAPACITY;

                return (
                  <div key={opt.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="font-bold text-xs text-slate-900">{opt.time}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        isFull ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {applicants.length} / {MAX_CAPACITY}명
                      </span>
                    </div>

                    <div className="space-y-1.5 min-h-[70px]">
                      {applicants.length === 0 ? (
                        <p className="text-[11px] text-slate-400 py-2 text-center">신청자 없음</p>
                      ) : (
                        applicants.map((app, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">
                            <span className="text-xs font-semibold text-slate-800">
                              {app.name} <span className="text-[10px] text-slate-400 font-normal">({app.studentId})</span>
                            </span>
                            <button
                              onClick={() => removeApplicant(app)}
                              className="text-rose-500 hover:text-rose-700 text-[11px] font-bold px-1.5 py-0.5 hover:bg-rose-50 rounded transition"
                            >
                              제거
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}