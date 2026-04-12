import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import Header from "./components/layout/Header";
// import Footer from "./components/layout/Footer";
// import Home from "./pages/Home";
import Login from "./pages/auth/LoginRegistration";
import "./styles/global.css";

function App() {
  return (
    <Router>
      {/* <Header /> */}
      <Routes>
        {/* <Route path="/" element={<Home />} /> */}
        <Route path="/" element={<Login />} />
      </Routes>
      {/* <Footer /> */}
    </Router>
  );
}

export default App;
