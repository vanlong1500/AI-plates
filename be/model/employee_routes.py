import os
from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from bson import ObjectId
from datetime import datetime
from pymongo import MongoClient
import re
from extensions import socketio
from api import *
import bcrypt



employee_bp = Blueprint("employee", __name__)

# ====================== MongoDB Setup ======================
client = MongoClient("mongodb://localhost:27017/")
db = client["plates"]
staffCollection = db["employees"]
newCol = db["newCol"]
infCol = db["infCol"]
plates = db["plates"]
users = db["users"]



# ====================== Upload Setup ======================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "../../fe/src/assets/uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# serve uploaded files
def broadcast_latest_data():
    # Lấy dữ liệu mới nhất (giống logic cũ của bạn)
    new_data_list = get_latest_10_data() or []
    
    # Phát dữ liệu tới tất cả client đang kết nối với sự kiện 'update_data'
    socketio.emit('update_data', {'new_list': new_data_list})

def init_socket_events(socketio):
    @socketio.on('connect')
    def handle_connect():
        print("Client connected via Socket.IO")
        # Gọi hàm phát dữ liệu
        new_data_list = get_latest_10_data() or []
        socketio.emit('update_data', {'new_list': new_data_list})
    @socketio.on('client_request_data')
    def handle_refresh_request():
        print("Client yêu cầu cập nhật lại danh sách xe hôm nay")
        # Gọi lại hàm phát dữ liệu mới nhất mà bạn đã viết
        broadcast_latest_data()

@employee_bp.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# ====================== ROUTES ======================
#reset password
@employee_bp.route("/quanly/newPass", methods=["POST"])
def reset_password():
    data = request.form.to_dict()
    username = data.get("username")
    print("Reset password request for username:", username)
    if not username:
        return jsonify({"error": "Username is required"}), 400

    # Tìm người dùng trong collection users
    user = users.find_one({"username": username})
    if not user:
        return jsonify({"error": "User not found", "message": "tài khoản không tồn tại"}), 404

    # Cập nhật mật khẩu mới (ví dụ: đặt thành '123456')
    new_hashed_password = bcrypt.hashpw("123456".encode('utf-8'), bcrypt.gensalt())
    users.update_one({"username": username}, {"$set": {"password": new_hashed_password.decode('utf-8')}})

    return jsonify({"message": "Password reset successfully"}), 200

@employee_bp.route("/quanly/uploadPass", methods=["POST"])
def upload_password():
    data = request.form.to_dict()
    username = data.get("username")
    if not username:
        return jsonify({"error": "Username is required"}), 400

    # Tìm người dùng trong collection users
    user = users.find_one({"username": username})
    if not user:
        return jsonify({"error": "User not found", "message": "tài khoản không tồn tại"}), 404
    old_password = data.get("passOld")
