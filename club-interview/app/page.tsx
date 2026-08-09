'use client';

import React, { useState, useEffect } from 'react';

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

export default function StudentPage() {
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [isIdentified, setIsIdentified] = useState(false);
  const [selectedRanks, setSelectedRanks] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeDateTab, setActiveDateTab] = useState<'9월 5일 (금)' | '9월 6일 (토)'>('9월 5일 (금)');
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>(DEFAULT_OPTIONS);

  useEffect(() => {
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
      setMessage({ type: 'info', text: '기존 제출 내역을 불러왔습니다.' });
    } else {
      setSelectedRanks([]);
      setIsSubmitted(false);
      setIsEditMode(true);
      setMessage({ type: 'success', text: '새로운 신청서를 작성합니다.' });
    }
    setIsIdentified(true);
  };

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

  const filteredOptions = options.filter(o => o.date === activeDateTab);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/20">
              09
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-100 tracking-tight">면접 일정 지망 신청 System</h1>
              <p className="text-xs text-slate-400">9월 5일 ~ 9월 6일 (오후 8:00 - 11:00)</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        {message && (
          <div className="p-4 rounded-xl text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {message.text}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <h2 className="text-sm font-bold text-slate-200 mb-4">1. 본인 확인 (학번 및 이름 입력)</h2>
          <form onSubmit={handleIdentify} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="학번 (예: 20241234)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={isIdentified && !isEditMode}
              className="sm:col-span-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="이름 (예: 홍길동)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isIdentified && !isEditMode}
              className="sm:col-span-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
            <button type="submit" className="sm:col-span-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition">
              {isIdentified ? '재조회' : '확인'}
            </button>
          </form>
        </div>

        {isIdentified && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-200 mb-1">2. 희망 시간대 선택 (1~6순위)</h2>
              <p className="text-xs text-slate-400">원하시는 시간대를 클릭한 순서대로 1순위, 2순위... 자동 지정됩니다.</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold text-slate-400">내가 선택한 지망 순위</span>
                {(!isSubmitted || isEditMode) && (
                  <button onClick={() => setSelectedRanks([])} className="text-[11px] text-slate-500 hover:text-red-400">전체 초기화</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedRanks.length === 0 && <span className="text-xs text-slate-600">선택된 시간대가 없습니다.</span>}
                {selectedRanks.map((id, idx) => {
                  const opt = DEFAULT_OPTIONS.find(o => o.id === id);
                  return (
                    <div key={id} onClick={() => toggleOptionRank(id)} className="bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-2 cursor-pointer">
                      <span className="bg-indigo-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded">{idx + 1}순위</span>
                      <span>{opt?.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex border-b border-slate-800 space-x-6">
              {(['9월 5일 (금)', '9월 6일 (토)'] as const).map(date => (
                <button
                  key={date}
                  onClick={() => setActiveDateTab(date)}
                  className={`pb-3 text-xs font-bold border-b-2 ${activeDateTab === date ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}
                >
                  📅 {date}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {filteredOptions.map(opt => {
                const rankIdx = selectedRanks.indexOf(opt.id);
                const isSelected = rankIdx !== -1;
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleOptionRank(opt.id)}
                    className={`p-3.5 rounded-xl border text-center cursor-pointer relative transition ${
                      isSelected ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
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

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              {isSubmitted && !isEditMode ? (
                <button onClick={() => setIsEditMode(true)} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-6 py-3 rounded-xl transition">
                  ✏️ 지망 수정하기
                </button>
              ) : (
                <button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-8 py-3 rounded-xl transition shadow-lg shadow-indigo-600/20">
                  지망 제출하기
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}