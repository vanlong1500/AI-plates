from xml.etree.ElementPath import find
from bson import ObjectId
from pymongo import MongoClient
import requests
import bcrypt
from datetime import datetime, timedelta, timezone

# Kết nối MongoDB
uri = "mongodb://localhost:27017"
connection = MongoClient(uri)

# Chọn database và collection
db = connection["plates"]
plates = db["plates"]      # ← đổi tên rõ ràng
users_col = db["users"]
infCol = db["infCol"]
employees = db["employees"]
newCol = db["newCol"]

#  đăng ký , đăng nhập
def register_user(data):
    username = data.get("username")
    password_notbcr = data.get("password")
    password = bcrypt.hashpw(
        password_notbcr.encode('utf-8'),
        bcrypt.gensalt()
    )
    role_id = data.get("role", 2)
    # 1. Kiểm tra xem user đã tồn tại chưa
    # Subject: server | Main Verb: kiểm tra (check) | Nouns: người dùng (user), tên đăng nhập (username)
    existing_user = users_col.find_one({"username": username})
    if existing_user:
        return {"success": False, "message": "Tên tài khoản đã tồn tại!"}

    # 2. Tạo bản ghi mới
    new_user = {
        "username": username,
        "password": password, # Senior note: Nên dùng thư viện bcrypt để hash mật khẩu
        "role": int(role_id),
        "created_at": datetime.utcnow()
    }

    try:
        users_col.insert_one(new_user)
        return {"success": True, "message": "Đăng ký thành công"}
    except Exception as e:
        return {"success": False, "message": str(e)}

# auto complete
def get_zone():
    # Ví dụ lấy từ một collection khác có tên là 'zones'
    # Hoặc đơn giản là trả về một list cố định từ DB
    find = infCol.distinct("name") # Giả sử bạn đang dùng hàm này
    return find

# api.py

def login_user(data):
    username = data.get("username")
    password = data.get("password")
    
    # Tìm người dùng trong database
    user = users_col.find_one({"username": username})
    if not user:
        return {"success": False, "message": "Sai tài khoản hoặc mật khẩu!"}
    is_match = bcrypt.checkpw(
        password.encode("utf-8"),
        user["password"].encode("utf-8")
    )
    if user:
        
        if is_match:
            is_match = bcrypt.checkpw(
            password.encode("utf-8"),
            user["password"].encode("utf-8")
            )
            return {
                "success": True, 
                "role": user.get("role", 2), # Trả về role (1 hoặc 2)
                "username": user.get("username")
            }
        else:
            return {"success": False, "message": "Sai tài khoản hoặc mật khẩu!"}
        # Subject: server | Main Verb: trả về (return) | Nouns: thông tin (info), quyền (role)

    else :
        return {"success": False, "message": "Sai tài khoản hoặc mật khẩu!"}
# xoá plates
def delete_inf_pls(data_del):
    print("🔍 Xoá bản ghi với dữ liệu:", data_del)
    del_id = data_del.get("_id")
    query = {"_id": ObjectId(del_id)}
    plates.delete_one(query)
    # kiểm tra đã xoá chưa
    check_del = plates.find_one(query)
    if check_del is None:
        print(f"✅ Đã xóa bản ghi với ID: {del_id}")
        return {"ok": True}
    else:
        return {"ok": False}


# lấy thông tin
def get_latest_10_data():
    """Lấy 10 bản ghi mới nhất trong bảng data"""
    # Sắp xếp theo thời gian giảm dần (mới nhất trước), giới hạn 10 bản ghi
    docs = list(plates.find().sort("time", -1).limit(10))

    # Chuyển ObjectId và datetime sang string để JSON hoá dễ dàng
    for doc in docs:
        doc["_id"] = str(doc["_id"])
        if "time" in doc:
            doc["time"] = doc["time"].isoformat()
    
    return docs
# sửa thông tin
def edit_home(new_data):
    try:
        document_id = new_data.get("_id")
        query = {"_id": ObjectId(document_id)}
        new_data.pop("_id", None)
        new_data.pop("createdAt", None)
        new_data.pop("time", None)
        #tìm kiếm và cập nhật
        plates.update_one(query, {"$set": new_data})
        return {'ok': True, 'message': f'cap nhat thanh cong'}

    except Exception as e:
        print("❌ Lỗi khi cập nhật:", e)
        return {"ok": False, "message": "thất bại"}

