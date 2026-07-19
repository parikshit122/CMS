
import { useEffect, useRef } from 'react';

export default function use3DTilt(options = {}) {
  const ref = useRef(null);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const { max = 15, perspective = 1000, scale = 1.05, speed = 400, easing = 'cubic-bezier(.03,.98,.52,.99)' } = options;
    
    el.style.transition = "transform ${speed}ms ${easing}";
    el.style.transformStyle = 'preserve-3d';
    
    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left; // x position within the element
      const y = e.clientY - rect.top; // y position within the element
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -max;
      const rotateY = ((x - centerX) / centerX) * max;
      
      el.style.transform = "perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})";
    };
    
    const handleMouseLeave = () => {
      el.style.transform = "perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    };
    
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []); // Removing options to prevent re-renders

  return ref;
}
