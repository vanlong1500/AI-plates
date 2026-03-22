import { MongoClient } from "mongodb";

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

const names = [
  "Nguyen Van A",
  "Tran Thi B",
  "Le Van C",
  "Pham Thi D",
  "Hoang Van E",
  "Nguyen Thi F",
  "Tran Van G",
  "Le Thi H",
  "Pham Van I",
  "Hoang Thi J",
];

const ranks = ["Sơ cấp", "Trung cấp", "Cao cấp", "Chuyên gia"];
const positions = ["Nhân viên", "Quản lý", "Giám sát", "Giám đốc"];

// 👉 Tách biển số thành 2 phần [mã vùng, số hiệu]
const Plates = [
  ["59A1", "12345"],
  ["59B2", "23456"],
  ["59C3", "34567"],
  ["59D4", "45678"],
  ["59E5", "56789"],
];

const avatars = [
  "/assets/images/users/1-old.jpg",
  "/assets/images/users/2.jpg",
  "/assets/images/users/3.jpg",
  "/assets/images/users/4.jpg",
  "/assets/images/users/5.jpg",
  "/assets/images/users/6.jpg",
  "/assets/images/users/7.jpg",
  "/assets/images/users/8.jpg",
];

const statuses = ["Vào", "Ra"]; // 2 khả năng

async function generateData() {
  try {
    await client.connect();
    const db = client.db("plates");
    const staff = db.collection("employees");

    const data = [];
    for (let i = 0; i < 50; i++) {
      const [area, number] = Plates[Math.floor(Math.random() * Plates.length)];

      data.push({
        name: names[Math.floor(Math.random() * names.length)],
        avatar: avatars[Math.floor(Math.random() * avatars.length)],
        rank: ranks[Math.floor(Math.random() * ranks.length)],
        position: positions[Math.floor(Math.random() * positions.length)],
        plateArea: area,
        plateNum: number,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        error: Math.random() < 0.3, // 30% khả năng true, còn lại false
      });
    }

    const result = await staff.insertMany(data);
    console.log(`✅ Đã chèn ${result.insertedCount} bản ghi mẫu`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

generateData();
