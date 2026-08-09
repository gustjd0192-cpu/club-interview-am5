'use client';

import React, { useState, useEffect } from 'react';

// 오후 8:00 ~ 11:00 (10분 간격 기본 슬롯 생성)
const generateInitialTimeSlots = () => {
  const slots: string[] = [];
  let hour = 20; // 20시 = 오후 8시
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
  // 9월 5일 옵션
  slots.forEach((time, idx) => {
    result.push({
      id: `sep5_${idx}`,
      date: '9월 5일 (금)',
      time: time,
      title: `9/5(금) ${time}`,
    });
  });
  // 9월 6일 옵션
  slots.forEach((time, idx) => {
    result.push({
      id: `sep6_${idx}`,
      date: '9월 6일 (토)',
      time: time,
      title: `9/6(토) ${time}`,
    });
  });

  return result;
};

const DEFAULT_OPTIONS = generateInitialTimeSlots();

export default function Page() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [isIdentified, setIsIdentified] = useState(false);
  const [selectedRanks, setSelectedRanks] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeDateTab, setActiveDateTab] = useState<'9월 5일 (금)' | '9월 6일 (토)'>('9월 5일 (금)');
  const [adminDateTab, setAdminDateTab] = useState<'9월 5일 (금)' | '9월 6일 (토)'>('9월 5일 (금)');
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  
  // 관리자 커스텀 가능한 옵션 목록 및 삭제된 옵션 관리
  const [options, setOptions] = useState<any[]>(DEFAULT_OPTIONS);

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path.includes('/gustjd') || hash === '#gustjd') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };

    checkRoute();
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);

    // 제출 데이터 불러오기
    const savedSubmissions = localStorage.getItem('gustjd_survey_data_v2');
    if (savedSubmissions) {
      try { setAllSubmissions(JSON.parse(savedSubmissions)); } catch (e) {}
    }

    // 어드민이 관리한 시간표 데이터 불러오기
    const savedOptions = localStorage.getItem('gustjd_survey_options_v2');
    if (savedOptions) {
      try { setOptions(JSON.parse(savedOptions)); } catch (e) {}
    }

    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  // 제출 데이터 저장
  const saveSubmissions = (updated: any[]) => {
    setAllSubmissions(updated);
    localStorage.setItem('gustjd_survey_data_v2', JSON.stringify(updated));
  };

  // 시간표 설정 저장
  const saveOptions = (updatedOptions: any[]) => {
    setOptions(updatedOptions);
    localStorage.setItem('gustjd_survey_options_v2', JSON.stringify(updatedOptions));
  };

  // 학생 조회
  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !name.trim()) {
      alert('학번과 이름을 모두 입력해 주세요.');
      return;
    }

    const existing = allSubmissions.find(
      sub => sub.studentId === studentId.trim() && sub.name === name.trim()
    );

    if (existing) {
      setSelectedRanks(existing.ranks || []);
      setIsSubmitted(true);
      setIsEditMode(false);
      setMessage({ type: 'info', text: '기존 제출 내역을 불러왔습니다. 수정하려면 하단 수정 버튼을 눌러주세요.' });
    } else {
      setSelectedRanks([]);
      setIsSubmitted(false);
      setIsEditMode(true);
      setMessage({ type: 'success', text: '새로운 신청서를 작성합니다. 원하시는 시간을 클릭하여 순위를 고르세요.' });
    }
    setIsIdentified(true);
  };

  // 희망 순위 클릭 토글
  const toggleOptionRank = (optionId: string) => {
    if (isSubmitted && !isEditMode) return;

    if (selectedRanks.includes(optionId)) {
      setSelectedRanks(selectedRanks.filter(id => id !== optionId));
    } else {
      if (selectedRanks.length >= 6) {
        alert('최대 6순위까지만 선택할 수 있습니다.');
        return;
      }
      setSelectedRanks([...selectedRanks, optionId]);
    }
  };

  // 학생 지망 제출/수정
  const handleSubmit = () => {
    if (selectedRanks.length === 0) {
      alert('최소 1개 이상의 순위를 선택해 주세요.');
      return;
    }

    const newRecord = {
      studentId: studentId.trim(),
      name: name.trim(),
      ranks: selectedRanks,
      updatedAt: new Date().toLocaleString('ko-KR')
    };

    const existingIndex = allSubmissions.findIndex(
      sub => sub.studentId === studentId.trim() && sub.name === name.trim()
    );

    let updatedList = [...allSubmissions];
    if (existingIndex >= 0) {
      updatedList[existingIndex] = newRecord;
    } else {
      updatedList.push(newRecord);
    }

    saveSubmissions(updatedList);
    setIsSubmitted(true);
    setIsEditMode(false);
    setMessage({ type: 'success', text: '지망 신청이 성공적으로 저장되었습니다!' });
  };

  // [어드민] CSV 엑셀 다운로드
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

  // [어드민] 학생 제출 기록 삭제
  const deleteSubmission = (sid: string, n: string) => {
    if (confirm(`${n} (${sid}) 학생의 제출 기록을 삭제하시겠습니까?`)) {
      const updated = allSubmissions.filter(s => !(s.studentId === sid && s.name === n));
      saveSubmissions(updated);
    }
  };

  // [어드민] 특정 시간표 슬롯 삭제
  const deleteTimeSlot = (optionId: string, timeTitle: string) => {
    if (confirm(`'${timeTitle}' 시간표를 삭제하시겠습니까?\n삭제 시 학생 화면 선택지에서 제외됩니다.`)) {
      const updated = options.filter(o => o.id !== optionId);
      saveOptions(updated);
    }
  };

  // [어드민] 시간표 전체 초기화
  const resetAllTimeSlots = () => {
    if (confirm('삭제된 모든 시간표를 초기 상태(오후 8시~11시전체)로 복구하시겠습니까?')) {
      saveOptions(DEFAULT_OPTIONS);
    }
  };

  const filteredOptions = options.filter(o => o.date === activeDateTab);
  const adminFilteredOptions = options.filter(o => o.date === adminDateTab);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 py-4 flex justify-between items-center">
          <div 
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => { window.location.hash = ''; setIsAdmin(false); }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/20">
              09
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-100 tracking-tight">일정 지망 신청 시스템</h1>
              <p className="text-xs text-slate-400">9월 5일 ~ 9월 6일 (오후 8:00 - 11:00)</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isAdmin) {
                window.location.hash = '';
                setIsAdmin(false);
              } else {
                window.location.hash = 'gustjd';
                setIsAdmin(true);
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
              isAdmin 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isAdmin ? '👤 학생 신청 화면' : '🔒 관리자 (/gustjd)'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-5 py-8">
        {isAdmin ? (
          /* ==================== 관리자 대시보드 ==================== */
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div>
                <span className="inline-block px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold rounded-md mb-2">
                  Admin Dashboard
                </span>
                <h2 className="text-xl font-bold text-white">어드민 관리 센터 (/gustjd)</h2>
                <p className="text-xs text-slate-400 mt-1">제출 현황 관리, CSV 다운로드 및 시간표 삭제/관리가 가능합니다.</p>
              </div>
              <button
                onClick={downloadCSV}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/20"
              >
                📊 엑셀(CSV) 다운로드
              </button>
            </div>

            {/* 어드민 기능 1: 시간표 삭제 및 관리 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">⚙️ 시간표 삭제 / 노출 관리</h3>
                  <p className="text-xs text-slate-400">특정 시간대를 클릭하여 삭제할 수 있습니다. (학생 화면에서 즉시 제외됨)</p>
                </div>
                <button
                  onClick={resetAllTimeSlots}
                  className="text-xs text-slate-400 hover:text-amber-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg transition"
                >
                  🔄 시간표 전체 복구
                </button>
              </div>

              {/* 어드민 날짜 탭 */}
              <div className="flex border-b border-slate-800 space-x-6">
                {(['9월 5일 (금)', '9월 6일 (토)'] as const).map(date => (
                  <button
                    key={date}
                    onClick={() => setAdminDateTab(date)}
                    className={`pb-2 text-xs font-bold transition border-b-2 ${
                      adminDateTab === date
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    📅 {date} (남은 슬롯: {options.filter(o => o.date === date).length}개)
                  </button>
                ))}
              </div>

              {/* 시간표 삭제 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {adminFilteredOptions.map(opt => (
                  <div
                    key={opt.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center"
                  >
                    <span className="text-xs font-bold text-slate-300">{opt.time}</span>
                    <button
                      onClick={() => deleteTimeSlot(opt.id, opt.title)}
                      className="text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 어드민 기능 2: 학생 제출 현황 테이블 및 삭제 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-6">
              <h3 className="text-sm font-bold text-slate-200">📋 학생 제출 현황 목록 ({allSubmissions.length}명)</h3>
              {allSubmissions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">제출된 데이터가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase">
                      <tr>
                        <th className="px-4 py-3">학번</th>
                        <th className="px-4 py-3">이름</th>
                        <th className="px-4 py-3">1순위</th>
                        <th className="px-4 py-3">2순위</th>
                        <th className="px-4 py-3">3순위</th>
                        <th className="px-4 py-3">4~6순위</th>
                        <th className="px-4 py-3">수정일시</th>
                        <th className="px-4 py-3 text-right">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {allSubmissions.map((sub, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="px-4 py-3.5 font-mono text-slate-200">{sub.studentId}</td>
                          <td className="px-4 py-3.5 font-semibold text-white">{sub.name}</td>
                          <td className="px-4 py-3.5 text-indigo-400 font-medium">
                            {DEFAULT_OPTIONS.find(o => o.id === sub.ranks[0])?.title || '-'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-300">
                            {DEFAULT_OPTIONS.find(o => o.id === sub.ranks[1])?.title || '-'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">
                            {DEFAULT_OPTIONS.find(o => o.id === sub.ranks[2])?.title || '-'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">
                            {sub.ranks.slice(3).map((id: string) => DEFAULT_OPTIONS.find(o => o.id === id)?.title).filter(Boolean).join(', ') || '-'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">{sub.updatedAt}</td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => deleteSubmission(sub.studentId, sub.name)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded text-[11px] transition"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ==================== 학생 신청 화면 ==================== */
          <div className="space-y-6">
            {message && (
              <div className={`p-4 rounded-xl text-xs border ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}>
                {message.text}
              </div>
            )}

            {/* Step 1: 학생 정보 입력 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center">
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center mr-2">1</span>
                인증 정보 입력
              </h2>
              <form onSubmit={handleIdentify} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">학번</label>
                  <input
                    type="text"
                    placeholder="예: 20241234"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    disabled={isIdentified && !isEditMode}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">이름</label>
                  <input
                    type="text"
                    placeholder="예: 홍길동"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isIdentified && !isEditMode}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20"
                  >
                    {isIdentified ? '재조회' : '확인'}
                  </button>
                </div>
              </form>
            </div>

            {/* Step 2: 시간대 선택 (학번 확인 후 노출) */}
            {isIdentified && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center">
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center mr-2">2</span>
                    희망 시간대 선택 (1~6순위)
                  </h2>
                  <p className="text-xs text-slate-400">
                    카드를 누르면 누른 순서대로 <strong className="text-indigo-400">1순위, 2순위...</strong> 자동 지정됩니다. (필수 6개 X)
                  </p>
                </div>

                {/* 현재 선택된 순위 내역 바 */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">내가 지망한 시간대</span>
                    {(!isSubmitted || isEditMode) && (
                      <button
                        onClick={() => setSelectedRanks([])}
                        className="text-[11px] text-slate-500 hover:text-red-400 transition"
                      >
                        선택 초기화
                      </button>
                    )}
                  </div>
                  {selectedRanks.length === 0 ? (
                    <p className="text-xs text-slate-600 italic">아래 시간표에서 희망하는 시간을 클릭해 주세요.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedRanks.map((id, idx) => {
                        const opt = DEFAULT_OPTIONS.find(o => o.id === id);
                        return (
                          <div
                            key={id}
                            onClick={() => toggleOptionRank(id)}
                            className="bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 cursor-pointer hover:bg-indigo-600/30 transition"
                          >
                            <span className="bg-indigo-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded">
                              {idx + 1}순위
                            </span>
                            <span>{opt?.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 날짜 탭 선택 */}
                <div className="flex border-b border-slate-800 space-x-6">
                  {(['9월 5일 (금)', '9월 6일 (토)'] as const).map(date => (
                    <button
                      key={date}
                      onClick={() => setActiveDateTab(date)}
                      className={`pb-3 text-xs font-bold transition border-b-2 ${
                        activeDateTab === date
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      📅 {date}
                    </button>
                  ))}
                </div>

                {/* 10분 간격 시간 그리드 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {filteredOptions.map(opt => {
                    const rankIdx = selectedRanks.indexOf(opt.id);
                    const isSelected = rankIdx !== -1;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => toggleOptionRank(opt.id)}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer select-none relative ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        } ${isSubmitted && !isEditMode ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 bg-indigo-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                            {rankIdx + 1}순위
                          </span>
                        )}
                        <div className="text-xs font-bold">{opt.time}</div>
                      </div>
                    );
                  })}
                </div>

                {/* 하단 완료 및 수정 버튼 */}
                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  {isSubmitted && !isEditMode ? (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-amber-600/20"
                    >
                      ✏️ 제출 내역 수정하기
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-8 py-3 rounded-xl transition shadow-lg shadow-indigo-600/20"
                    >
                      {isSubmitted ? '수정사항 저장' : '지망 신청 제출하기'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}