import { motion } from "framer-motion";
import "../../styles/AuthMotionBackground.css";

const objects = [
  { id: 1, type: "ring", size: 120, top: "15%", left: "10%", duration: 25, delay: 0 },
  { id: 2, type: "square", size: 80, top: "65%", left: "85%", duration: 22, delay: 2 },
  { id: 3, type: "circle", size: 45, top: "35%", left: "80%", duration: 18, delay: 5 },
  { id: 4, type: "glass-panel", size: 150, top: "75%", left: "15%", duration: 30, delay: 1 },
  { id: 5, type: "ring", size: 70, top: "25%", left: "65%", duration: 20, delay: 3 },
  { id: 6, type: "square", size: 40, top: "10%", left: "45%", duration: 15, delay: 4 },
];

export default function AuthMotionBackground() {
  return (
    <div className="auth-motion-bg">
      {objects.map((obj) => (
        <motion.div
          key={obj.id}
          className={`floating-obj obj-${obj.type}`}
          style={{ width: obj.size, height: obj.size, top: obj.top, left: obj.left }}
          animate={{
            y: [0, -80, 40, 0],
            x: [0, 50, -50, 0],
            rotateZ: [0, 180, 360],
            rotateX: obj.type === "glass-panel" ? [20, 45, 20] : [0, 0, 0],
            rotateY: obj.type === "glass-panel" ? [-20, -45, -20] : [0, 0, 0],
          }}
          transition={{
            duration: obj.duration,
            repeat: Infinity,
            ease: "linear",
            delay: obj.delay,
          }}
        />
      ))}
    </div>
  );
}
