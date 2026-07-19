import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Button from "../common/Button";
import "../../styles/HeroMotionGraphics.css";
import "boxicons/css/boxicons.min.css";

const floatingAnimation = {
  animate: {
    y: [0, -15, 0],
    rotateX: [0, 2, -2, 0],
    rotateY: [0, -2, 2, 0],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
  }
};

const pulseAnimation = {
  animate: {
    scale: [1, 1.15, 1],
    opacity: [0.4, 0.7, 0.4],
    transition: { duration: 5, repeat: Infinity, ease: "easeInOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
};

export default function HeroMotionGraphics() {
  const navigate = useNavigate();

  return (
    <div className="hero-motion-wrapper">
      {/* Ambient Glowing Orbs */}
      <motion.div className="ambient-orb orb-orange" variants={pulseAnimation} animate="animate" />
      <motion.div className="ambient-orb orb-rose" variants={pulseAnimation} animate="animate" style={{ animationDelay: "2s" }} />
      <motion.div className="ambient-orb orb-cyan" variants={pulseAnimation} animate="animate" style={{ animationDelay: "1s" }} />

      <div className="hero-content-grid">
        
        {/* Left: Text & CTA */}
        <motion.div 
          className="hero-text-section"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div className="hero-badge neon-badge-pulse" variants={fadeUp}>
            <i className="bx bx-shield-quarter" />
            Next-Gen Complaint Resolution
          </motion.div>
          
          <motion.h1 className="hero-title" variants={fadeUp}>
            Resolve Issues with 
            <br />
            <span className="hero-gradient-text">Absolute Velocity</span>
          </motion.h1>
          
          <motion.p className="hero-subtitle" variants={fadeUp}>
            The spatial-first platform designed to streamline, track, and close complaints instantly. Experience the future of workflow management.
          </motion.p>
          
          <motion.div className="hero-cta-group" variants={fadeUp}>
            <Button className="hero-btn-primary" onClick={() => navigate("/auth", { state: { panel: "register" } })}>
              <i className="bx bx-rocket" /> Get Started Now
            </Button>
            <Button className="hero-btn-secondary" onClick={() => navigate("/auth", { state: { panel: "login" } })}>
              <i className="bx bx-log-in-circle" /> Access Portal
            </Button>
          </motion.div>
          
          <motion.div className="hero-stats-row" variants={fadeUp}>
            <div className="hero-micro-stat">
              <span className="hero-stat-num">99%</span>
              <span className="hero-stat-label">Resolution</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-micro-stat">
              <span className="hero-stat-num">24/7</span>
              <span className="hero-stat-label">Tracking</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-micro-stat">
              <div className="avatar-group">
                <div className="micro-avatar" style={{ background: "#3b82f6" }}></div>
                <div className="micro-avatar" style={{ background: "#e11d48", marginLeft: "-10px" }}></div>
                <div className="micro-avatar" style={{ background: "#22c55e", marginLeft: "-10px" }}></div>
              </div>
              <span className="hero-stat-label">10k+ Users</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Right: 3D Motion Graphics */}
        <div className="hero-visual-section">
          <div className="glass-perspective-container">
            
            {/* Main Central Dashboard Card */}
            <motion.div className="hero-glass-card main-card" variants={floatingAnimation} animate="animate">
              <div className="mockup-header">
                <span className="mockup-dot red"></span>
                <span className="mockup-dot yellow"></span>
                <span className="mockup-dot green"></span>
              </div>
              <div className="mockup-body">
                <div className="mockup-line title-line"></div>
                <div className="mockup-line subtitle-line"></div>
                
                <div className="mockup-chart-container">
                  <motion.div className="mockup-bar" initial={{ height: 0 }} animate={{ height: "60%" }} transition={{ duration: 1.5, delay: 0.2 }} />
                  <motion.div className="mockup-bar" initial={{ height: 0 }} animate={{ height: "90%" }} transition={{ duration: 1.5, delay: 0.4 }} />
                  <motion.div className="mockup-bar" initial={{ height: 0 }} animate={{ height: "40%" }} transition={{ duration: 1.5, delay: 0.6 }} />
                  <motion.div className="mockup-bar" initial={{ height: 0 }} animate={{ height: "100%" }} transition={{ duration: 1.5, delay: 0.8 }} />
                  <motion.div className="mockup-bar" initial={{ height: 0 }} animate={{ height: "70%" }} transition={{ duration: 1.5, delay: 1.0 }} />
                </div>
              </div>
            </motion.div>

            {/* Floating Accent Card - Left */}
            <motion.div className="hero-glass-card side-card-left" variants={floatingAnimation} animate="animate" style={{ animationDelay: "1s" }}>
              <div className="mockup-stat">
                <div className="pulse-ring">
                  <i className="bx bx-check-double neon-text-orange" />
                </div>
                <div className="stat-bars">
                  <div className="mockup-line title-line short"></div>
                  <div className="mockup-line subtitle-line short"></div>
                </div>
              </div>
            </motion.div>

            {/* Floating Accent Card - Right */}
            <motion.div className="hero-glass-card side-card-right" variants={floatingAnimation} animate="animate" style={{ animationDelay: "1.5s" }}>
              <div className="mockup-avatar-row">
                <div className="mockup-avatar">
                  <i className="bx bx-user" />
                </div>
                <div className="mockup-text-block">
                  <div className="mockup-line title-line short-mini"></div>
                  <div className="mockup-line subtitle-line short-mini"></div>
                </div>
              </div>
              <div className="mockup-badge">
                <i className="bx bx-check" /> Active
              </div>
            </motion.div>

          </div>
        </div>
        
      </div>
    </div>
  );
}
