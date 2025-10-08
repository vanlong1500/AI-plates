import cv2
import numpy as np
from ultralytics import YOLO
import easyocr
import re
from collections import defaultdict, deque
import threading
import time
from newSql import save_plate
from imutils.perspective import four_point_transform
import imutils
import requests

# ================== CameraStream Class ==================
class CameraStream:
    def __init__(self, src):
        self.cap = cv2.VideoCapture(src)
        self.ret, self.frame = self.cap.read()
        self.lock = threading.Lock()
        self.running = True
        threading.Thread(target=self.update, daemon=True).start()

    def update(self):
        while self.running:
            ret, frame = self.cap.read()
            if not ret:
                continue
            with self.lock:
                self.ret, self.frame = ret, frame

    def read(self):
        with self.lock:
            return self.ret, self.frame.copy() if self.frame is not None else (False, None)

    def release(self):
        self.running = False
        self.cap.release()


# ================== Global Models ==================
model = YOLO('best.pt')  # model YOLO
reader = easyocr.Reader(['en'], gpu=True)  # EasyOCR

# Regex
regex_line1 = re.compile(r'^[0-9]{2}[A-Z]{1}[A-Z0-9]{1}$')
regex_line2 = re.compile(r'^[0-9]{4,5}$')

# Stabilization
plate_history = defaultdict(lambda: deque(maxlen=10))
plate_final = {}


# ================== Functions ==================
def correct_plate_format(line1: str, line2: str) -> str:
    line1 = line1.strip().upper().replace(" ", "")
    line2 = line2.strip().upper().replace(" ", "")
    if regex_line1.match(line1) and regex_line2.match(line2):
        return f"{line1} {line2}"
    """Chuẩn hóa định dạng biển số"""
    mapping_number_to_alpha = {"0": "D", "1": "I", "2": "S", "3": "E",
                               "4": "A", "5": "S", "6": "G", "7": "T",
                               "8": "B", "9": "P"}
    mapping_alpha_to_number = { "I": "1", "K": "2", "E": "3",
                               "A": "4", "S": "5", "G": "6", "T": "7",
                               "B": "8", "P": "9", "L": "4","D": "0","C":"0","F":"5",}

    if len(line1) != 4 or len(line2) not in [4, 5]:
        return ""

    corrected = []
    for i, ch in enumerate(line1):
        if i < 2:  # số
            corrected.append(mapping_alpha_to_number.get(ch, ch))
        elif i == 2:  # chữ
            corrected.append(mapping_number_to_alpha.get(ch, ch))
        else:
            corrected.append(ch)

    corrected2 = [mapping_alpha_to_number.get(ch, ch) for ch in line2]

    if not (regex_line1.match("".join(corrected)) and regex_line2.match("".join(corrected2))):
        return ""

    return f"{''.join(corrected)} {''.join(corrected2)}"


def preprocess_plate(plate_crop):
    gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)
    if cnts:
        c = max(cnts, key=cv2.contourArea)
        # tìm bounding box 4 điểm
        rect = cv2.minAreaRect(c)
        box = cv2.boxPoints(rect)
        box = np.int0(box)

        warped = four_point_transform(plate_crop, box)
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return cv2.resize(thresh, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

def recognize_plate(plate_crop):
    """OCR và trả về biển số hợp lệ"""
    if plate_crop.size == 0:
        return ""
    plate_img = preprocess_plate(plate_crop)
    try:
        ocr_result = reader.readtext(
            plate_img,
            detail=0,
            allowlist="ABCDEFGHIKLMNPRSTUVXY0123456789"
        )
        print("OCR raw:", ocr_result)
        if len(ocr_result) >= 2:
            l1 = ocr_result[0].replace(" ", "")
            l2 = ocr_result[1].replace(" ", "")
            plate_text = correct_plate_format(l1, l2)
            if plate_text:
                print(f"✅ ĐÃ NHẬN DẠNG ĐƯỢC BIỂN SỐ: {plate_text}")
            return plate_text
    except Exception as e:
        print("OCR error:", e)
    return ""


def get_box_id(x1, y1, x2, y2):
    """Sinh ID duy nhất cho bounding box để ổn định biển số"""
    return f"{int(x1/10)}_{int(y1/10)}_{int(x2/10)}_{int(y2/10)}"


def get_stable_plate(box_id, new_text):
    """Lấy biển số ổn định bằng cách majority voting"""
    if new_text:
        plate_history[box_id].append(new_text)
        most_common = max(set(plate_history[box_id]), key=plate_history[box_id].count)
        plate_final[box_id] = most_common
    return plate_final.get(box_id, "")


def draw_plate(frame, x1, y1, x2, y2, stable_text):
    """Vẽ khung xanh quanh biển số và text kết quả phía trên"""
    # Vẽ bounding box xanh
    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
    
    # Vẽ text biển số phía trên khung
    if stable_text:
        text_x = x1
        text_y = max(0, y1 - 10)  # đảm bảo không ra ngoài frame
        cv2.putText(frame, stable_text, (text_x, text_y),
                    cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 0), 6)  # outline đen
        cv2.putText(frame, stable_text, (text_x, text_y),
                    cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)  # chữ trắng

