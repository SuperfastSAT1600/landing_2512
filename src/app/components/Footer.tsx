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
                            <p className={styles.companyName}>Argonaut AI Inc.</p>
                            <p>Email : cs@argonautai.co.kr</p>
                            <p>Company Address : 302, 21 Samgae-ro, Mapo-gu, Seoul, Republic of Korea</p>
                            <p>Business registration number : 564-85-03129</p>
                            <p>Online Business Registration Number : 2026-서울마포-0000호</p>
                            <p>Contact : 02-6956-0061</p>
                        </div>
                    </div>



                    <div className={styles.column}>
                        <h4 className={styles.heading}>Legal</h4>
                        <ul className={styles.links}>
                            <li><Link href="#">Privacy Policy</Link></li>
                            <li><Link href="#">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p>&copy; {new Date().getFullYear()} Argonaut AI Inc. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
