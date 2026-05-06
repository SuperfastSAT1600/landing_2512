import { CheckCircle2 } from 'lucide-react';
import styles from './Curriculum.module.css';

const curriculum = [
    {
        week: "Weeks 1-2",
        title: "Foundation Mastery",
        description: "Deep dive into core SAT concepts. Grammar rules, algebra foundations, and critical reading strategies.",
        points: ["Evaluation Test & Goal Setting", "Grammar Essentials", "Heart of Algebra", "Reading Composition"]
    },
    {
        week: "Weeks 3-4",
        title: "Advanced Strategies",
        description: "Learn specific techniques to tackle hard problems. Pacing strategies for both sections.",
        points: ["Advanced Math Concepts", "Data Analysis", "Rhetoric & Synthesis", "Time Management Drills"]
    },
    {
        week: "Weeks 5-6",
        title: "Practice & Refinement",
        description: "Intensive practice with real SAT questions. Identifying weak spots and targeted improvement.",
        points: ["Mock Tests Review", "Error Log Analysis", "One-on-One Feedback", "Stress Management"]
    },
    {
        week: "Weeks 7-8",
        title: "Final Push & Simulation",
        description: "Simulating actual test conditions. Final polishing and confidence building.",
        points: ["Full-Length Proctored Exams", "Last Minute Tips", "Mental Prep", "Test Day Logistics"]
    }
];

export default function Curriculum() {
    return (
        <section className={styles.curriculum}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>8-Week Intensive Program</h2>
                    <p className={styles.subtitle}>
                        A structured path to your target score. Comprehensive coverage of every topic tested on the SAT.
                    </p>
                </div>

                <div className={styles.timeline}>
                    {curriculum.map((module, index) => (
                        <div key={index} className={styles.module}>
                            <div className={styles.marker}>
                                <div className={styles.dot} />
                                {index !== curriculum.length - 1 && <div className={styles.line} />}
                            </div>
                            <div className={styles.content}>
                                <span className={styles.week}>{module.week}</span>
                                <h3 className={styles.moduleTitle}>{module.title}</h3>
                                <p className={styles.moduleDescription}>{module.description}</p>
                                <ul className={styles.points}>
                                    {module.points.map((point, i) => (
                                        <li key={i} className={styles.point}>
                                            <CheckCircle2 size={16} className={styles.pointIcon} />
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
