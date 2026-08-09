'use client';

import React, { useState, useEffect } from 'react';

// 관리자 비밀번호 설정
const ADMIN_PASSWORD = '1234';

// 기본 면접 시간표 데이터 (오후 8:00 ~ 11:00)
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
    result.push({ id: `sep5_${idx}`, date: '9월 5일 (금)', time, title: `9/5(금) ${time}` });
  });
  slots.forEach((time, idx) => {
    result.push({ id: `sep6_${idx}`, date: '9월 6일 (토)', time, title: `9/6(토) ${time}` });
  });

  return result;
};

const DEFAULT_OPTIONS = generateInitialTimeSlots();

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState('');

  const [adminDateTab, setAdminDateTab] = useState<'9월 5일 (금)' | '9월 6일 (토)'>('9월 5일 (금)');
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>(DEFAULT_OPTIONS);

  const [scheduleResult, setScheduleResult] = useState<{ slotId: string; student: any; rankUsed: number }[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<any[]>([]);

  useEffect(() => {
    // 저장된 데이터 불러오기
    const savedSubmissions = localStorage.getItem('gustjd_survey_data_v2');
    if (savedSubmissions) {
      try { setAllSubmissions(JSON.parse(savedSubmissions)); } catch (e) {}
    }

    const savedOptions = localStorage.getItem('gustjd_survey_options_v2');
    if (savedOptions) {
      try { setOptions(JSON.parse(savedOptions)); } catch (e) {}
    }
  }, []);

  const saveSubmissions = (updated: any[]) => {
    setAllSubmissions(updated);
    localStorage.setItem('gustjd_survey_data_v2', JSON.stringify(updated));
  };

  const saveOptions = (updatedOptions: any[]) => {
    setOptions(updatedOptions);
    localStorage.setItem('gustjd_survey_options_v2', JSON.stringify(updatedOptions));
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setInputPassword('');
    } else {
      alert('비밀번호가 올바르지 않습니다.');
      setInputPassword('');
    }
  };

  // 최적 면접 시간표 자동 배치 로직
  const generateOptimalSchedule = () => {
    if (allSubmissions.length === 0) {
      alert('배정할 지원자 데이터가 없습니다.');
      return;
    }

    const assignedSlots = new Map<string, { student: any; rankUsed: number }>();
    const unassigned: any[] = [];
    const studentsPool = [...allSubmissions];

    studentsPool.forEach((student) => {
      let assigned = false;

      if (student.ranks && Array.isArray(student.ranks)) {
        for (let r = 0; r < student.ranks.length; r++) {
          const preferredSlotId = student.ranks[r];
          const isValidOption = options.some(o => o.id === preferredSlotId);
          if (isValidOption && !assignedSlots.has(preferredSlotId)) {
            assignedSlots.set(preferredSlotId, { student, rankUsed: r + 1 });
            assigned = true;
            break;
          }
        }
      }

      if (!assigned) {
        unassigned.push(student);
      }
    });

    const resultList: any[] = [];
    assignedSlots.forEach((val, slotId) => {
      resultList.push({ slotId, student: val.student, rankUsed: val.rankUsed });
    });

    setScheduleResult(resultList);
    setUnassignedStudents(unassigned);
  };

  // CSV 다운로드
  const downloadCSV = () => {
    if (allSubmissions.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    let csvContent = "\uFEFF학번,이름,1순위,2순위,3순위,4순위,5순위,6순위,최종수정시간\n";
    allSubmissions.forEach(sub => {
      const rankTitles = [0, 1, 2, 3, 4, 5].map(idx => {
        const optId = sub.ranks[idx];
        const opt = DEFAULT_OPTIONS.find(o => o.id === optId);
        return opt ? `"${opt.title}"` : '""';
      });
      csvContent += `"${sub.studentId}","${sub.name}",${rankTitles.join(',')},"${sub.updatedAt}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `지망신청결과_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteSubmission = (sid: string, n: string) => {
    if (confirm(`${n} (${sid}) 학생의 기록을 삭제하시겠습니까?`)) {
      saveSubmissions(allSubmissions.filter(s => !(s.studentId === sid && s.name === n)));
    }
  };

  const deleteTimeSlot = (optionId: string, timeTitle: string) => {
    if (confirm(`'${timeTitle}' 시간표를 삭제하시겠습니까?`)) {
      saveOptions(options.filter(o => o.id !== optionId));
    }
  };

  const adminFilteredOptions = options.filter(o => o.date === adminDateTab);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* 헤더 */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/20">
              09
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-100 tracking-tight">면접 관리자 센터</h1>
              <p className="text-xs text-slate-400">지망 현황 관리 및 자동 일정 배정</p>
            </div>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              로그아웃
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {!isAuthenticated ? (
          /* ================= 1. 관리자 비밀번호 입력 폼 ================= */
          <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center space-y-6">
            <div>
              <span className="text-3xl">🔑</span>
              <h2 className="text-lg font-bold text-white mt-2">관리자 인증</h2>
              <p className="text-xs text-slate-400 mt-1">접속을 위해 관리자 비밀번호를 입력해 주세요.</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="password"
                placeholder="비밀번호 입력 (기본: 1234)"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white text-center focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/20"
              >
                확인
              </button>
            </form>
          </div>
        ) : (
          /* ================= 2. 관리자 대시보드 메인 ================= */
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div>
                <span className="inline-block px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold rounded-md mb-2">
                  Admin Center
                </span>
                <h2 className="text-xl font-bold text-white">면접 관리자 대시보드</h2>
                <p className="text-xs text-slate-400 mt-1">지망 분석을 통한 합리적 면접 시간표 자동 생성 기능을 제공합니다.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={generateOptimalSchedule}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20"
                >
                  ⚡ 최적 면접 시간표 자동 배치
                </button>
                <button
                  onClick={downloadCSV}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/20"
                >
                  📊 CSV 다운로드
                </button>
              </div>
            </div>

            {/* 자동 배정 결과 */}
            {scheduleResult.length > 0 && (
              <div className="bg-indigo-950/40 border border-indigo-500/30 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-indigo-300">🎯 자동 배정된 최종 면접 시간표</h3>
                    <p className="text-xs text-slate-400">학생들의 1~6순위를 최우선적으로 고려하여 중복 없이 배치한 결과입니다.</p>
                  </div>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold">
                    총 {scheduleResult.length}명 배치 완료
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scheduleResult.map((res, i) => {
                    const opt = DEFAULT_OPTIONS.find(o => o.id === res.slotId);
                    return (
                      <div key={i} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex justify-between items-center">
                        <div>
                          <div className="text-xs text-indigo-400 font-bold">{opt?.title}</div>
                          <div className="text-sm font-bold text-white mt-0.5">
                            {res.student.name} <span className="text-xs font-normal text-slate-400">({res.student.studentId})</span>
                          </div>
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-1 rounded">
                          {res.rankUsed}순위 반영
                        </span>
                      </div>
                    );
                  })}
                </div>

                {unassignedStudents.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-amber-400 mb-2">⚠️ 지망 시간대가 모두 차서 미배정된 학생 ({unassignedStudents.length}명)</h4>
                    <div className="flex flex-wrap gap-2">
                      {unassignedStudents.map((s, i) => (
                        <span key={i} className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-lg">
                          {s.name} ({s.studentId})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 타임슬롯 관리 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-200">⚙️ 면접 가능 타임슬롯 관리</h3>
                <button
                  onClick={() => saveOptions(DEFAULT_OPTIONS)}
                  className="text-xs text-slate-400 hover:text-amber-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg"
                >
                  🔄 슬롯 초기화
                </button>
              </div>

              <div className="flex border-b border-slate-800 space-x-6">
                {(['9월 5일 (금)', '9월 6일 (토)'] as const).map(date => (
                  <button
                    key={date}
                    onClick={() => setAdminDateTab(date)}
                    className={`pb-2 text-xs font-bold border-b-2 ${
                      adminDateTab === date ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'
                    }`}
                  >
                    📅 {date}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {adminFilteredOptions.map(opt => (
                  <div key={opt.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300">{opt.time}</span>
                    <button
                      onClick={() => deleteTimeSlot(opt.id, opt.title)}
                      className="text-[11px] text-red-400 hover:text-red-300 px-2 py-1 rounded"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 신청 현황 목록 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-200 mb-4">📋 전체 지망 제출 현황 ({allSubmissions.length}명)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase">
                    <tr>
                      <th className="px-4 py-3">학번</th>
                      <th className="px-4 py-3">이름</th>
                      <th className="px-4 py-3">1순위</th>
                      <th className="px-4 py-3">2순위</th>
                      <th className="px-4 py-3">3순위</th>
                      <th className="px-4 py-3 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {allSubmissions.map((sub, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-mono">{sub.studentId}</td>
                        <td className="px-4 py-3 font-semibold text-white">{sub.name}</td>
                        <td className="px-4 py-3 text-indigo-400">{DEFAULT_OPTIONS.find(o => o.id === sub.ranks[0])?.title || '-'}</td>
                        <td className="px-4 py-3">{DEFAULT_OPTIONS.find(o => o.id === sub.ranks[1])?.title || '-'}</td>
                        <td className="px-4 py-3 text-slate-400">{DEFAULT_OPTIONS.find(o => o.id === sub.ranks[2])?.title || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => deleteSubmission(sub.studentId, sub.name)} className="text-red-400 text-[11px]">삭제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}