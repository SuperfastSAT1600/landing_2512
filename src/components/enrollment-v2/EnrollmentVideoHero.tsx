'use client';
// v2
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './EnrollmentVideoHero.module.css';

type ExamType = 'SAT' | 'AP';

interface Props {
  onExamSelect?: (exam: ExamType) => void;
}

export function EnrollmentVideoHero({ onExamSelect }: Props) {
  const [exam, setExam] = useState<ExamType | null>(null);

  function handleSelect(type: ExamType) {
    setExam(type);
    onExamSelect?.(type);
  }

  return (
    <section id="v2-exam" className={styles.hero} aria-label="히어로 섹션">
      {/* YouTube iframe background */}
      <div className={styles.videoBg}>
        {/* Poster image — visible on mobile (iframe hidden), covered by iframe on desktop */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://img.youtube.com/vi/3_FyzliFEbw/maxresdefault.jpg"
          alt=""
          aria-hidden="true"
          className={styles.posterImg}
        />
        <iframe
          src="https://www.youtube.com/embed/3_FyzliFEbw?autoplay=1&mute=1&loop=1&controls=0&rel=0&showinfo=0&playlist=3_FyzliFEbw&playsinline=1"
          title="Ivy League Campus Tour"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>

      {/* Gradient overlay */}
      <div className={styles.overlay} aria-hidden="true" />

      {/* Text content — vertically centered */}
      <div className={styles.content}>
        <h1 className={styles.headline}>
          아이에게<br />딱 맞는 수업을<br />받아보세요.
        </h1>

        <p className={styles.examPrompt}>수업이 필요한 과목을 선택하세요</p>

        {/* SAT / AP — first choice */}
        <div className={styles.examSelector} role="group" aria-label="시험 종류 선택">
          {(['SAT', 'AP'] as ExamType[]).map(type => (
            <button
              key={type}
              type="button"
              className={`${styles.examBtn} ${exam === type ? styles.examBtnActive : ''}`}
              onClick={() => handleSelect(type)}
              aria-pressed={exam === type}
            >
              {type}
            </button>
          ))}
        </div>

        <div className={styles.scrollHint} aria-hidden="true">
          <ChevronDown className={styles.chevron} />
        </div>
      </div>
    </section>
  );
}
