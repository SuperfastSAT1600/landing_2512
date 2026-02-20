'use client';

import { motion } from 'framer-motion';

interface Props {
    children: React.ReactNode;
    width?: "fit-content" | "100%";
    delay?: number;
}

export const ScrollReveal = ({ children, width = "100%", delay = 0 }: Props) => {
    return (
        <motion.div
            style={{ width }}
            initial={{ opacity: 0, y: 55 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -50px 0px" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
        >
            {children}
        </motion.div>
    );
};
