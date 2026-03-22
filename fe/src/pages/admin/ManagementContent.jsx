import React, { useState, useEffect, useRef } from "react";
import { InputField } from "../../components/InputField";

const ManagementContent = () => {
  const [staffs, setStaffs] = useState([]);
  const [dynamicCols, setDynamicCols] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [errors, setErrors] = useState({});
  // State cho Tìm kiếm và Thêm mới
  const [mngpass, setMngpass] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "" });
  const [newPassUser, setNewPassUser] = useState({ username: "" });
  const fileInputRef = useRef(null);
  const BASE_URL = "http://127.0.0.1:5000";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/staff`);
      const data = await res.json();
      setStaffs(data.staff_list || []);
      setDynamicCols(data.new_list || []);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
    }
  };

  // Logic Tìm kiếm: Lọc danh sách dựa trên tên
  const filteredStaffs = staffs.filter((staff) =>
    staff.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  // Logic Thêm nhân viên (Từ add.js)
  const handleAddStaff = async () => {
    const newErrors = {};

    // 1. Kiểm tra các trường cố định
    if (!newStaff.name) newErrors.name = true;
    if (!newStaff.number) newErrors.number = true;
    if (!newStaff.area) newErrors.area = true;
    if (!newStaff.username) newErrors.username = true;
    if (!newStaff.password) newErrors.password = true;

    // 2. Kiểm tra các trường động từ dynamicCols

    // 3. Nếu có ít nhất một lỗi, cập nhật state và dừng việc lưu
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert("Vui lòng điền đầy đủ các thông tin có viền đỏ!");
      return; // Dừng hàm tại đây, không gọi API
    }

    // Nếu không có lỗi, tiến hành gửi dữ liệu (giữ nguyên logic FormData trước đó của bạn)
    setErrors({}); // Xóa bỏ các lỗi cũ nếu có
    const formData = new FormData();

    // Thêm các trường dữ liệu vào FormData
    formData.append("name", newStaff.name);
    formData.append("number", newStaff.number);
    formData.append("area", newStaff.area);
    formData.append("username", newStaff.username);
    formData.append("password", newStaff.password);

    // Nếu có file ảnh, thêm vào FormData
    if (newStaff.avatarFile) {
      formData.append("avatar", newStaff.avatarFile);
    }

    // Thêm các cột động
    dynamicCols.forEach((col) => {
      formData.append(col.textName, newStaff[col.textName] || "");
    });

    try {
      const res = await fetch(`${BASE_URL}/quanly/add`, {
        method: "POST",
        body: formData, // Gửi trực tiếp formData, không cần headers Content-Type JSON
      });

      if (res.ok) {
        alert("Thêm nhân viên thành công!");
        setShowAddModal(false);
        fetchData(); // Load lại bảng
      }
      if (!res.ok) {
        const errorData = await res.json();
        alert(
          `Thêm nhân viên thất bại: ${
            errorData.message || "Lỗi không xác định"
          }`,
        );
      }
    } catch (err) {
      console.error("Lỗi khi upload:", err);
    }
  };

  const newPass = async () => {
    const newErrors = {};
    // 1. Kiểm tra các trường cố định
    if (!newPassUser.username) newErrors.username = true;
    // 3. Nếu có ít nhất một lỗi, cập nhật state và dừng việc lưu
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert("Vui lòng điền đầy đủ các thông tin có viền đỏ!");
      return; // Dừng hàm tại đây, không gọi API
    }
    // Nếu không có lỗi, tiến hành gửi dữ liệu (giữ nguyên logic FormData trước đó của bạn)
    setErrors({}); // Xóa bỏ các lỗi cũ nếu có
    const formData = new FormData();

    formData.append("username", newPassUser.username);

    try {
      const res = await fetch(`${BASE_URL}/quanly/newPass`, {
        method: "POST",
        body: formData, // Gửi trực tiếp formData, không cần headers Content-Type JSON
      });

      if (res.ok) {
        alert(
          "Đã cấp lại mật khẩu thành công! Mật khẩu mới là '123456'. Vui lòng yêu cầu nhân viên đổi mật khẩu sau khi đăng nhập.",
        );
      }
      if (!res.ok) {
        const errorData = await res.json();
        alert(
          `Cấp lại mật khẩu thất bại: ${
            errorData.message || "Lỗi không xác định"
          }`,
        );
      }
    } catch (err) {
      console.error("Lỗi khi upload:", err);
    }
  };
  const handleAutoFillByPlate = async (plateNum) => {
    if (!plateNum) return;
    try {
      const res = await fetch(`${BASE_URL}/api/plsMB`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateNum }),
      });
      const data = await res.json();

      if (data && data.length > 0) {
        const info = data[0];

        setEditValues((prev) => {
          // Tạo một object mới chứa dữ liệu mặc định
          const newValues = {
            ...prev,
            name: info.name || prev.name,
            area: info.area || prev.area,
            status: info.status || prev.status,
          };

          // Nếu trong dữ liệu API trả về có các key trùng với cột động (filterOptions)
          // Chúng ta sẽ lặp qua và gán chúng vào newValues
          filterOptions.forEach((opt) => {
            if (info[opt.textName]) {
              newValues[opt.textName] = info[opt.textName];
            }
          });

          return newValues;
        });
      }
    } catch (err) {
      console.error("Lỗi cập nhật dữ liệu:", err);
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
      return;
    }

    if (!editValues.number || editValues.number.trim() === "") {
      setErrors((prev) => ({ ...prev, number: true }));
      return;
    }
    if (!editValues.username || editValues.username.trim() === "") {
      setErrors((prev) => ({ ...prev, username: true }));
      return;
    }
    if (!editValues.password || editValues.password.trim() === "") {
      setErrors((prev) => ({ ...prev, password: true }));
      return;
    }

    // 3. Log dữ liệu ra console để bạn kiểm tra (Debugging)
    console.log("Dữ liệu gửi lên:", { id, ...editValues });
    try {
      const res = await fetch(`${BASE_URL}/mng/edit/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editValues }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchData();
      }
    } catch (err) {
      alert("Lỗi khi lưu!");
    }
  };
  const handleDeleteStaff = async (id) => {
    const isConfirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa nhân viên này không? Hành động này không thể hoàn tác.",
    );
    if (!id) {
      alert("Không tìm thấy ID nhân viên!");
      return;
    }
    if (isConfirmed) {
      try {
        const res = await fetch(`${BASE_URL}/quanly/delete/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          fetchData();
        }
      } catch (err) {
        alert("Lỗi khi xóa!");
      }
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-lg">
        {/* Header & Thanh tìm kiếm & Nút Thêm */}
        <div
          className=" border-b flex flex-col md:flex-row justify-between items-start "
          style={{ padding: "8px 0" }}
        >
          <h4 className="my-[20px] text-[24px] text-gray-700">
            Quản lý nhân viên
          </h4>

          <button
            className="text-[20px] my-[10px]"
            onClick={() => setMngpass(!mngpass)}
          >
            CẤP LẠI MẬT KHẨU
          </button>
          {mngpass && (
            <div className="mb-[10px] text-[18px] mb-4 text-red-500">
              <InputField
                type="text"
                placeholder="Tài khoản cấp lại mật khẩu"
                className="text-[18px]"
                value={newPassUser.username || ""}
                onChange={(val) => {
                  setNewPassUser({ ...newPassUser, username: val });
                  if (val) {
                    setErrors((prev) => ({ ...prev, username: false }));
                  }
                }}
              />
              <button
                className="text-[18px]  py-1 bg-gray-500 text-white rounded hover:bg-[#f1354e]"
                style={{ margin: "0 5px 0 0", borderRadius: "6px" }}
                onClick={() => {
                  setMngpass(!mngpass);
                  setNewPassUser({ username: "" });
                  setErrors({});
                }}
              >
                Huỷ
              </button>
              <button
                className="text-[18px] ml-2 px-4 py-1 bg-blue-500 text-white rounded hover:bg-[#1dd10f]"
                style={{ borderRadius: "6px" }}
                onClick={newPass}
              >
                Xác nhận
              </button>
            </div>
          )}
          <div className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Tìm kiếm tên nhân viên..."
              className="border rounded  w-full md:w-64 outline-none focus:ring-2 focus:ring-blue-400"
              style={{ marginRight: "10px" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {}
            <button
              onClick={() => setShowAddModal(!showAddModal)}
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                padding: "8px 16px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                whiteSpace: "nowrap",
              }}
            >
              {showAddModal ? "Đóng" : "Thêm nhân viên"}
            </button>
          </div>
        </div>
        {showAddModal && (
          <div
            className="p-6 border-t bg-gray-50 rounded-b-lg shadow-inner "
            style={{ fontSize: "20px" }}
          >
            <h5 className="text-[20px] font-bold mb-6 text-gray-800 border-l-4 border-blue-600 pl-3">
              THÊM NHÂN VIÊN MỚI
            </h5>
            <div className="grid grid-cols-2 gap-6">
              <div className=" mr-[10px]">
                <label className="text-sm font-semibold text-gray-700 mb-1">
                  ĐIỀN TÊN TÀI KHOẢN
                </label>
                <InputField
                  type="text"
                  style={{ fontSize: "16px", marginRight: "10px" }}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={newStaff.username || ""}
                  onChange={(val) => {
                    // Logic cập nhật state
                    setNewStaff({ ...newStaff, username: val });
                    // Kiểm tra lỗi: nếu có giá trị thì xóa trạng thái lỗi của 'username'
                    if (val) {
                      setErrors((prev) => ({ ...prev, username: false }));
                    }
                  }}
                  hasError={!!errors.username} // Bây giờ thuộc tính này sẽ hoạt động vì dùng đúng InputField
                />
              </div>
              <div className=" mr-[10px]">
                <label className="text-sm font-semibold text-gray-700 mb-1">
                  ĐIỀN MẬT KHẨU
                </label>
                <InputField
                  type="password"
                  style={{ fontSize: "16px", marginRight: "10px" }}
                  placeholder="Ví dụ: 123456"
                  value={newStaff.password || ""}
                  onChange={(val) => {
                    // Logic cập nhật state
                    setNewStaff({ ...newStaff, password: val });
                    // Kiểm tra lỗi: nếu có giá trị thì xóa trạng thái lỗi của 'password'
                    if (val) {
                      setErrors((prev) => ({ ...prev, password: false }));
                    }
                  }}
                  hasError={!!errors.password} // Bây giờ thuộc tính này sẽ hoạt động vì dùng đúng InputField
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {/* 4. Chọn Ảnh (Avatar) */}
              <div className="col-span-1">
                {/* Sử dụng Tailwind: flex flex-col sẽ ép label và ảnh xuống hàng */}
                <label
                  className="mb-[20px] col-span-2 w-[300px] h-[300px] 
             border-2 border-dashed border-gray-300 
             rounded-xl flex items-center justify-center 
             cursor-pointer relative overflow-hidden 
             hover:border-blue-500 transition"
                >
                  <img
                    src={
                      previewImage ||
                      "http://127.0.0.1:5000/assets/images/users/guest.jpg"
                    }
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <span className="text-white font-semibold">
                      {previewImage ? "Đổi ảnh" : "Tải ảnh đại diện"}
                    </span>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setNewStaff({ ...newStaff, avatarFile: file });
                        setPreviewImage(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>

                <div className="w-full flex flex-col items-center gap-2 py-2">
                  {/* <label className="text-sm font-semibold text-gray-700">
                    Ảnh đại diện
                  </label>

                  <div
                    className="avatar-wrapper group"
                    style={{
                      position: "relative",
                      display: "inline-block",
                      width: "80px",
                      height: "80px",
                      cursor: "pointer",
                    }}
                    onClick={() => fileInputRef.current.click()}
                  > */}
                  {/* Ảnh Preview */}
                  {/* <img
                      src={
                        previewImage ||
                        "http://127.0.0.1:5000/assets/images/users/guest.jpg"
                      }
                      alt="chọn ảnh"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                      }}
                    /> */}

                  {/* Input file bị ẩn */}
                  {/* <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setNewStaff({ ...newStaff, avatarFile: file });
                          setPreviewImage(URL.createObjectURL(file));
                        }
                      }}
                    /> */}
                  {/* </div> */}
                </div>
              </div>
              {/* Container Grid chính với 4 cột */}
              {/* 1. Nhập Tên */}
              <div className="col-span-3 grid grid-cols-3 gap-6">
                <div className="mr-[10px]">
                  <label className="text-sm font-semibold text-gray-700 mb-1">
                    Họ Tên
                  </label>
                  <InputField
                    type="text"
                    style={{ fontSize: "16px", marginRight: "10px" }}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={newStaff.name || ""}
                    onChange={(val) => {
                      // Logic cập nhật state
                      setNewStaff({ ...newStaff, name: val });
                      // Kiểm tra lỗi: nếu có giá trị thì xóa trạng thái lỗi của 'name'
                      if (val) {
                        setErrors((prev) => ({ ...prev, name: false }));
                      }
                    }}
                    hasError={!!errors.name} // Bây giờ thuộc tính này sẽ hoạt động vì dùng đúng InputField
                  />
                </div>

                {/* 2. Nhập Số hiệu */}
                <div className=" mr-[10px]">
                  <label className="text-sm font-semibold text-gray-700 mb-1">
                    Biển số xe
                  </label>
                  <InputField
                    type="text"
                    style={{ marginLeft: "10px", fontSize: "16px" }}
                    placeholder="Nhập số..."
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newStaff.number || ""}
                    onChange={(val) => {
                      setNewStaff({ ...newStaff, number: val });
                      if (val) {
                        setErrors((prev) => ({ ...prev, number: false }));
                      }
                    }}
                    hasError={!!errors.number}
                  />
                </div>

                {/* 3. Nhập Khu vực */}
                <div className=" mr-[10px]">
                  <label className="text-sm font-semibold text-gray-700 mb-1">
                    Khu vực
                  </label>
                  <InputField
                    style={{ marginLeft: "10px", fontSize: "16px" }}
                    type="text"
                    placeholder="Ví dụ: 12A3"
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newStaff.area || ""}
                    onChange={(val) => {
                      setNewStaff({ ...newStaff, area: val });
                      if (val) {
                        setErrors((prev) => ({ ...prev, area: false }));
                      }
                    }}
                    hasError={!!errors.area}
                  />
                </div>

                {/* 5. Render các thẻ Select động từ dynamicCols (Sẽ tự động lấp đầy các ô còn lại trong hàng) */}
                {dynamicCols.map((col) => (
                  <div key={col.textName} className=" mr-[10px] pb-[10px]">
                    <label className="text-sm font-semibold text-gray-700 pb-[5px] ">
                      {col.name}
                    </label>
                    <div>
                      <select
                        style={{
                          fontSize: "16px",
                          width: "100% ",
                          height: "36px",
                          borderRadius: "6px",
                        }}
                        className=" border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                        value={newStaff[col.textName] || ""}
                        onChange={(e) => {
                          setNewStaff({
                            ...newStaff,
                            [col.textName]: e.target.value,
                          });
                        }}
                      >
                        <option value="">-- Chọn {col.name} --</option>
                        {col.content?.map((val, i) => (
                          <option key={i} value={val}>
                            {val}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Nút hành động */}
            <div
              className=" border-t flex justify-start gap-4"
              style={{ padding: "16px 0", marginTop: "20px" }}
            >
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setPreviewImage(null);
                  setNewStaff({
                    name: "",
                    number: "",
                    area: "",
                    username: "",
                    password: "",
                  });
                  setErrors({});
                }}
                className="bg-red hover:bg-[#dc2626] cursor-pointer "
                style={{ fontSize: "20px", marginRight: "10px" }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleAddStaff}
                className="px-8 py-2 text-white rounded-lg font-bold hover:bg-[#16a34a]  shadow-lg active:transform active:scale-95 transition-all"
                style={{
                  fontSize: "20px",
                  marginRight: "10px",
                }}
              >
                Xác nhận Thêm
              </button>
            </div>
          </div>
        )}
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100 uppercase text-xs text-gray-600 border-b-2 border-gray-300 text-center">
              <tr>
                <th className="px-4 py-3 border-b">STT</th>
                <th className="px-4 py-3 border-b">Ảnh</th>
                <th className="px-4 py-3 border-b">Họ Tên</th>
                <th className="px-4 py-3 border-b">Khu Vực</th>
                <th className="px-4 py-3 border-b">Biển Số</th>

                {dynamicCols.map((col) => (
                  <th key={col.textName} className="px-4 py-3 border-b">
                    {col.name}
                  </th>
                ))}
                <th className="px-4 py-3 border-b text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-center">
              {filteredStaffs.map((item, idx) => (
                <tr key={item._id || idx}>
                  {/* 1. STT */}
                  <td className="px-4 py-3 border-b text-sm text-center">
                    {idx + 1}
                  </td>

                  {editingId === item._id ? (
                    <React.Fragment key={`edit-${item._id || idx}`}>
                      {/* 2. Ảnh đại diện */}
                      <td>
                        <div className="col-span-1">
                          {/* Sử dụng Tailwind: flex flex-col sẽ ép label và ảnh xuống hàng */}
                          <div className="w-full flex flex-col items-center gap-2 py-2">
                            <div
                              className="avatar-wrapper group text-center"
                              style={{
                                position: "relative",
                                display: "inline-block",
                                width: "80px",
                                height: "80px",
                                cursor: "pointer",
                              }}
                              onClick={() => fileInputRef.current.click()}
                            >
                              {/* Ảnh Preview */}
                              <img
                                src={
                                  previewImage ||
                                  // 2. Nếu không, hiển thị ảnh hiện tại của nhân viên từ Server
                                  `${BASE_URL}${item.avatar}` ||
                                  // 3. Cuối cùng mới là ảnh mặc định
                                  "http://127.0.0.1:5000/assets/images/users/guest.jpg"
                                }
                                alt="chọn ảnh"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  borderRadius: "8px",
                                  border: "1px solid #ccc",
                                }}
                              />

                              {/* Input file bị ẩn */}
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    setNewStaff({
                                      ...newStaff,
                                      avatarFile: file,
                                    });
                                    setPreviewImage(URL.createObjectURL(file));
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* 3. họ tên*/}
                      <td
                        className="font-medium text-center"
                        style={{ borderBottom: "1px solid #111111ff" }}
                      >
                        <InputField
                          type="text"
                          style={{ fontSize: "12px", width: "100%" }}
                          value={editValues.name || ""}
                          onChange={(val) => {
                            setEditValues({ ...editValues, name: val });
                            if (val)
                              setErrors((prev) => ({ ...prev, name: false }));
                          }}
                          hasError={!!errors.name}
                        />
                      </td>
                      {/* 4. Khu vực */}
                      <td
                        className="font-medium text-center"
                        style={{ borderBottom: "1px solid #111111ff" }}
                      >
                        <InputField
                          type="text"
                          style={{ fontSize: "12px", width: "100%" }}
                          value={editValues.area || ""}
                          onChange={(val) => {
                            setEditValues({ ...editValues, area: val });
                            if (val)
                              setErrors((prev) => ({ ...prev, area: false }));
                          }}
                          hasError={!!errors.area}
                        />
                      </td>
                      {/* 5. Biển số */}
                      <td
                        className="font-medium text-center"
                        style={{ borderBottom: "1px solid #111111ff" }}
                      >
                        <InputField
                          type="text"
                          style={{ fontSize: "12px", width: "100%" }}
                          value={editValues.number || ""}
                          onChange={(val) => {
                            setEditValues({ ...editValues, number: val });
                            if (val)
                              setErrors((prev) => ({ ...prev, number: false }));
                          }}
                          onBlur={(e) =>
                            handleAutoFillByPlate(editValues.number)
                          }
                          hasError={!!errors.number}
                        />
                      </td>

                      {dynamicCols.map((opt) => (
                        <td
                          key={`edit-opt-${opt.textName}`}
                          className="px-4 py-3 text-sm text-center"
                          style={{ borderBottom: "1px solid #181414ff" }}
                        >
                          <select
                            className="w-full border rounded px-1 py-1"
                            style={{
                              height: "36px",
                              border: "1px solid #ccc",
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
                        </td>
                      ))}
                    </React.Fragment>
                  ) : (
                    <React.Fragment key={`view-${item._id || idx}`}>
                      {/* 2. Ảnh đại diện */}
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
                                className="inset-0 w-full h-full object-cover"
                                alt="avt"
                              />
                            )}
                          </div>
                        </div>
                      </td>
                      {/* 3. họ tên */}
                      <td
                        className="px-4 py-3"
                        style={{ borderBottom: "1px solid #181414ff" }}
                      >
                        {item.name}
                      </td>
                      {/* 4. Khu vực */}
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ borderBottom: "1px solid #181414ff" }}
                      >
                        {item.area}
                      </td>
                      {/* 5. Biển số */}
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ borderBottom: "1px solid #181414ff" }}
                      >
                        {item.number}
                      </td>
                      {dynamicCols.map((col) => (
                        <td
                          key={`view-opt-${col.textName}`}
                          className="px-4 py-3 text-sm"
                          style={{ borderBottom: "1px solid #181414ff" }}
                        >
                          {item[col.textName] || ""}
                        </td>
                      ))}
                    </React.Fragment>
                  )}

                  <td
                    className="px-2 py-3"
                    style={{ borderBottom: "1px solid #181414ff" }}
                  >
                    <div className="flex flex-col items-center gap-[5px] p-[5px_0]">
                      {editingId === item._id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(item._id)}
                            className="bg-[#16a34a] text-white w-[70px] h-[30px] rounded cursor-pointer"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-[#6b7280] text-white w-[70px] h-[30px] rounded cursor-pointer"
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
                            className="bg-[#2563eb] text-white w-[70px] h-[30px] rounded cursor-pointer"
                            style={{ fontSize: "16px", marginRight: "10px" }}
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(item._id)}
                            className="bg-[#dc2626] text-white w-[70px] h-[30px] rounded cursor-pointer"
                            style={{ fontSize: "16px", marginRight: "10px" }}
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
        </div>
      </div>
    </div>
  );
};

export default ManagementContent;
