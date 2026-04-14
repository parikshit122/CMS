import "../styles/Home.css";
import Button from "../components/common/Button";

function Home() {
  return (
    <main className="landing">
      
      <div className="hero-section">
        {/* Caurosel */}
        <div
          id="carouselExampleDark"
          className="carousel carousel-dark slide"
          data-bs-ride="carousel"
        >
          {/* Indicators */}
          <div className="carousel-indicators">
            <button
              type="button"
              data-bs-target="#carouselExampleDark"
              data-bs-slide-to="0"
              className="active"
              aria-current="true"
              aria-label="Slide 1"
            ></button>

            <button
              type="button"
              data-bs-target="#carouselExampleDark"
              data-bs-slide-to="1"
              aria-label="Slide 2"
            ></button>

            <button
              type="button"
              data-bs-target="#carouselExampleDark"
              data-bs-slide-to="2"
              aria-label="Slide 3"
            ></button>
          </div>

          {/* Slides */}
          <div className="carousel-inner">
            <div className="carousel-item active" data-bs-interval="5000">
              <img
                src="https://picsum.photos/id/1018/1200/400"
                className="d-block w-100"
                alt="Slide 1"
              />
              <div className="carousel-caption d-none d-md-block">
                <h5>First slide</h5>
                <p>Example caption for first slide.</p>
              </div>
            </div>

            <div className="carousel-item" data-bs-interval="5000">
              <img
                src="https://picsum.photos/id/1015/1200/400"
                className="d-block w-100"
                alt="Slide 2"
              />
              <div className="carousel-caption d-none d-md-block">
                <h5>Second slide</h5>
                <p>Example caption for second slide.</p>
              </div>
            </div>

            <div className="carousel-item" data-bs-interval="5000">
              <img
                src="https://picsum.photos/id/1019/1200/400"
                className="d-block w-100"
                alt="Slide 3"
              />
              <div className="carousel-caption d-none d-md-block">
                <h5>Third slide</h5>
                <p>Example caption for third slide.</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target="#carouselExampleDark"
            data-bs-slide="prev"
          >
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Previous</span>
          </button>

          <button
            className="carousel-control-next"
            type="button"
            data-bs-target="#carouselExampleDark"
            data-bs-slide="next"
          >
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Next</span>
          </button>
        </div>
      </div>

      <div className="section">
        <h4>Modern Complaint Management System</h4>
      </div>

      <div className="container">
        <h1>
          Streamline Your <span><br />Complaint</span> Management
        </h1>

        <p>
          Efficiently manage, track, and resolve complaints with our modern,
          <br />
          user-friendly platform designed for organizations of all sizes.
        </p>

        <div className="Button">
          <Button className="btn-home register-btn">Get Started Free →</Button>
          <Button className="btn-home login-btn">Sign In</Button>
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

      <section className="features-wrap">
        <div className="features-grid">
          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true" />
            <h3>Easy Submission</h3>
            <p>Submit complaints in minutes with our intuitive interface</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true" />
            <h3>Real-time Tracking</h3>
            <p>Track your complaint status 24/7 with live updates</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true" />
            <h3>Secure &amp; Private</h3>
            <p>Your data is encrypted and protected at all times</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true" />
            <h3>Analytics Dashboard</h3>
            <p>Get insights and reports on complaint trends</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true" />
            <h3>Multi-role Support</h3>
            <p>Designed for users, staff, and administrators</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true" />
            <h3>Fast Resolution</h3>
            <p>Streamlined workflow for quick issue resolution</p>
          </article>
        </div>
      </section>

      <section className="ready-container">
        <div className="ready">
          <h2>Ready to Get Started?</h2>
          <p>
            Join thousands of organizations that trust ComplaintSync for their
            <br />
            complaint management needs.
          </p>

          <div className="Button">
            <Button className="btn-home register-btn">Create Free Account →</Button>
            <Button className="btn-home login-btn">Sign In Now</Button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;