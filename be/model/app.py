import os
from flask import Flask, Response, send_from_directory, request, jsonify
import cv2
import json        
import time 
from pymongo import MongoClient
from datetime import datetime
from flask_cors import CORS
from api import *
from newSql import save_plate
import threading
from employee_routes import employee_bp ,init_socket_events,broadcast_latest_data
from detector_logic import LicensePlateSystem
from extensions import socketio
import json

app = Flask(__name__)

# 1. Cấu hình CORS chấp nhận TẤT CẢ (Origins, Methods, Headers)
CORS(app, resources={r"/*": {
    "origins": "*",
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Headers"],
    "expose_headers": ["Content-Type", "Authorization"]
}})

app.register_blueprint(employee_bp)
socketio.init_app(app)

# Đăng ký các sự kiện socket từ file route
init_socket_events(socketio)
# đăng ký , đang nhập
@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    # Subject: app.py | Main Verb: chuyển tiếp (forward) | Nouns: dữ liệu (data), hàm xử lý (register_user)
    response = register_user(data) 
    return jsonify(response)

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    response = login_user(data)
    return jsonify(response)

@app.route('/api/getZones', methods=['GET'])
def get_zones():
    zones_in_db = get_zone() # Lấy các tên không trùng lặp
    return jsonify(zones_in_db)
# mở camera
# rtsp_url = "rtsp://admin:camera2025@192.168.1.10:554/Streaming/Channels/101"
# rtsp_url2 = "http://192.168.1.100:8080/video"

FRAME_SKIP = 10 
test = None

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

with open("config.json", "r", encoding="utf-8") as f:
    config = json.load(f)

camera_stream = config.get("camera1")
camera_stream2 = config.get("camera2")  # Sử dụng camera mặc định

detector_1 = LicensePlateSystem(camera_stream, True) 
detector_2 = LicensePlateSystem(camera_stream2, False)
test = ""
last_save_time = 0
last_save_time2 = 0

@app.route("/video")
def video():
    if not detector_1.running:
        threading.Thread(target=detector_1.process_ai, daemon=True).start()

    def generate():
        global test # BẮT BUỘC có dòng này để dùng biến toàn cục
        global last_save_time
        try:
            while True:
                frame = detector_1.processed_frame
                if frame is not None:
                    current_time = time.time()
                    # So sánh với biến test để tránh lưu trùng
                    if detector_1.is_detected and detector_1.plate_text != test:
                        if (current_time - last_save_time) > 3:
                            save_plate(detector_1.plate_text, detector_1.status, frame)
                            test = detector_1.plate_text
                            last_save_time = current_time
                            print(f"✅ Đã lưu biển số: {test}")
                            broadcast_latest_data()
                        else:
                            # Trong thời gian 3 giây này, video vẫn chạy nhưng không chạy hàm save_plate
                            pass
                    ret, buffer = cv2.imencode('.jpg', frame)
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                time.sleep(0.03)
        except Exception as e:
            print(f"--- [INFO] Kết nối dừng: {e} ---")
            
    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/video2")
def video2():
    if not detector_2.running:
        threading.Thread(target=detector_2.process_ai, daemon=True).start()

    def generate():
        global test # BẮT BUỘC có dòng này để dùng biến toàn cục
        global last_save_time2
        try:
            while True:
                frame = detector_2.processed_frame
                if frame is not None:
                    current_time = time.time()
                    # So sánh với biến test để tránh lưu trùng
                    if detector_2.is_detected and detector_2.plate_text != test:
                        if (current_time - last_save_time2) > 3:
                            save_plate(detector_2.plate_text, detector_2.status, frame)
                            test = detector_2.plate_text
                            last_save_time2 = current_time
                            print(f"✅ Đã lưu biển số: {test}")
                        else:
                            # Trong thời gian 3 giây này, video vẫn chạy nhưng không chạy hàm save_plate
                            pass
                    ret, buffer = cv2.imencode('.jpg', frame)
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                time.sleep(0.03)
        except Exception as e:
            print(f"--- [INFO] Kết nối dừng: {e} ---")
            
    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")


