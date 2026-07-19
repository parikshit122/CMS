import { useNavigate } from "react-router-dom";
import "../styles/Home.css";
import Button from "../components/common/Button";
import HeroMotionGraphics from "../components/layout/HeroMotionGraphics";
import "boxicons/css/boxicons.min.css";

function Home() {
  const navigate = useNavigate();

  const handleNavigation = (panel) => {
    navigate("/auth", { state: { panel } });
  };

  return (
    <div className="landing">
      <HeroMotionGraphics />

      <section className="stats-container">
        <div className="card">
          <i className="bx bx-check-circle stat-icon" />
          <h2>10,000+</h2>
          <p>Complaints Resolved</p>
        </div>

        <div className="card">
          <i className="bx bx-smile stat-icon" />
          <h2>98%</h2>
          <p>Satisfaction Rate</p>
        </div>

        <div className="card">
          <i className="bx bx-time-five stat-icon" />
          <h2>24/7</h2>
          <p>Support Available</p>
        </div>

        <div className="card">
          <i className="bx bx-buildings stat-icon" />
          <h2>50+</h2>
          <p>Organizations</p>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <div id="features" className="container1">
        <h1>
          <span>
            <i className="bx bx-star section-emoji" /> Everything You Need
          </span>
        </h1>
        <p>
          Powerful features to manage complaints efficiently and effectively,
          <br />
          user-friendly platform designed for organizations of all sizes.
        </p>
      </div>

      <section className="features-wrap">
        <div className="features-grid">
          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              <i className="bx bx-edit" />
            </div>
            <h3>Easy Submission</h3>
            <p>Submit complaints in minutes with our intuitive interface</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              <i className="bx bx-radar" />
            </div>
            <h3>Real-time Tracking</h3>
            <p>Track your complaint status 24/7 with live updates</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              <i className="bx bx-shield-quarter" />
            </div>
            <h3>Secure &amp; Private</h3>
            <p>Your data is encrypted and protected at all times</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              <i className="bx bx-bar-chart-alt-2" />
            </div>
            <h3>Analytics Dashboard</h3>
            <p>Get insights and reports on complaint trends</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              <i className="bx bx-group" />
            </div>
            <h3>Multi-role Support</h3>
            <p>Designed for users, staff, and administrators</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              <i className="bx bx-rocket" />
            </div>
            <h3>Fast Resolution</h3>
            <p>Streamlined workflow for quick issue resolution</p>
          </article>
        </div>
      </section>

      {/* ── WORKFLOW SECTION ── */}
      <div id="workflow" className="container1 workflow-header">
        <h1>
          <span>
            <i className="bx bx-git-branch section-emoji" /> How It Works
          </span>
        </h1>
        <p>
          A simple, streamlined process from complaint submission to resolution.
          <br />
          Follow your complaint every step of the way.
        </p>
      </div>

      <section className="workflow-wrap">
        <div className="workflow-grid">
          <article className="workflow-card">
            <div className="workflow-step">1</div>
            <div className="workflow-icon">
              <i className="bx bx-user-plus" />
            </div>
            <h3>Sign Up</h3>
            <p>Create your free account in seconds with email or social login</p>
          </article>

          <div className="workflow-arrow">
            <i className="bx bx-right-arrow-alt" />
          </div>

          <article className="workflow-card">
            <div className="workflow-step">2</div>
            <div className="workflow-icon">
              <i className="bx bx-edit-alt" />
            </div>
            <h3>Submit Complaint</h3>
            <p>File your complaint with details, attachments, and category</p>
          </article>

          <div className="workflow-arrow">
            <i className="bx bx-right-arrow-alt" />
          </div>

          <article className="workflow-card">
            <div className="workflow-step">3</div>
            <div className="workflow-icon">
              <i className="bx bx-search-alt" />
            </div>
            <h3>Track Progress</h3>
            <p>Monitor your complaint status in real-time with live updates</p>
          </article>

          <div className="workflow-arrow">
            <i className="bx bx-right-arrow-alt" />
          </div>

          <article className="workflow-card">
            <div className="workflow-step">4</div>
            <div className="workflow-icon">
              <i className="bx bx-check-double" />
            </div>
            <h3>Get Resolved</h3>
            <p>Receive notifications and confirmation when issue is resolved</p>
          </article>
        </div>
      </section>

      {/* ── READY TO START ── */}
      <section className="ready-container">
        <div className="ready">
          <h2>
            <i className="bx bx-rocket ready-icon" /> Ready to Get Started?
          </h2>
          <p>
            Join thousands of organizations that trust ComplaintSync for their
            <br />
            complaint management needs.
          </p>

          <div className="Button">
            <Button
              className="btn-home register-btn"
              onClick={() => handleNavigation("register")}
            >
              <i className="bx bx-user-plus" /> Create Free Account →
            </Button>
            <Button
              className="btn-home login-btn"
              onClick={() => handleNavigation("login")}
            >
              <i className="bx bx-log-in" /> Sign In Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;