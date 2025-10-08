from pymongo import MongoClient
from datetime import datetime, timedelta
import random

# Kết nối MongoDB local
client = MongoClient("mongodb://localhost:27017")

# Chọn database plates
db = client["plates"]
collection = db["list_plates"]

# Danh sách biển số sample (trùng với staff)
plates_list = ["59A1 12345", "59B2 54321", "59C3 67890", "59D4 11122"]

# Tạo dữ liệu mẫu
sample_data = []

# Giả lập mỗi biển số được nhận diện nhiều lần trong ngày
for plate in plates_list:
    for i in range(random.randint(3, 7)):  # mỗi biển số 3-7 lần
        time_offset = timedelta(minutes=random.randint(0, 120))  # trong 2 tiếng gần đây
        sample_data.append({
            "plate": plate,
            "time": datetime.utcnow() - time_offset
        })

# Thêm vào collection
result = collection.insert_many(sample_data)
print("Inserted IDs:", result.inserted_ids)
