import React from "react";

export default function DecorativeCorners() {
  return (
    <>
      {/* Top Left */}
      <div className="absolute top-4 left-4 w-8 h-8 pointer-events-none z-10 border-t-2 border-l-2 border-[#B9A779]/80 rounded-tl-sm transition-all duration-300 group-hover:top-3 group-hover:left-3"></div>
      
      {/* Top Right */}
      <div className="absolute top-4 right-4 w-8 h-8 pointer-events-none z-10 border-t-2 border-r-2 border-[#B9A779]/80 rounded-tr-sm transition-all duration-300 group-hover:top-3 group-hover:right-3"></div>
      
      {/* Bottom Left */}
      <div className="absolute bottom-4 left-4 w-8 h-8 pointer-events-none z-10 border-b-2 border-l-2 border-[#B9A779]/80 rounded-bl-sm transition-all duration-300 group-hover:bottom-3 group-hover:left-3"></div>
      
      {/* Bottom Right */}
      <div className="absolute bottom-4 right-4 w-8 h-8 pointer-events-none z-10 border-b-2 border-r-2 border-[#B9A779]/80 rounded-br-sm transition-all duration-300 group-hover:bottom-3 group-hover:right-3"></div>
    </>
  );
}
