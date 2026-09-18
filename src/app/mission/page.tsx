'use client';

import { useState, useEffect, useCallback } from 'react';
import TeacherPost from './components/TeacherPost';
import FollowVerifier from './components/FollowVerifier';
import SubmissionForm from './components/SubmissionForm';
import SubmissionFeed from './components/SubmissionFeed';

interface Submission {
  id: string;
  display_name: string;
  instagram_username: string;
  rep_count: number;
  photo_url?: string;
  created_at: string;
}

interface DailyPost {
  instagram_url: string;
}

export default function MissionPage() {
  const [post, setPost] = useState<DailyPost | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalReps, setTotalReps] = useState(0);
  const [verifiedUsername, setVerifiedUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/mission/today');
      const json = await res.json();
      setPost(json.data.post);
      setSubmissions(json.data.submissions);
      setTotalReps(json.data.totalReps);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const alreadySubmitted = verifiedUsername
    ? submissions.some((s) => s.instagram_username === verifiedUsername)
    : false;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-gray-900 mb-1">턱걸이 1600 챌린지</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
        </div>

        {/* 선생님 인증 임베드 */}
        {post?.instagram_url && <TeacherPost instagramUrl={post.instagram_url} />}

        {/* 진행률 + 학생 피드 */}
        {!loading && (
          <SubmissionFeed submissions={submissions} totalReps={totalReps} goal={1600} />
        )}

        {/* 인증 제출 섹션 */}
        <div className="mt-8 border-t pt-8">
          {alreadySubmitted ? (
            <div className="text-center text-sm text-gray-500 py-4">
              오늘 인증을 이미 제출했어요!
            </div>
          ) : verifiedUsername ? (
            <SubmissionForm
              instagramUsername={verifiedUsername}
              onSubmitted={fetchData}
            />
          ) : (
            <FollowVerifier onVerified={setVerifiedUsername} />
          )}
        </div>
      </div>
    </div>
  );
}
