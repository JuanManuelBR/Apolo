import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface HojaCalculoProps {
  darkMode: boolean;
  onSave?: (data: any) => void;
}

interface Cell {
  value: string;
  formula?: string | null;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  border?: boolean;
  decimals?: number;
  fontSize?: number;
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean;
  color?: string;
  bgColor?: string;
}

interface SheetMeta {
  id: number;
  name: string;
  colWidths?: Record<number, number>;
}

interface SelRange {
  r1: number; c1: number;
  r2: number; c2: number;
}

interface ChartConfig {
  id: number;
  type: 'bar' | 'line' | 'area' | 'pie' | 'scatter';
  title: string;
  rangeX: string;
  rangeY: string;
  hasHeader: boolean;
  pos: { x: number; y: number };
  size: { w: number; h: number };
}

interface ChartSeries {
  name: string;
  values: number[];
  color: string;
}

interface ChartData {
  labels: string[];
  series: ChartSeries[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROWS = 100;
const COLS = 26;
const DEFAULT_COL_W = 100;
const ROW_H = 24;
const HEADER_W = 46;
const CHART_COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#FF6D00', '#46BDC6', '#7B61FF', '#E91E63'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getColumnLabel = (index: number): string => {
  let label = '';
  let num = index;
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
};

const getCellId = (row: number, col: number): string =>
  `${getColumnLabel(col)}${row + 1}`;

const parseRef = (ref: string): { col: number; row: number } | null => {
  const m = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (let i = 0; i < m[1].length; i++) col = col * 26 + m[1].charCodeAt(i) - 64;
  return { col: col - 1, row: parseInt(m[2]) - 1 };
};

// Format number for display
const formatNumber = (val: string, decimals?: number): string => {
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  if (typeof decimals === 'number' && decimals >= 0) return num.toFixed(decimals);
  // Auto-format: remove unnecessary trailing zeros
  if (Number.isInteger(num)) return String(num);
  return String(parseFloat(num.toPrecision(10)));
};

// ─── Formula Engine ───────────────────────────────────────────────────────────

const formulaCache = new Map<string, string>();

function getRaw(id: string, cells: Record<string, Cell>): string {
  const c = cells[id];
  if (!c) return '';
  return c.formula ? evaluateFormula(c.formula, cells) : (c.value ?? '');
}

function evaluateFormula(formula: string, cells: Record<string, Cell>): string {
  if (!formula.startsWith('=')) return formula;
  
  let expr = formula.slice(1).toUpperCase();

  const fnMap: Record<string, (v: number[]) => number> = {
    SUM:     (v) => v.reduce((a, b) => a + b, 0),
    AVERAGE: (v) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0,
    COUNT:   (v) => v.filter((x) => !isNaN(x) && x !== null).length,
    COUNTA:  (v) => v.length,
    MIN:     (v) => v.length ? Math.min(...v) : 0,
    MAX:     (v) => v.length ? Math.max(...v) : 0,
    ABS:     (v) => Math.abs(v[0] ?? 0),
    SQRT:    (v) => Math.sqrt(v[0] ?? 0),
    ROUND:   (v) => Math.round((v[0] ?? 0) * Math.pow(10, v[1] ?? 0)) / Math.pow(10, v[1] ?? 0),
    POWER:   (v) => Math.pow(v[0] ?? 0, v[1] ?? 2),
    INT:     (v) => Math.floor(v[0] ?? 0),
  };

  // Process range functions: FN(A1:B5)
  for (const [fn, op] of Object.entries(fnMap)) {
    const re = new RegExp(`${fn}\\(([^)]+)\\)`, 'g');
    expr = expr.replace(re, (_: string, args: string) => {
      const rangeParts = args.split(',');
      const vals: number[] = [];
      
      for (const part of rangeParts) {
        const trimmed = part.trim();
        if (trimmed.includes(':')) {
          const [s, e] = trimmed.split(':');
          const sc = parseRef(s.trim()), ec = parseRef(e.trim());
          if (!sc || !ec) return '#REF!';
          for (let r = sc.row; r <= ec.row; r++) {
            for (let c = sc.col; c <= ec.col; c++) {
              const raw = getRaw(getCellId(r, c), cells);
              const v = parseFloat(raw);
              if (!isNaN(v)) vals.push(v);
            }
          }
        } else {
          const ref = parseRef(trimmed);
          if (ref) {
            const raw = getRaw(getCellId(ref.row, ref.col), cells);
            const v = parseFloat(raw);
            if (!isNaN(v)) vals.push(v);
          } else {
            const v = parseFloat(trimmed);
            if (!isNaN(v)) vals.push(v);
          }
        }
      }
      
      if (!vals.length && fn !== 'COUNT' && fn !== 'COUNTA') return '0';
      return String(op(vals));
    });
  }

  // Replace remaining cell references with values
  expr = expr.replace(/([A-Z]+\d+)/g, (ref: string) => {
    const v = parseFloat(getRaw(ref, cells));
    return isNaN(v) ? '0' : String(v);
  });

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${expr})`)();
    if (result === null || result === undefined) return '';
    if (typeof result === 'number' && !isFinite(result)) return '#DIV/0!';
    return String(parseFloat(result.toPrecision(12)));
  } catch {
    return '#ERROR!';
  }
}

// ─── Chart data builder ───────────────────────────────────────────────────────

function buildChartData(
  rangeX: string, 
  rangeY: string, 
  hasHeader: boolean, 
  cells: Record<string, Cell>
): ChartData {
  const labels: string[] = [];
  const series: ChartSeries[] = [];

  const parseRange = (range: string) => {
    const parts = range.toUpperCase().trim().split(':');
    const s = parseRef(parts[0]?.trim() || '');
    const e = parseRef(parts[1]?.trim() || parts[0]?.trim() || '');
    return s && e ? { s, e } : null;
  };

  // Process X axis
  if (rangeX && rangeX.trim()) {
    const r = parseRange(rangeX);
    if (r) {
      const r1 = Math.min(r.s.row, r.e.row), r2 = Math.max(r.s.row, r.e.row);
      const c = Math.min(r.s.col, r.e.col);
      const startRow = hasHeader ? r1 + 1 : r1;
      for (let row = startRow; row <= r2; row++) {
        labels.push(getRaw(getCellId(row, c), cells));
      }
    }
  }

  // Process Y axis (series)
  if (rangeY && rangeY.trim()) {
    const r = parseRange(rangeY);
    if (r) {
      const r1 = Math.min(r.s.row, r.e.row), r2 = Math.max(r.s.row, r.e.row);
      const c1 = Math.min(r.s.col, r.e.col), c2 = Math.max(r.s.col, r.e.col);
      const startRow = hasHeader ? r1 + 1 : r1;

      if (labels.length === 0) {
        for (let row = startRow; row <= r2; row++) 
          labels.push(String(row - startRow + 1));
      }

      for (let c = c1; c <= c2; c++) {
        const name = hasHeader 
          ? (getRaw(getCellId(r1, c), cells) || getColumnLabel(c)) 
          : getColumnLabel(c);
        const values: number[] = [];
        for (let row = startRow; row <= r2; row++) {
          const v = parseFloat(getRaw(getCellId(row, c), cells));
          values.push(isNaN(v) ? 0 : v);
        }
        series.push({ name, values, color: CHART_COLORS[(c - c1) % CHART_COLORS.length] });
      }
    }
  }

  return { labels, series };
}

// ─── SVG Charts ───────────────────────────────────────────────────────────────

interface SVGChartProps { data: ChartData; width: number; height: number; darkMode: boolean; }

function EmptyChart({ width, height, darkMode }: { width: number; height: number; darkMode: boolean }) {
  return (
    <svg width={width} height={height}>
      <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={12} fill={darkMode ? '#475569' : '#bbb'}>
        Sin datos — configura rangos X e Y
      </text>
    </svg>
  );
}

// Shared grid lines + Y axis helper
function GridLines({ ticks, pad, W, axisC, textC, height, padBottom }: any) {
  return (
    <>
      {ticks.map((t: any, i: number) => (
        <g key={i}>
          <line x1={pad.left} y1={t.y} x2={pad.left + W} y2={t.y} stroke={axisC} strokeWidth={0.5} strokeDasharray={i === 0 ? '0' : '3,3'} />
          <text x={pad.left - 6} y={t.y + 4} fontSize={9} fill={textC} textAnchor="end">
            {Math.abs(t.val) >= 10000 ? `${(t.val / 1000).toFixed(0)}k` 
             : Math.abs(t.val) >= 1000 ? `${(t.val / 1000).toFixed(1)}k`
             : t.val % 1 === 0 ? t.val : t.val.toFixed(1)}
          </text>
        </g>
      ))}
    </>
  );
}

function Legend({ series, pad, width, height, textC }: any) {
  if (series.length <= 1) return null;
  const itemW = 70;
  const totalW = series.length * itemW;
  const startX = Math.max(pad.left, (width - totalW) / 2);
  return (
    <>
      {series.slice(0, 8).map((s: ChartSeries, i: number) => (
        <g key={i} transform={`translate(${startX + i * itemW}, ${height - 10})`}>
          <rect width={10} height={10} fill={s.color} rx={2} />
          <text x={14} y={9} fontSize={9} fill={textC}>{s.name.slice(0, 8)}</text>
        </g>
      ))}
    </>
  );
}

function BarChartSVG({ data, width, height, darkMode }: SVGChartProps) {
  const { labels, series } = data;
  if (!labels.length || !series.length) return <EmptyChart width={width} height={height} darkMode={darkMode} />;

  const pad = { top: 20, right: 16, bottom: series.length > 1 ? 48 : 32, left: 48 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;
  const allVals = series.flatMap((s) => s.values);
  const rawMax = Math.max(...allVals, 0);
  const rawMin = Math.min(0, ...allVals);
  
  // Nice scale
  const range = rawMax - rawMin || 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
  const step = Math.ceil(range / (4 * magnitude)) * magnitude;
  const maxVal = Math.ceil(rawMax / step) * step;
  const minVal = Math.floor(rawMin / step) * step;
  const totalRange = maxVal - minVal || 1;

  const axisC = darkMode ? '#2d3748' : '#e5e7eb';
  const textC = darkMode ? '#718096' : '#9ca3af';
  
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const val = minVal + (totalRange / (tickCount - 1)) * i;
    return { val, y: pad.top + H * (1 - (val - minVal) / totalRange) };
  });
  
  const zeroY = pad.top + H * (1 - (0 - minVal) / totalRange);
  const groupW = W / labels.length;
  const barPad = Math.max(2, groupW * 0.15);
  const totalBarW = groupW - barPad * 2;
  const barW = Math.max(3, totalBarW / series.length);

  return (
    <svg width={width} height={height}>
      <GridLines ticks={ticks} pad={pad} W={W} axisC={axisC} textC={textC} height={height} padBottom={pad.bottom} />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      <line x1={pad.left} y1={zeroY} x2={pad.left + W} y2={zeroY} stroke={darkMode ? '#4a5568' : '#d1d5db'} strokeWidth={1} />
      {labels.map((label, li) => (
        <g key={li}>
          {series.map((s, si) => {
            const x = pad.left + barPad + li * groupW + si * barW;
            const bH = Math.max(1, Math.abs(((s.values[li] ?? 0) / totalRange) * H));
            const y = (s.values[li] ?? 0) >= 0 ? zeroY - bH : zeroY;
            return (
              <g key={si}>
                <rect x={x} y={y} width={Math.max(1, barW - 1)} height={bH} fill={s.color} rx={2} opacity={0.9}>
                  <title>{`${s.name}: ${s.values[li]}`}</title>
                </rect>
                {/* Value label on hover via title */}
              </g>
            );
          })}
          <text
            x={pad.left + barPad + li * groupW + totalBarW / 2}
            y={height - pad.bottom + 13}
            fontSize={9} fill={textC} textAnchor="middle"
          >
            {String(label).length > 8 ? String(label).slice(0, 7) + '…' : label}
          </text>
          <line x1={pad.left + li * groupW} y1={zeroY} x2={pad.left + li * groupW} y2={zeroY + 4} stroke={axisC} strokeWidth={1} />
        </g>
      ))}
      <Legend series={series} pad={pad} width={width} height={height} textC={textC} />
    </svg>
  );
}

function LineChartSVG({ data, width, height, darkMode }: SVGChartProps) {
  const { labels, series } = data;
  if (!labels.length || !series.length) return <EmptyChart width={width} height={height} darkMode={darkMode} />;

  const pad = { top: 20, right: 20, bottom: series.length > 1 ? 48 : 32, left: 48 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;

  const xValues = labels.map(l => parseFloat(l));
  const isNumericX = xValues.every(v => !isNaN(v)) && xValues.length > 1;

  const allVals = series.flatMap((s) => s.values);
  const rawMax = Math.max(...allVals, 0);
  const rawMin = Math.min(0, ...allVals);
  const range = rawMax - rawMin || 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
  const step = Math.ceil(range / (4 * magnitude)) * magnitude;
  const maxVal = Math.ceil(rawMax / step) * step;
  const minVal = Math.floor(rawMin / step) * step;
  const totalRange = maxVal - minVal || 1;

  const getY = (v: number) => pad.top + H * (1 - (v - minVal) / totalRange);

  let getX: (i: number) => number;
  let xTicks: { val: string | number, x: number }[] = [];

  if (isNumericX) {
    const minX = Math.min(...xValues), maxX = Math.max(...xValues);
    const rangeX = maxX - minX || 1;
    getX = (i: number) => pad.left + ((xValues[i] - minX) / rangeX) * W;
    const tickStep = Math.ceil(labels.length / 6);
    for (let i = 0; i < labels.length; i += tickStep) {
      xTicks.push({ val: xValues[i] % 1 === 0 ? xValues[i] : xValues[i].toFixed(1), x: getX(i) });
    }
  } else {
    getX = (i: number) => pad.left + (labels.length > 1 ? (i / (labels.length - 1)) * W : W / 2);
    const tickStep = Math.ceil(labels.length / 6);
    for (let i = 0; i < labels.length; i += tickStep) {
      xTicks.push({ val: labels[i], x: getX(i) });
    }
    if (xTicks.length && xTicks[xTicks.length - 1].x !== getX(labels.length - 1)) {
      xTicks.push({ val: labels[labels.length - 1], x: getX(labels.length - 1) });
    }
  }

  const axisC = darkMode ? '#2d3748' : '#e5e7eb';
  const textC = darkMode ? '#718096' : '#9ca3af';
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (totalRange / 4) * i;
    return { val, y: getY(val) };
  });

  return (
    <svg width={width} height={height}>
      <GridLines ticks={yTicks} pad={pad} W={W} axisC={axisC} textC={textC} height={height} padBottom={pad.bottom} />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      <line x1={pad.left} y1={pad.top + H} x2={pad.left + W} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      {xTicks.map((t, i) => (
        <g key={i}>
          <line x1={t.x} y1={pad.top + H} x2={t.x} y2={pad.top + H + 4} stroke={axisC} strokeWidth={1} />
          <text x={t.x} y={height - pad.bottom + 14} fontSize={9} fill={textC} textAnchor="middle">
            {String(t.val).length > 8 ? String(t.val).slice(0, 7) + '…' : t.val}
          </text>
        </g>
      ))}
      {series.map((s) => {
        const points = isNumericX 
          ? [...s.values.map((v, i) => ({ x: getX(i), y: getY(v), val: v, xVal: xValues[i] }))].sort((a, b) => a.xVal - b.xVal)
          : s.values.map((v, i) => ({ x: getX(i), y: getY(v), val: v, xVal: i }));
        const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
        return (
          <g key={s.name}>
            <polyline points={polyline} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill={s.color} stroke={darkMode ? '#1a202c' : '#fff'} strokeWidth={1.5}>
                <title>{`${s.name}: ${p.val}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      <Legend series={series} pad={pad} width={width} height={height} textC={textC} />
    </svg>
  );
}

