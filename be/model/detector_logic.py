# detector_logic.py
import cv2
import numpy as np
from ultralytics import YOLO
import threading
import time
import re
from typing import Optional

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
        if self.cap.isOpened():
            self.cap.release()
class TextProcessor:
    OCR_CORRECTIONS = {'S': '5', 'I': '1', 'O': '0', 'L': '1', 'Z': '2', 'G': '6', 'B': '8', 'T': '7'}
    MOTORBIKE_PATTERN = re.compile(r'^(\d{2})([A-Z])(\d)(\d{4,5})$')
    CAR_PATTERN = re.compile(r'^(\d{2})([A-Z])(\d{4,5})$')
    MOTORBIKE_LETTERS = {'H', 'T', 'B', 'C', 'D', 'E', 'F', 'G', 'K', 'L', 'N', 'P', 'S', 'U', 'V', 'X', 'Y', 'Z'}

    @staticmethod
    def clean_text(text: str) -> str:
        if text is None: return ""
        text = text.upper().replace(" ", "").replace("-", "")
        # for k, v in TextProcessor.OCR_CORRECTIONS.items():
        #     text = text.replace(k, v)
        return text
    
    @staticmethod
    def format_plate(line1: str, line2: str = "") -> Optional[str]:
        
        full_text = line1 + line2
        match = TextProcessor.MOTORBIKE_PATTERN.match(full_text)
        if match:
            g = match.groups()
            if g[1] in TextProcessor.MOTORBIKE_LETTERS:
                return f"{g[0]}{g[1]}{g[2]}-{g[3]}"
        match = TextProcessor.CAR_PATTERN.match(full_text)
        if match:
            g = match.groups()
            return f"{g[0]}{g[1]}-{g[2]}"
        return full_text if full_text else None

class LicensePlateSystem:
    # CHỈ GIỮ LẠI MỘT HÀM __INIT__ DUY NHẤT CÓ THAM SỐ
    def __init__(self, video_src, status: bool):
        print(f"--- [STARTUP] Đang nạp Model cho {status}... ---")
        self.plate_model = YOLO('best1.pt')
        self.ocr_model = YOLO('characters_best_phap060402.pt')
        
        self.status = status
        self.camera_stream = CameraStream(video_src)
        self.processed_frame = None
        self.plate_text = ""
        self.is_detected = False
        self.running = False
        self.chars = '0123456789ABCDEFGHKLMNPSTUVXYZ'
        self.mapping = {i: char for i, char in enumerate(self.chars)}

    def _recognize_logic(self, plate_img):
        # 1. Lấy thông tin kích thước để phân biệt hàng
        height, width = plate_img.shape[:2]

        results = self.ocr_model(plate_img, verbose=False)
        chars = []
        for r in results:
            if r.boxes:
                for box in r.boxes:
                    if float(box.conf[0]) > 0.4:
                        x = (box.xyxy[0][0] + box.xyxy[0][2]) / 2
                        y = (box.xyxy[0][1] + box.xyxy[0][3]) / 2
                        chars.append({'char': self.mapping.get(int(box.cls[0]), '?'), 'x': x, 'y': y})
        
        if not chars: return None

        # 2. Phân loại dựa trên tỉ lệ W/H
        if width > (2 * height):
            # --- TRƯỜNG HỢP 1 HÀNG (Ô tô) ---
            # Sắp xếp từ trái sang phải
            sorted_chars = [c['char'] for c in sorted(chars, key=lambda c: c['x'])]
            full_text = "".join(sorted_chars)
            
            # Kiểm tra độ dài trước khi trả về (ví dụ ô tô thường 8 hoặc 9 ký tự)
            if len(full_text) not in [8, 9]: return None
            print(f"--- [XỬ LÝ 1 HÀNG] Biển số nhận diện: {full_text} ---")
            print(f"--- [XỬ LÝ 1 HÀNG] Ký tự đã sắp xếp: {sorted_chars} ---")
            # Tách cứng: 3 ký tự đầu - phần còn lại
            l1 = TextProcessor.clean_text("".join(sorted_chars[:3]))
            l2 = TextProcessor.clean_text("".join(sorted_chars[3:]))
            # TRẢ VỀ TRỰC TIẾP DẠNG CÓ DẤU GẠCH NGANG (Không qua format_plate để tránh bị tự sửa)
            return f"{l1}-{l2}"
        else:
            # --- TRƯỜNG HỢP 2 HÀNG (Xe máy) ---
            y_coords = [c['y'] for c in chars]
            y_mean = np.mean(y_coords)
            line1 = "".join([c['char'] for c in sorted([c for c in chars if c['y'] < y_mean], key=lambda c: c['x'])])
            line2 = "".join([c['char'] for c in sorted([c for c in chars if c['y'] >= y_mean], key=lambda c: c['x'])])
            
            if len(line1 + line2) not in [8, 9]: return None
            print(f"--- [XỬ LÝ 2 HÀNG] Biển số nhận diện: {line1} | {line2} ---")
            if len(line1) == 3:
                print(f"--- [CHUYỂN ĐỔI] Phát hiện biển ô tô 2 hàng: {line1}-{line2} ---")
                return f"{line1}-{line2}"
            # TRẢ VỀ QUA TEXTPROCESSOR NHƯ CŨ
            return TextProcessor.format_plate(TextProcessor.clean_text(line1), TextProcessor.clean_text(line2))
    
    def process_ai(self):
        self.running = True
        print(f"--- [AI] {self.status} bắt đầu xử lý ---")
        while self.running and self.camera_stream.running:
            ret, frame = self.camera_stream.read()
            if not ret or frame is None:
                time.sleep(0.01)
                continue
            
            results = self.plate_model(frame, verbose=False)
            found = False
            for r in results:
                if r.boxes and len(r.boxes) > 0:
                    box = r.boxes[0]
                    if float(box.conf[0]) > 0.5:
                        x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
                        self.plate_text = self._recognize_logic(frame[y1:y2, x1:x2])
                        print(f"--- [KẾT QUẢ] Biển số nhận diện: {self.plate_text} ---")
                        found = True
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                        break
            
            self.is_detected = found
            self.processed_frame = frame
            time.sleep(0.01)