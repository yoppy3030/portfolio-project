import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import MainContent from "./components/MainContent";
import RegisterForm from "./components/RegisterForm";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="wrapper">
        <Header />
        <Routes>
          <Route path="/" element={<MainContent />} />
          <Route path="/register" element={<RegisterForm />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}
export default App;
