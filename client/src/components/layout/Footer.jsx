import "../../styles/Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Column 1: Brand & Copyright */}
        <div className="footer-col footer-brand">
          <h3 className="footer-logo">ComplaintSync</h3>
          <p className="footer-desc">
            Streamlining complaint management for organizations worldwide with
            modern technology.
          </p>
          <p className="copyright">© 2026 Complaint Management System. All rights reserved.</p>
        </div>

        {/* Column 2: Features */}
        <div className="footer-col">
          <h4 className="footer-title">Features</h4>
          <ul className="footer-links">
            <li><a href="#">Easy Submission</a></li>
            <li><a href="#">Real-time Tracking</a></li>
            <li><a href="#">Secure & Private</a></li>
            <li><a href="#">Analytics Dashboard</a></li>
            <li><a href="#">Multi-role Support</a></li>
          </ul>
        </div>

        {/* Column 3: Company & Legal */}
        <div className="footer-col">
          <h4 className="footer-title">Company</h4>
          <ul className="footer-links">
            <li><a href="#">About Us</a></li>
            <li><a href="#">Contact Support</a></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Rules & Regulations</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default Footer;