def process_frame(frame, conf_thresh=0.3):
    """Xử lý 1 frame, trả về frame vẽ + danh sách biển số"""
    results = model(frame, verbose=False)
    detected_plates = []
    has_plate = False

    for r in results:
        for box in r.boxes:
            conf = float(box.conf.cpu().numpy().item())
            if conf < conf_thresh:
                continue

            has_plate = True
            x1, y1, x2, y2 = map(int, box.xyxy.cpu().numpy()[0])
            plate_crop = frame[y1:y2, x1:x2]
            if plate_crop.size == 0:
                continue

            # OCR
            text = recognize_plate(plate_crop)
            box_id = get_box_id(x1, y1, x2, y2)
            stable_text = get_stable_plate(box_id, text)

            if text:
                detected_plates.append(text)
                save_plate(text)
                
                try:
                    res = requests.post("http://localhost:5000/update_plate", json={"plate": text})
                    if res.ok:
                        print("Phản hồi từ server:", res.json())
                    else:
                        print("Lỗi phản hồi từ server:", res.status_code)
                except Exception as e:
                    print("Không gửi được tới server:", e)
            # Vẽ bounding box + overlay
            draw_plate(frame, x1, y1, x2, y2, stable_text)


    return frame, detected_plates, has_plate


# ================== Main ==================
# def main():
#     stream = CameraStream("http://192.168.10.106:8080/video")
#     CONF_THRESH = 0.3

#     while True:
#         start_time = time.time()
#         ret, frame = stream.read()
#         if not ret:
#             print("Không đọc được frame từ camera")
#             break

#         frame, detected_plates, has_plate = process_frame(frame, CONF_THRESH)

#         if has_plate:
#             if detected_plates:
#                 print("Biển số nhận dạng được:", detected_plates)
#             cv2.imshow('IP Camera - License Plate Detection', frame)

#         print(f"Thời gian xử lý frame: {time.time() - start_time:.3f} giây")

#         if cv2.waitKey(1) & 0xFF == ord('q'):
#             break

#     stream.release()
#     cv2.destroyAllWindows()


# if __name__ == "__main__":
#     main()
# ================== Video Frame Generator ==================
def generate_frames():
    """
    Tạo ra một luồng video từ camera IP, xử lý từng frame để nhận dạng biển số,
    và trả về các frame đã được mã hóa JPEG.
    """
    stream = CameraStream("http://192.168.1.83:8080/video")
    CONF_THRESH = 0.3

    try:
        while True:
            # Đọc frame từ CameraStream
            ret, frame = stream.read()
            if not ret or frame is None:
                # Nếu không đọc được frame, chờ một lát rồi thử lại
                time.sleep(0.1)
                continue

            # Xử lý frame
            frame, detected_plates, has_plate = process_frame(frame, CONF_THRESH)
            
            # In biển số ra console để kiểm tra
            if detected_plates:
                print("Biển số nhận dạng được:", detected_plates)

            # Mã hóa frame đã xử lý thành định dạng JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()

            # Trả về frame dưới dạng byte stream
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    finally:
        # Khối code này sẽ luôn được chạy khi hàm kết thúc
        # dù là do lỗi hay do bạn tắt server
        stream.release()