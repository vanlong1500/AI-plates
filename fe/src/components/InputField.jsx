// src/components/InputField.jsx
export const InputField = (props) => {
  const { label, hasError, id, onChange, value, type, ...rest } = props; // Bóc tách kỹ value và onChange

  return (
    <div style={{ marginBottom: "15px" }}>
      <label
        style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
      >
        {label}
      </label>
      <input
        {...rest}
        id={id}
        type={type}
        value={value} // Đảm bảo value được truyền đúng
        onChange={(e) => onChange(e.target.value)} // Truyền thẳng giá trị chuỗi ra ngoài
        style={{
          width: "100%",
          padding: "10px",
          marginRight: "10px",
          boxSizing: "border-box",
          borderRadius: "4px",
          border: hasError ? "2px solid red" : "1px solid #ccc",
          outline: "none",
        }}
      />
    </div>
  );
};
// src/utils/autoFillService.js
// src/utils/autoFillService.js
export const handleAutoFillByPlate = async (
  plateNumber,
  filterOptions,
  setEditValues,
  BASE_URL,
) => {
  if (!plateNumber) return;

  try {
    const res = await fetch(`${BASE_URL}/statistic/auto`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: plateNumber }),
    });

    const data = await res.json();

    if (data.success && data.results && data.results.length > 0) {
      const info = data.results[0]; // Đối tượng {area: "75h1", name: "aaa", ...}
      const { _id, time, createdAt, ...infoClean } = info;
      setEditValues((prev) => {
        // 1. Cập nhật các trường cố định (Tên, Khu vực, Số xe, Trạng thái)
        const newValues = {
          ...prev,
          ...infoClean,
          // name: info.name || prev.name,
          // area: info.area || prev.area,
          // number: info.number || prev.number,
        };

        // 2. QUAN TRỌNG: Cập nhật các cột động (filterOptions)
        // Ví dụ: Nếu filterOptions có opt.textName là "chuc_vu",
        // nó sẽ lấy info["chuc_vu"] (là "\u0111\u1ea1i u\u00fd") gán vào newValues
        filterOptions.forEach((opt) => {
          if (info[opt.textName] !== undefined) {
            newValues[opt.textName] = info[opt.textName];
          }
        });

        return newValues;
      });
    }
  } catch (err) {
    console.error("Lỗi tự động điền:", err);
  }
};
