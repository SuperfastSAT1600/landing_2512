'use client';

import { useState, useRef } from 'react';

interface Props {
  instagramUsername: string;
  onSubmitted: () => void;
}

export default function SubmissionForm({ instagramUsername, onSubmitted }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;

    setStatus('uploading');
    setErrorMsg('');

    let photoUrl: string | undefined;

    if (file) {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/mission/upload', { method: 'POST', body: form });
      const uploadJson = await uploadRes.json();

      if (!uploadRes.ok) {
        setStatus('error');
        setErrorMsg(uploadJson.error?.message ?? 'Upload error');
        return;
      }
      photoUrl = uploadJson.data.url;
    }

    setStatus('submitting');

    const res = await fetch('/api/mission/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instagram_username: instagramUsername,
        display_name: displayName.trim(),
        photo_url: photoUrl,
        rep_count: 1,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setStatus('error');
      setErrorMsg(json.error?.message ?? 'Submission error');
      return;
    }

    setStatus('done');
    onSubmitted();
  }

  if (status === 'done') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
        <p className="text-green-700 font-semibold text-lg mb-1">Submitted!</p>
        <p className="text-green-600 text-sm">Great work today!</p>
      </div>
    );
  }

  const isLoading = status === 'uploading' || status === 'submitting';

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-5 mb-6">
      <p className="text-sm font-semibold text-gray-800 mb-4">Step 2. Submit Your Proof</p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name (nickname OK)</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Proof photo / video (optional)</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-[#3182F6] transition-colors"
          >
            {preview ? (
              <img src={preview} alt="preview" className="max-h-40 mx-auto rounded-lg object-cover" />
            ) : (
              <p className="text-sm text-gray-400">Click to add a photo or video</p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/webp,video/mp4"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {errorMsg && <p className="mt-2 text-sm text-red-500">{errorMsg}</p>}

      <button
        type="submit"
        disabled={isLoading || !displayName.trim()}
        className="mt-4 w-full py-3 bg-[#3182F6] hover:bg-[#1B6AE0] text-white font-semibold rounded-xl disabled:opacity-50 transition-colors"
      >
        {status === 'uploading' ? 'Uploading...' : status === 'submitting' ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
