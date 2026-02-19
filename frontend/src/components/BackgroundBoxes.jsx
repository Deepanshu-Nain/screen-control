/**
 * BackgroundBoxes — Aceternity-style isometric grid background.
 * Uses inline styles for borders to guarantee rendering with any Tailwind version.
 *
 * An isometric grid of cells that light up with random colors on hover.
 * Grid size: 40×30 for performance.
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

const BORDER_COLOR = 'rgba(71, 85, 105, 0.5)';

const rowStyle = {
    position: 'relative',
    height: 32,
    width: 64,
    flexShrink: 0,
    borderLeft: `1px solid ${BORDER_COLOR}`,
};

const cellStyle = {
    position: 'relative',
    height: 32,
    width: 64,
    borderTop: `1px solid ${BORDER_COLOR}`,
    borderRight: `1px solid ${BORDER_COLOR}`,
};

function BoxesCore({ className = '' }) {
    const rowCount = 40;
    const colCount = 30;
    const rows = useMemo(() => new Array(rowCount).fill(1), []);
    const cols = useMemo(() => new Array(colCount).fill(1), []);

    return (
        <div
            className={className}
            style={{
                position: 'absolute',
                top: '-25%',
                left: '25%',
                zIndex: 1,
                display: 'flex',
                height: '200%',
                width: '200%',
                padding: 16,
                transform:
                    'translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)',
            }}
        >
            {rows.map((_, i) => (
                <motion.div key={`row${i}`} style={rowStyle}>
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
                            style={cellStyle}
                        >
                            {j % 2 === 0 && i % 2 === 0 ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    style={{
                                        pointerEvents: 'none',
                                        position: 'absolute',
                                        top: -14,
                                        left: -22,
                                        height: 24,
                                        width: 40,
                                        strokeWidth: 1,
                                        color: 'rgba(71, 85, 105, 0.4)',
                                    }}
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
