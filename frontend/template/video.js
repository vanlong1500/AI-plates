document.getElementById("test-btn").addEventListener("click", async () => {
  try {
    const response = await fetch("/test-backend");
    const data = await response.json();
    document.getElementById("result").innerText = data.message;
  } catch (error) {
    document.getElementById("result").innerText = "Lỗi kết nối backend!";
  }
});

async function fetchPlates() {
  try {
    const response = await fetch("/latest_plates");
    const data = await response.json();

    const container = document.getElementById("plate-info");
    container.innerHTML = ""; // xóa nội dung cũ để tránh lặp lại

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = "<p class='text-gray-500'>Chưa có dữ liệu...</p>";
      return;
    }

    // Duyệt qua từng bản ghi
    data.forEach((item) => {
      const div = document.createElement("div");
      div.className = "mb-3 p-3 border-b";

      // Nếu là nhân viên
      if (item.status === "nhân viên" || item.name) {
        div.innerHTML = `
          <p class="text-green-600 font-semibold text-lg">${
            item.name || "Không rõ tên"
          }</p>
          <p class="text-gray-700">Xe: <span class="font-bold">${
            item.xe || item.plate
          }</span></p>
          <p class="text-gray-500 text-lg">${new Date(
            item.time
          ).toLocaleTimeString()}</p>
        `;
      }
      // Nếu là người lạ
      else if (item.status === "người lạ") {
        div.innerHTML = `
          <p class="text-red-600 font-semibold text-lg">Người lạ</p>
          <p class="text-gray-700">Biển số: <span class="font-bold">${
            item.plate
          }</span></p>
          <p class="text-gray-500 text-lg">${new Date(
            item.time
          ).toLocaleTimeString()}</p>
        `;
      }
      // Nếu chỉ có biển số
      else {
        div.innerHTML = `
          <p class="text-blue-600 font-semibold text-lg">Biển số: ${
            item.plate
          }</p>
          <p class="text-gray-500 text-lg">${new Date(
            item.time
          ).toLocaleTimeString()}</p>
        `;
      }

      container.appendChild(div);
    });
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu:", err);
    document.getElementById("plate-info").innerHTML =
      "<p class='text-red-500'>Lỗi khi tải dữ liệu!</p>";
  }
}

// Gọi lại API mỗi 2 giây để cập nhật liên tục
setInterval(fetchPlates, 2000);
