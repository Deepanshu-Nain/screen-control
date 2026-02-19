/**
 * BackgroundBoxes — Aceternity-style isometric grid background.
 * Ported to vanilla React + CSS (no Tailwind/shadcn dependencies).
 *
 * An isometric grid of cells that light up with random colors on hover.
 * Grid size reduced from 150×100 to 40×30 for performance.
 */
import React, { useMemo } from 'react';
import { motion } from 'motion/react';

const COLORS = [
    '#818cf8', '#f9a8d4', '#86efac', '#fde047',
    '#fca5a5', '#d8b4fe', '#93c5fd', '#a5b4fc', '#c4b5fd',
];

function getRandomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function BoxesCore({ className = '' }) {
    const rowCount = 40;
    const colCount = 30;
    const rows = useMemo(() => new Array(rowCount).fill(1), []);
    const cols = useMemo(() => new Array(colCount).fill(1), []);

    return (
        <div
            className={`boxes-grid ${className}`}
            style={{
                transform:
                    'translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)',
            }}
        >
            {rows.map((_, i) => (
                <motion.div
                    key={`row${i}`}
                    className="boxes-row"
                >
                    {cols.map((_, j) => (
                        <motion.div
                            whileHover={{
                                backgroundColor: getRandomColor(),
                                transition: { duration: 0 },
                            }}
                            animate={{
                                transition: { duration: 2 },
                            }}
                            key={`col${j}`}
                            className="boxes-cell"
                        >
                            {j % 2 === 0 && i % 2 === 0 ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="boxes-plus-icon"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 6v12m6-6H6"
                                    />
                                </svg>
                            ) : null}
                        </motion.div>
                    ))}
                </motion.div>
            ))}
        </div>
    );
}

export const Boxes = React.memo(BoxesCore);
