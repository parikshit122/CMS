import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Button from "../common/Button";
import "../../styles/HeroMotionGraphics.css";
import "boxicons/css/boxicons.min.css";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
};

const CHART_BARS = [
  { height: "60%", delay: 0.1 },
  { height: "90%", delay: 0.18 },
  { height: "40%", delay: 0.26 },
  { height: "100%", delay: 0.34 },
  { height: "70%", delay: 0.42 },
];

export default function HeroMotionGraphics() {
  const navigate = useNavigate();

  return (
    <div className="hero-motion-wrapper">
      {/* Ambient Glowing Orbs (pure radial-gradient + CSS transform, no blur filter repaint) */}
      <div className="ambient-orb orb-orange" aria-hidden="true" />
      <div className="ambient-orb orb-rose" aria-hidden="true" />
      <div className="ambient-orb orb-cyan" aria-hidden="true" />
      <div className="hero-grid-overlay" aria-hidden="true" />
      <div className="hero-orbit hero-orbit-a" aria-hidden="true" />
      <div className="hero-orbit hero-orbit-b" aria-hidden="true" />

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

        {/* Right: 3D Motion Graphics (CSS GPU-composited float) */}
        <div className="hero-visual-section">
          <div className="glass-perspective-container">
            
            {/* Main Central Dashboard Card */}
            <div className="hero-glass-card main-card hero-float-card">
              <div className="mockup-header">
                <span className="mockup-dot red"></span>
                <span className="mockup-dot yellow"></span>
                <span className="mockup-dot green"></span>
              </div>
              <div className="mockup-body">
                <div className="mockup-kicker"><span className="mockup-live-dot" /> Live resolution overview</div>
                <div className="mockup-line title-line"></div>
                <div className="mockup-line subtitle-line"></div>
                
                <div className="mockup-chart-container">
                  {CHART_BARS.map((bar, idx) => (
                    <motion.div
                      key={idx}
                      className="mockup-bar"
                      style={{ height: bar.height, transformOrigin: "bottom" }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.7, delay: bar.delay, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ))}
                </div>
                <div className="mockup-footer-row">
                  <span>Weekly resolution</span>
                  <strong>+18.4%</strong>
                </div>
              </div>
            </div>

            {/* Floating Accent Card - Left */}
            <div className="hero-glass-card side-card-left hero-float-card-left">
              <div className="mockup-stat">
                <div className="pulse-ring">
                  <i className="bx bx-check-double neon-text-orange" />
                </div>
                <div className="stat-bars">
                  <div className="mockup-line title-line short"></div>
                  <div className="mockup-line subtitle-line short"></div>
                </div>
              </div>
            </div>

            {/* Floating Accent Card - Right */}
            <div className="hero-glass-card side-card-right hero-float-card-right">
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
            </div>

          </div>
        </div>
        
      </div>
    </div>
  );
}