function AreaChartSVG({ data, width, height, darkMode }: SVGChartProps) {
  const { labels, series } = data;
  if (!labels.length || !series.length) return <EmptyChart width={width} height={height} darkMode={darkMode} />;

  const pad = { top: 20, right: 16, bottom: series.length > 1 ? 48 : 32, left: 48 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;
  const allVals = series.flatMap((s) => s.values);
  const rawMax = Math.max(...allVals, 0);
  const rawMin = Math.min(0, ...allVals);
  const range = rawMax - rawMin || 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
  const step = Math.ceil(range / (4 * magnitude)) * magnitude;
  const maxVal = Math.ceil(rawMax / step) * step;
  const minVal = Math.floor(rawMin / step) * step;
  const totalRange = maxVal - minVal || 1;
  
  const xStep = labels.length > 1 ? W / (labels.length - 1) : W;
  const getX = (i: number) => pad.left + i * xStep;
  const getY = (v: number) => pad.top + H * (1 - (v - minVal) / totalRange);
  const baseY = getY(Math.max(0, minVal));
  
  const axisC = darkMode ? '#2d3748' : '#e5e7eb';
  const textC = darkMode ? '#718096' : '#9ca3af';
  const ticks = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (totalRange / 4) * i;
    return { val, y: getY(val) };
  });

  return (
    <svg width={width} height={height}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`ag-${i}-${s.color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>
      <GridLines ticks={ticks} pad={pad} W={W} axisC={axisC} textC={textC} height={height} padBottom={pad.bottom} />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      <line x1={pad.left} y1={pad.top + H} x2={pad.left + W} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      {series.map((s, si) => {
        const polyline = s.values.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
        const areaPolygon = `${getX(0)},${baseY} ${s.values.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')} ${getX(s.values.length - 1)},${baseY}`;
        return (
          <g key={s.name}>
            <polygon points={areaPolygon} fill={`url(#ag-${si}-${s.color.replace('#','')})`} />
            <polyline points={polyline} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
            {s.values.map((v, i) => (
              <circle key={i} cx={getX(i)} cy={getY(v)} r={2.5} fill={s.color} stroke={darkMode ? '#1a202c' : '#fff'} strokeWidth={1.5}>
                <title>{`${s.name}: ${v}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      {labels.map((label, i) => {
        const step = Math.ceil(labels.length / 6);
        if (i % step !== 0 && i !== labels.length - 1) return null;
        return (
          <text key={i} x={getX(i)} y={height - pad.bottom + 14} fontSize={9} fill={textC} textAnchor="middle">
            {String(label).length > 8 ? String(label).slice(0, 7) + '…' : label}
          </text>
        );
      })}
      <Legend series={series} pad={pad} width={width} height={height} textC={textC} />
    </svg>
  );
}

function PieChartSVG({ data, width, height, darkMode }: SVGChartProps) {
  const { labels, series } = data;
  if (!labels.length || !series.length) return <EmptyChart width={width} height={height} darkMode={darkMode} />;

  const legendH = Math.min(labels.length * 18 + 8, height - 10);
  const legendW = 80;
  const cx = (width - legendW) / 2;
  const cy = height / 2;
  const r = Math.min(cx - 10, (height - 30) / 2);
  const textC = darkMode ? '#718096' : '#9ca3af';

  const values = labels.map((_, i) => Math.abs(series[0]?.values[i] ?? 0));
  const total = values.reduce((a, b) => a + b, 0) || 1;

  let angle = -Math.PI / 2;
  const slices = values.map((v, i) => {
    const ratio = v / total;
    const startAngle = angle;
    angle += ratio * 2 * Math.PI;
    const endAngle = angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = ratio > 0.5 ? 1 : 0;
    const midAngle = startAngle + (endAngle - startAngle) / 2;
    const lx = cx + (r * 0.6) * Math.cos(midAngle);
    const ly = cy + (r * 0.6) * Math.sin(midAngle);
    return { 
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, 
      color: CHART_COLORS[i % 8], label: labels[i], value: v, ratio, midAngle, lx, ly 
    };
  });

  return (
    <svg width={width} height={height}>
      {slices.map((sl, i) => (
        <g key={i}>
          <path d={sl.path} fill={sl.color} stroke={darkMode ? '#1a202c' : '#fff'} strokeWidth={2} opacity={0.92}>
            <title>{`${sl.label}: ${sl.value} (${(sl.ratio * 100).toFixed(1)}%)`}</title>
          </path>
          {sl.ratio > 0.08 && (
            <text x={sl.lx} y={sl.ly} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">
              {(sl.ratio * 100).toFixed(0)}%
            </text>
          )}
        </g>
      ))}
      {/* Legend on the right */}
      {labels.slice(0, 8).map((label, i) => (
        <g key={i} transform={`translate(${width - legendW + 2}, ${(height - Math.min(labels.length, 8) * 18) / 2 + i * 18})`}>
          <rect width={10} height={10} fill={CHART_COLORS[i % 8]} rx={2} />
          <text x={14} y={9} fontSize={9} fill={textC}>{String(label).slice(0, 9)}</text>
        </g>
      ))}
    </svg>
  );
}

function ScatterChartSVG({ data, width, height, darkMode }: SVGChartProps) {
  const { labels, series } = data;
  if (!labels.length || !series.length) return <EmptyChart width={width} height={height} darkMode={darkMode} />;

  const pad = { top: 20, right: 20, bottom: series.length > 1 ? 48 : 32, left: 48 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;

  const xValues = labels.map(l => parseFloat(l));
  const isNumericX = xValues.every(v => !isNaN(v)) && xValues.length > 1;

  const allVals = series.flatMap((s) => s.values);
  const rawMax = Math.max(...allVals, 0);
  const rawMin = Math.min(0, ...allVals);
  const range = rawMax - rawMin || 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
  const step = Math.ceil(range / (4 * magnitude)) * magnitude;
  const maxVal = Math.ceil(rawMax / step) * step;
  const minVal = Math.floor(rawMin / step) * step;
  const totalRange = maxVal - minVal || 1;

  const getY = (v: number) => pad.top + H * (1 - (v - minVal) / totalRange);
  
  let getX: (i: number) => number;
  let xTicks: { val: string | number, x: number }[] = [];

  if (isNumericX) {
    const minX = Math.min(...xValues), maxX = Math.max(...xValues);
    const rangeX = maxX - minX || 1;
    getX = (i: number) => pad.left + ((xValues[i] - minX) / rangeX) * W;
    for (let i = 0; i <= 4; i++) {
      const val = minX + (rangeX / 4) * i;
      xTicks.push({ val: val % 1 === 0 ? val : val.toFixed(1), x: pad.left + (i * W / 4) });
    }
  } else {
    getX = (i: number) => pad.left + (labels.length > 1 ? (i / (labels.length - 1)) * W : W / 2);
    const tickStep = Math.ceil(labels.length / 6);
    for (let i = 0; i < labels.length; i += tickStep) {
      xTicks.push({ val: labels[i], x: getX(i) });
    }
  }

  const axisC = darkMode ? '#2d3748' : '#e5e7eb';
  const textC = darkMode ? '#718096' : '#9ca3af';
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (totalRange / 4) * i;
    return { val, y: getY(val) };
  });

  return (
    <svg width={width} height={height}>
      <GridLines ticks={yTicks} pad={pad} W={W} axisC={axisC} textC={textC} height={height} padBottom={pad.bottom} />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      <line x1={pad.left} y1={pad.top + H} x2={pad.left + W} y2={pad.top + H} stroke={axisC} strokeWidth={1} />
      {xTicks.map((t, i) => (
        <g key={i}>
          <line x1={t.x} y1={pad.top + H} x2={t.x} y2={pad.top + H + 4} stroke={axisC} strokeWidth={1} />
          <text x={t.x} y={height - pad.bottom + 14} fontSize={9} fill={textC} textAnchor="middle">
            {String(t.val).length > 8 ? String(t.val).slice(0, 7) + '…' : t.val}
          </text>
        </g>
      ))}
      {series.map((s) => s.values.map((v, i) => (
        <circle
          key={`${s.name}-${i}`}
          cx={getX(i)} cy={getY(v)} r={4.5}
          fill={s.color} stroke={darkMode ? '#1a202c' : '#fff'} strokeWidth={1.5}
          opacity={0.85}
        >
          <title>{`${s.name}: ${v} (x=${isNumericX ? xValues[i] : labels[i]})`}</title>
        </circle>
      )))}
      <Legend series={series} pad={pad} width={width} height={height} textC={textC} />
    </svg>
  );
}

function ChartPreview({ type, data, width, height, darkMode }: SVGChartProps & { type: ChartConfig['type'] }) {
  if (type === 'bar')     return <BarChartSVG     data={data} width={width} height={height} darkMode={darkMode} />;
  if (type === 'line')    return <LineChartSVG    data={data} width={width} height={height} darkMode={darkMode} />;
  if (type === 'area')    return <AreaChartSVG    data={data} width={width} height={height} darkMode={darkMode} />;
  if (type === 'pie')     return <PieChartSVG     data={data} width={width} height={height} darkMode={darkMode} />;
  if (type === 'scatter') return <ScatterChartSVG data={data} width={width} height={height} darkMode={darkMode} />;
  return null;
}

// ─── ChartModal ───────────────────────────────────────────────────────────────

interface ChartModalProps {
  darkMode: boolean;
  cells: Record<string, Cell>;
  selRange: SelRange | null;
  onClose: () => void;
  onInsert: (cfg: Omit<ChartConfig, 'id' | 'pos' | 'size'>) => void;
}

function ChartModal({ darkMode, cells, selRange, onClose, onInsert }: ChartModalProps) {
  const [type, setType] = useState<ChartConfig['type']>('bar');

  const [rangeX, setRangeX] = useState<string>(() => {
    if (!selRange) return '';
    if (selRange.c1 !== selRange.c2) {
      const r1 = Math.min(selRange.r1, selRange.r2), r2 = Math.max(selRange.r1, selRange.r2);
      const c1 = Math.min(selRange.c1, selRange.c2);
      return `${getCellId(r1, c1)}:${getCellId(r2, c1)}`;
    }
    return '';
  });

  const [rangeY, setRangeY] = useState<string>(() => {
    if (!selRange) return '';
    const r1 = Math.min(selRange.r1, selRange.r2), r2 = Math.max(selRange.r1, selRange.r2);
    const c1 = Math.min(selRange.c1, selRange.c2), c2 = Math.max(selRange.c1, selRange.c2);
    if (c1 !== c2) return `${getCellId(r1, c1 + 1)}:${getCellId(r2, c2)}`;
    return `${getCellId(r1, c1)}:${getCellId(r2, c2)}`;
  });

  const [title, setTitle] = useState('');
  const [hasHeader, setHasHeader] = useState(true);

  const chartData = useMemo(() => buildChartData(rangeX, rangeY, hasHeader, cells), [rangeX, rangeY, hasHeader, cells]);
  const dm = darkMode;

  const chartTypes: { id: ChartConfig['type']; label: string }[] = [
    { id: 'bar',     label: 'Barras' },
    { id: 'line',    label: 'Líneas' },
    { id: 'area',    label: 'Área' },
    { id: 'pie',     label: 'Pastel' },
    { id: 'scatter', label: 'Dispersión' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={`flex flex-col overflow-hidden rounded-xl shadow-2xl w-[680px] max-w-[96vw] ${dm ? 'bg-slate-800' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 bg-[#188038]">
          <span className="text-white font-semibold text-sm">Insertar gráfica</span>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl bg-transparent border-none cursor-pointer">&times;</button>
        </div>

        <div className="flex flex-1">
          <div className={`w-36 shrink-0 p-2 border-r ${dm ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-[10px] font-semibold tracking-wider mb-2 pl-1 ${dm ? 'text-slate-500' : 'text-gray-400'}`}>TIPO</p>
            {chartTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-md mb-0.5 text-[13px] border-none cursor-pointer transition-colors
                  ${type === t.id
                    ? 'bg-[#e6f4ea] text-[#188038] font-semibold'
                    : dm ? 'bg-transparent text-slate-300 hover:bg-slate-700' : 'bg-transparent text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4">
            <div className={`rounded-lg border mb-4 p-2 ${dm ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-[11px] font-medium text-center mb-1 ${dm ? 'text-slate-400' : 'text-gray-500'}`}>{title || 'Vista previa'}</p>
              <ChartPreview type={type} data={chartData} width={470} height={200} darkMode={dm} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-400' : 'text-gray-500'}`}>Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título de la gráfica"
                  className={`w-full px-2 py-1.5 rounded border text-[13px] outline-none focus:border-[#188038] ${dm ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-800'}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-400' : 'text-gray-500'}`}>Rango Eje X (etiquetas)</label>
                <input
                  value={rangeX}
                  onChange={(e) => setRangeX(e.target.value.toUpperCase())}
                  placeholder="ej. A1:A10"
                  className={`w-full px-2 py-1.5 rounded border text-[13px] font-mono outline-none focus:border-[#188038] ${dm ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-800'}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-400' : 'text-gray-500'}`}>Rango Eje Y (valores)</label>
                <input
                  value={rangeY}
                  onChange={(e) => setRangeY(e.target.value.toUpperCase())}
                  placeholder="ej. B1:D10"
                  className={`w-full px-2 py-1.5 rounded border text-[13px] font-mono outline-none focus:border-[#188038] ${dm ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-800'}`}
                />
              </div>
            </div>

            <label className={`flex items-center gap-2 mt-3 text-[13px] cursor-pointer ${dm ? 'text-slate-300' : 'text-gray-700'}`}>
              <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="accent-[#188038]" />
              Primera fila como encabezados de serie
            </label>
          </div>
        </div>

        <div className={`flex justify-end gap-2 px-4 py-3 border-t ${dm ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-5 py-1.5 rounded text-[13px] font-medium border cursor-pointer ${dm ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >Cancelar</button>
          <button
            onClick={() => onInsert({ type, title, rangeX, rangeY, hasHeader })}
            className="px-5 py-1.5 rounded text-[13px] font-medium bg-[#188038] text-white border-none cursor-pointer hover:bg-[#137033]"
          >Insertar</button>
        </div>
      </div>
    </div>
  );
}

// ─── FloatingChart ────────────────────────────────────────────────────────────

interface FloatingChartProps {
  chart: ChartConfig;
  cells: Record<string, Cell>;
  darkMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onPositionChange: (id: number, pos: { x: number; y: number }, size: { w: number; h: number }) => void;
}

function FloatingChart({ chart, cells, darkMode, selected, onSelect, onRemove, onPositionChange }: FloatingChartProps) {
  const [pos, setPos] = useState(chart.pos);
  const [size, setSize] = useState(chart.size);
  const chartData = useMemo(() => buildChartData(chart.rangeX || '', chart.rangeY || '', chart.hasHeader, cells), [chart, cells]);

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    e.preventDefault();
    onSelect();
    const ox = e.clientX - pos.x, oy = e.clientY - pos.y;
    const onMove = (mv: MouseEvent) => setPos({ x: mv.clientX - ox, y: mv.clientY - oy });
    const onUp = (mv: MouseEvent) => {
      const newPos = { x: mv.clientX - ox, y: mv.clientY - oy };
      setPos(newPos);
      onPositionChange(chart.id, newPos, size);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    const sx = e.clientX, sy = e.clientY, sw = size.w, sh = size.h;
    const onMove = (mv: MouseEvent) => setSize({ w: Math.max(250, sw + mv.clientX - sx), h: Math.max(180, sh + mv.clientY - sy) });
    const onUp = (mv: MouseEvent) => {
      const newSize = { w: Math.max(250, sw + mv.clientX - sx), h: Math.max(180, sh + mv.clientY - sy) };
      setSize(newSize);
      onPositionChange(chart.id, pos, newSize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const dm = darkMode;

  return (
    <div
      onMouseDown={startDrag}
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      className={`absolute flex flex-col overflow-hidden rounded-lg cursor-move select-none
        ${selected ? 'z-50 shadow-xl ring-2 ring-[#1a73e8]' : 'z-10 shadow-md hover:shadow-lg hover:ring-1 hover:ring-gray-300'}
        ${dm ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}
    >
      <div className={`flex items-center justify-between px-3 py-1.5 shrink-0 border-b ${dm ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
        <span className={`text-[12px] font-semibold truncate flex-1 ${dm ? 'text-slate-300' : 'text-gray-600'}`}>
          {chart.title || `Gráfica (${chart.type})`}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className={`bg-transparent border-none cursor-pointer text-lg leading-none ml-2 transition-colors ${dm ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'}`}
        >
          &times;
        </button>
      </div>

      <div className="flex-1 min-h-0 p-2">
        <ChartPreview type={chart.type} data={chartData} width={size.w - 16} height={size.h - 52} darkMode={dm} />
      </div>

      <div
        className="resize-handle absolute right-0 bottom-0 w-5 h-5 cursor-nwse-resize z-10 flex items-center justify-center"
        onMouseDown={startResize}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill={dm ? '#4a5568' : '#cbd5e0'}>
          <path d="M 10 0 L 10 10 L 0 10 Z"/>
        </svg>
      </div>

      {selected && [
        [0, 0], [50, 0], [100, 0],
        [0, 50], [100, 50],
        [0, 100], [50, 100], [100, 100]
      ].map(([lp, tp], i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-[#1a73e8] border-2 border-white rounded-sm pointer-events-none z-20"
          style={{ left: `${lp}%`, top: `${tp}%`, transform: 'translate(-50%,-50%)' }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HojaCalculo({ darkMode, onSave }: HojaCalculoProps) {
  // ── State ──
  const [sheets, setSheets] = useState<SheetMeta[]>([
    { id: 1, name: 'Hoja 1' },
    { id: 2, name: 'Hoja 2' },
  ]);
  const [activeSheet, setActiveSheet] = useState<number>(1);
  const [allCells, setAllCells] = useState<Record<number, Record<string, Cell>>>({});
  const [allCharts, setAllCharts] = useState<Record<number, ChartConfig[]>>({});
  const [sel, setSel] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [selRange, setSelRange] = useState<SelRange | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editVal, setEditVal] = useState<string>('');
  const [isSelectingFromHeader, setIsSelectingFromHeader] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [selectedChart, setSelectedChart] = useState<number | null>(null);
  const [renamingSheet, setRenamingSheet] = useState<number | null>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  // Drag-to-fill state
  const [fillHandleActive, setFillHandleActive] = useState(false);
  const fillStartRef = useRef<{ r: number; c: number } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);

  const cells: Record<string, Cell> = useMemo(() => allCells[activeSheet] || {}, [allCells, activeSheet]);
  const charts: ChartConfig[] = useMemo(() => allCharts[activeSheet] || [], [allCharts, activeSheet]);
  const dm = darkMode;

  const getColW = (sheetId: number, col: number): number => {
    return colWidths[`${sheetId}-${col}`] ?? DEFAULT_COL_W;
  };
  const setColW = (sheetId: number, col: number, w: number) => {
    setColWidths(prev => ({ ...prev, [`${sheetId}-${col}`]: w }));
  };

  // ── Cell helpers ──
  const setCell = useCallback((id: string, data: Partial<Cell>) => {
    setAllCells((prev) => {
      const updated = {
        ...prev,
        [activeSheet]: {
          ...(prev[activeSheet] || {}),
          [id]: { ...(prev[activeSheet]?.[id] || {}), ...data } as Cell,
        },
      };
      onSave?.({ cells: updated[activeSheet], rows: ROWS, cols: COLS });
      return updated;
    });
  }, [activeSheet, onSave]);

  const getCell = useCallback((id: string): Cell => cells[id] || ({ value: '' } as Cell), [cells]);
  const curId = getCellId(sel.r, sel.c);
  const curCell = getCell(curId);

  // ── Edit ──
  const startEdit = useCallback((id: string, initVal?: string) => {
    const c = getCell(id);
    setEditingCell(id);
    setEditVal(initVal !== undefined ? initVal : (c.formula || c.value || ''));
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
  }, [getCell]);

  const commitEdit = useCallback((id: string | null, val: string) => {
    if (!id) return;
    const trimmed = val.trim();
    const data: Partial<Cell> = trimmed.startsWith('=')
      ? { formula: trimmed, value: '' }
      : { formula: null, value: trimmed };
    setAllCells((prev) => {
      const updated = {
        ...prev,
        [activeSheet]: {
          ...(prev[activeSheet] || {}),
          [id]: { ...(prev[activeSheet]?.[id] || {}), ...data } as Cell,
        },
      };
      onSave?.({ cells: updated[activeSheet], rows: ROWS, cols: COLS });
      return updated;
    });
    setEditingCell(null);
    setEditVal('');
    gridRef.current?.focus();
  }, [activeSheet, onSave]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditVal('');
    gridRef.current?.focus();
  }, []);

  // ── Selection ──
  const moveSel = useCallback((dr: number, dc: number, extend = false) => {
    setSel((prev) => {
      const nr = Math.max(0, Math.min(ROWS - 1, prev.r + dr));
      const nc = Math.max(0, Math.min(COLS - 1, prev.c + dc));
      if (!extend) setSelRange(null);
      else setSelRange((rng) =>
        rng
          ? { ...rng, r2: nr, c2: nc }
          : { r1: prev.r, c1: prev.c, r2: nr, c2: nc }
      );
      return { r: nr, c: nc };
    });
  }, []);

  const clickCell = useCallback((r: number, c: number, shift: boolean, e?: React.MouseEvent) => {
    if (e && (e.target as HTMLElement).tagName === 'INPUT') return;
    if (e && isSelectingFromHeader) return;

    // Formula cell ref insertion
    if (editingCell && editVal.startsWith('=')) {
      e?.preventDefault();
      const clickedId = getCellId(r, c);
      if (clickedId !== editingCell) {
        setEditVal((prev) => prev + clickedId);
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }
    }

    if (editingCell) commitEdit(editingCell, editVal);

    if (shift) {
      setSelRange((rng) =>
        rng ? { ...rng, r2: r, c2: c } : { r1: sel.r, c1: sel.c, r2: r, c2: c }
      );
      setSel({ r, c });
    } else {
      setSel({ r, c });
      setSelRange(null);
    }
    setSelectedChart(null);
    gridRef.current?.focus();
  }, [editingCell, editVal, sel.r, sel.c, commitEdit, isSelectingFromHeader]);

  const isInRange = useCallback((r: number, c: number): boolean => {
    if (!selRange) return false;
    const r1 = Math.min(selRange.r1, selRange.r2), r2 = Math.max(selRange.r1, selRange.r2);
    const c1 = Math.min(selRange.c1, selRange.c2), c2 = Math.max(selRange.c1, selRange.c2);
    return r >= r1 && r <= r2 && c >= c1 && c <= c2;
  }, [selRange]);

  // ── Keyboard ──
  const onGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingCell) return;

    const navMap: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0],
      ArrowLeft: [0, -1], ArrowRight: [0, 1],
      Tab: [0, 1], Enter: [1, 0],
    };

    if (navMap[e.key]) {
      e.preventDefault();
      moveSel(...navMap[e.key], e.shiftKey && e.key.startsWith('Arrow'));
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const ids = selRange ? getRangeIds(selRange) : [curId];
      setAllCells((prev) => {
        const s = { ...(prev[activeSheet] || {}) };
        ids.forEach((id) => {
          if (s[id]) s[id] = { ...s[id], value: '', formula: null };
        });
        return { ...prev, [activeSheet]: s };
      });
      return;
    }

    if (e.key === 'F2') { startEdit(curId); return; }
    if (e.key === 'Escape') { setSelRange(null); return; }

    // Start typing to edit
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      startEdit(curId, e.key);
    }
  }, [editingCell, selRange, curId, activeSheet, moveSel, startEdit]);

  const onEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitEdit(editingCell, editVal);
      moveSel(1, 0);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit(editingCell, editVal);
      moveSel(0, e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      cancelEdit();
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !editVal.startsWith('=')) {
      commitEdit(editingCell, editVal);
      moveSel(e.key === 'ArrowUp' ? -1 : 1, 0);
    }
  }, [editingCell, editVal, commitEdit, cancelEdit, moveSel]);

  // ── Column select from header (prevents grid text selection) ──
  const selectColumn = (c: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (editingCell) commitEdit(editingCell, editVal);
    setSel({ r: 0, c });
    setSelRange({ r1: 0, c1: c, r2: ROWS - 1, c2: c });
    gridRef.current?.focus();
  };

  const selectRow = (r: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (editingCell) commitEdit(editingCell, editVal);
    setSel({ r, c: 0 });
    setSelRange({ r1: r, c1: 0, r2: r, c2: COLS - 1 });
    gridRef.current?.focus();
  };

  // ── Column resize ──
  const startColResize = (e: React.MouseEvent, c: number) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX;
    const sw = getColW(activeSheet, c);
    const onMove = (mv: MouseEvent) => setColW(activeSheet, c, Math.max(40, sw + mv.clientX - sx));
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Format helpers ──
  const getRangeIds = useCallback((rng: SelRange) => {
    const a: string[] = [];
    const r1 = Math.min(rng.r1, rng.r2), r2 = Math.max(rng.r1, rng.r2);
    const c1 = Math.min(rng.c1, rng.c2), c2 = Math.max(rng.c1, rng.c2);
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) a.push(getCellId(r, c));
    return a;
  }, []);

  const toggleFmt = (key: 'bold' | 'italic' | 'underline') => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      const anyOff = ids.some((id) => !s[id]?.[key]);
      ids.forEach((id) => { s[id] = { ...(s[id] || { value: '' }), [key]: anyOff }; });
      return { ...prev, [activeSheet]: s };
    });
  };

  const setTextColor = (color: string) => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      ids.forEach((id) => { s[id] = { ...(s[id] || { value: '' }), color }; });
      return { ...prev, [activeSheet]: s };
    });
  };

  const setBgColor = (color: string) => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      ids.forEach((id) => { s[id] = { ...(s[id] || { value: '' }), bgColor: color }; });
      return { ...prev, [activeSheet]: s };
    });
  };

  const setAlign = (v: Cell['align']) => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      ids.forEach((id) => { s[id] = { ...(s[id] || { value: '' }), align: v }; });
      return { ...prev, [activeSheet]: s };
    });
  };

  const setFontSize = (size: number) => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      ids.forEach((id) => { s[id] = { ...(s[id] || { value: '' }), fontSize: size }; });
      return { ...prev, [activeSheet]: s };
    });
  };

  const toggleBorder = () => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      const anyOff = ids.some((id) => !s[id]?.border);
      ids.forEach((id) => { s[id] = { ...(s[id] || { value: '' }), border: anyOff }; });
      return { ...prev, [activeSheet]: s };
    });
  };

  const adjustDecimals = (delta: number) => {
    const ids = selRange ? getRangeIds(selRange) : [curId];
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      ids.forEach((id) => {
        const current = s[id]?.decimals ?? -1;
        const newVal = Math.max(0, (current === -1 ? 0 : current) + delta);
        s[id] = { ...(s[id] || { value: '' }), decimals: newVal };
      });
      return { ...prev, [activeSheet]: s };
    });
  };

  const mergeCells = () => {
    if (!selRange) {
      const cell = getCell(curId);
      if ((cell.rowSpan || 1) > 1 || (cell.colSpan || 1) > 1) {
        setAllCells((prev) => {
          const s = { ...(prev[activeSheet] || {}) };
          const rSpan = cell.rowSpan || 1, cSpan = cell.colSpan || 1;
          for (let r = sel.r; r < sel.r + rSpan; r++) {
            for (let c = sel.c; c < sel.c + cSpan; c++) {
              const id = getCellId(r, c);
              if (s[id]) {
                const { rowSpan, colSpan, hidden, ...rest } = s[id];
                s[id] = rest as Cell;
              }
            }
          }
          return { ...prev, [activeSheet]: s };
        });
      }
      return;
    }

    const r1 = Math.min(selRange.r1, selRange.r2), r2 = Math.max(selRange.r1, selRange.r2);
    const c1 = Math.min(selRange.c1, selRange.c2), c2 = Math.max(selRange.c1, selRange.c2);
    const topLeftId = getCellId(r1, c1);

    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      s[topLeftId] = { ...(s[topLeftId] || { value: '' }), rowSpan: r2 - r1 + 1, colSpan: c2 - c1 + 1, hidden: false };
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          if (r === r1 && c === c1) continue;
          const id = getCellId(r, c);
          s[id] = { ...(s[id] || { value: '' }), hidden: true, rowSpan: undefined, colSpan: undefined };
        }
      }
      return { ...prev, [activeSheet]: s };
    });
    setSelRange(null);
    setSel({ r: r1, c: c1 });
  };

  const insertFunction = (fn: string) => {
    startEdit(curId, `=${fn}(`);
    setTimeout(() => {
      if (inputRef.current) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 10);
  };

  // ── Fill Down (drag fill handle) ──
  const fillDown = () => {
    if (!selRange) return;
    const r1 = Math.min(selRange.r1, selRange.r2);
    const r2 = Math.max(selRange.r1, selRange.r2);
    const c1 = Math.min(selRange.c1, selRange.c2);
    const c2 = Math.max(selRange.c1, selRange.c2);
    // Copy first row down
    setAllCells((prev) => {
      const s = { ...(prev[activeSheet] || {}) };
      for (let c = c1; c <= c2; c++) {
        const srcCell = s[getCellId(r1, c)] || { value: '' };
        for (let r = r1 + 1; r <= r2; r++) {
          const destId = getCellId(r, c);
          // Offset formula if it has cell refs
          if (srcCell.formula) {
            const offset = r - r1;
            const newFormula = srcCell.formula.replace(/([A-Z]+)(\d+)/g, (_, col, row) => {
              return `${col}${parseInt(row) + offset}`;
            });
            s[destId] = { ...(s[getCellId(r1, c)] || {}), formula: newFormula, value: '' };
          } else {
            s[destId] = { ...(s[getCellId(r1, c)] || {}) };
          }
        }
      }
      return { ...prev, [activeSheet]: s };
    });
  };

  // ── Charts ──
  const insertChart = (cfg: Omit<ChartConfig, 'id' | 'pos' | 'size'>) => {
    const id = Date.now();
    setAllCharts((p) => ({
      ...p,
      [activeSheet]: [
        ...(p[activeSheet] || []),
        { ...cfg, id, pos: { x: 100, y: 80 }, size: { w: 440, h: 300 } },
      ],
    }));
    setShowChartModal(false);
  };

  const removeChart = (id: number) =>
    setAllCharts((p) => ({ ...p, [activeSheet]: (p[activeSheet] || []).filter((c) => c.id !== id) }));

  const updateChartPosSize = (id: number, pos: { x: number; y: number }, size: { w: number; h: number }) => {
    setAllCharts((p) => ({
      ...p,
      [activeSheet]: (p[activeSheet] || []).map((c) => c.id === id ? { ...c, pos, size } : c),
    }));
  };

  // ── Sheets ──
  const addSheet = () => {
    if (sheets.length >= 5) return;
    const id = Date.now();
    setSheets((s) => [...s, { id, name: `Hoja ${s.length + 1}` }]);
    setActiveSheet(id);
  };

  const renameSheet = (id: number, name: string) =>
    setSheets((s) => s.map((sh) => (sh.id === id ? { ...sh, name: name || sh.name } : sh)));

  const deleteSheet = (id: number) => {
    if (sheets.length === 1) return;
    setSheets((s) => {
      const ns = s.filter((sh) => sh.id !== id);
      if (activeSheet === id) setActiveSheet(ns[ns.length - 1].id);
      return ns;
    });
    setAllCells((p) => { const n = { ...p }; delete n[id]; return n; });
    setAllCharts((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  // ── Scroll to current cell ──
  useEffect(() => {
    const el = document.getElementById(`cell-${curId}`);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [sel, curId]);

  // ── Computed values ──
  const refName = selRange
    ? `${getCellId(Math.min(selRange.r1, selRange.r2), Math.min(selRange.c1, selRange.c2))}:${getCellId(Math.max(selRange.r1, selRange.r2), Math.max(selRange.c1, selRange.c2))}`
    : curId;

  const formulaBarVal = editingCell === curId
    ? editVal
    : (curCell.formula || curCell.value || '');

  // Selection stats for status bar
  const selectionStats = useMemo(() => {
    if (!selRange) return null;
    const ids = getRangeIds(selRange);
    const vals = ids
      .map(id => parseFloat(getRaw(id, cells)))
      .filter(v => !isNaN(v));
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      count: ids.length,
      numCount: vals.length,
      sum: parseFloat(sum.toPrecision(10)),
      avg: parseFloat((sum / vals.length).toPrecision(8)),
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  }, [selRange, cells, getRangeIds]);

  // ── Styles ──
  const surfaceCls  = dm ? 'bg-slate-800' : 'bg-white';
  const borderCls   = dm ? 'border-slate-700' : 'border-gray-200';
  const headerBgCls = dm ? 'bg-slate-900' : 'bg-gray-50';
  const textCls     = dm ? 'text-slate-100' : 'text-gray-800';
  const subTextCls  = dm ? 'text-slate-400' : 'text-gray-500';
  const hoverBtnCls = dm ? 'hover:bg-slate-700' : 'hover:bg-gray-100';
  const tbBtnBase   = `flex items-center gap-1 px-1.5 py-1 rounded text-[13px] h-7 whitespace-nowrap border-none cursor-pointer bg-transparent transition-colors ${dm ? 'text-slate-200' : 'text-gray-700'} ${hoverBtnCls}`;
  const tbBtnActive = dm ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700';

  return (
    <div
      className={`flex flex-col h-full w-full overflow-hidden text-[13px] ${surfaceCls} ${textCls}`}
      style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
    >
      {/* ── Toolbar ── */}
      <div className={`flex items-center gap-0.5 px-2 py-1 border-b flex-wrap shrink-0 ${borderCls} ${surfaceCls}`}>
        {/* Font size */}
        <select
          value={curCell.fontSize || 13}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className={`border rounded px-1 py-0.5 text-[12px] h-6 cursor-pointer outline-none ${dm ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-gray-300 text-gray-700'}`}
        >
          {[8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className={`w-px h-5 mx-0.5 ${dm ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Bold / Italic / Underline */}
        <button className={`${tbBtnBase} font-bold w-7 justify-center ${curCell.bold ? tbBtnActive : ''}`} onClick={() => toggleFmt('bold')} title="Negrita (Ctrl+B)">B</button>
        <button className={`${tbBtnBase} italic w-7 justify-center ${curCell.italic ? tbBtnActive : ''}`} onClick={() => toggleFmt('italic')} title="Cursiva (Ctrl+I)">I</button>
        <button className={`${tbBtnBase} underline w-7 justify-center ${curCell.underline ? tbBtnActive : ''}`} onClick={() => toggleFmt('underline')} title="Subrayado">U</button>

        <div className={`w-px h-5 mx-0.5 ${dm ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Text color */}
        <div className="relative" title="Color de texto">
          <div className={`w-6 h-6 rounded cursor-pointer border flex flex-col items-center justify-center overflow-hidden ${dm ? 'border-slate-600' : 'border-gray-300'}`}>
            <span className={`text-[11px] font-bold leading-none ${textCls}`}>A</span>
            <div className="h-1.5 w-full mt-0.5" style={{ backgroundColor: curCell.color || (dm ? '#e2e8f0' : '#1a202c') }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => setTextColor(e.target.value)} />
          </div>
        </div>

        {/* Background color */}
        <div className="relative" title="Color de fondo">
          <div className={`w-6 h-6 rounded cursor-pointer border flex flex-col items-center justify-center overflow-hidden ${dm ? 'border-slate-600' : 'border-gray-300'}`}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill={dm ? '#94a3b8' : '#6b7280'}>
              <path d="M13.5 2H8L2 8l6 6 5.5-5.5V2zm-5 1.5L12 7H8V3.5z"/>
            </svg>
            <div className="h-1.5 w-full mt-0.5" style={{ backgroundColor: curCell.bgColor || 'transparent', border: curCell.bgColor ? 'none' : `1px solid ${dm ? '#4a5568' : '#e2e8f0'}` }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => setBgColor(e.target.value)} />
          </div>
        </div>

        <div className={`w-px h-5 mx-0.5 ${dm ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Alignment */}
        <button className={`${tbBtnBase} w-6 justify-center ${!curCell.align || curCell.align === 'left' ? tbBtnActive : ''}`} onClick={() => setAlign('left')} title="Izquierda">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2"/><rect x="1" y="7" width="9" height="2"/><rect x="1" y="12" width="11" height="2"/></svg>
        </button>
        <button className={`${tbBtnBase} w-6 justify-center ${curCell.align === 'center' ? tbBtnActive : ''}`} onClick={() => setAlign('center')} title="Centro">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2"/><rect x="3.5" y="7" width="9" height="2"/><rect x="2.5" y="12" width="11" height="2"/></svg>
        </button>
        <button className={`${tbBtnBase} w-6 justify-center ${curCell.align === 'right' ? tbBtnActive : ''}`} onClick={() => setAlign('right')} title="Derecha">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2"/><rect x="6" y="7" width="9" height="2"/><rect x="4" y="12" width="11" height="2"/></svg>
        </button>

        <div className={`w-px h-5 mx-0.5 ${dm ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Borders */}
        <button className={`${tbBtnBase} w-6 justify-center ${curCell.border ? tbBtnActive : ''}`} onClick={toggleBorder} title="Bordes">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="14" height="14" rx="1"/><line x1="1" y1="8" x2="15" y2="8"/><line x1="8" y1="1" x2="8" y2="15"/></svg>
        </button>

        {/* Decimals */}
        <button className={`${tbBtnBase} px-2 font-mono text-[11px]`} onClick={() => adjustDecimals(-1)} title="Menos decimales">.0</button>
        <button className={`${tbBtnBase} px-2 font-mono text-[11px]`} onClick={() => adjustDecimals(1)} title="Más decimales">.00</button>

        <div className={`w-px h-5 mx-0.5 ${dm ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Merge */}
        <button
          className={`${tbBtnBase} w-6 justify-center ${(curCell.rowSpan || 1) > 1 || (curCell.colSpan || 1) > 1 ? tbBtnActive : ''}`}
          onClick={mergeCells}
          title="Combinar/Separar celdas"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="14" height="14" rx="1"/>
            <line x1="5" y1="1" x2="5" y2="15"/><line x1="11" y1="1" x2="11" y2="15"/>
            <line x1="1" y1="5" x2="15" y2="5"/><line x1="1" y1="11" x2="15" y2="11"/>
          </svg>
        </button>

        {/* Fill Down */}
        {selRange && (
          <button className={`${tbBtnBase} px-2 text-[11px]`} onClick={fillDown} title="Rellenar hacia abajo">
            ↓ Rellenar
          </button>
        )}

        <div className={`w-px h-5 mx-0.5 ${dm ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {/* Insert chart */}
        <button
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[12px] font-medium border cursor-pointer h-6 text-[#188038] bg-transparent transition-colors ${dm ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-300 hover:bg-green-50'}`}
          onClick={() => setShowChartModal(true)}
          title="Insertar gráfica"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#188038" strokeWidth="2.5">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
            <line x1="2" y1="20" x2="22" y2="20"/>
          </svg>
          Insertar gráfica
        </button>

        {/* Functions dropdown */}
        <div className="relative group">
          <button className={`${tbBtnBase} px-2 font-bold text-[#188038] text-base`} title="Insertar función">∑</button>
          <div className={`absolute left-0 top-full mt-0.5 w-36 py-1 rounded shadow-xl hidden group-hover:block z-50 border ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            {['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'ROUND', 'ABS', 'SQRT'].map((fn) => (
              <button
                key={fn}
                onClick={() => insertFunction(fn)}
                className={`block w-full text-left px-3 py-1.5 text-[12px] transition-colors ${dm ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {fn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Formula bar ── */}
      <div className={`flex items-center border-b h-7 shrink-0 ${borderCls} ${surfaceCls}`}>
        <div className={`min-w-[68px] px-2 flex items-center justify-center font-mono text-[12px] font-bold h-full border-r ${borderCls} ${headerBgCls} ${textCls}`}>
          {refName}
        </div>
        <div className={`w-7 flex items-center justify-center italic font-bold text-base text-[#188038] h-full border-r ${borderCls}`}>
          ƒ
        </div>
        <input
          type="text"
          value={formulaBarVal}
          onChange={(e) => {
            if (editingCell === curId) setEditVal(e.target.value);
            else startEdit(curId, e.target.value);
          }}
          onKeyDown={editingCell === curId ? onEditKeyDown : undefined}
          onFocus={() => { if (!editingCell) startEdit(curId); }}
          placeholder="Escribe un valor o =FORMULA"
          className={`flex-1 border-none outline-none px-2 font-mono text-[12px] h-full bg-transparent ${textCls}`}
        />
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto relative"
          onClick={(e) => {
            if ((e.target as HTMLElement) === scrollContainerRef.current) setSelectedChart(null);
          }}
        >
          {/* Floating charts */}
          {charts.map((chart) => (
            <FloatingChart
              key={chart.id}
              chart={chart}
              cells={cells}
              darkMode={dm}
              selected={selectedChart === chart.id}
              onSelect={() => setSelectedChart(chart.id)}
              onRemove={() => removeChart(chart.id)}
              onPositionChange={updateChartPosSize}
            />
          ))}

          {/* Table */}
          <div
            ref={gridRef}
            tabIndex={0}
            onKeyDown={onGridKeyDown}
            className="outline-none"
            style={{ display: 'inline-block', minWidth: '100%', userSelect: 'none' }}
          >
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content' }}>
              <colgroup>
                <col style={{ width: HEADER_W, minWidth: HEADER_W }} />
                {Array.from({ length: COLS }).map((_, c) => (
                  <col key={c} style={{ width: getColW(activeSheet, c), minWidth: 30 }} />
                ))}
              </colgroup>

              <thead>
                <tr style={{ height: ROW_H }}>
                  {/* Corner cell */}
                  <th
                    className={`sticky top-0 left-0 z-20 border-r border-b select-none ${dm ? 'bg-slate-900 border-slate-600' : 'bg-gray-100 border-gray-300'}`}
                    style={{ width: HEADER_W }}
                    onClick={(e) => {
                      e.preventDefault();
                      if (editingCell) commitEdit(editingCell, editVal);
                      setSel({ r: 0, c: 0 });
                      setSelRange({ r1: 0, c1: 0, r2: ROWS - 1, c2: COLS - 1 });
                      gridRef.current?.focus();
                    }}
                  />
                  {Array.from({ length: COLS }).map((_, c) => {
                    const isColSelected = selRange
                      ? Math.min(selRange.c1, selRange.c2) <= c && c <= Math.max(selRange.c1, selRange.c2)
                      : sel.c === c;
                    return (
                      <th
                        key={c}
                        className={`sticky top-0 z-10 text-[11px] font-semibold text-center select-none border-b border-r relative cursor-pointer transition-colors
                          ${dm
                            ? isColSelected ? 'bg-slate-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                            : isColSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
                          }`}
                        style={{ width: getColW(activeSheet, c), height: ROW_H }}
                        onMouseDown={(e) => selectColumn(c, e)}
                      >
                        {getColumnLabel(c)}
                        <div
                          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-10 hover:bg-blue-400 transition-colors"
                          onMouseDown={(e) => startColResize(e, c)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {Array.from({ length: ROWS }).map((_, r) => {
                  const isRowSelected = selRange
                    ? Math.min(selRange.r1, selRange.r2) <= r && r <= Math.max(selRange.r1, selRange.r2)
                    : sel.r === r;
                  return (
                    <tr key={r} style={{ height: ROW_H }}>
                      {/* Row header */}
                      <td
                        className={`sticky left-0 z-10 text-[11px] font-semibold text-center select-none border-b border-r cursor-pointer transition-colors
                          ${dm
                            ? isRowSelected ? 'bg-slate-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                            : isRowSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
                          }`}
                        style={{ width: HEADER_W, height: ROW_H }}
                        onMouseDown={(e) => selectRow(r, e)}
                      >
                        {r + 1}
                      </td>

                      {Array.from({ length: COLS }).map((_, c) => {
                        const id = getCellId(r, c);
                        const cell = getCell(id);

                        if (cell.hidden) return null;

                        const rawDisplay = getRaw(id, cells);
                        const isSel = sel.r === r && sel.c === c;
                        const inRng = isInRange(r, c);
                        const editing = editingCell === id;
                        const fontSize = cell.fontSize || 13;

                        // Format display value
                        let displayVal = rawDisplay;
                        const numVal = parseFloat(rawDisplay);
                        if (!isNaN(numVal)) {
                          displayVal = formatNumber(rawDisplay, cell.decimals);
                        }

                        // Cell background
                        let cellBg = dm ? '#0f172a' : '#ffffff';
                        if (cell.bgColor) cellBg = cell.bgColor;
                        else if (isSel && !inRng) cellBg = dm ? '#1e3a5f' : '#e8f0fe';
                        else if (inRng) cellBg = dm ? '#1e3a5f' : '#e8f0fe';

                        return (
                          <td
                            key={id}
                            id={`cell-${id}`}
                            className={`overflow-hidden whitespace-nowrap p-0 cursor-default relative
                              ${dm ? 'border-slate-800' : 'border-gray-200'} border-b border-r
                              ${isSel ? 'outline outline-2 outline-[#1a73e8] outline-offset-[-2px] z-[5]' : ''}
                            `}
                            colSpan={cell.colSpan}
                            rowSpan={cell.rowSpan}
                            style={{
                              width: getColW(activeSheet, c),
                              height: ROW_H,
                              fontWeight: cell.bold ? 700 : 400,
                              fontStyle: cell.italic ? 'italic' : 'normal',
                              textDecoration: cell.underline ? 'underline' : 'none',
                              textAlign: cell.align || 'left',
                              boxShadow: cell.border ? `inset 0 0 0 1px ${dm ? '#94a3b8' : '#374151'}` : undefined,
                              fontSize: `${fontSize}px`,
                              color: cell.color || (dm ? '#e2e8f0' : '#1a202c'),
                              backgroundColor: cellBg,
                            }}
                            onMouseDown={(e) => {
                              if ((e.target as HTMLElement).classList.contains('fill-handle')) return;
                              isMouseDownRef.current = true;
                              if (e.detail === 2) {
                                startEdit(id);
                              } else {
                                clickCell(r, c, e.shiftKey, e);
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (isMouseDownRef.current && e.buttons === 1) {
                                setSelRange((rng) =>
                                  rng
                                    ? { ...rng, r2: r, c2: c }
                                    : { r1: sel.r, c1: sel.c, r2: r, c2: c }
                                );
                                setSel({ r, c });
                              }
                            }}
                            onMouseUp={() => { isMouseDownRef.current = false; }}
                          >
                            {editing ? (
                              <input
                                ref={inputRef}
                                type="text"
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                onKeyDown={onEditKeyDown}
                                onBlur={() => commitEdit(id, editVal)}
                                className={`absolute inset-0 w-full border-none outline-none px-1 bg-white dark:bg-slate-800 z-10`}
                                style={{
                                  height: ROW_H,
                                  fontWeight: cell.bold ? 700 : 400,
                                  fontStyle: cell.italic ? 'italic' : 'normal',
                                  textAlign: cell.align || 'left',
                                  fontSize: `${fontSize}px`,
                                  color: cell.color || (dm ? '#e2e8f0' : '#1a202c'),
                                  fontFamily: 'inherit',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                }}
                              />
                            ) : (
                              <div
                                className={`px-1 overflow-hidden text-ellipsis whitespace-nowrap flex items-center ${
                                  rawDisplay.startsWith('#') && rawDisplay.includes('!')
                                    ? 'text-red-500'
                                    : cell.formula
                                      ? (dm ? 'text-blue-300' : 'text-blue-600')
                                      : ''
                                }`}
                                style={{
                                  height: ROW_H,
                                  justifyContent: cell.align === 'right' ? 'flex-end'
                                    : cell.align === 'center' ? 'center' : 'flex-start',
                                  fontSize: `${fontSize}px`,
                                }}
                              >
                                {displayVal}
                              </div>
                            )}
                            {/* Fill handle — only on bottom-right of selection anchor or single selected */}
                            {isSel && !editing && (
                              <div
                                className="fill-handle absolute right-0 bottom-0 w-3 h-3 bg-[#1a73e8] cursor-crosshair z-10"
                                style={{ transform: 'translate(50%, 50%)' }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  fillStartRef.current = { r, c };
                                  const onMove = (mv: MouseEvent) => {
                                    const target = document.elementFromPoint(mv.clientX, mv.clientY);
                                    if (target) {
                                      const cellEl = target.closest('[id^="cell-"]');
                                      if (cellEl) {
                                        const cid = cellEl.id.replace('cell-', '');
                                        const ref = parseRef(cid);
                                        if (ref) {
                                          setSelRange({ r1: r, c1: c, r2: ref.row, c2: ref.col });
                                        }
                                      }
                                    }
                                  };
                                  const onUp = () => {
                                    fillDown();
                                    window.removeEventListener('mousemove', onMove);
                                    window.removeEventListener('mouseup', onUp);
                                  };
                                  window.addEventListener('mousemove', onMove);
                                  window.addEventListener('mouseup', onUp);
                                }}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Status bar ── */}
        <div className={`h-6 flex items-center justify-between px-3 border-t text-[11px] shrink-0 ${borderCls} ${dm ? 'bg-slate-900 text-slate-500' : 'bg-gray-50 text-gray-400'}`}>
          <div className="flex items-center gap-1">
            {selectionStats && (
              <span>
                Suma: <strong className={dm ? 'text-slate-300' : 'text-gray-600'}>{selectionStats.sum}</strong>
                {' · '}Promedio: <strong className={dm ? 'text-slate-300' : 'text-gray-600'}>{selectionStats.avg}</strong>
                {' · '}Min: <strong className={dm ? 'text-slate-300' : 'text-gray-600'}>{selectionStats.min}</strong>
                {' · '}Max: <strong className={dm ? 'text-slate-300' : 'text-gray-600'}>{selectionStats.max}</strong>
                {' · '}Número: <strong className={dm ? 'text-slate-300' : 'text-gray-600'}>{selectionStats.numCount}</strong>
              </span>
            )}
          </div>
          <span>{curId}</span>
        </div>

        {/* ── Sheet tabs ── */}
        <div className={`h-8 border-t flex items-stretch overflow-hidden shrink-0 ${borderCls} ${headerBgCls}`}>
          <button
            onClick={addSheet}
            title="Nueva hoja"
            className={`w-8 flex items-center justify-center border-none border-r shrink-0 cursor-pointer bg-transparent ${borderCls} ${subTextCls} ${hoverBtnCls}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          <div className="flex items-stretch flex-1 overflow-x-auto overflow-y-hidden">
            {sheets.map((sheet) => (
              <div key={sheet.id} className="relative flex items-stretch shrink-0">
                {renamingSheet === sheet.id ? (
                  <input
                    autoFocus
                    defaultValue={sheet.name}
                    className={`w-24 px-2 border-2 border-[#1a73e8] rounded-sm text-[12px] outline-none ${dm ? 'bg-slate-800 text-slate-100' : 'bg-white text-gray-800'}`}
                    onBlur={(e) => { renameSheet(sheet.id, e.target.value); setRenamingSheet(null); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { renameSheet(sheet.id, (e.target as HTMLInputElement).value); setRenamingSheet(null); }
                      if (e.key === 'Escape') setRenamingSheet(null);
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setActiveSheet(sheet.id)}
                    onDoubleClick={() => setRenamingSheet(sheet.id)}
                    className={`flex items-center h-full text-[12px] font-medium border-none cursor-pointer border-r transition-colors px-4 pr-8
                      ${activeSheet === sheet.id
                        ? `${surfaceCls} text-[#1a73e8] border-t-2 border-t-[#1a73e8]`
                        : `${headerBgCls} ${subTextCls} border-t-2 border-t-transparent ${hoverBtnCls}`
                      } ${borderCls}`}
                  >
                    {sheet.name}
                  </button>
                )}
                {sheets.length > 1 && activeSheet === sheet.id && renamingSheet !== sheet.id && (
                  <button
                    onClick={() => deleteSheet(sheet.id)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400 hover:text-red-500 text-sm leading-none p-0.5 transition-colors"
                    title="Eliminar hoja"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart modal ── */}
      {showChartModal && (
        <ChartModal
          darkMode={dm}
          cells={cells}
          selRange={selRange}
          onClose={() => setShowChartModal(false)}
          onInsert={insertChart}
        />
      )}
    </div>
  );
}