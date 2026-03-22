import React, { useState, useEffect } from "react";
import { removeVietnameseTones } from "../../components/stringUtils";
const AutoContent = () => {
  const [columns, setColumns] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColContent, setNewColContent] = useState([""]); // Mảng nội dung
  const [editingId, setEditingId] = useState(null);

  // Lấy dữ liệu khi load trang (Thay cho apiFind trong autocomplete.js)
  useEffect(() => {
    fetchColumns();
  }, []);

  const fetchColumns = async () => {
    const keyToSend = "2";
    try {
      const res = await fetch(
        `http://127.0.0.1:5000/api/findCol?key=${keyToSend}`
      );
      const data = await res.json();
      setColumns(data);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
    }
  };

  // Lưu cột mới (Thay cho apiAddColumn)
  const handleSaveColumn = async () => {
    if (!newColName) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    const payload = {
      name: newColName,
      key: "2",
      textName: removeVietnameseTones(newColName), // Normalize đơn giản
    };
    console.log("Payload to send:", payload);
    const url = editingId
      ? `http://127.0.0.1:5000/api/saveEdit`
      : `http://127.0.0.1:5000/api/addCol`;

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
    const keyToSend = "2";
    if (window.confirm(`Bạn chắc chắn muốn xóa ${name}?`)) {
      await fetch(`http://127.0.0.1:5000/api/delCol/${id}?key=${keyToSend}`, {
        method: "DELETE",
      });
      fetchColumns();
    }
  };

  const resetForm = () => {
    setNewColName("");
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
          <h3>{editingId ? "Chỉnh sửa khu giữ xe" : "Thêm khu giữ xe mới"}</h3>
          <div style={{ marginBottom: "15px" }}>
            <label>Tên khu giữ xe:</label>
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
            />
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
                <button
                  onClick={() => {
                    setEditingId(col._id);
                    setNewColName(col.name);
                    setNewColContent(
                      Array.isArray(col.content) ? col.content : [col.content]
                    );
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
