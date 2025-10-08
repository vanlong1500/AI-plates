from pymongo import MongoClient
from datetime import datetime, timezone

# Kết nối
uri = "mongodb://localhost:27017"
connection = MongoClient(uri)

# Chọn database và collection
db = connection["plates"]
collection = db["list_plates"]

# Thêm một bản ghi
data = {"name": "Plate 1", "size": "10 inch", "time":  datetime.utcnow()}
# result = collection.insert_one(data)
# thêm nhiều bản ghi result = collection.insert_many(data_list)
# Kiểm tra _id được thêm
# print("Inserted ID:", result.inserted_id)

# Lấy ra bản ghi vừa thêm
# doc = collection.find_one({"_id": result.inserted_id})
# print("Inserted document:", doc)
 # lấy nhiều 
# for doc in collection.find():
#     print(doc)
# lấy theo điều kiện
# for doc in collection.find({"color": "blue"}):
#     print(doc)

#xoá , xoá nhiều 
collection.delete_one({"color": "blue"})
# collection.delete_many({"color": "blue"})
def save_plate(plate_text):
    doc = {
        "plate": plate_text,
        "time": datetime.utcnow()
    }
    collection.insert_one(doc)