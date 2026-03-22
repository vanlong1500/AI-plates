import express from "express";
import cors from "cors";
import { ObjectId } from "mongodb";
import { MongoClient } from "mongodb";
// import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
// Tạo __dirname giống CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Kết nối MongoDB
const uri = "mongodb://localhost:27017"; // Địa chỉ MongoDB local
const client = new MongoClient(uri);

let staffCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("plates"); // 🔥 database
    staffCollection = db.collection("employees"); // 🔥 collection
    console.log("✅ Connected to MongoDB (plates.employees)");
  } catch (err) {
    console.error("❌ Database connection error:", err);
  }
}
//
// QUAN LY NHAN VIEN
// ADD NHÂN VIÊN TRONG QUANLY

// --- set up folder lưu ảnh (frontend assets)
const uploadFolder = path.join(__dirname, "../frontend/assets/uploads");
import fs from "fs";
if (!fs.existsSync(uploadFolder))
  fs.mkdirSync(uploadFolder, { recursive: true });

// serve uploaded files
app.use("/uploads", express.static(uploadFolder));

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name =
      Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, name);
  },
});
const upload = multer({ storage });
//
// Serve static files
app.use("/assets", express.static(path.join(__dirname, "../frontend/assets")));
app.use("/dist", express.static(path.join(__dirname, "../frontend/dist")));
app.use(
  "/quanly",
  express.static(path.join(__dirname, "../frontend/pages/quanly"))
);

// Route /quanly mở luôn HTML
app.get("/quanly", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/quanly/quanly.html"));
});

// ✅ API: Test Lấy tất cả nhân viên
// app.get("/api/staff", async (req, res) => {
//   try {
//     const staffList = await staffCollection.find().toArray();
//     res.json(staffList);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });
app.get("/api/staff", async (req, res) => {
  try {
    const staffList = await staffCollection.find().toArray();

    const fixedList = staffList.map((s) => ({
      ...s,
      avatar:
        !s.avatar ||
        s.avatar === "null" ||
        s.avatar === "undefined" ||
        s.avatar.trim() === ""
          ? "/assets/images/users/guest.jpg"
          : s.avatar,
    }));

    res.json(fixedList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
//
// Xóa nhân viên
app.get("/quanly/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await staffCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res.json({ success: true, message: "Xóa nhân viên thành công" });
    } else {
      res.json({ success: false, message: "Không tìm thấy nhân viên" });
    }
  } catch (err) {
    console.error(err);

    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});
// ------------------------------------------------------------
// EDIT NHÂN VIÊN (PUT)
app.put("/quanly/edit/:id", upload.single("avatar"), async (req, res) => {
  const { id } = req.params;

  try {
    const { name, rank, position, plateArea, plateNum, status, error } =
      req.body;
    const updateData = {
      name,
      rank,
      position,
      plateArea,
      plateNum,
      status,
      error: error === "true" || false,
    };

    // Nếu có file mới thì cập nhật đường dẫn avatar
    if (req.file) {
      updateData.avatar = `/uploads/${req.file.filename}`;
    }

    const result = await staffCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.json({
      success: result.modifiedCount === 1,
      message: "Cập nhật thành công",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật",
    });
  }
});
//
// Route ADD nhân viên - quanly
// Thêm nhân viên (upload ảnh + insert vào MongoDB)
app.post("/quanly/add", upload.single("avatar"), async (req, res) => {
  try {
    const { name, rank, position, plateArea, plateNum, status, error } =
      req.body;
    let avatarPath = "";

    if (req.file) {
      // Lưu đường dẫn public để front-end hiển thị
      avatarPath = `/uploads/${req.file.filename}`;
    } else {
      // Nếu ko upload file, có thể gán default avatar
      avatarPath = `/uploads/guest.jpg`; // hoặc để file mặc định
    }

    const newStaff = {
      name: name || "",
      rank: rank || "",
      position: position || "",
      plateArea: plateArea || "",
      plateNum: plateNum || "",
      status: status || "Out", // mặc định Enter nếu không có
      error: error === "true" || false, // parse từ string nếu từ form gửi
      avatar: avatarPath,
      createdAt: new Date(),
    };

    const result = await staffCollection.insertOne(newStaff);
    // gán _id về staff để trả về

    newStaff._id = result.insertedId;

    res.json({ success: true, staff: newStaff });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi thêm nhân viên" });
  }
});
// -------------
// ✅ SEARCH nhân viên
// ✅ SEARCH nhân viên
app.post("/quanly/search", async (req, res) => {
  try {
    const { name, rank, position, plateArea, plateNum, status } = req.body;

    // Tạo filter động
    const query = {};

    if (name && name.trim() !== "") {
      query.name = { $regex: name.trim(), $options: "i" }; // tìm gần đúng, không phân biệt hoa thường
    }
    if (rank && rank.trim() !== "") {
      query.rank = { $regex: rank.trim(), $options: "i" };
    }
    if (position && position.trim() !== "") {
      query.position = { $regex: position.trim(), $options: "i" };
    }
    if (plateArea && plateArea.trim() !== "") {
      query.plateArea = { $regex: plateArea.trim(), $options: "i" };
    }
    if (plateNum && plateNum.trim() !== "") {
      query.plateNum = { $regex: plateNum.trim(), $options: "i" };
    }
    if (status && status !== "All") {
      query.status = status;
    }

    const results = await staffCollection.find(query).toArray();

    res.json({ success: true, results });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi tìm kiếm" });
  }
});

//
// ✅ Chạy server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB(); // Kết nối DB khi server khởi động
});
