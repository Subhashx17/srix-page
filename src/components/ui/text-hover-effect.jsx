
"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";

export const TextHoverEffect = ({ text, duration }) => {
  const svgRef = useRef(null);

  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const [maskPosition, setMaskPosition] = useState({
    cx: "50%",
    cy: "50%",
  });

  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect();

      const cxPercentage =
        ((cursor.x - svgRect.left) / svgRect.width) * 100;

      const cyPercentage =
        ((cursor.y - svgRect.top) / svgRect.height) * 100;

      setMaskPosition({
        cx: `${cxPercentage}%`,
        cy: `${cyPercentage}%`,
      });
    }
  }, [cursor]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 1200 180"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) =>
        setCursor({ x: e.clientX, y: e.clientY })
      }
      className="select-none"
    >
      <defs>
        <linearGradient
          id="textGradient"
          gradientUnits="userSpaceOnUse"
          cx="50%"
          cy="50%"
          r="25%"
        >
          {hovered && (
            <>
              <stop offset="0%" stopColor="#9d9bf5" />
              <stop offset="25%" stopColor="#8fd0ae" />
              <stop offset="50%" stopColor="#c9c7ff" />
              <stop offset="75%" stopColor="#7fe3b8" />
              <stop offset="100%" stopColor="#7a77ee" />
            </>
          )}
        </linearGradient>

        <motion.radialGradient
          id="revealMask"
          gradientUnits="userSpaceOnUse"
          r="20%"
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{
            duration: duration ?? 0.25,
            ease: "easeOut",
          }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>

        <mask id="textMask">
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#revealMask)"
          />
        </mask>
      </defs>

      {/* Layer 1: Hover outline */}
      <text
        x="600"
        y="90"
        textAnchor="middle"
        dominantBaseline="middle"
        textLength="1100"
        lengthAdjust="spacingAndGlyphs"
        strokeWidth="0.3"
        className="hero-hover-svg-text"
        style={{ opacity: hovered ? 0.7 : 0 }}
      >
        {text}
      </text>

      {/* Layer 2: Initial animated outline */}
      <motion.text
        x="600"
        y="90"
        textAnchor="middle"
        dominantBaseline="middle"
        textLength="1100"
        lengthAdjust="spacingAndGlyphs"
        strokeWidth="0.3"
        className="hero-hover-svg-text"
        initial={{
          strokeDashoffset: 1000,
          strokeDasharray: 1000,
        }}
        animate={{
          strokeDashoffset: 0,
          strokeDasharray: 1000,
        }}
        transition={{
          duration: 4,
          ease: "easeInOut",
        }}
      >
        {text}
      </motion.text>

      {/* Layer 3: Cursor-following gradient */}
      <text
        x="600"
        y="90"
        textAnchor="middle"
        dominantBaseline="middle"
        textLength="1100"
        lengthAdjust="spacingAndGlyphs"
        stroke="url(#textGradient)"
        strokeWidth="0.3"
        mask="url(#textMask)"
        className="hero-hover-svg-text"
      >
        {text}
      </text>
    </svg>
  );
};
