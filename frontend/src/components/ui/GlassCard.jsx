import React from "react";
import { motion } from "motion/react";

export function GlassCard({
  children,
  className = "",
  hoverEffect = true,
  onClick,
  ...props
}) {
  const hoverProps = hoverEffect
    ? {
        whileHover: { y: -2, transition: { duration: 0.2 } },
      }
    : {};

  return (
    <motion.div
      {...hoverProps}
      onClick={onClick}
      className={`glass-panel rounded-2xl p-5 shadow-xl transition-colors duration-200 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default GlassCard;
