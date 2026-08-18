'use client';

import { useState, useRef } from 'react';
import { QuestionStat } from '@/lib/diagnosis-analysis';

interface QuestionDetailModalProps {
  stat: QuestionStat;
  adminKey: string;
  versionId: string;
  onClose: () => void;
  onVersionCreated: (newVersionId: string) => void;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'text-green-400',
  Medium: 'text-yellow-400',
  Hard: 'text-red-400',
};

// SAT section → domain → skill taxonomy
const SAT_TAXONOMY: Record<string, Record<string, string[]>> = {
  'Reading and Writing': {
    'Craft and Structure': [
      'Words in Context',
      'Text Structure and Purpose',
      'Cross-Text Connections',
    ],
    'Information and Ideas': [
      'Central Ideas and Details',
      'Inferences',
      'Command of Evidence (Textual)',
      'Command of Evidence (Quantitative)',
    ],
    'Standard English Conventions': [
      'Boundaries',
      'Form, Structure, and Sense',
    ],
    'Expression of Ideas': [
      'Transitions',
      'Rhetorical Synthesis',
    ],
  },
  'Math': {
    'Algebra': [
      'Linear equations in one variable',
      'Linear equations in two variables',
      'Linear functions',
      'Systems of two linear equations in two variables',
      'Linear inequalities in one or two variables',
    ],
    'Advanced Math': [
      'Equivalent expressions',
      'Nonlinear equations in one variable',
      'Nonlinear functions',
      'Systems of equations',
    ],
    'Problem-Solving and Data Analysis': [
      'Ratios, rates, and proportional relationships',
      'Percentages',
      'One-variable data: distributions and measures',
      'Two-variable data',
      'Probability and conditional probability',
      'Inference from sample statistics',
      'Evaluating statistical claims',
    ],
    'Geometry and Trigonometry': [
      'Area and volume',
      'Lines, angles, and triangles',
      'Right triangles and trigonometry',
      'Circles',
    ],
  },
};

type Mode = 'view' | 'edit';

interface EditableOption {
  id: string;
  text: string;
  type: 'correct' | 'incorrect';
}

