import Link from 'next/link';
import styles from './Sidebar.module.css';

export default function Sidebar() {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.brand}>
                <div className={styles.companyInfo}>
                    <p className={styles.companyName}>Argonaut AI Inc.</p>
                    <p>Email: superfastsat@argonaut.co.kr</p>
                    <p>Address: 302, 21 Samgae-ro, Mapo-gu, Seoul, Republic of Korea</p>
                    <p>Business Reg: 102-81-48143</p>
                    <p>Online Biz Reg: 2025-서울마포-0893호</p>
                    <p>Academy Reg: 제 02202500031호 슈퍼패스트에스에이티 학원</p>
                    <p>Contact: 02-6956-0061</p>
                </div>
            </div>

            <nav className={styles.section}>
                <h4 className={styles.heading}>LEGAL</h4>
                <ul className={styles.links}>
                    <li><Link href="#">Privacy Policy</Link></li>
                    <li><Link href="#">Terms of Service</Link></li>
                </ul>
            </nav>

            <div className={styles.copyright}>
                &copy; {new Date().getFullYear()} Argonaut AI Inc. All rights reserved.
            </div>
        </aside>
    );
}
