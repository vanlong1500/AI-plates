import React, { useState } from "react";
import { InputField } from "../components/InputField";
import { useNavigate } from "react-router-dom";

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // State để lưu trữ thông báo lỗi cho từng ô nhập liệu
  const [errors, setErrors] = useState({
    username: "",
    password: "",
    confirm: "",
  });

  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();

    // Khởi tạo đối tượng lỗi mới (Xoá lỗi cũ mỗi lần nhấn nút)
    let newErrors = { username: "", password: "", confirm: "" };
    let isValid = true;

    // 1. Kiểm tra tài khoản: Đủ 6 ký tự, không có khoảng trắng
    if (username.length < 6) {
      newErrors.username = "Tài khoản phải có ít nhất 6 ký tự.";
      isValid = false;
    } else if (/\s/.test(username)) {
      newErrors.username = "Tài khoản không được chứa khoảng trắng.";
      isValid = false;
    }

    // 2. Kiểm tra mật khẩu (Bạn có thể thêm điều kiện độ dài ở đây)
    if (password.length < 1) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
      isValid = false;
    }

    // 3. Kiểm tra nhập lại mật khẩu: Phải khớp
    if (password !== confirmPassword) {
      newErrors.confirm = "Mật khẩu nhập lại không khớp.";
      isValid = false;
    }

    // Cập nhật State lỗi (Cái mới sẽ thay thế hoàn toàn cái cũ)
    setErrors(newErrors);

    if (isValid) {
      console.log("Đang gửi dữ liệu đăng ký...");

      fetch("http://127.0.0.1:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password, // Trong thực tế nên mã hóa password
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alert("Đăng ký thành công!");
            navigate("/"); // Chuyển về trang đăng nhập
          } else {
            // Hiển thị lỗi từ Backend (ví dụ: trùng tên tài khoản)
            setErrors({ ...errors, username: data.message });
          }
        })
        .catch((err) => console.error("Lỗi kết nối BE:", err));
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "50px auto",
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        fontFamily: "Arial",
      }}
    >
      <h2 style={{ textAlign: "center" }}>Đăng ký hệ thống</h2>
      <form onSubmit={handleRegister}>
        {/* Ô Tài khoản */}
        <InputField
          id="reg-username"
          label="Tài khoản"
          type="text"
          value={username}
          onChange={setUsername}
        />
        {errors.username && (
          <p
            style={{
              color: "red",
              fontSize: "12px",
              marginTop: "-10px",
              marginBottom: "10px",
            }}
          >
            {errors.username}
          </p>
        )}

        {/* Ô Mật khẩu */}
        <InputField
          id="reg-password"
          label="Mật khẩu"
          type="password"
          value={password}
          onChange={setPassword}
        />
        {errors.password && (
          <p
            style={{
              color: "red",
              fontSize: "12px",
              marginTop: "-10px",
              marginBottom: "10px",
            }}
          >
            {errors.password}
          </p>
        )}

        {/* Ô Nhập lại mật khẩu */}
        <InputField
          id="reg-confirm-password"
          label="Nhập lại mật khẩu"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
        {errors.confirm && (
          <p
            style={{
              color: "red",
              fontSize: "12px",
              marginTop: "-10px",
              marginBottom: "10px",
            }}
          >
            {errors.confirm}
          </p>
        )}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            background: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ĐĂNG KÝ
        </button>

        <div style={{ marginTop: "15px", textAlign: "center" }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              color: "#007bff",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Đã có tài khoản? Đăng nhập
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterPage;
