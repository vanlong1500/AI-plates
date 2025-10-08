# **
# Chỉ chạy file này một lần để tạo dữ liệu mẫu, chạy lại sẽ tạo duplicate.

from pymongo import MongoClient
from datetime import datetime

# Kết nối MongoDB local
client = MongoClient("mongodb://localhost:27017")

# Chọn database
db = client["employees"] # Tên db employees

# Chọn collection
staff = db["staff"] # Collection staff

# Data mẫu
sample_data = [
    {"name": "Nguyen Van A", "position": "Nhân viên", "xe": "59A1 12345", "time_added": datetime.utcnow()},
    {"name": "Tran Thi B", "position": "Quản lý", "xe": "59B2 54321", "time_added": datetime.utcnow()},
    {"name": "Le Van C", "position": "Nhân viên", "xe": "59C3 67890", "time_added": datetime.utcnow()},
    {"name": "Pham Thi D", "position": "Kế toán", "xe": "59D4 11122", "time_added": datetime.utcnow()}
]

# Thêm vào collection
result = staff.insert_many(sample_data)
print("Inserted IDs:", result.inserted_ids)