'use client';

import { useState, useEffect, useCallback } from 'react';
import DateNavigator from './components/DateTabs';
import TeacherPost from './components/TeacherPost';
import MissionStatus from './components/MissionStatus';
import StudentFeed from './components/StudentFeed';
import FollowVerifier from './components/FollowVerifier';
import SubmissionForm from './components/SubmissionForm';

interface Submission {
  id: string;
  display_name: string;
  instagram_username: string;
  rep_count: number;
  photo_url?: string;
  created_at: string;
}

interface DailyPost {
  date: string;
  instagram_url: string;
  teacher_rep_count?: number;
}

function getLocalDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MissionPage() {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [post, setPost] = useState<DailyPost | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalReps, setTotalReps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifiedUsername, setVerifiedUsername] = useState<string | null>(null);
  const [showVerifyFlow, setShowVerifyFlow] = useState(false);
  const [missionTitle, setMissionTitle] = useState('SAT 미션');

  const fetchData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mission/today?date=${date}`);
      const json = await res.json();
      setPost(json.data.post);
      setSubmissions(json.data.submissions);
      setTotalReps(json.data.totalReps);
      if (json.data.missionTitle) setMissionTitle(json.data.missionTitle);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, fetchData]);

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    setVerifiedUsername(null);
    setShowVerifyFlow(false);
  }

  const isToday = selectedDate === getLocalDateString();
  const alreadySubmitted = verifiedUsername
    ? submissions.some((s) => s.instagram_username === verifiedUsername)
    : false;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 pt-24 pb-12">
        {/* 미션 현황 */}
        {!loading && (
          <MissionStatus totalReps={totalReps} goal={1600} title={`${missionTitle} · 1,600 Pull-ups`} />
        )}

        {/* 날짜 네비게이터 */}
        <DateNavigator selectedDate={selectedDate} onSelect={handleDateSelect} />

        {/* 인스타 피드 */}
        {post?.instagram_url && (
          <TeacherPost
            instagramUrl={post.instagram_url}
            date={post.date}
            repCount={post.teacher_rep_count}
          />
        )}

        {/* 학생 인증 포스팅 */}
        {!loading && (
          <StudentFeed submissions={submissions} />
        )}

        {/* 내 미션 인증하기 — 오늘만 노출 */}
        {isToday && !loading && (
          <div className="mt-2">
            {alreadySubmitted ? (
              <div className="text-center text-sm text-gray-500 py-4 bg-blue-50 rounded-2xl">
                You&apos;ve already submitted today!
              </div>
            ) : !showVerifyFlow ? (
              <button
                onClick={() => setShowVerifyFlow(true)}
                className="w-full py-4 bg-[#3182F6] hover:bg-[#1B6AE0] text-white text-base font-bold rounded-2xl active:scale-95 transition-colors shadow-md"
              >
                Log My Mission
              </button>
            ) : verifiedUsername ? (
              <SubmissionForm
                instagramUsername={verifiedUsername}
                onSubmitted={() => fetchData(selectedDate)}
              />
            ) : (
              <FollowVerifier onVerified={setVerifiedUsername} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
