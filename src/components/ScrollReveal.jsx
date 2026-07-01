"use client";

import React, { useEffect, useRef, useState } from "react";

export default function ScrollReveal({
  children,
  type = "up", // 'up', 'left', 'right', 'scale'
  delay = 0,   // 0, 100, 200, 300, 400, 500
  className = "",
}) {
  const [inView, setInView] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          // Once it's in view, we can stop observing it
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.1, // trigger when 10% of the element is visible
        rootMargin: "0px 0px -50px 0px", // offset to trigger slightly before/after crossing viewport edge
      }
    );

    const currentEl = elementRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
    };
  }, []);

  const revealClasses = {
    up: "reveal-on-scroll",
    left: "reveal-left-on-scroll",
    right: "reveal-right-on-scroll",
    scale: "reveal-scale-on-scroll",
  };

  const delayClasses = {
    0: "",
    100: "delay-100",
    200: "delay-200",
    300: "delay-300",
    400: "delay-400",
    500: "delay-500",
  };

  const revealClass = revealClasses[type] || revealClasses.up;
  const delayClass = delayClasses[delay] || "";
  const inViewClass = inView ? "in-view" : "";

  return (
    <div
      ref={elementRef}
      className={`${revealClass} ${delayClass} ${inViewClass} ${className}`}
    >
      {children}
    </div>
  );
}