# Kiểm tra mật khẩu cũ với mật khẩu đã lưu trong database
    if not bcrypt.checkpw(old_password.encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({"error": "Old password is incorrect", "message": "Mật khẩu cũ không đúng"}), 400
    new_password = data.get("passNew")
    if not new_password or new_password.strip() == "":
        return jsonify({"error": "New password is required", "message": "Mật khẩu mới không được để trống"}), 400
    # Cập nhật mật khẩu mới
    new_hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    users.update_one({"username": username}, {"$set": {"password": new_hashed_password.decode('utf-8')}})
    return jsonify({"message": "Mật khẩu đã được cập nhật thành công"}), 200

# laays thong tin nhan vien
@employee_bp.route("/api/getEmployee/<username>", methods=["GET"])
def get_employee(username):
    employee = staffCollection.find_one({"username": username})
    if employee:
        employee["_id"] = str(employee["_id"])
        avatar = employee.get("avatar", "")
        if not avatar or avatar in ["null", "undefined", ""]:
            employee["avatar"] = "/assets/images/users/guest.jpg"
        return jsonify({"success": True, "employee": employee})
    else:
        return jsonify({"success": False, "message": "Nhân viên không tồn tại"})
# Lấy toàn bộ nhân viên
@employee_bp.route("/api/staff", methods=["GET"])
def get_all_staff():
    staff_list = list(staffCollection.find().sort("createdAt", -1))
    new_list = list(newCol.find())
    for s in staff_list:
        s["_id"] = str(s["_id"])
        avatar = s.get("avatar", "")
        if not avatar or avatar in ["null", "undefined", ""]:
            s["avatar"] = "/assets/images/users/guest.jpg"
    for s in new_list:
        s["_id"] = str(s["_id"])
        if "content" in s and isinstance(s["content"], str):
            # Ví dụ: "2" -> ["2"]
            s["content"] = [s["content"]]
        elif "content" not in s or s["content"] is None:
             s["content"] = []
    return jsonify({
    "staff_list": staff_list, 
    "new_list": new_list
})

@employee_bp.route("/api/ColAuto", methods=["POST"])
def auto_Col():
    try:
        data_request = request.json
        name = data_request.get('name', '')
        
        if not name:
            return jsonify({"error": "Missing required fields"}), 400
        
        # 1. Thực hiện tìm kiếm và chuyển thành list
        # {"_id": 0} giúp loại bỏ trường ObjectId để tránh lỗi JSON
        results = list(newCol.find({"sta": name}, {"_id": 0}))
        
        # 2. Trả về kết quả
        return jsonify({
            "status": "success",
            "new_list": results  # kết quả đã là một list
        })
    except Exception as e:
        print(f"Lỗi Server: {e}")
        return jsonify({"error": str(e)}), 500
# Thêm nhân viên
@employee_bp.route("/quanly/add", methods=["POST"])
def add_staff():
    new_staff = request.form.to_dict()
    
    username = new_staff.get("username")
    password = new_staff.get("password")
    # tìm thông tin tài khoản trong users
    check_user = users.find_one({"username": username})
    if check_user:
        return jsonify({"success": False, "message": "tài khoản đã tồn tại"}), 400

    if username and password and password.strip() != "":
        try:
            hashed_password = bcrypt.hashpw(
                password.encode('utf-8'),
                bcrypt.gensalt()
            )

            users.insert_one({
                "username": username,
                "password": hashed_password.decode('utf-8'),
                "role": 2  # Mặc định role là 2 nếu không có
            })

            print("✅ Insert users success")

        except Exception as e:
            print("❌ Lỗi bcrypt hoặc insert users:", e)
    else:
        print("❌ Thiếu username hoặc password")

    avatar_path = "/uploads/guest.jpg"
    if "avatar" in request.files:
        file = request.files["avatar"]
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            save_name = f"{datetime.now().timestamp()}_{filename}"
            file.save(os.path.join(UPLOAD_FOLDER, save_name))
            avatar_path = f"/uploads/{save_name}"
    new_staff["avatar"] = avatar_path
    new_staff["createdAt"] = datetime.utcnow()
    print("New staff data:", new_staff)
    result = staffCollection.insert_one(new_staff)
    new_staff["_id"] = str(result.inserted_id)
    #lấy tài khoản mật khẩu lưu vào users collection

    return jsonify({"success": True, "staff": new_staff})


# Sửa nhân viên
@employee_bp.route('/api/contentStats', methods=['GET'])
def get_stats_menu():
    try:
        # Lấy tất cả ({}), chỉ lấy name và textName (key), bỏ qua _id
        cursor = infCol.find(
            {}, 
            {"name": 1, "textName": 1, "_id": 0}
        )
        
        # Chuyển cursor thành list để có thể trả về JSON
        all_columns = list(cursor)
        
        return jsonify(all_columns), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
#cập nhật thông tin nhân viên
@employee_bp.route("/quanly/updateInf", methods=["POST"])
def update_staff():
    new_staff = request.form.to_dict()
    username = new_staff.get("username")
#cập nhập thông tin tài khoản trong employees collection

    avatar_path = "/uploads/guest.jpg"
    if "avatar" in request.files:
        file = request.files["avatar"]
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            save_name = f"{datetime.now().timestamp()}_{filename}"
            file.save(os.path.join(UPLOAD_FOLDER, save_name))
            avatar_path = f"/uploads/{save_name}"
    new_staff["avatar"] = avatar_path
    new_staff["createdAt"] = datetime.utcnow()
    print("New staff data:", new_staff)
    #cập nhập thông tin tài khoản trong employees collection
    result = staffCollection.update_one(
        {"username": username},
        {"$set": new_staff}
    )
    #lây thông tin tài khoản sau khi cập nhật để trả về
    updated_staff = staffCollection.find_one({"username": username})
    if updated_staff:
        updated_staff["_id"] = str(updated_staff["_id"])
        avatar = updated_staff.get("avatar", "")
        if not avatar or avatar in ["null", "undefined", ""]:
            updated_staff["avatar"] = "/assets/images/users/guest.jpg"
        new_staff = updated_staff
    return jsonify({"success": True, "staff": new_staff})


@employee_bp.route("/mng/edit/<id>", methods=["PUT"])
def edit_staff(id):
    try:
        update_data = request.get_json()
        update_data.pop("id", None)  # Xóa trường id nếu có trong dữ liệu cập nhật
        update_data.pop("_id", None)  # Xóa trường _id nếu có trong dữ liệu cập nhật

        if "avatar" in request.files:
            file = request.files["avatar"]
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                save_name = f"{datetime.now().timestamp()}_{filename}"
                file.save(os.path.join(UPLOAD_FOLDER, save_name))
                update_data["avatar"] = f"/uploads/{save_name}"
        print("Update data:", update_data)
        result = staffCollection.update_one(
            {"_id": ObjectId(id)}, {"$set": update_data}
        )

        return jsonify(
            {
                "success": result.modified_count == 1,
                "message": "Cập nhật thành công" if result.modified_count else "Không có thay đổi",
            }
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# Xóa nhân viên
@employee_bp.route("/quanly/delete/<id>", methods=["GET", "DELETE"])
def delete_staff(id):
    try:
        result = staffCollection.delete_one({"_id": ObjectId(id)})
        if result.deleted_count == 1:
            return jsonify({"success": True, "message": "Xóa nhân viên thành công"})
        else:
            return jsonify({"success": False, "message": "Không tìm thấy nhân viên"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# Tìm kiếm nhân viên
@employee_bp.route("/quanly/search", methods=["POST"])
def search_staff():
    data = request.json or {}
    print("Search data:", data)
    results = list(staffCollection.find_one(data))
    for r in results:
        r["_id"] = str(r["_id"])
    if not results:
        return jsonify({"success": False, "message": "Không tìm thấy nhân viên phù hợp"}), 200
    return jsonify({"success": True, "results": results})

@employee_bp.route("/statistic/auto", methods=["PUT"])
def search_Auto():
    try:
        data = request.json or {}
        # Sử dụng find_one để chỉ lấy 1 bản ghi duy nhất
        result = staffCollection.find_one(data)
        
        if not result:
            return jsonify({"success": False, "message": "Không tìm thấy nhân viên phù hợp"}), 200

        # Bây giờ result là một Dictionary, các hàm .pop() sẽ hoạt động đúng
        result.pop("_id", None)
        result.pop("time", None)
        
        # Trả về đối tượng đơn lẻ trong results
        return jsonify({"success": True, "results": [result]})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@employee_bp.route("/statistic/edit/<id>", methods=["PUT"])
def edit_Auto(id):
    try:
        update_data = request.get_json()
        update_data.pop("id", None)  # Xóa trường id nếu có trong dữ liệu cập nhật
        update_data.pop("_id", None)  # Xóa trường _id nếu có trong dữ liệu cập nhật
        update_data.pop("time", None)  # Xóa trường date nếu có trong dữ liệu cập nhật
        if "avatar" in request.files:
            file = request.files["avatar"]
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                save_name = f"{datetime.now().timestamp()}_{filename}"
                file.save(os.path.join(UPLOAD_FOLDER, save_name))
                update_data["avatar"] = f"/uploads/{save_name}"
        print("Update data:", update_data)
        result = plates.update_one(
            {"_id": ObjectId(id)}, {"$set": update_data}
        )
        broadcast_latest_data()
        return jsonify(
            {
                "success": result.modified_count == 1,
                "message": "Cập nhật thành công" if result.modified_count else "Không có thay đổi",
            }
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500