export function QuestionDetailModal({ stat, adminKey, versionId, onClose, onVersionCreated }: QuestionDetailModalProps) {
  const totalAnswers = Object.values(stat.answerDistribution).reduce((a, b) => a + b, 0);
  const [mode, setMode] = useState<Mode>('view');

  // Edit state
  const [editSection, setEditSection] = useState(stat.section);
  const [editDomain, setEditDomain] = useState(stat.domain);
  const [editSkill, setEditSkill] = useState(stat.skill);
  const [editDifficulty, setEditDifficulty] = useState(stat.difficulty);
  const [editPassage, setEditPassage] = useState(stat.passage ?? '');
  const [editQuestion, setEditQuestion] = useState(stat.question);
  const [editOptions, setEditOptions] = useState<EditableOption[]>(
    stat.options.length > 0
      ? stat.options.map((o) => ({
          id: o.id,
          text: o.text,
          type: o.id === stat.correctAnswer ? 'correct' : 'incorrect',
        }))
      : []
  );
  const [editCorrectAnswer, setEditCorrectAnswer] = useState(
    stat.options.length === 0 ? stat.correctAnswer : ''
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const passageRef = useRef<HTMLTextAreaElement>(null);

  // Derived domain/skill lists based on selected section/domain
  const domains = Object.keys(SAT_TAXONOMY[editSection] ?? {});
  const skills = SAT_TAXONOMY[editSection]?.[editDomain] ?? [];

  const handleSectionChange = (section: string) => {
    setEditSection(section);
    const firstDomain = Object.keys(SAT_TAXONOMY[section] ?? {})[0] ?? '';
    setEditDomain(firstDomain);
    const firstSkill = SAT_TAXONOMY[section]?.[firstDomain]?.[0] ?? '';
    setEditSkill(firstSkill);
  };

  const handleDomainChange = (domain: string) => {
    setEditDomain(domain);
    const firstSkill = SAT_TAXONOMY[editSection]?.[domain]?.[0] ?? '';
    setEditSkill(firstSkill);
  };

  const handleOptionChange = (idx: number, field: 'text' | 'type', value: string) => {
    setEditOptions((prev) =>
      prev.map((o, i) => {
        if (field === 'type' && value === 'correct') {
          return { ...o, type: i === idx ? 'correct' : 'incorrect' };
        }
        if (i === idx) return { ...o, [field]: value };
        return o;
      })
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '업로드 실패');
      }

      const { url } = await res.json();
      const imgTag = `<img src="${url}" alt="question image" style="max-width:100%;margin:8px 0;" />`;

      // Insert at cursor position in passage textarea, or append
      const textarea = passageRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? editPassage.length;
        const end = textarea.selectionEnd ?? editPassage.length;
        setEditPassage(editPassage.slice(0, start) + imgTag + editPassage.slice(end));
      } else {
        setEditPassage((prev) => prev + imgTag);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaveError('');
    setSaving(true);
    try {
      const editedQuestion = {
        id: stat.questionId,
        section: editSection,
        domain: editDomain,
        skill: editSkill,
        difficulty: editDifficulty,
        passage: editPassage || null,
        question: editQuestion,
        type: stat.options.length > 0 ? 'multiple-choice' : 'short-answer',
        options: stat.options.length > 0
          ? editOptions.map((o) => ({ id: o.id, text: o.text, type: o.type }))
          : undefined,
        answers: stat.options.length === 0 ? [editCorrectAnswer] : undefined,
      };

      const res = await fetch('/api/admin/diagnosis/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ baseVersionId: versionId, editedQuestion }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '버전 생성 실패');
      }

      const data = await res.json();
      onVersionCreated(data.version.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
                {stat.section}
              </span>
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                {stat.domain}
              </span>
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                {stat.skill}
              </span>
              <span className={`text-xs font-semibold ${DIFFICULTY_COLOR[stat.difficulty]}`}>
                {stat.difficulty}
              </span>
            </div>
            <h2 className="text-xl font-bold">문항 {stat.questionNumber}</h2>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {mode === 'view' && (
              <button
                onClick={() => setMode('edit')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition-colors"
              >
                편집
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {mode === 'view' ? (
          <>
            {/* Stats summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: '응시', value: `${stat.totalAttempts}명` },
                { label: '정답률', value: stat.totalAttempts > 0 ? `${(stat.accuracyRate * 100).toFixed(1)}%` : '-' },
                { label: '평균 자신감', value: stat.avgConfidence > 0 ? `${stat.avgConfidence.toFixed(1)} / 5` : '-' },
                {
                  label: '평균 시간',
                  value: stat.avgTimeSeconds > 0
                    ? `${Math.floor(stat.avgTimeSeconds / 60)}:${String(Math.round(stat.avgTimeSeconds % 60)).padStart(2, '0')}`
                    : '-',
                },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-700 rounded-lg p-3 text-center">
                  <div className="text-gray-400 text-xs mb-1">{label}</div>
                  <div className="font-semibold">{value}</div>
                </div>
              ))}
            </div>

            {stat.passage && (
              <div
                className="bg-gray-700/50 rounded-lg p-4 mb-4 text-sm text-gray-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: stat.passage }}
              />
            )}

            <p className="font-semibold mb-4">{stat.question}</p>

            {stat.options.length > 0 && (
              <div className="space-y-2">
                {stat.options.map((option) => {
                  const count = stat.answerDistribution[option.id] ?? 0;
                  const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0;
                  const isCorrect = option.id === stat.correctAnswer;
                  return (
                    <div key={option.id} className={`rounded-lg p-3 ${isCorrect ? 'bg-green-900/40 border border-green-700' : 'bg-gray-700'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">
                          <span className="font-bold mr-2">{option.id}.</span>
                          {option.text}
                          {isCorrect && <span className="ml-2 text-green-400 text-xs">✓ 정답</span>}
                        </span>
                        <span className="text-xs text-gray-400 ml-4 flex-shrink-0">
                          {count}명 ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${isCorrect ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {stat.options.length === 0 && stat.correctAnswer && (
              <div className="bg-green-900/40 border border-green-700 rounded-lg p-3">
                <span className="text-xs text-green-400">정답: </span>
                <span className="font-semibold">{stat.correctAnswer}</span>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-5">
            <div className="text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-4 py-3">
              저장 시 현재 버전을 기반으로 새 버전이 생성됩니다. 기존 버전은 유지됩니다.
            </div>

            {/* Section / Domain / Skill */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-400 uppercase tracking-wide">섹션</label>
                <select
                  value={editSection}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.keys(SAT_TAXONOMY).map((s) => (
                    <option key={s} value={s}>{s === 'Reading and Writing' ? 'Reading & Writing' : s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-400 uppercase tracking-wide">도메인</label>
                <select
                  value={editDomain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {domains.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-400 uppercase tracking-wide">스킬</label>
                <select
                  value={editSkill}
                  onChange={(e) => setEditSkill(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {skills.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-400 uppercase tracking-wide">난이도</label>
              <select
                value={editDifficulty}
                onChange={(e) => setEditDifficulty(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Passage + Image Upload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  지문 <span className="text-gray-500 font-normal normal-case">(선택, HTML 가능)</span>
                </label>
                <div className="flex items-center gap-2">
                  {uploadError && <span className="text-red-400 text-xs">{uploadError}</span>}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        이미지 첨부
                      </>
                    )}
                  </button>
                </div>
              </div>
              <textarea
                ref={passageRef}
                value={editPassage}
                onChange={(e) => setEditPassage(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder="지문 없음. 이미지 첨부 버튼으로 커서 위치에 <img> 태그 삽입 가능."
              />
              {/* Image preview if passage contains img tags */}
              {editPassage.includes('<img') && (
                <div className="mt-2 rounded-lg border border-gray-600 bg-gray-900/50 p-3">
                  <p className="text-xs text-gray-500 mb-2">미리보기</p>
                  <div
                    className="text-sm text-gray-200 leading-relaxed [&_img]:max-w-full [&_img]:rounded"
                    dangerouslySetInnerHTML={{ __html: editPassage }}
                  />
                </div>
              )}
            </div>

            {/* Question text */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-400 uppercase tracking-wide">문제</label>
              <textarea
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>

            {/* Multiple choice options */}
            {editOptions.length > 0 && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-400 uppercase tracking-wide">보기</label>
                <div className="space-y-2">
                  {editOptions.map((opt, idx) => (
                    <div key={opt.id} className="flex items-start gap-3">
                      <div className="flex items-center gap-2 flex-shrink-0 mt-2">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={opt.type === 'correct'}
                          onChange={() => handleOptionChange(idx, 'type', 'correct')}
                          className="accent-green-500"
                          title="정답으로 설정"
                        />
                        <span className="font-bold text-sm w-5">{opt.id}.</span>
                      </div>
                      <textarea
                        value={opt.text}
                        onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                        rows={2}
                        className={`flex-1 px-3 py-2 bg-gray-700 border rounded-lg text-sm text-white focus:outline-none focus:ring-2 resize-y ${
                          opt.type === 'correct'
                            ? 'border-green-600 focus:ring-green-500'
                            : 'border-gray-600 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">라디오 버튼으로 정답 선택</p>
              </div>
            )}

            {/* Short answer */}
            {editOptions.length === 0 && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-400 uppercase tracking-wide">정답</label>
                <input
                  type="text"
                  value={editCorrectAnswer}
                  onChange={(e) => setEditCorrectAnswer(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {saveError && <p className="text-red-400 text-sm">{saveError}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '저장 중...' : '새 버전으로 저장'}
              </button>
              <button
                onClick={() => { setMode('view'); setSaveError(''); setUploadError(''); }}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
