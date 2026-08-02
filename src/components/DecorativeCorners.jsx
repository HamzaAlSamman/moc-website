import React from "react";

export default function DecorativeCorners({ className = "" }) {
  return (
    <div className={className}>
      {/* Top Left */}
      <div className="absolute top-2.5 left-2.5 w-6 h-6 pointer-events-none z-10 border-t-2 border-l-2 border-[#B9A779]/80 rounded-tl-sm transition-all duration-300 group-hover:top-2 group-hover:left-2"></div>
      
      {/* Top Right */}
      <div className="absolute top-2.5 right-2.5 w-6 h-6 pointer-events-none z-10 border-t-2 border-r-2 border-[#B9A779]/80 rounded-tr-sm transition-all duration-300 group-hover:top-2 group-hover:right-2"></div>
      
      {/* Bottom Left */}
      <div className="absolute bottom-2.5 left-2.5 w-6 h-6 pointer-events-none z-10 border-b-2 border-l-2 border-[#B9A779]/80 rounded-bl-sm transition-all duration-300 group-hover:bottom-2 group-hover:left-2"></div>
      
      {/* Bottom Right */}
      <div className="absolute bottom-2.5 right-2.5 w-6 h-6 pointer-events-none z-10 border-b-2 border-r-2 border-[#B9A779]/80 rounded-br-sm transition-all duration-300 group-hover:bottom-2 group-hover:right-2"></div>
    </div>
  );
}
