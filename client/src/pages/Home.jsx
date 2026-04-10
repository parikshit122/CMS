import "../styles/Home.css";
import Button from "../components/common/Button";

function Home() {
  return (
    <>
      <div className="landing">
        <div className="hero-section">
          
        </div>

        <div className="section">
          <h4>Modern Complaint Management System</h4>
        </div>

        <div className="container">
          <h1>
            Streamline Your<span> Complaint </span>
            Management
          </h1>

          <p>
            Efficiently manage, track, and resolve complaints with our modern,<br />
            user-friendly platform designed for organizations of all sizes.
          </p>

          <div className="button">
            <Button className="register-btn btn-home">
              Get Started Free →
            </Button>

            <Button className="login-btn btn-home">
              Sign In
            </Button>
          </div>
        </div>

        <section className="stats-container">
          <div className="card">
            <h2>10,000+</h2>
            <p>Complaints Resolved</p>
          </div>

          <div className="card">
            <h2>98%</h2>
            <p>Satisfaction Rate</p>
          </div>

          <div className="card">
            <h2>24/7</h2>
            <p>Support Available</p>
          </div>

          <div className="card">
            <h2>50+</h2>
            <p>Organizations</p>
          </div>
        </section>

        <div className="container1">
          <h1>
            <span>Everything You Need</span>
          </h1>
          <p>
            Powerful features to manage complaints efficiently and effectively,
            <br />
            user-friendly platform designed for organizations of all sizes.
          </p>
        </div>

        <div className="features-wrap">
          <div className="features-grid">
            <article className="feature-card">
              <div className="feature-icon" aria-hidden="true"></div>
              <h3>Easy Submission</h3>
              <p>Submit complaints in minutes with our intuitive interface</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon" aria-hidden="true"></div>
              <h3>Real-time Tracking</h3>
              <p>Track your complaint status 24/7 with live updates</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon" aria-hidden="true"></div>
              <h3>Secure &amp; Private</h3>
              <p>Your data is encrypted and protected at all times</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon" aria-hidden="true"></div>
              <h3>Analytics Dashboard</h3>
              <p>Get insights and reports on complaint trends</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon" aria-hidden="true"></div>
              <h3>Multi-role Support</h3>
              <p>Designed for users, staff, and administrators</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon" aria-hidden="true"></div>
              <h3>Fast Resolution</h3>
              <p>Streamlined workflow for quick issue resolution</p>
            </article>
          </div>
        </div>

        <div className="ready-container">
          <div className="ready">
            <h2>Ready to Get Started?</h2>
            <p>
              Join thousands of organizations that trust ComplanintSync for their
              <br />
              complaint management needs.
            </p>

            <div className="button">
              <Button className="register-btn btn-home">
                Create Free Account →
              </Button>

              <Button className="login-btn btn-home">
                Sign In Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Home;