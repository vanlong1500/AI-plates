import React, { useState, useEffect, useRef } from "react";
import { InputField } from "../../components/InputField";

const InfCus = ({ title, nameCus }) => {
  const [staffs, setStaffs] = useState([]);
  const [dynamicCols, setDynamicCols] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [errors, setErrors] = useState({});
  // State cho Tìm kiếm và Thêm mới
  const [mngpass, setMngpass] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [infEmployee, setInfEmployee] = useState({ name: "" });
  const [newPassUser, setNewPassUser] = useState({ username: "" });
  const fileInputRef = useRef(null);
  // const [infEmployee, setInfEmployee] = useState({});
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
  const uploadDataEmp = async () => {
    const newErrors = {};

    // 1. Kiểm tra các trường cố định
    if (!infEmployee.name) newErrors.name = true;
    if (!infEmployee.number) newErrors.number = true;
    if (!infEmployee.area) newErrors.area = true;

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
    formData.append("name", infEmployee.name);
    formData.append("number", infEmployee.number);
    formData.append("area", infEmployee.area);
    formData.append("username", nameCus);
    // Nếu có file ảnh, thêm vào FormData
    if (infEmployee.avatarFile) {
      formData.append("avatar", infEmployee.avatarFile);
    }
    console.log("avatarFile:", infEmployee.avatarFile);
    // Thêm các cột động
    dynamicCols.forEach((col) => {
      formData.append(col.textName, infEmployee[col.textName] || "");
    });
    console.log("Dữ liệu gửi lên:", {
      ...infEmployee,
      username: nameCus,
    });
    try {
      const res = await fetch(`${BASE_URL}/quanly/updateInf`, {
        method: "POST",
        body: formData, // Gửi trực tiếp formData, không cần headers Content-Type JSON
      });

      if (res.ok) {
        alert("Cập nhật thông tin nhân viên thành công!");
        setShowAddModal(false);
        fetchData(); // Load lại bảng
      }
      if (!res.ok) {
        const errorData = await res.json();
        alert(
          `Cập nhật thông tin nhân viên thất bại: ${
            errorData.message || "Lỗi không xác định"
          }`,
        );
      }
    } catch (err) {
      console.error("Lỗi khi upload:", err);
    }
  };

  const uploadPass = async () => {
    const newErrors = {};
    // 1. Kiểm tra các trường cố định
    if (!newPassUser.passOld) newErrors.passOld = true;
    if (!newPassUser.passNew) newErrors.passNew = true;
    if (!newPassUser.passConfirm) newErrors.passConfirm = true;
    // 2. Kiểm tra nếu có lỗi nào đó, cập nhật state và kiểm tra mật khẩu mới phải lớn hơn  hoặc bằng 6 ký tự
    if (newPassUser.passNew && newPassUser.passNew.length < 6) {
      newErrors.passNew = true;
      alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; // Dừng hàm tại đây, không gọi API
    }
    // Nếu không có lỗi, tiến hành gửi dữ liệu (giữ nguyên logic FormData trước đó của bạn)
    setErrors({}); // Xóa bỏ các lỗi cũ nếu có
    const formData = new FormData();
    // kiểm tra mật khẩu mới và xác nhận mật khẩu mới có khớp nhau không
    if (newPassUser.passNew !== newPassUser.passConfirm) {
      setErrors((prev) => ({ ...prev, passConfirm: true }));
      alert("Mật khẩu mới và xác nhận mật khẩu mới không khớp!");
      return;
    }
    formData.append("passOld", newPassUser.passOld);
    formData.append("passNew", newPassUser.passNew);
    formData.append("passConfirm", newPassUser.passConfirm);
    formData.append("username", nameCus);
    console.log("Dữ liệu gửi lên:", { ...newPassUser, username: nameCus });
    try {
      const res = await fetch(`${BASE_URL}/quanly/uploadPass`, {
        method: "POST",
        body: formData, // Gửi trực tiếp formData, không cần headers Content-Type JSON
      });

      if (res.ok) {
        alert("Đổi mật khẩu thành công! ");
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
  const getInfEmployee = async (username) => {
    try {
      const res = await fetch(`${BASE_URL}/api/getEmployee/${username}`, {
        method: "GET",
      });
      const data = await res.json();
      // nếu trả về là 404 thì alert và setInfEmployee về rỗng
      if (data.success === false) {
        setInfEmployee({});
        alert(
          "Không tìm thấy thông tin nhân viên! Vui lòng cập nhật thông tin cá nhân đầy đủ.",
        );
      } else {
        setInfEmployee(data.employee || {});
        setPreviewImage(
          data.employee.avatar ? `${BASE_URL}${data.employee.avatar}` : null,
        );
        return;
      }
      console.log("Thông tin nhân viên:", data);
    } catch (err) {
      console.error("Lỗi khi lấy thông tin nhân viên:", err);
    }
  };
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-lg">
        {/* Header & Thanh tìm kiếm & Nút Thêm */}

        <div
          className="col-span-2 border-b flex flex-col md:flex-row justify-between items-start "
          style={{ padding: "8px 0" }}
        >
          <h4 className="my-[20px] text-[32px] text-gray-700">TRANG CÁ NHÂN</h4>
          <div className="w-full grid grid-cols-3  gap-4 items-start">
            <div className="col-span-2">
              <button
                className="text-[20px] my-[10px]"
                onClick={() => {
                  getInfEmployee(nameCus);
                  setMngpass(1);
                }}
              >
                THÔNG TIN CÁ NHÂN
              </button>
              {mngpass === 1 && (
                <div className="grid grid-cols-2 gap-6 text-[18px]">
                  <div
                    className="mb-[20px] col-span-2 w-[300px] h-[300px] 
             border-2 border-dashed border-gray-300 
             rounded-xl flex items-center justify-center 
             cursor-pointer relative overflow-hidden 
             hover:border-blue-500 transition"
                    onClick={() => fileInputRef.current.click()}
                  >
                    {/* Ảnh preview */}
                    {previewImage && (
                      <img
                        src={
                          previewImage
                            ? previewImage
                            : avatar
                              ? `${BASE_URL}${infEmployee.avatar}`
                              : "http://127.0.0.1:5000/assets/images/users/guest.jpg"
                        }
                        alt="avatar"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    {/* Overlay + text */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="text-white text-[16px] font-semibold text-center px-2">
                        {previewImage ? "" : "Tải ảnh đại diện"}
                      </span>
                    </div>

                    {/* Input hidden */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setPreviewImage(URL.createObjectURL(file));
                          setInfEmployee({ ...infEmployee, avatarFile: file });
                        }
                      }}
                    />
                  </div>
                  {/* Name */}
                  <div style={{ marginRight: "10px", height: "80px" }}>
                    <label
                      htmlFor="name"
                      className="text-[20px] uppercase font-bold text-gray-700 mb-[5px] block"
                    >
                      Họ tên
                    </label>
                    <InputField
                      type="text"
                      className="text-[20px]"
                      placeholder="Họ tên (Chưa có dữ liệu)"
                      value={infEmployee.name || ""}
                      onChange={(val) => {
                        setInfEmployee({ ...infEmployee, name: val });
                        if (val) {
                          setErrors((prev) => ({ ...prev, name: false }));
                        }
                      }}
                      hasError={!!errors.name}
                    />
                  </div>
                  {/* Number */}
                  <div style={{ marginRight: "10px", height: "80px" }}>
                    <label
                      htmlFor="number"
                      className="text-[20px] uppercase font-bold text-gray-700 mb-[5px] block"
                    >
                      Biển số
                    </label>
                    <InputField
                      type="text"
                      placeholder="Biển số"
                      value={infEmployee.number || ""}
                      onChange={(val) => {
                        setInfEmployee({ ...infEmployee, number: val });
                        if (val) {
                          setErrors((prev) => ({ ...prev, number: false }));
                        }
                      }}
                      hasError={!!errors.number}
                    />
                  </div>
                  {/* Area */}
                  <div style={{ marginRight: "10px", height: "80px" }}>
                    <label
                      htmlFor="area"
                      className="text-[20px] uppercase font-bold text-gray-700 mb-[5px] block"
                    >
                      Khu vực
                    </label>
                    <InputField
                      type="text"
                      placeholder="Khu vực"
                      value={infEmployee.area || ""}
                      onChange={(val) => {
                        setInfEmployee({ ...infEmployee, area: val });
                        if (val) {
                          setErrors((prev) => ({ ...prev, area: false }));
                        }
                      }}
                      hasError={!!errors.area}
                    />
                  </div>
                  {/* Select reder auto*/}
                  {dynamicCols.map((col) => (
                    <div
                      key={col.textName}
                      style={{ marginRight: "10px", height: "80px" }}
                    >
                      <label className="text-[20px] uppercase font-bold text-gray-700 mb-[5px] block">
                        {col.name}
                      </label>
                      <select
                        style={{ borderRadius: "10px" }}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 h-[38px] mr-[10px] w-full focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                        value={infEmployee[col.textName] || ""}
                        onChange={(e) => {
                          setInfEmployee({
                            ...infEmployee,
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
                  ))}
                  {/* Buttons */}
                  <div className="col-span-2 flex gap-3 mt-4">
                    <button
                      className="text-[20px] p-[10px] bg-gray-500 text-white rounded hover:bg-[#f1354e]"
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
                      className="text-[20px] ml-2 p-[10px] bg-blue-500 text-white rounded hover:bg-[#1dd10f]"
                      style={{ borderRadius: "6px" }}
                      onClick={uploadDataEmp}
                    >
                      Xác nhận
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="col-span-1">
              <button
                className="text-[20px] my-[10px]"
                onClick={() => setMngpass(2)}
              >
                ĐỔI MẬT KHẨU
              </button>
              {mngpass === 2 && (
                <div className="mb-[10px] text-[18px] mb-4 text-red-500">
                  <InputField
                    type="password"
                    placeholder="Mật khẩu cũ"
                    className="text-[18px]"
                    value={newPassUser.passOld || ""}
                    onChange={(val) => {
                      setNewPassUser({ ...newPassUser, passOld: val });
                      if (val) {
                        setErrors((prev) => ({ ...prev, passOld: false }));
                      }
                    }}
                    hasError={!!errors.passOld}
                  />
                  <InputField
                    type="password"
                    placeholder="Mật khẩu mới"
                    className="text-[18px]"
                    value={newPassUser.passNew || ""}
                    onChange={(val) => {
                      setNewPassUser({ ...newPassUser, passNew: val });
                      if (val) {
                        setErrors((prev) => ({ ...prev, passNew: false }));
                      }
                    }}
                    hasError={!!errors.passNew}
                  />
                  <InputField
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    className="text-[18px]"
                    value={newPassUser.passConfirm || ""}
                    onChange={(val) => {
                      setNewPassUser({ ...newPassUser, passConfirm: val });
                      if (val) {
                        setErrors((prev) => ({ ...prev, passConfirm: false }));
                      }
                    }}
                    hasError={!!errors.passConfirm}
                  />
                  <button
                    className="text-[18px]  py-1 bg-gray-500 text-white rounded hover:bg-[#f1354e]"
                    style={{ margin: "0 5px 0 0", borderRadius: "6px" }}
                    onClick={() => {
                      setMngpass(0);
                      setNewPassUser({
                        username: "",
                        passOld: "",
                        passNew: "",
                        passConfirm: "",
                      });
                      setErrors({});
                    }}
                  >
                    Huỷ
                  </button>
                  <button
                    className="text-[18px] ml-2 px-4 py-1 bg-blue-500 text-white rounded hover:bg-[#1dd10f]"
                    style={{ borderRadius: "6px" }}
                    onClick={uploadPass}
                  >
                    Xác nhận
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfCus;
