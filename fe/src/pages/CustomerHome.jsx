import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeContent from "./admin/HomeContent";
import InfCus from "./users/infCus";

const customerDashboard = () => {
  const [username, setUsername] = useState("");
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);
  const [activeTab, setActiveTab] = useState("home");
  const navigate = useNavigate();
  const [showAutoSubMenu, setShowAutoSubMenu] = useState(false);
  const handleLogout = () => {
    localStorage.clear(); // Xóa sạch dữ liệu đăng nhập
    navigate("/"); // Đưa người dùng về trang Login
  };
  const [Statistics, setStatistics] = useState([]);
  const [staContent, setStaContent] = useState(false);
  const [selectedStatKey, setSelectedStatKey] = useState("");
  const [selectedStat, setSelectedStat] = useState(null);

  const apiContentStats = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/contentStats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error("Error fetching content stats:", error);
    }
  };

  const handleStatsClick = () => {
    const nextState = !staContent;
    setStaContent(nextState);
    if (nextState) {
      apiContentStats(); // Chỉ gọi API khi mở menu
    }
  };
  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomeContent title="Trang chủ" />;
      case "manage":
        return <InfCus title="Trang cá nhân" nameCus={username} />;
      default:
        return <HomeContent title="Trang chủ" />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Arial" }}>
      {/* PHẦN 1/6: SIDEBAR (ĐIỀU HƯỚNG CHÍNH) */}
      <div
        style={{
          flex: 1, // Tương đương 1/6 khi kết hợp với phần nội dung flex: 5
          background: "#2c3e50",
          color: "white",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3 style={{ borderBottom: "1px solid #555", paddingBottom: "10px" }}>
            {username}
          </h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li
              onClick={() => setActiveTab("home")}
              style={menuItemStyle(activeTab === "home")}
            >
              Trang chủ
            </li>
            <li
              onClick={() => setActiveTab("manage")}
              style={menuItemStyle(activeTab === "manage")}
            >
              Trang cá nhân
            </li>
          </ul>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px",
              background: "#e74c3c",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* PHẦN 5/6: MAIN CONTENT (RENDER NỘI DUNG PHỤ) */}
      <div style={{ flex: 5, padding: "30px", background: "#f4f7f6" }}>
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            height: "auto",
          }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Style cho các mục menu
const menuItemStyle = (isActive) => ({
  padding: "15px 10px",
  cursor: "pointer",
  background: isActive ? "#34495e" : "transparent",
  borderLeft: isActive ? "4px solid #3498db" : "4px solid transparent",
  transition: "0.3s",
  marginBottom: "5px",
  borderRadius: "4px",
});
const subMenuItemStyle = (isActive) => ({
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "0.9rem",
  color: isActive ? "#3498db" : "#bdc3c7", // Đổi màu khi được chọn
  transition: "all 0.3s",
  background: isActive ? "#ecf0f1" : "transparent",
});
export default customerDashboard;
