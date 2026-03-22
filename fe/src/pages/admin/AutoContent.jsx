import React, { useState, useEffect } from "react";
import { removeVietnameseTones } from "../../components/stringUtils";
import Select from "react-select";

const AutoContent = () => {
  const [columns, setColumns] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColContent, setNewColContent] = useState([""]); // Mảng nội dung
  const [editingId, setEditingId] = useState(null);
  const [zones, setZones] = useState(["Trang chủ", "Quản lý"]); // State cho danh sách khu vực
  const [selectedZone, setSelectedZone] = useState([
    { value: "Trang chủ", label: "Trang chủ" },
  ]); // State cho giá trị đang chọn

  const initData = async () => {
    try {
      // Chạy cả 2 hàm song song để tiết kiệm thời gian
      await Promise.all([fetchColumns(), fetchZones()]);
    } catch (err) {
      console.error("Lỗi khởi tạo dữ liệu:", err); // Sửa print -> console.error
    }
  };

  // 2. Chỉ dùng 1 useEffect duy nhất cho việc khởi tạo
  useEffect(() => {
    initData();
  }, []);
  // 1. Hàm riêng biệt để lấy dữ liệu khu vực từ một API khác
  const fetchZones = async () => {
    try {
      // Giả sử bạn có một endpoint riêng để lấy danh sách các khu vực/trang
      const res = await fetch("http://127.0.0.1:5000/api/getZones");
      const data = await res.json();

      // Giả sử data trả về là mảng các chuỗi: ["Kho", "Bến xe", "Văn phòng"]
      // Chúng ta gộp với các giá trị mặc định cố định
      setZones(["Trang chủ", "Quản lý", ...data]);
    } catch (err) {
      print("Lỗi khi lấy danh sách khu vực:", err);
    }
  };

  // 2. useEffect độc lập để gọi hàm fetchZones khi component mount

  const fetchColumns = async () => {
    const keyToSend = "1";
    try {
      const res = await fetch(
        "http://127.0.0.1:5000/api/findCol?key=" + keyToSend
      );
      const data = await res.json();
      setColumns(data);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
    }
  };

  // Xử lý thêm/xóa input nội dung
  const handleAddContentInput = () => setNewColContent([...newColContent, ""]);
  const handleRemoveContentInput = (index) => {
    const updated = newColContent.filter((_, i) => i !== index);
    setNewColContent(updated);
  };

  // Lưu cột mới (Thay cho apiAddColumn)
  const handleSaveColumn = async () => {
    if (!newColName || newColContent.some((c) => !c.trim())) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    const payload = {
      name: newColName,
      content: newColContent,
      key: "1",
      sta: selectedZone.map((z) => z.value),
      textName: removeVietnameseTones(newColName), // Normalize đơn giản
    };
    console.log("Payload to send:", payload);
    const url = editingId
      ? `http://127.0.0.1:5000/api/saveEdit`
      : `http://127.0.0.1:5000/api/addCol`;

    console.log("URL to use:", url);
    const method = editingId ? "PUT" : "POST";
    if (editingId) payload._id = editingId;

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.ok !== false) {
        alert("Thao tác thành công!");
        resetForm();
        fetchColumns();
      }
    } catch (err) {
      alert("Lỗi hệ thống!");
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn chắc chắn muốn xóa ${name}?`)) {
      await fetch(`http://127.0.0.1:5000/api/delCol/${id}`, {
        method: "DELETE",
      });
      fetchColumns();
    }
  };

  const resetForm = () => {
    setNewColName("");
    setNewColContent([""]);
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div style={{ padding: "10px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ color: "#2c3e50" }}>🤖 Quản lý Thông tin Tự động</h2>
        <button
          onClick={() => setIsAdding(true)}
          style={{
            padding: "10px 20px",
            background: "#27ae60",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          + Thêm thông tin mới
        </button>
      </div>

      {/* Form Thêm/Sửa (Thay cho addColumn.html) */}
      {(isAdding || editingId) && (
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            marginBottom: "20px",
          }}
        >
          <h3>{editingId ? "Chỉnh sửa cột" : "Thêm cột mới"}</h3>
          <div style={{ marginBottom: "15px" }}>
            <label>Khu hiển thị:</label>
            <Select
              isMulti // Cho phép chọn nhiều và hiện dấu x
              options={zones.map((z) => ({ value: z, label: z }))} // Danh sách lựa chọn
              value={selectedZone} // Giá trị đang chọn (dạng mảng object)
              onChange={(selected) => setSelectedZone(selected || [])} // Cập nhật mảng
              placeholder="-- Chọn khu vực hiển thị --"
              className="basic-multi-select"
              classNamePrefix="select"
              styles={{
                control: (base) => ({
                  ...base,
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  marginTop: "5px",
                }),
              }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label>Tên cột:</label>
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label>Nội dung:</label>
            {newColContent.map((item, index) => (
              <div
                key={index}
                style={{ display: "flex", gap: "10px", marginTop: "5px" }}
              >
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const updated = [...newColContent];
                    updated[index] = e.target.value;
                    setNewColContent(updated);
                  }}
                  style={{ flex: 1, padding: "8px" }}
                />
                <button
                  onClick={() => handleRemoveContentInput(index)}
                  style={{ color: "red" }}
                >
                  Xóa
                </button>
              </div>
            ))}
            <button
              onClick={handleAddContentInput}
              style={{
                marginTop: "10px",
                color: "blue",
                cursor: "pointer",
                border: "none",
                background: "none",
              }}
            >
              + Thêm dòng nội dung
            </button>
          </div>
          <button
            onClick={handleSaveColumn}
            style={{
              padding: "10px 20px",
              background: "#3498db",
              color: "#fff",
              border: "none",
              marginRight: "10px",
            }}
          >
            Lưu lại
          </button>
          <button
            onClick={resetForm}
            style={{
              padding: "10px 20px",
              background: "#95a5a6",
              color: "#fff",
              border: "none",
            }}
          >
            Hủy
          </button>
        </div>
      )}

      {/* Bảng hiển thị (Thay cho findInf.html) */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#fff",
        }}
      >
        <thead>
          <tr style={{ background: "#ecf0f1", textAlign: "left" }}>
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>
              Tên cột
            </th>
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>
              Nội dung
            </th>
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>
              Khu hiển thị
            </th>
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>
              Hành động
            </th>
          </tr>
        </thead>
        <tbody>
          {columns.map((col) => (
            <tr key={col._id}>
              <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                {col.name}
              </td>
              <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                {Array.isArray(col.content)
                  ? col.content.join(", ")
                  : col.content}
              </td>
              <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                {Array.isArray(col.sta) ? col.sta.join(", ") : col.sta}
              </td>
              <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                <button
                  onClick={() => {
                    setEditingId(col._id);
                    setNewColName(col.name);
                    setNewColContent(
                      Array.isArray(col.content) ? col.content : [col.content]
                    );

                    // Chuyển đổi ["Khu A", "Khu B"] -> [{value: "Khu A", label: "Khu B"}, ...]
                    const formattedZones = Array.isArray(col.sta)
                      ? col.sta.map((z) => ({ value: z, label: z }))
                      : [{ value: col.sta, label: col.sta }];
                    setSelectedZone(formattedZones);
                    setIsAdding(true); // Mở form sửa
                  }}
                  style={{
                    marginRight: "10px",
                    color: "#3498db",
                    cursor: "pointer",
                    border: "none",
                    background: "none",
                  }}
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(col._id, col.name)}
                  style={{
                    color: "#e74c3c",
                    cursor: "pointer",
                    border: "none",
                    background: "none",
                  }}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AutoContent;
