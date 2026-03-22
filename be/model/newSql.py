import os
import cv2
from pymongo import MongoClient
from datetime import datetime

# Kết nối
uri = "mongodb://localhost:27017"
connection = MongoClient(uri)

# Chọn database và collection
db = connection["plates"]
plates = db["plates"]

employees = db["employees"]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER_IMG = os.path.join(BASE_DIR, "../../fe/src/assets/img_plates")
os.makedirs(UPLOAD_FOLDER_IMG, exist_ok=True)

def save_plate(plate, status, frame):
    statusCg = ""
    if status == True:
        statusCg = "Vào"
    else:
        statusCg = "Ra"

    if plate and '-' in plate:
        try:
            province_series, serial_number = plate.split('-', 1)

            print(f"   [TÁCH]: Mã/Series: {province_series} | Số: {serial_number}")
            #tìm kiếm trong bảng employees
            #chuyển serial_number về string để so sánh
            emp = employees.find_one({"number": str(serial_number.replace("O","0"))})
            #xoá _id để tránh lỗi khi update
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{serial_number}_{timestamp}.jpg"
            file_path = os.path.join(UPLOAD_FOLDER_IMG, filename)
            cv2.imwrite(file_path, frame)
            relative_path_for_frontend = f"img_plates/{filename}"
            if emp:
                newdoc = emp.copy()
                newdoc.pop("_id", None)
                newdoc.pop("createdAt", None)

                newdoc["status"] = statusCg
                newdoc["image_path"] = relative_path_for_frontend
                # Cập nhật thời gian và trạng thái
                newdoc["time"] = datetime.utcnow()
                plates.insert_one(newdoc)
                #cập nhật lại status bảng employees
                employees.update_one(
                    {"_id": emp["_id"]},
                    {"$set": {"status": statusCg}}
                )
                #in ra đã cập nhập và thêm thành công
                print(f"   [CẬP NHẬP NHÂN VIÊN]: {newdoc['name']} - Trạng thái: {statusCg} ")
            else:
                print(f"   [KHÔNG TÌM THẤY NHÂN VIÊN]: Biển số {plate} không khớp với nhân viên nào.")
                newdoc = {
                    "name": "người lạ",
                    "number": str(serial_number.replace("O","0")),
                    "status": statusCg,
                    "area": str(province_series),
                    "time": datetime.utcnow(),
                    "image_path": relative_path_for_frontend
                    }
                plates.insert_one(newdoc)
        except ValueError:
            # Xử lý nếu chuỗi có nhiều hơn 1 dấu '-' nhưng bạn chỉ cần 2 phần
            print(f"   [LỖI TÁCH]: Biển số có quá nhiều dấu gạch ngang: {plate}")

