import React, { useState, useEffect } from "react";
import { InputField, handleAutoFillByPlate } from "../../components/InputField";

const StatisticsContent = ({ selectedStat }) => {
  console.log("selectedStat:", selectedStat);
  const [filters, setFilters] = useState({
    name: "",
    _id: "",
    Start_day: "",
    End_day: "",
    status: "",
  });
  const [dynamicFilters, setDynamicFilters] = useState({}); // Lưu giá trị các select động
  const [filterOptions, setFilterOptions] = useState([]); // Danh sách filter từ API staff
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchPlate, setSearchPlate] = useState("");
  const [staload, setStaload] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [errors, setErrors] = useState({ name: false });

  const BASE_URL = "http://127.0.0.1:5000";

  // 1. Lấy cấu hình các cột động khi load trang
  useEffect(() => {
    const fetchConfig = async () => {
      if (!selectedStat) return;

      try {
        const res = await fetch(`${BASE_URL}/api/ColAuto`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(selectedStat),
        });

        const data = await res.json();
        setFilterOptions(data.new_list || []);

        // Xóa dữ liệu cũ của các filter động khi đổi mục thống kê
        setDynamicFilters({});
      } catch (err) {
        console.error("Lỗi lấy cấu hình:", err);
      }
    };

    fetchConfig();
    // Thêm selectedStat vào đây để hàm chạy lại mỗi khi bạn click mục mới
  }, [selectedStat]);

  // 2. Hàm xử lý tìm kiếm theo bộ lọc (listFindInf)
  const handleFilter = async () => {
    if (!filters.Start_day || !filters.End_day) {
      alert("Vui lòng chọn đầy đủ Từ ngày và Đến ngày!");
      return;
    }

    const startDate = new Date(filters.Start_day + "T00:00:00");
    const endDate = new Date(filters.End_day + "T00:00:00");

    if (startDate >= endDate) {
      alert("Ngày bắt đầu phải nhỏ hơn ngày kết thúc!");
      return;
    }

    setLoading(true);
    // Gộp filter tĩnh và filter động
    const payload = {
      ...filters,
      ...dynamicFilters,
      Start_day: startDate.toISOString(),
      End_day: endDate.toISOString(),
    };

    try {
      const res = await fetch(`${BASE_URL}/api/listFindInf`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setTableData(data);
    } catch (err) {
      console.error("Lỗi lọc dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };
  const handleSaveEdit = async (id) => {
    if (!id) {
      alert("Không tìm thấy ID nhân viên!");
      return;
    }

    // 2. Kiểm tra dữ liệu trống (ví dụ: Tên không được để trống)
    if (!editValues.name || editValues.name.trim() === "") {
      setErrors((prev) => ({ ...prev, name: true }));
      alert("Tên nhân viên không được để trống!");
      return;
    }
    if (!editValues.area || editValues.area.trim() === "") {
      setErrors((prev) => ({ ...prev, area: true }));
      alert("Tên nhân viên không được để trống!");
      return;
    }
    if (!editValues.number || editValues.number.trim() === "") {
      setErrors((prev) => ({ ...prev, number: true }));
      alert("Tên nhân viên không được để trống!");
      return;
    }

    // 3. Log dữ liệu ra console để bạn kiểm tra (Debugging)
    try {
      const res = await fetch(`${BASE_URL}/statistic/edit/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editValues }),
      });
      if (res.ok) {
        setEditingId(null);
        handleFilter();
      }
    } catch (err) {
      alert("Lỗi khi lưu!");
    }
  };
  const handleDeleteStaff = async (staffId) => {
    if (!staffId) {
      alert("Không tìm thấy ID nhân viên!");
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/delPts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: staffId }),
      });
      if (res.ok) {
        handleFilter();
      }
    } catch (err) {
      console.error("Lỗi xóa nhân viên:", err);
    }
  };
  // 3. Tìm kiếm biển số nhanh
  const handlePlateSearch = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/plsMB`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateNum: searchPlate }),
      });
      const data = await res.json();
      setTableData(data);
    } catch (err) {
      console.error("Lỗi tìm biển số:", err);
    }
  };

  // 4. Xuất Excel (CSV)
  const exportCSV = () => {
    if (tableData.length === 0) return alert("Không có dữ liệu để xuất!");

    // BOM (Byte Order Mark) để Excel nhận diện đúng tiếng Việt có dấu
    let csvContent = "\uFEFF";

    // 1. Định nghĩa danh sách Tiêu đề (Headers)
    let headers = [
      "Thời gian",
      "Ảnh xe (Link)",
      "Avatar (Link)",
      "Tên",
      "Khu vực",
      "Số xe",
      "Trạng thái",
    ];

    // Thêm các tiêu đề động từ filterOptions
    filterOptions.forEach((opt) => {
      headers.push(opt.name);
    });

    csvContent += headers.join(",") + "\n";

    // 2. Duyệt qua dữ liệu bảng để tạo từng dòng (Rows)
    tableData.forEach((item) => {
      // Ép kiểu ="giá trị" để Excel không tự ý đổi định dạng số/khoa học (như 89E1)
      const row = [
        formatTime(item.time),
        item.image_path ? `${BASE_URL}/${item.image_path}` : "N/A", // Link ảnh xe
        item.avatar ? `${BASE_URL}/${item.avatar}` : "N/A", // Link avatar
        `="${item.name || ""}"`, // Ép kiểu chuỗi
        `="${item.area || ""}"`, // Sửa lỗi 89E1 -> 8.90E+02
        `="${item.number || ""}"`, // Đảm bảo không mất số 0 ở đầu biển số
        item.status || "",
      ];

      // Thêm các giá trị của filter động
      filterOptions.forEach((opt) => {
        const dynamicVal = item[opt.textName] || "";
        row.push(`="${dynamicVal}"`);
      });

      // Nối các cột bằng dấu phẩy
      csvContent += row.join(",") + "\n";
    });

    // 3. Tạo file và tải về
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // Đặt tên file theo mục thống kê và ngày hiện tại
    const fileName = `ThongKe_${selectedStat?.name || "Data"}_${new Date()
      .toLocaleDateString("vi-VN")
      .replace(/\//g, "-")}.csv`;
    link.download = fileName;
    link.click();

    // Giải phóng bộ nhớ sau khi tải
    URL.revokeObjectURL(url);
  };

  const formatTime = (utc) => {
    if (!utc) return "";
    return new Date(utc).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  };

  return (
    <div className="text-[24px] space-y-6">
      {/* Card Bộ lọc */}
      <div className="bg-white p-6 rounded-lg shadow-md text-xl">
        <h4 className="text-xl font-bold mb-4 text-gray-700">
          Bộ lọc thống kê {selectedStat?.name}
        </h4>
        <div className="pb-[20px] text-[20px] grid grid-cols-6 md:grid-cols-4 gap-4">
          <div>
            <label className="block  text-gray-600">Tên nhân viên</label>
            <input
              type="text"
              className="mt-1 block w-8/10 h-[20px] border rounded-md p-2"
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block  text-gray-600">Từ ngày</label>
            <input
              type="date"
              className="mt-1 block w-8/10 h-[20px] border rounded-md p-2"
              onChange={(e) =>
                setFilters({ ...filters, Start_day: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block  text-gray-600">Đến ngày</label>
            <input
              type="date"
              className="mt-1 block w-8/10 h-[20px] border rounded-md p-2"
              onChange={(e) =>
                setFilters({ ...filters, End_day: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block  text-gray-600">Trạng thái</label>
            <select
              className="text-[14px] mt-1 block w-8/10 h-[20px] border rounded-md p-2"
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">Tất cả</option>
              <option value="Vào">Vào</option>
              <option value="Ra">Ra</option>
            </select>
          </div>

          {/* Render các filter động từ API */}
          {filterOptions.map((opt) => (
            <div key={opt.textName}>
              <label className="block text-gray-600">{opt.name}</label>
              <select
                className="text-[14px] mt-1 block w-8/10 h-[20px] border rounded-md p-2"
                onChange={(e) =>
                  setDynamicFilters({
                    ...dynamicFilters,
                    [opt.textName]: e.target.value,
                  })
                }
              >
                <option value="">Tất cả</option>
                {opt.content?.map((val, idx) => (
                  <option key={idx} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex" style={{ gap: "20px" }}>
          <button
            onClick={handleFilter}
            className="text-[20px] mr-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-[#6591d5]"
          >
            Lọc
          </button>
          <button
            onClick={exportCSV}
            className="text-[20px] bg-green-600 text-white px-4 py-2 rounded hover:bg-[#6bd565]"
          >
            Xuất Excel
          </button>
          <button
            onClick={() => window.location.reload()}
            className="text-[20px] bg-gray-400 text-white px-4 py-2 rounded"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Card Bảng dữ liệu */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold">Danh sách xe ra vào</h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tìm biển số..."
              className="text-[16px] border p-2 rounded w-48"
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
            />
            <button
              onClick={handlePlateSearch}
              className="text-[16px] bg-blue-500 text-white p-2 rounded"
            >
              Tìm
            </button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[600px] border rounded-lg shadow-sm">
          <table className="text-[18px] min-w-full divide-y divide-gray-200 sticky-header">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_2px_0_0_rgba(0,0,0,1)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Thời gian
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ảnh xe
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avata
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Khu vực
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Số xe
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
                {filterOptions.map((opt) => (
                  <th
                    key={opt.textName}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    {opt.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {tableData.map((item, idx) => (
                <tr key={item._id || idx}>
                  <td
                    className="w-[90px] px-4 py-3 text-sm"
                    style={{
                      borderBottom: "1px solid #181414ff",
                    }}
                  >
                    {formatTime(item.time)}
                  </td>
                  <td
                    className="px-4 py-3 text-center"
                    style={{
                      borderBottom: "1px solid #181414ff",
                      width: "80px",
                    }}
                  >
                    <div className="flex justify-center items-center w-full">
                      <div className="w-[60px] h-[60px] relative rounded border overflow-hidden bg-gray-100">
                        {item.image_path && (
                          <img
                            src={`${BASE_URL}/${item.image_path}`}
                            className=" inset-0 w-full h-full object-cover"
                            alt="avt"
                          />
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 text-center"
                    style={{
                      borderBottom: "1px solid #181414ff",
                      width: "80px",
                    }}
                  >
                    <div className="flex justify-center items-center w-full">
                      <div className="w-[60px] h-[60px] relative rounded border overflow-hidden bg-gray-100">
                        {item.avatar && (
                          <img
                            src={`${BASE_URL}/${item.avatar}`}
                            className=" inset-0 w-full h-full object-cover"
                            alt="avt"
                          />
                        )}
                      </div>
                    </div>
                  </td>
                  {editingId === item._id ? (
                    <>
                      <td
                        className="font-medium "
                        style={{ borderBottom: "1px solid #111111ff" }}
                      >
                        <InputField
                          type="text"
                          style={{
                            fontSize: "12px",
                            marginRight: "10px",
                            width: "100%",
                          }}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          value={editValues.name || ""}
                          onChange={(val) => {
                            // Logic cập nhật state
                            setEditValues({ ...editValues, name: val });
                            // Kiểm tra lỗi: nếu có giá trị thì xóa trạng thái lỗi của 'name'
                            if (val) {
                              setErrors((prev) => ({ ...prev, name: false }));
                            }
                          }}
                          hasError={!!errors.name} // Bây giờ thuộc tính này sẽ hoạt động vì dùng đúng InputField
                        />
                      </td>
                      <td
                        className="font-medium "
                        style={{ borderBottom: "1px solid #111111ff" }}
                      >
                        <InputField
                          type="text"
                          style={{
                            fontSize: "12px",
                            marginRight: "10px",
                            width: "100%",
                          }}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          value={editValues.area || ""}
                          onChange={(val) => {
                            // Logic cập nhật state
                            setEditValues({ ...editValues, area: val });
                            // Kiểm tra lỗi: nếu có giá trị thì xóa trạng thái lỗi của 'area'
                            if (val) {
                              setErrors((prev) => ({ ...prev, area: false }));
                            }
                          }}
                          hasError={!!errors.area} // Bây giờ thuộc tính này sẽ hoạt động vì dùng đúng InputField
                        />
                      </td>
                      <td
                        className="font-medium "
                        style={{ borderBottom: "1px solid #111111ff" }}
                      >
                        <InputField
                          type="text"
                          style={{
                            fontSize: "12px",
                            marginRight: "10px",
                            width: "100%",
                          }}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          value={editValues.number || ""}
                          onChange={(val) => {
                            // Logic cập nhật state
                            setEditValues({ ...editValues, number: val });
                            // Kiểm tra lỗi: nếu có giá trị thì xóa trạng thái lỗi của 'number'
                            if (val) {
                              setErrors((prev) => ({ ...prev, number: false }));
                            }
                          }}
                          onBlur={(e) =>
                            handleAutoFillByPlate(
                              editValues.number,
                              filterOptions,
                              setEditValues,
                              BASE_URL
                            )
                          }
                          hasError={!!errors.number} // Bây giờ thuộc tính này sẽ hoạt động vì dùng đúng InputField
                        />
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{ borderBottom: "1px solid #181414ff" }}
                      >
                        {editingId === item._id ? (
                          <select
                            className="w-full border rounded px-1 py-1"
                            style={{
                              height: "36px",
                              borderRadius: "4px",
                              border: "1px solid #ccc",
                              outline: "none",
                              marginBottom: "10px",
                            }}
                            // Sử dụng key cố định là "status" để lưu giá trị vào state
                            value={editValues.status || ""}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                status: e.target.value,
                              })
                            }
                          >
                            {/* Bạn tự định nghĩa các option ở đây, không cần map từ đâu cả */}
                            <option value="">-- Chọn trạng thái --</option>
                            <option value="Vào">Vào </option>
                            <option value="Ra">Ra </option>
                          </select>
                        ) : (
                          // Khi không sửa thì hiển thị text từ dữ liệu item
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              item.status === "Vào"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.status || "---"}
                          </span>
                        )}
                      </td>
                      {filterOptions.map((opt) => (
                        <td
                          key={opt.textName} // Đừng quên key khi dùng map
                          className="px-4 py-3 text-sm"
                          style={{ borderBottom: "1px solid #181414ff" }}
                        >
                          {editingId === item._id ? (
                            <select
                              className="w-full border rounded px-1 py-1"
                              style={{
                                height: "36px",
                                width: "100%",
                                padding: "5px",
                                marginBottom: "11px",
                                boxSizing: "border-box",
                                borderRadius: "4px",
                                border: "1px solid rgb(204, 204, 204)",
                                outline: "none",
                              }}
                              value={editValues[opt.textName] || ""}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  [opt.textName]: e.target.value,
                                })
                              }
                            >
                              <option value="">Chọn...</option>
                              {opt.content?.map((val, i) => (
                                <option key={i} value={val}>
                                  {val}
                                </option>
                              ))}
                            </select>
                          ) : (
                            item[opt.textName] || ""
                          )}
                        </td>
                      ))}
                    </>
                  ) : (
                    <>
                      <td
                        className="px-4 py-3"
                        style={{
                          borderBottom: "1px solid #181414ff",
                        }}
                      >
                        {item.name}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{
                          borderBottom: "1px solid #181414ff",
                        }}
                      >
                        {item.area}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{
                          borderBottom: "1px solid #181414ff",
                        }}
                      >
                        {item.number}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{
                          borderBottom: "1px solid #181414ff",
                        }}
                      >
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            item.status === "Vào"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      {filterOptions.map((opt) => (
                        <td
                          className="px-4 py-3 text-sm"
                          style={{
                            borderBottom: "1px solid #181414ff",
                          }}
                        >
                          {item[opt.textName] || ""}
                        </td>
                      ))}
                    </>
                  )}
                  <td
                    className="px-2 py-3"
                    style={{ borderBottom: "1px solid #181414ff" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 0",
                      }}
                    >
                      {editingId === item._id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(item._id)}
                            style={{
                              backgroundColor: "#16a34a",
                              color: "white",
                              width: "70px",
                              height: "30px",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{
                              backgroundColor: "#6b7280",
                              color: "white",
                              width: "70px",
                              height: "30px",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Hủy
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(item._id);
                              setEditValues({ ...item });
                            }}
                            style={{
                              backgroundColor: "#2563eb",
                              color: "white",
                              width: "70px",
                              height: "30px",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteStaff(item._id);
                            }}
                            style={{
                              backgroundColor: "#dc2626",
                              color: "white",
                              width: "70px",
                              height: "30px",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Xóa
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  )
                </tr>
              ))}
            </tbody>
          </table>
          {tableData.length === 0 && !loading && (
            <p className="text-center py-4 text-gray-500">Không có dữ liệu</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsContent;
