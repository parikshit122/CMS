import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import Login from "./pages/auth/LoginRegistration";
import "./styles/global.css";

function App() {
  return (
    <div className="App">        {/* ADD THIS WRAPPER */}
      <Router>
        <Routes>

          {/* Home Page */}
          <Route
            path="/"
            element={
              <>
                <Header />
                <Home />
                <Footer />
              </>
            }
          />

          {/* Login / Registration Page */}
          <Route path="/auth" element={<Login />} />

        </Routes>
      </Router>
    </div>
  );
}

export default App;