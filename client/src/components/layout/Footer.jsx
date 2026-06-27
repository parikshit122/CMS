import "../../styles/Footer.css";
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">

        <div className="footer-col footer-brand">
          <h3 className="footer-logo">ComplaintSync</h3>
          <p className="footer-desc">
            Streamlining complaint management for organizations worldwide with
            modern technology.
          </p>

          {/* ✅ Social Icons */}
          <div className="footer-social">
            <a href="#"><FaFacebookF /></a>
            <a href="#"><FaTwitter /></a>
            <a href="#"><FaInstagram /></a>
            <a href="#"><FaLinkedinIn /></a>
          </div>

          <p className="copyright">
            © 2026 Complaint Management System. All rights reserved.
          </p>
        </div>

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