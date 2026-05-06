import Sidebar from './Sidebar';
import styles from './SidebarLayout.module.css';

export default function SidebarLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.container}>
            <main className={styles.main}>
                {children}
            </main>
            {/* Sidebar Wrapper */}
            <div className={styles.sidebarWrapper}>
                <Sidebar />
            </div>
        </div>
    );
}