# kết nối MongoDB
client = MongoClient("mongodb://localhost:27017")
db = client["plates"]
plates = db["plates"]     
out = db["plates_out"]
employees = db["employees"]
newCol = db["newCol"]
# SEARCH
@app.route("/search", methods=["POST"])
def search_employee():
    data = request.json  # frontend sẽ gửi JSON { name, position, xe }
    query = {}
    if data.get("name"):
        query["name"] = {"$regex": data["name"], "$options": "i"}  # tìm gần đúng
    if data.get("position"):
        query["position"] = {"$regex": data["position"], "$options": "i"}
    if data.get("xe"):
        query["xe"] = {"$regex": data["xe"], "$options": "i"}

    results = list(collection.find(query, {"_id": 0}))  # bỏ _id
    return jsonify(results)
# Backend này nhận JSON từ frontend, tìm trong MongoDB và trả kết quả.
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) 
# Đường dẫn tuyệt đối đến thư mục chứa ảnh
# Đường dẫn này đã đúng: backend/model/ -> ../../frontend/assets/img_plates
IMG_DIR = os.path.join(BASE_DIR, "../../fe/src/assets/img_plates")

# 🌟 ROUTE ĐÃ SỬA: Phục vụ file tại đường dẫn /img_plates/ 🌟
@app.route("/img_plates/<path:filename>")
def get_plate_image(filename):
    # Subject: server (app) | Main Verb: gửi (send) | Nouns: file ảnh (filename), thư mục (IMG_DIR)
    
    # Flask sẽ tìm file có tên 'filename' trong thư mục IMG_DIR
    return send_from_directory(IMG_DIR, filename)
#  History
# Lấy lịch sử plates của một biển số xe
@app.route("/plates-history")
def plates_history():
    # Lấy biển số từ query string
    xe = request.args.get("xe")  # ← đổi từ "plate" thành "xe"
    if not xe:
        return jsonify({"error": "Thiếu biển số"}), 400

    plates_db = client["plates"]
    collection = plates_db["list_plates"]

    # Tìm tất cả bản ghi có biển số trùng
    history = list(collection.find({"plate": xe}))

    formatted = []
    for h in history:
        formatted.append({
            "id": str(h["_id"]),
            "plate": h["plate"],
            "time_added": h["time"].isoformat(),  # gửi ISO string để JS đọc được
            "result": h.get("result", None)
        })

    # sort theo thời gian mới nhất
    formatted.sort(key=lambda x: x["time_added"], reverse=True)

    return jsonify(formatted)

