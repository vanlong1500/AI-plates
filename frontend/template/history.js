export async function loadHistory(xe, name, position) {
  const container = document.getElementById("search-result");

  try {
    // Gọi API lấy lịch sử
    const res = await fetch(`/plates-history?xe=${encodeURIComponent(xe)}`);
    if (!res.ok) throw new Error("Lỗi tải lịch sử");
    const data = await res.json();

    // Load HTML template
    const htmlRes = await fetch("history.html");
    const html = await htmlRes.text();
    container.innerHTML = html;

    // Render bảng thông tin nhân viên
    const infoDiv = document.getElementById("employee-info");
    infoDiv.innerHTML = `
      <table class="border border-gray-300 w-full text-left mb-2">
        <thead class="bg-gray-200">
          <tr>
            <th class="border p-1">Tên</th>
            <th class="border p-1">Chức vụ</th>
            <th class="border p-1">Biển số xe</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border p-1">${name}</td>
            <td class="border p-1">${position}</td>
            <td class="border p-1">${xe}</td>
          </tr>
        </tbody>
      </table>
    `;

    // Render bảng lịch sử
    const result = document.getElementById("history-result");
    if (data.length === 0) {
      result.innerHTML = "<p>Không có lịch sử cho xe này.</p>";
    } else {
      result.innerHTML = `
        <table class="border border-gray-300 w-full text-left">
          <thead class="bg-gray-200">
            <tr>
              <th class="border p-1">Ngày</th>
              <th class="border p-1">Giờ</th>
            </tr>
          </thead>
          <tbody>
            ${data
              .map((item) => {
                const dt = new Date(item.time_added);
                return `
                <tr>
                  <td class="border p-1">${dt.toLocaleDateString()}</td>
                  <td class="border p-1">${dt.toLocaleTimeString()}</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class='text-red-500'>Lỗi khi tải lịch sử.</p>`;
  }
}
