import { useState } from "react";
import "../../styles/Header.css";
import logo from "../../assets/images/logo.png";
import Navbar from "../layout/Navbar";

export default function Header({
  showSearch = true,
  searchPlaceholder = "Search...",
  onSearch,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    if (onSearch) onSearch(value);
  };

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

      {showSearch && (
        <div className="header-search bg-white m-15">
          <i className="bx bx-search"></i>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={handleSearchChange}
          />
        </div>
      )}

      <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
    </header>
  );
}