# lấy thông tin ra vào
def data_enter(sta,page,limit):
    print("🔍 Tìm kiếm dữ liệu vào...")
    now = datetime.now(timezone.utc)
    time_24h_ago = now - timedelta(hours=720)
    query = {}       
    query["status"] = sta
    query["time"] = {"$gte": time_24h_ago}
    try:
        page = max(1, int(page))
        limit = max(1, int(limit))
    except (ValueError, TypeError):
        page = 1
        limit = 2
    # tài liệu khớp
    skip_count = (page - 1) * limit
    total_docs = plates.count_documents(query)
    docs_cursor = plates.find(query) \
                        .sort("time", -1) \
                        .skip(skip_count) \
                        .limit(limit)
                        
    docs = list(docs_cursor)
    total_pages = (total_docs + limit - 1) // limit 
    
    for doc in docs:
        doc["_id"] = str(doc["_id"]) 
        if "time" in doc and isinstance(doc["time"], datetime):
            # Chuyển đổi datetime object sang chuỗi ISO để gửi về FE
            doc["time"] = doc["time"].isoformat() 

    print(f"✅ Tìm thấy {len(docs)} bản ghi trong tổng số {total_docs} trong 24h.")
    
    return {
        "data": docs,
        "pagination": {
            "total_records": total_docs,
            "total_pages": total_pages,
            "current_page": page,
            "page_size": limit
        }
    }

# auto complete
def find_all_emp():
    employees_cursor = employees.find({}, {"name": 1, "_id": 1}) # Giả sử bạn đang dùng hàm này
    employee_list = []
    for emp in employees_cursor:
        # Chuyển đổi ObjectId sang chuỗi trước khi thêm vào list
        emp['_id'] = str(emp['_id'])
        employee_list.append(emp)
    return employee_list

def find_plsNB(NB):
    number=NB.get("plateNum")
    query = {"number":str(number)}

    docs = list(plates.find(query).sort("time", -1))

    # Chuyển ObjectId và datetime sang string để JSON hoá dễ dàng
    for doc in docs:
        doc["_id"] = str(doc["_id"])
        if "time" in doc:
            doc["time"] = doc["time"].isoformat()
    
    if docs:
        return (docs)
    else:
        return {"ok":False}

def find_data_plates(find):
    # 1. Lấy và chuẩn hóa các trường thời gian
    Start_day = find.get("Start_day")
    End_day = find.get("End_day")
    print(f"🔍 Tìm kiếm với điều kiện: {find}")
    # Kiểm tra bắt buộc cho thời gian (nên được kiểm tra ở frontend, nhưng giữ lại cho backend)
    if not Start_day or not End_day:
        return {"error": "Thiếu Ngày bắt đầu hoặc Ngày kết thúc."}

    try:
        # Chuyển đổi Start_day sang đối tượng datetime
        if Start_day.endswith('Z'):
            start_day_dt = datetime.fromisoformat(Start_day.replace('Z', '+00:00'))
        else:
            start_day_dt = datetime.fromisoformat(Start_day)

        # Chuyển đổi End_day sang đối tượng datetime
        if End_day.endswith('Z'):
            end_day_dt = datetime.fromisoformat(End_day.replace('Z', '+00:00'))
        else:
            end_day_dt = datetime.fromisoformat(End_day)
    except ValueError as e:
        print(f"Lỗi định dạng thời gian: {e}")
        return {"error": "Định dạng thời gian không hợp lệ."}

    # 2. KHỞI TẠO QUERY với điều kiện thời gian
    query = {
        "time": {
            "$gte": start_day_dt,
            "$lte": end_day_dt
        }
    }

    # 3. THÊM TẤT CẢ CÁC TRƯỜNG LỌC KHÁC vào query
    # Logic này đảm bảo mọi trường có dữ liệu (name, status, chuc_vu, cap_bac,...) 
    # đều được thêm vào truy vấn mà không cần kiểm tra thủ công.
    for key, value in find.items():
        if key not in ["Start_day", "End_day"]:
            # Chỉ thêm vào query nếu value không phải None và không phải chuỗi rỗng
           if value is not None and str(value).strip() != "":
                query[key] = value
            
    # 4. Thực hiện truy vấn
    find_inf_pls = plates.find(query)
    results = list(find_inf_pls)
    
    so_ban_ghi = len(results)
    print(f"Số bản ghi tìm thấy: {so_ban_ghi}") 
    data_rs = to_json_safe(results)
    return data_rs

def to_json_safe(data):
    """Đảm bảo các trường ObjectId và datetime được chuyển thành chuỗi."""
    if isinstance(data, dict):
        return {k: to_json_safe(v) for k, v in data.items()}
    if isinstance(data, list):
        return [to_json_safe(v) for v in data]
    if isinstance(data, ObjectId):
        return str(data)
    if isinstance(data, datetime):
        return data.isoformat()
    return data

