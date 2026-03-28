import Link from 'next/link';
import { Twitter, Instagram, Linkedin, Mail } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.grid}>
                    <div className={styles.brand}>

                        <div className={styles.companyInfo}>
                            <p className={styles.companyName}>Argonaut AI TutoringLab</p>
                            <p>Email : cs@argonautai.co.kr</p>
                            <p>Company Address : 201-A45, 46, Mapo-daero 4na-gil, Mapo-gu, Seoul, Republic of Korea</p>
                            <p>Business registration number : 564-85-03129</p>
                            <p>Online Business Registration Number : 2026-서울마포-0539호</p>
                            <p>Contact : 02-6956-0061</p>
                            <p>
                                <Link href="https://free-streetcar-e47.notion.site/Privacy-Policy-21b8706b608280948463e5f5609cf80a" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
                                {' | '}
                                <Link href="https://free-streetcar-e47.notion.site/Terms-of-Use-21b8706b608280aba839e07716e1f3f3?pvs=73" target="_blank" rel="noopener noreferrer">Terms of Service</Link>
                            </p>
                        </div>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p>&copy; {new Date().getFullYear()} Argonaut AI Inc. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
