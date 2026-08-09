'use client';

import React, { useState, useEffect } from 'react';

// 9월 5일, 9월 6일 보기 옵션
const OPTIONS = [
  { id: 'opt1', date: '9월 5일 (금)', title: '9/5(금) 오전 조', time: '09:00 ~ 13:00', desc: '오전 시간대 활동' },
  { id: 'opt2', date: '9월 5일 (금)', title: '9/5(금) 오후 조', time: '13:00 ~ 17:00', desc: '오후 시간대 활동' },
  { id: 'opt3', date: '9월 5일 (금)', title: '9/5(금) 야간 조', time: '17:00 ~ 21:00', desc: '저녁/야간 시간대 활동' },
  { id: 'opt4', date: '9월 6일 (토)', title: '9/6(토) 오전 조', time: '09:00 ~ 13:00', desc: '주말 오전 시간대 활동' },
  { id: 'opt5', date: '9월 6일 (토)', title: '9/6(토) 오후 조', time: '13:00 ~ 17:00', desc: '주말 오후 시간대 활동' },
  { id: 'opt6', date: '9월 6일 (토)', title: '9/6(토) 야간 조', time: '17:00 ~ 21:00', desc: '주말 야간 시간대 활동' },
];

export default function Page() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [isIdentified, setIsIdentified] = useState(false);
  const [selectedRanks, setSelectedRanks] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

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

    const saved = localStorage.getItem('gustjd_survey_data');
    if (saved) {
      try { setAllSubmissions(JSON.parse(saved)); } catch(e) {}
    }

    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  const saveToStorage = (updated: any[]) => {
    setAllSubmissions(updated);
    localStorage.setItem('gustjd_survey_data', JSON.stringify(updated));
  };

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !name.trim()) {
      alert('학번과 이름을 모두 입력해주세요.');
      return;
    }

    const existing = allSubmissions.find(
      sub => sub.studentId === studentId.trim() && sub.name === name.trim()
    );

    if (existing) {
      setSelectedRanks(existing.ranks || []);
      setIsSubmitted(true);
      setIsEditMode(false);
      setMessage({ type: 'info', text: '기존 제출 내역을 불러왔습니다. 하단 수정 버튼을 눌러 변경하실 수 있습니다.' });
    } else {
      setSelectedRanks([]);
      setIsSubmitted(false);
      setIsEditMode(true);
      setMessage({ type: 'success', text: '새로운 신청서를 작성합니다. 원하시는 순서대로 보기를 선택해주세요.' });
    }
    setIsIdentified(true);
  };

  const toggleOptionRank = (optionId: string) => {
    if (isSubmitted && !isEditMode) return;

    if (selectedRanks.includes(optionId)) {
      setSelectedRanks(selectedRanks.filter(id => id !== optionId));
    } else {
      if (selectedRanks.length >= 6) {
        alert('최대 6순위까지만 선택하실 수 있습니다.');
        return;
      }
      setSelectedRanks([...selectedRanks, optionId]);
    }
  };

  const handleSubmit = () => {
    if (selectedRanks.length === 0) {
      alert('최소 1개 이상의 순위를 선택해주세요.');
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

    saveToStorage(updatedList);
    setIsSubmitted(true);
    setIsEditMode(false);
    setMessage({ type: 'success', text: '지망 신청이 성공적으로 제출(저장)되었습니다!' });
  };

  const downloadCSV = () => {
    if (allSubmissions.length === 0) {
      alert('다운로드할 제출 데이터가 없습니다.');
      return;
    }

    let csvContent = "\uFEFF학번,이름,1순위,2순위,3순위,4순위,5순위,6순위,최종제출시간\n";
    allSubmissions.forEach(sub => {
      const rankTitles = [0, 1, 2, 3, 4, 5].map(idx => {
        const optId = sub.ranks[idx];
        const opt = OPTIONS.find(o => o.id === optId);
        return opt ? `"${opt.title}"` : '""';
      });
      csvContent += `"${sub.studentId}","${sub.name}",${rankTitles.join(',')},"${sub.updatedAt}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `지망신청결과_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
        <h2>9월 5일 ~ 9월 6일 지망 신청</h2>
        <button onClick={() => { window.location.hash = isAdmin ? '' : 'gustjd'; setIsAdmin(!isAdmin); }}>
          {isAdmin ? '👤 학생 화면' : '🔒 관리자 모드 (/gustjd)'}
        </button>
      </header>

      {isAdmin ? (
        <div>
          <h3>관리자 대시보드 (/gustjd)</h3>
          <button onClick={downloadCSV} style={{ marginBottom: '15px' }}>📊 엑셀(CSV) 다운로드</button>
          <table border={1} cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>학번</th><th>이름</th><th>1순위</th><th>2순위</th><th>3순위</th><th>최종 수정일시</th>
              </tr>
            </thead>
            <tbody>
              {allSubmissions.map((sub, i) => (
                <tr key={i}>
                  <td>{sub.studentId}</td>
                  <td>{sub.name}</td>
                  <td>{OPTIONS.find(o => o.id === sub.ranks[0])?.title || '-'}</td>
                  <td>{OPTIONS.find(o => o.id === sub.ranks[1])?.title || '-'}</td>
                  <td>{OPTIONS.find(o => o.id === sub.ranks[2])?.title || '-'}</td>
                  <td>{sub.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          {message && <div style={{ background: '#eef', padding: '10px', marginBottom: '15px' }}>{message.text}</div>}
          
          <form onSubmit={handleIdentify} style={{ marginBottom: '20px' }}>
            <input placeholder="학번" value={studentId} onChange={e => setStudentId(e.target.value)} disabled={isIdentified && !isEditMode} style={{ marginRight: '8px' }} />
            <input placeholder="이름" value={name} onChange={e => setName(e.target.value)} disabled={isIdentified && !isEditMode} style={{ marginRight: '8px' }} />
            <button type="submit">{isIdentified ? '조회/재설정' : '확인'}</button>
          </form>

          {isIdentified && (
            <div>
              <p><b>선택한 순위:</b> {selectedRanks.map((id, idx) => `${idx + 1}순위: ${OPTIONS.find(o => o.id === id)?.title}`).join(', ') || '없음'}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '15px 0' }}>
                {OPTIONS.map(opt => {
                  const rankIdx = selectedRanks.indexOf(opt.id);
                  return (
                    <div 
                      key={opt.id} 
                      onClick={() => toggleOptionRank(opt.id)}
                      style={{ border: rankIdx !== -1 ? '2px solid #4f46e5' : '1px solid #ccc', padding: '10px', cursor: 'pointer', borderRadius: '8px' }}
                    >
                      {rankIdx !== -1 && <b>[⭐ {rankIdx + 1}순위] </b>}
                      <span>{opt.title} ({opt.time})</span>
                    </div>
                  );
                })}
              </div>

              {isSubmitted && !isEditMode ? (
                <button onClick={() => setIsEditMode(true)}>✏️ 수정하기</button>
              ) : (
                <button onClick={handleSubmit} style={{ background: '#4f46e5', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '5px' }}>
                  {isSubmitted ? '수정사항 저장' : '지망 제출하기'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}