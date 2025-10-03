import React from "react";
import { Link } from "react-router-dom";
import logoImg from "../assets/logo.png";

function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <img src={logoImg} alt="ロゴ" className="logo-img"/>
      </div>      
      <div className="right">
        <Link to="/register" className="register-btn">
          新規登録
        </Link>
        <Link to="/login" className="login-btn">
          ログイン
        </Link>
      </div>
    </header>
  );
}
export default Header;
