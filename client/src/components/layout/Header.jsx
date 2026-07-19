import { useState } from "react";
import "../../styles/Header.css";
import logo from "../../assets/images/complaintsync-mark.svg";
import Navbar from "../layout/Navbar";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <img className="logo" src={logo} alt="Logo" />

      <h1 className="title wave_text">
        {"ComplaintSync".split("").map((char, i) => (
          <span key={i} style={{ "--i": i + 1 }}>
            {char}
          </span>
        ))}
      </h1>

      <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
    </header>
  );
}