# 
# ADD
@app.route("/add_employee",methods =["POST"])
def add_employee():
    data = request.json
    if not data.get("name") or not data.get("position") or not data.get("xe"):
        return jsonify({"error":"Thiết dữ liệu"}),400
    
    new_employee = {
        "name":data["name"],
        "position":data["position"],
        "xe":data["xe"],
        "time_added":datetime.utcnow()
    }
    try:
        result = collection.insert_one(new_employee)
        return jsonify({"success": True, "id": str(result.inserted_id)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# #route show infomation
@app.route("/info")
def info():
    return send_from_directory(app.static_folder, "info.html")

############### Lưu biển số mới nhất #################
latest_result = None  # danh sách lưu các biển số nhận dạng được gần nhất

get_newdata = None

@app.route("/update_plate", methods=["POST"])
def get_data():
    global get_newdata
    get_newdata = get_latest_10_data()
    jsonify({"ok": True})

@app.route("/dataNew" , methods=["GET"])
def data_new():
    initial_data = json.dumps(get_latest_10_data() or []) 

    def event_stream():
        last_data_str = initial_data
        yield f"data: {initial_data}\n\n"
        
        while True:
            new_data_list = get_latest_10_data()
            data_str = json.dumps(new_data_list)
            if data_str != last_data_str:
                last_data_str = data_str
                print(f"[SSE UPDATE]: {data_str[:100]}... (Total {len(data_str)} chars)")
                yield f"data: {data_str}\n\n"
            # Đợi 1 giây trước khi kiểm tra lại
            time.sleep(1)
    return Response(event_stream(), mimetype="text/event-stream")

@app.route("/status" , methods=["POST"])
def data_new_status():
    get_data = request.get_json(silent=True)
    if get_data is None:
        get_data = {}
    status = get_data.get('status', 'Enter')  # Ví dụ: /status?status=Out
    page = get_data.get('pageNB', 1)            # Ví dụ: /status?page=2
    limit = get_data.get('limit', 10)
    print(status)
    try:
        page_int = int(page)
        limit_int = int(limit)
    except ValueError:
        return jsonify({"success": False, "message": "Tham số page và limit phải là số nguyên"}), 400
    data = data_enter(status,page_int,limit_int)
    if data is None:
        return jsonify("không có data")
    return jsonify(data)
# delete pls
@app.route("/delPts" , methods=["DELETE"])
def delete_plate():
    data = request.json
    Response=    delete_inf_pls(data)
    return jsonify(Response)

# edit information plates
@app.route("/api/home/edit" , methods=["PUT"])
def edit_inf_Home():
    data = request.json
    Response=edit_home(data)
    return jsonify(Response)

@app.route("/api/home/status" , methods=["PUT"])
def edit_sta_Home():
    data = request.json
    edit_home(data)
    global get_data
    get_newdata = get_latest_10_data()
    return(get_newdata)



# thống kê 
@app.route("/api/employees/all")
def find_emp():
    data = find_all_emp()
    return jsonify(data)
@app.route("/api/listFindInf" ,methods=["PUT"])
def list_find_inf():
    dataRP= request.json
    find_data=find_data_plates(dataRP)
    return jsonify(find_data)
@app.route("/api/plsMB" ,methods=["PUT"])
def list_find_plsNB():
    dataPlsNb= request.json
    find_pls=find_plsNB(dataPlsNb)
    return jsonify(find_pls)

@app.route("/api/addCol" ,methods=["POST"])
def addColumn():
    data = request.json
    response=add_column(data)
    print("Added column:", response)
    return jsonify(response)

@app.route("/api/findCol" ,methods=["GET"])
def findColumn():
    key_value = request.args.get('key')
    dataFindCol = find_col(key_value)
    return jsonify(dataFindCol)

from flask import jsonify, request # Đảm bảo đã import
from bson.objectid import ObjectId # Rất quan trọng để làm việc với MongoDB ID

@app.route('/api/delCol/<id>', methods=['DELETE'])
def delete_column_definition(id):
    received_key = request.args.get('key')
    delete_result = delete_col(id, received_key)
    return jsonify(delete_result)

@app.route('/api/editCol/<id>', methods=['GET'])
def edit_column_definition(id):
    edit_result = edit_col(id)
    return jsonify(edit_result)

@app.route('/api/saveEdit', methods=['PUT'])
def save_Edit():
    data = request.json
    saveEdit = save_Edit_Col(data)
    return jsonify(saveEdit)

@app.route("/api/employee/search_by_number/<string:number>", methods=["GET"])
def search_employee_by_number(number):
    clean_number = number.replace("O", "0") 
    print(f"🔍 Tìm kiếm nhân viên với số: {clean_number}")
    emp = employees.find_one({"number": str(clean_number)})
    
    if emp:
        emp.pop("_id", None)  # Loại bỏ _id không cần thiết
        emp.pop("createdAt", None)  # Loại bỏ createdAt nếu không cần thiết                
        return jsonify(emp), 200
    else:
        return jsonify({"error": "Không tìm thấy nhân viên với số đã cho."}), 404

# Thay vì app.run, hãy sử dụng socketio.run
if __name__ == '__main__':
    # Giữ nguyên host và port của bạn
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)