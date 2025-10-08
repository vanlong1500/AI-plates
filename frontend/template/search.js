const addEmployeeBtn = document.getElementById("search-employee-btn");
const addEmployeeResult = document.getElementById("search-employee-result");

let isFormVisible = false; // trạng thái toggle

document.getElementById("search-employee-btn").addEventListener("click", () => {
  (async () => {
    if (isFormVisible) {
      addEmployeeResult.innerHTML = "";
      isFormVisible = false;
      return;
    }
    try {
      const res = await fetch("search.html");
      if (!res.ok) throw new Error("Không thể tải file");
      const html = await res.text();
      document.getElementById("search-employee-result").innerHTML = html;
      isFormVisible = true;
      //
      // Submit
      const form = document.getElementById("search-employee-form");
      form.addEventListener("submit", async (e) => {
        e.preventDefault(); // chống load

        const name = document.getElementById("name").value;
        const position = document.getElementById("position").value;
        const xe = document.getElementById("xe").value;

        try {
          const res = await fetch("/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, position, xe }),
          });

          if (!res.ok) throw new Error("Lỗi khi tìm kiếm");

          const data = await res.json(); // Danh sách kết quả từ back end

          // render kết quả
          const result = document.getElementById("search-result");
          result.style.display = "block"; // Hiện bảng
          if (data.length === 0) {
            result.innerHTML = "<p>Không tìm thấy nhân viên.</p>";
          } else {
            result.innerHTML = `
                <table class="border border-gray-300 w-full text-left">
                <thead class="bg-gray-200 sticky top-0">
                  <tr>
                    <th class="border p-1">Tên</th>
                    <th class="border p-1">Chức vụ</th>
                    <th class="border p-1">Biển số xe</th>
                  </tr>
                </thead>
                <tbody>
                  ${data
                    .map(
                      (item, idx) => `
                    <tr>
                      <td class="border p-1 cursor-pointer text-blue-600 hover:underline" data-xe="${item.xe}" id="staff-name-${idx}">${item.name}</td>
                      <td class="border p-1">${item.position}</td>
                      <td class="border p-1">${item.xe}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
                `;
            // click xem lịch sử
            // Gắn event click cho từng tên
            const nameCells = result.querySelectorAll("td[data-xe]");
            nameCells.forEach((cell, idx) => {
              cell.addEventListener("click", async () => {
                const xe = cell.dataset.xe;
                const item = data[idx]; // lấy thông tin đầy đủ từ kết quả search
                const module = await import("./history.js");
                module.loadHistory(xe, item.name, item.position);
              });
            });
            //
          }
        } catch (err) {
          console.error(err);
          document.getElementById("result").innerHTML =
            "<p class='text-red-500'>Lỗi khi tìm kiếm nhân viên.</p>";
        }
      });
    } catch (err) {
      console.error("Fetch error:", err);
      document.getElementById("search-employee-result").innerHTML =
        "<p class='text-red-500'>Không tải được form Tìm kiếm nhân viên.</p>";
    }
  })();
});