def add_column(data):
    name = data.get('name')
    text_name = data.get('textName')
    key = data.get('key')
    if not key:
        return {'ok': False, 'message': 'Thiếu trường "key" bắt buộc.'}
    if not name:
        return {'ok': False, 'message': 'Thiếu trường "name" bắt buộc.'}
    if key == "2":
        find = infCol.find_one({"name": name})
        if find:
            # Nếu trùng lặp, trả về lỗi ngay lập tức
           # Synonym: Existing (hiện có) -> Current, Pre-existing (TOEIC)
            return {'ok': False, 'message': f'Cột với tên "{name}" đã tồn tại.'}
        else:
            try:
                result = infCol.insert_one(data)
                # Synonym: Acknowledge (xác nhận) -> Confirm, Recognize (TOEIC)
                if result.acknowledged:
                    return {'ok': True, 'inserted_id': str(result.inserted_id), 'message': 'Chèn dữ liệu thành công.'}
                else:
                    return {'ok': False, 'message': 'Chèn dữ liệu thất bại (Không được xác nhận).'}
            except Exception as e:
                return {'ok': False, 'message': f'Lỗi khi chèn dữ liệu: {e}'}
    elif key == "1":
        find = newCol.find_one({"name": name})
        if find:
            # Nếu trùng lặp, trả về lỗi ngay lập tức
           # Synonym: Existing (hiện có) -> Current, Pre-existing (TOEIC)
            return {'ok': False, 'message': f'Cột với tên "{name}" đã tồn tại.'}
        else:
            try:
                result = newCol.insert_one(data)
                # Synonym: Acknowledge (xác nhận) -> Confirm, Recognize (TOEIC)
                if result.acknowledged:
                    return {'ok': True, 'inserted_id': str(result.inserted_id), 'message': 'Chèn dữ liệu thành công.'}
                else:
                    return {'ok': False, 'message': 'Chèn dữ liệu thất bại (Không được xác nhận).'}
            except Exception as e:
                return {'ok': False, 'message': f'Lỗi khi chèn dữ liệu: {e}'}
    return {'ok': False, 'message': f'Giá trị key "{key}" không hợp lệ.'}
        
def find_col(key_value):
    if key_value == "2":
        columns_cursor = infCol.find({})
        column_list = []
        for col in columns_cursor:
        # Chuyển đổi ObjectId sang chuỗi 
            col['_id'] = str(col['_id']) 
            column_list.append(col)
        return column_list
    elif key_value == "1":
        columns_cursor = newCol.find({})
        column_list = []
        for col in columns_cursor:
            # Chuyển đổi ObjectId sang chuỗi 
            col['_id'] = str(col['_id']) 
            column_list.append(col)
        return column_list
def delete_col(id_del,key_value):
    try:
        object_id = ObjectId(id_del) 
        if key_value == "2":
            result = infCol.delete_one({"_id": object_id})
        else:
            result = newCol.delete_one({"_id": object_id})
        if result.deleted_count == 1:
            return {"ok": True, "message": f"Đã xóa thành công ID: {id_del}"}
        else:
            return {"ok": False, "message": f"Không tìm thấy tài liệu với ID: {id_del}"}
    except Exception as e:
        return {"ok": False, "message": f"Lỗi server hoặc ID không hợp lệ: {str(e)}"}
    
def edit_col(id_edit):
    try:
        object_id = ObjectId(id_edit) 
        result = newCol.find_one({"_id": object_id})
        if result:
            result['_id'] = str(result['_id']) 
            return {"ok": True, "data": result}
        else:
            return {"ok": False, "message": f"Không tìm thấy tài liệu với ID: {id_edit}"}
    except Exception as e:
        return {"ok": False, "message": f"Lỗi server hoặc ID không hợp lệ: {str(e)}"}
    
def save_Edit_Col(data):
    try:
        key = data.get("key")
        if key == "2":
            query = {"_id": ObjectId(data.get("_id"))}
            new_value = data.copy()
            new_value.pop("_id", None)
            infCol.update_one(query, {"$set": new_value})
            return {"ok": True, "message": "Cập nhật thành công", "updated": new_value}

        document_id = data.get("_id")
        if not document_id:
            return {"ok": False, "message": "Thiếu ID"}

        query = {"_id": ObjectId(document_id)}
        new_value = data.copy()
        new_value.pop("_id", None)

        newCol.update_one(query, {"$set": new_value})
        return {"ok": True, "message": "Cập nhật thành công", "updated": new_value}
    except Exception as e:
        print("❌ Lỗi khi cập nhật:", e)
        return {"ok": False, "message": str(e)}