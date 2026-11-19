import React, { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import { formatINR } from "../../utils/formatCurrency.js";

export function AnimatedCounter({ value, isCurrency = true, className = "" }) {
  const numericValue = typeof value === "number" ? value : parseFloat(value) || 0;

  const spring = useSpring(0, {
    mass: 0.8,
    stiffness: 75,
    damping: 15,
  });

  const display = useTransform(spring, (current) => {
    if (isCurrency) {
      return formatINR(current);
    }
    return Math.round(current).toLocaleString("en-IN");
  });

  const [currentDisplay, setCurrentDisplay] = useState(
    isCurrency ? formatINR(0) : "0"
  );

  useEffect(() => {
    spring.set(numericValue);
  }, [spring, numericValue]);

  useEffect(() => {
    const unsubscribe = display.on("change", (latest) => {
      setCurrentDisplay(latest);
    });
    return () => unsubscribe();
  }, [display]);

  return (
    <span className={`tabular-numbers font-mono font-semibold ${className}`}>
      {currentDisplay}
    </span>
  );
}

export default AnimatedCounter;
