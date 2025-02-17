import React from "react";

interface CouponUsageChartProps {
  total: number;
  unused: number;
  usedup: number;
  scale?: number;
}

const CouponUsageChart: React.FC<CouponUsageChartProps> = ({ total, unused, usedup, scale = 1 }) => {
  const used = total - unused - usedup;

  // Compute segment sizes as proportions of the total circumference
  const radius = 50; // Size of the arc
  const startX = 30;
  const endX = 120;
  const Y = 90;
  const arcPath = `M ${startX},${Y} A ${radius},${radius} 0 1,1 ${endX},${Y}`;

  const chordLength = endX - startX;
  const smallAngle = 2 * Math.asin(chordLength / (2 * radius));
  const theta = (Math.PI * 2) - smallAngle;
  const circumference = radius * theta;

  const unusedLength = (unused / total) * circumference;
  const usedLength = (used / total) * circumference;
  const usedupLength = (usedup / total) * circumference;

  const strokeWidth = 16;

  const svgWidth = 150 * scale;
  const svgHeight = 100 * scale;
  return (
    <svg width={svgWidth} height={svgHeight} viewBox="0 0 150 100">
      <path
        d={arcPath}
        fill="none"
        stroke="#ddd"
        strokeWidth={strokeWidth}
      />
      <path
        d={arcPath}
        fill="none"
        stroke="#4caf50"
        strokeWidth={strokeWidth}
        strokeDasharray={`${unusedLength} ${circumference}`}
        strokeDashoffset={0}
      />
      <path
        d={arcPath}
        fill="none"
        stroke="#ff9800"
        strokeWidth={strokeWidth}
        strokeDasharray={`${usedLength} ${circumference}`}
        strokeDashoffset={-unusedLength}
      />
      <path
        d={arcPath}
        fill="none"
        stroke="#f44336"
        strokeWidth={strokeWidth}
        strokeDasharray={`${usedupLength} ${circumference}`}
        strokeDashoffset={-(unusedLength + usedLength)}
      />
    </svg>
  );
};

export default CouponUsageChart;
