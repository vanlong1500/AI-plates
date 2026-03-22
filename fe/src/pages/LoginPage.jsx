import React, { useState } from "react";
import { InputField } from "../components/InputField";
import { Link, useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // Để hiển thị cảnh báo
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Xóa lỗi cũ

    // 1. Cảnh báo nếu chưa điền đầy đủ
    if (!username || !password) {
      setErrorMessage("Vui lòng điền đầy đủ tài khoản và mật khẩu!");
      return;
    }

    // 2. Gọi đến Backend Python (localhost:5000)
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      console.log("Login response:", data); // Debug: Xem phản hồi từ BE
      if (data.success) {
        // Lưu role vào bộ nhớ tạm để dùng
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("username", data.username);

        // 3. Kiểm tra role để chuyển trang
        if (data.role === 1) {
          navigate("/admin-dashboard"); // Chuyển đến trang Admin
        } else if (data.role === 2) {
          navigate("/customer-home");
        }
      } else {
        setErrorMessage(data.message); // Hiển thị lỗi từ BE (sai tài khoản/mật khẩu)
      }
    } catch (error) {
      setErrorMessage("Không thể kết nối đến máy chủ.");
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "100px auto",
        padding: "20px",
        border: "1px solid #ccc",
      }}
    >
      <h2>Đăng nhập hệ thống</h2>
      <form onSubmit={handleLogin}>
        <InputField
          label="Tài khoản"
          type="text"
          value={username}
          onChange={setUsername}
        />
        <InputField
          label="Mật khẩu"
          type="password"
          value={password}
          onChange={setPassword}
        />

        {/* Hiển thị cảnh báo lỗi ngay trên nút đăng nhập */}
        {errorMessage && (
          <p style={{ color: "red", fontSize: "14px", marginBottom: "10px" }}>
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            background: "#007bff",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Đăng nhập
        </button>

        <div
          style={{ marginTop: "15px", textAlign: "center", fontSize: "14px" }}
        >
          <div>
            Chưa có tài khoản?{" "}
            <Link
              id="link-register"
              to="/register"
              style={{
                color: "#007bff",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
