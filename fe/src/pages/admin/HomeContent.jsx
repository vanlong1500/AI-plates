import React, { useState, useRef, useEffect } from "react";
import { InputField, handleAutoFillByPlate } from "../../components/InputField";
import { io } from "socket.io-client";

const HomeContent = ({ title }) => {
  console.log("HomeContent title:", title);
  const BASE_URL = "http://127.0.0.1:5000";

  // State cho Camera 1 (Cổng vào)
  const [newList, setNewList] = useState([]);
  const [activeCam1, setActiveCam1] = useState(false);
  const [dynamicFilters, setDynamicFilters] = useState({}); // Lưu giá trị các select động
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const [loading1, setLoading1] = useState(false);
  const [filterOptions, setFilterOptions] = useState([]); // Danh sách filter từ API staff
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ name: false });
  const [currentStatus, setCurrentStatus] = useState(1);
  // State cho Camera 2 (Cổng ra)
  const [activeCam2, setActiveCam2] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const socketRef = useRef(null);
  const [pagination, setPagination] = useState([]);
  const cameraFrameStyle = {
    position: "relative",
    background: "#1a1a1a",
    borderRadius: "12px",
    overflow: "hidden",
    height: "350px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #333",
  };
  useEffect(() => {
    // 1. Khởi tạo Socket
    socketRef.current = io("http://127.0.0.1:5000");

    socketRef.current.on("connect", () => console.log("Socket connected"));

    socketRef.current.on("update_data", (data) => {
      if (data?.new_list) {
        setTableData(data.new_list);
      }
      console.log("Received update_data:", data);
    });

    // 2. Định nghĩa hàm Fetch
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/ColAuto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: title }),
        });
        const data = await res.json();
        setFilterOptions(data.new_list || []);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    fetchConfig();
    console.log(tableData);
    // 3. Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off("update_data");
        socketRef.current.disconnect();
      }
    };
  }, [title]); // Chạy lại khi title thay đổi
  // Hàm xử lý khi bấm nút Play
  const toggleCamera = (camId, setActive, setLoading) => {
    setLoading(true);
    setActive(true);
    // Giả lập thời gian kết nối Model
    setTimeout(() => setLoading(false), 1200);
  };
  const handleRefresh = () => {
    if (socketRef.current) {
      setEditingId(null);
      socketRef.current.emit("client_request_data");
      console.log("Đã gửi yêu cầu cập nhật dữ liệu từ client.");
    } else {
      console.error("Socket chưa kết nối!");
    }
  };
  const stopCamera = (setActive) => {
    setActive(false);
    // Khi setActive(false), thẻ <img> sẽ biến mất, trình duyệt ngắt kết nối Stream.
  };
  const formatTime = (utc) => {
    if (!utc) return "";
    return new Date(utc).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
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
      }
    } catch (err) {
      alert("Lỗi khi lưu!");
    }
  };
  // xoá id
  const handleDeleteStaff = async (id) => {
    if (!id) {
      alert("Không tìm thấy ID mục cần xóa!");
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/delPts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id }),
      });
      if (res.ok) {
        handleRefresh(); // Gọi lại hàm refresh để cập nhật lại bảng
      } else {
        alert("Xóa thất bại!");
      }
    } catch (err) {
      alert("Lỗi khi xóa!");
    }
  };
  const mng_Nb = async (sta, page) => {
    console.log("sta ", sta);
    try {
      const data_to_send = {
        status: sta === 1 ? "Vào" : "Ra",
        pageNB: page,
        limit: 2,
      };
      const res = await fetch(`${BASE_URL}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data_to_send),
      });
      const data = await res.json();
      setTableData(data.data || []);
      setPagination(data.pagination || []);
      console.log("Fetched data:", tableData, pagination);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };
  return (
    <div className="text-[24px] container-fluid p-4">
      <div className="grid grid-cols-2 md:grid-cols-2" style={{ gap: "20px" }}>
        {/* CAMERA 1: CỔNG VÀO */}
        <div className="camera-container col-span-1">
          <h5 className="text-center font-bold mb-3 text-green-600 uppercase">
            <i className="mdi mdi-login mr-1"></i> Camera cổng vào
          </h5>
          <div style={cameraFrameStyle}>
            {!activeCam1 && (
              <button
                onClick={() => toggleCamera(1, setActiveCam1, setLoading1)}
                className="z-20 bg-green-500 hover:bg-green-600 text-white w-100 h-100 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110"
              >
                <i
                  className="mdi mdi-play text-white"
                  style={{
                    fontSize: "100px", // Kích thước rất lớn để dễ bấm
                    filter: "drop-shadow(0px 0px 20px rgba(0,0,0,0.5))", // Đổ bóng giúp thấy rõ trên mọi nền ảnh
                  }}
                ></i>
              </button>
            )}

            {loading1 && (
              <div className="absolute z-30 bg-black/70 inset-0 flex flex-col items-center justify-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-green-500 mb-2"></div>
                <span>Đang nạp Model Cam 1...</span>
              </div>
            )}

            {activeCam1 && !loading1 && (
              <>
                <button
                  onClick={() => stopCamera(setActiveCam1)} // Sử dụng hàm dừng mới
                  className="absolute top-4 right-4 z-20 bg-red-600 text-white px-3 py-1 rounded text-xs font-bold"
                >
                  DỪNG
                </button>
                <img
                  src={`${BASE_URL}/video`} // Trình duyệt tự kết nối khi thẻ img hiện ra
                  className="w-full h-full object-cover"
                  alt="Cam 1"
                />
              </>
            )}
          </div>
        </div>

        {/* CAMERA 2: CỔNG RA */}
        <div className="camera-container col-span-1">
          <h5 className="text-center font-bold mb-3 text-red-600 uppercase">
            <i className="mdi mdi-logout mr-1"></i> Camera cổng ra
          </h5>
          <div style={cameraFrameStyle}>
            {!activeCam2 && (
              <button
                onClick={() => toggleCamera(2, setActiveCam2, setLoading2)}
                className="z-20 bg-red-500 hover:bg-red-600 text-white w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110"
              >
                <i
                  className="mdi mdi-play text-white"
                  style={{
                    fontSize: "100px", // Kích thước rất lớn để dễ bấm
                    filter: "drop-shadow(0px 0px 20px rgba(0,0,0,0.5))", // Đổ bóng giúp thấy rõ trên mọi nền ảnh
                  }}
                ></i>
              </button>
            )}

            {loading2 && (
              <div className="absolute z-30 bg-black/70 inset-0 flex flex-col items-center justify-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-500 mb-2"></div>
                <span>Đang nạp Model Cam 2...</span>
              </div>
            )}

            {activeCam2 && !loading2 && (
              <>
                <button
                  onClick={() => setActiveCam2(false)}
                  className="absolute top-4 right-4 z-20 bg-red-600 text-white px-3 py-1 rounded text-xs font-bold"
                >
                  DỪNG
                </button>
                <img
                  src={`${BASE_URL}/video2`}
                  className="w-full h-full object-cover"
                  alt="Cam 2"
                />
              </>
            )}
          </div>
        </div>
      </div>
      {/* button */}
      <div
        className="pt-[20px] h-[40px] grid grid-cols-3 md:grid-cols-3 flex justify-center"
        style={{ gap: "10px" }}
      >
        <button
          onClick={() => {
            handleRefresh();
          }}
          className=" hover:bg-gray-600 text-white px-4 py-2 rounded uppercase border-darius border-gray-400"
          style={{ background: "#5a68dfff", borderRadius: "0px 75px 0px 0px" }}
        >
          xe hôm nay
        </button>
        <button
          onClick={() => {
            setCurrentStatus(1);
            mng_Nb(1, 1);
          }}
          className=" hover:bg-gray-600 text-white px-4 py-2 rounded uppercase "
          style={{ background: "#55e476ff", borderRadius: "0px 75px 0px 0px" }}
        >
          xe vào
        </button>
        <button
          onClick={() => {
            setCurrentStatus(0);
            mng_Nb(0, 1);
          }}
          className="b hover:bg-gray-600 text-white px-4 py-2 rounded uppercase "
          style={{ background: "#eb6464ff", borderRadius: "0px 75px 0px 0px" }}
        >
          xe ra
        </button>
      </div>
      {/* table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[600px] border rounded-lg shadow-sm">
        <table className="text-[18px] min-w-full divide-y divide-gray-200 sticky-header">
          <thead
            className="bg-gray-50 sticky top-0 z-10 shadow-[0_2px_0_0_rgba(0,0,0,1)] "
            style={{ textAlign: "center" }}
          >
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
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase "
                style={{ textAlign: "center" }}
              >
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white ">
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
                        key={opt.textName} // Đừng quên key khi dùng map
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
              </tr>
            ))}
          </tbody>
        </table>
        {tableData.length === 0 && !loading && (
          <p className="text-center py-4 text-gray-500">Không có dữ liệu</p>
        )}
        {/* Pagination Controls */}
        {pagination.total_pages > 1 && (
          <div
            style={{ gap: "10px" }}
            className="flex justify-center items-center space-x-2 mt-4 py-4"
            id="pagination-controls"
          >
            {/* Nút Previous (&laquo;) */}
            <button
              style={{ fontSize: "20px" }}
              className={`px-3 py-1 border rounded text-sm ${
                pagination.current_page === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-600 hover:bg-gray-50 border-gray-300"
              }`}
              disabled={pagination.current_page === 1}
              onClick={() => mng_Nb(currentStatus, pagination.current_page - 1)}
            >
              &laquo;
            </button>

            {/* Các Nút Số (Logic 3 nút) */}
            {(() => {
              let startPage, endPage;
              const total = pagination.total_pages;
              const current = pagination.current_page;

              if (total <= 3) {
                startPage = 1;
                endPage = total;
              } else if (current === 1) {
                startPage = 1;
                endPage = 3;
              } else if (current === total) {
                startPage = total - 2;
                endPage = total;
              } else {
                startPage = current - 1;
                endPage = current + 1;
              }

              const pages = [];
              for (let i = startPage; i <= endPage; i++) {
                const isActive = i === current;
                pages.push(
                  <button
                    key={i}
                    style={{
                      fontSize: "20px",
                      backgroundColor: isActive ? "#2563eb" : "#ffffff",
                    }}
                    className={` px-3 py-1 border rounded text-sm transition-colors ${
                      i === current
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-blue-600 border-gray-300 hover:bg-blue-50"
                    }`}
                    onClick={() => mng_Nb(currentStatus, i)}
                  >
                    {i}
                  </button>
                );
              }
              return pages;
            })()}

            {/* Nút Next (&raquo;) */}
            <button
              style={{ fontSize: "20px" }}
              className={`hover:bg-blue-600 hover:cursor-pointer px-3 py-1 border rounded text-sm ${
                pagination.current_page === pagination.total_pages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-600 hover:bg-gray-50 border-gray-300"
              }`}
              disabled={pagination.current_page === pagination.total_pages}
              onClick={() => mng_Nb(currentStatus, pagination.current_page + 1)}
            >
              &raquo;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default HomeContent;
