import { useNavigate } from "react-router-dom";
import "../styles/Home.css";
import Button from "../components/common/Button";
import Image from "../assets/images/carousel/carousel1.png";
import "boxicons/css/boxicons.min.css";

function Home() {
  const navigate = useNavigate();

  const handleNavigation = (panel) => {
    navigate("/auth", { state: { panel } });
  };

  return (
    <div className="landing">
      <div className="hero-section w-100 overflow-hidden rounded-3">
        <div
          id="carouselExampleDark"
          className="carousel slide carousel-dark h-100"
          data-bs-ride="carousel"
        >
          <div className="carousel-indicators">
            <button
              type="button"
              data-bs-target="#carouselExampleDark"
              data-bs-slide-to="0"
              className="active"
              aria-current="true"
              aria-label="Slide 1"
            />
            <button
              type="button"
              data-bs-target="#carouselExampleDark"
              data-bs-slide-to="1"
              aria-label="Slide 2"
            />
            <button
              type="button"
              data-bs-target="#carouselExampleDark"
              data-bs-slide-to="2"
              aria-label="Slide 3"
            />
          </div>

          <div className="carousel-inner h-100">
            <div className="carousel-item active h-100" data-bs-interval="5000">
              <img
                src={Image}
                className="d-block w-100 h-100"
                alt="Slide 1"
                style={{ objectFit: "fit", objectPosition: "center" }}
              />
            </div>

            <div className="carousel-item h-100" data-bs-interval="5000">
              <img
                src="https://picsum.photos/id/1015/1200/400"
                className="d-block w-100 h-100"
                alt="Slide 2"
                style={{ objectFit: "cover", objectPosition: "center" }}
              />
            </div>

            <div className="carousel-item h-100" data-bs-interval="5000">
              <img
                src="https://picsum.photos/id/1019/1200/400"
                className="d-block w-100 h-100"
                alt="Slide 3"
                style={{ objectFit: "cover", objectPosition: "center" }}
              />
            </div>
          </div>

          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target="#carouselExampleDark"
            data-bs-slide="prev"
          >
            <span className="carousel-control-prev-icon" aria-hidden="true" />
            <span className="visually-hidden">Previous</span>
          </button>

          <button
            className="carousel-control-next"
            type="button"
            data-bs-target="#carouselExampleDark"
            data-bs-slide="next"
          >
            <span className="carousel-control-next-icon" aria-hidden="true" />
            <span className="visually-hidden">Next</span>
          </button>
        </div>
      </div>

      <div className="section">
        <h4>
          <i className="bx bx-shield-quarter section-icon" />
          Modern Complaint Management System
        </h4>
      </div>

      <div className="container">
        <h1>
          Streamline Your{" "}
          <span>
            <br />
            Complaint
          </span>{" "}
          Management
        </h1>

        <p>
          Efficiently manage, track, and resolve complaints with our modern,
          <br />
          user-friendly platform designed for organizations of all sizes.
        </p>

        <div className="Button">
          <Button
            className="btn-home register-btn"
            onClick={() => handleNavigation("register")}
          >
            <i className="bx bx-rocket" /> Get Started Free →
          </Button>
          <Button
            className="btn-home login-btn"
            onClick={() => handleNavigation("login")}
          >
            <i className="bx bx-log-in" /> Sign In
          </Button>
        </div>
      </div>

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