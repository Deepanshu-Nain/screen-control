/**
 * BackgroundBoxes — Aceternity-style isometric grid background.
 * Uses Tailwind CSS + cn() utility for styling.
 *
 * An isometric grid of cells that light up with random colors on hover.
 * Grid size: 40×30 for performance.
 */
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

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
            className={cn(
                'absolute -top-1/4 left-1/4 z-[1] flex h-[200%] w-[200%] p-4',
                className
            )}
            style={{
                transform:
                    'translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)',
            }}
        >
            {rows.map((_, i) => (
                <motion.div
                    key={`row${i}`}
                    className="relative h-8 w-16 shrink-0 border-l border-slate-600/70"
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
                            className="relative h-8 w-16 border-t border-r border-slate-600/70"
                        >
                            {j % 2 === 0 && i % 2 === 0 ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="pointer-events-none absolute -top-3.5 -left-5.5 h-6 w-10 stroke-1 text-slate-600/50"
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
