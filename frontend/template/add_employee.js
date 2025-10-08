const addEmployeeBtn = document.getElementById("add-employee-btn");
const addEmployeeResult = document.getElementById("add-employee-result");

let isFormVisible = false; // trạng thái toggle

document.getElementById("add-employee-btn").addEventListener("click", () => {
  (async () => {
    if (isFormVisible) {
      addEmployeeResult.innerHTML = "";
      isFormVisible = false;
      return;
    }
    try {
      const res = await fetch("add_employee.html");
      if (!res.ok) throw new Error("Không thể tải file");
      const html = await res.text();
      document.getElementById("add-employee-result").innerHTML = html;
      isFormVisible = true;
      // Nút thoát
      const exitBtn = document.getElementById("exitUser-btn");
      if (exitBtn) {
        exitBtn.addEventListener("click", () => {
          addEmployeeResult.innerHTML = "";
          isFormVisible = false;
        });
      }
      // format biển số
      function formatPlate(plate) {
        plate = plate.toUpperCase().replace(/\s+/g, ""); // xóa khoảng trắng
        // nếu đủ 8 ký tự: 4 + 4
        if (plate.length === 8) return plate.slice(0, 4) + " " + plate.slice(4);
        // nếu đủ 9 ký tự: 5 + 4
        if (plate.length === 9) return plate.slice(0, 4) + " " + plate.slice(4);
        return plate;
      }
      // Validate
      const validator = new JustValidate("#add-employee-form");
      validator
        .addField("#name", [
          { rule: "required", errorMessage: "Tên không được để trống" },
          {
            rule: "customRegexp",
            value: /^[\p{L}\s]+$/u, // phép tất cả chữ Unicode (có dấu)
            errorMessage: "Tên chỉ được chứa chữ cái và khoảng trắng",
          },
        ])
        .addField("#position", [
          { rule: "required", errorMessage: "Chức vụ không được để trống" },
        ])
        .addField("#motobike", [
          { rule: "required", errorMessage: "Biển số không được để trống" },
          {
            rule: "custom",
            errorMessage: "Biển số không hợp lệ (VD: 59A1 12345)",
            validator: (value) => {
              const cleaned = value.replace(/\s+/g, "");
              return /^[0-9]{2}[A-Z]{1}[A-Z0-9]{1}[0-9]{4,5}$/.test(cleaned);
            },
          },
        ]);

      document
        .getElementById("addUser-btn")
        .addEventListener("click", async () => {
          const isValid = await validator.revalidate(); // chạy validate lại
          if (isValid) {
            const name = document.getElementById("name").value;
            const position = document.getElementById("position").value;
            let motobike = document.getElementById("motobike").value;
            motobike = formatPlate(motobike);
            // console.log("✅ Hợp lệ:", name, position, motobike);
            // alert("Thêm thành công!");
            try {
              const res = await fetch("/add_employee", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: name,
                  position: position,
                  xe: motobike,
                }),
              });
              const data = await res.json();
              if (!res.ok)
                throw new Error(data.error || "Lỗi khi thêm nhân viên");
              alert("✅ Thêm thành công! ID: " + data.id);
              document.getElementById("add-employee-form").reset();
            } catch (err) {
              console.error(err);
              alert(err.message);
            }
          }
        });
    } catch (err) {
      console.error("Fetch error:", err);
      document.getElementById("add-employee-result").innerHTML =
        "<p class='text-red-500'>Không tải được form thêm nhân viên.</p>";
    }
  })();
});
