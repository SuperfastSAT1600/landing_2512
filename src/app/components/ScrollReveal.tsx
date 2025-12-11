'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface Props {
    children: React.ReactNode;
    width?: "fit-content" | "100%";
    delay?: number;
}

export const ScrollReveal = ({ children, width = "100%", delay = 0 }: Props) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" }); // Trigger slightly before full view

    return (
        <div ref={ref} style={{ width }}>
            <motion.div
                variants={{
                    hidden: { opacity: 0, y: 50 }, // Reduced y distance
                    visible: { opacity: 1, y: 0 },
                }}
                initial="visible"
                animate="visible"
                transition={{ duration: 0.6, ease: "easeOut", delay }}
            >
                {children}
            </motion.div>
        </div>
    );
};
