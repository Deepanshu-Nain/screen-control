/**
 * BackgroundRippleEffect — Aceternity-style grid ripple background.
 * Ported to vanilla React + CSS (no Tailwind/shadcn dependencies).
 *
 * A grid of cells that ripple when clicked. Themed for hand gesture control.
 */
import { useMemo, useRef, useState } from 'react';

export function BackgroundRippleEffect({
    rows = 10,
    cols = 30,
    cellSize = 52,
}) {
    const [clickedCell, setClickedCell] = useState(null);
    const [rippleKey, setRippleKey] = useState(0);
    const ref = useRef(null);

    return (
        <div ref={ref} className="ripple-bg-root">
            <div className="ripple-bg-inner">
                <div className="ripple-bg-mask" />
                <DivGrid
                    key={`base-${rippleKey}`}
                    rows={rows}
                    cols={cols}
                    cellSize={cellSize}
                    borderColor="rgba(99, 102, 241, 0.15)"
                    fillColor="rgba(99, 102, 241, 0.06)"
                    clickedCell={clickedCell}
                    onCellClick={(row, col) => {
                        setClickedCell({ row, col });
                        setRippleKey((k) => k + 1);
                    }}
                    interactive
                />
            </div>
        </div>
    );
}

function DivGrid({
    rows = 10,
    cols = 30,
    cellSize = 52,
    borderColor = 'rgba(99, 102, 241, 0.15)',
    fillColor = 'rgba(99, 102, 241, 0.06)',
    clickedCell = null,
    onCellClick = () => { },
    interactive = true,
}) {
    const cells = useMemo(
        () => Array.from({ length: rows * cols }, (_, idx) => idx),
        [rows, cols]
    );

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        width: cols * cellSize,
        height: rows * cellSize,
        marginInline: 'auto',
    };

    return (
        <div className="ripple-grid" style={gridStyle}>
            {cells.map((idx) => {
                const rowIdx = Math.floor(idx / cols);
                const colIdx = idx % cols;
                const distance = clickedCell
                    ? Math.hypot(clickedCell.row - rowIdx, clickedCell.col - colIdx)
                    : 0;
                const delay = clickedCell ? Math.max(0, distance * 55) : 0;
                const duration = 200 + distance * 80;

                const style = {
                    backgroundColor: fillColor,
                    borderColor: borderColor,
                    ...(clickedCell
                        ? {
                            '--ripple-delay': `${delay}ms`,
                            '--ripple-duration': `${duration}ms`,
                        }
                        : {}),
                };

                const className = [
                    'ripple-cell',
                    clickedCell ? 'ripple-cell-animating' : '',
                    !interactive ? 'ripple-cell-static' : '',
                ].filter(Boolean).join(' ');

                return (
                    <div
                        key={idx}
                        className={className}
                        style={style}
                        onClick={interactive ? () => onCellClick(rowIdx, colIdx) : undefined}
                    />
                );
            })}
        </div>
    );
}
