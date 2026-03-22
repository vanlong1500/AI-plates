import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://127.0.0.1:5000", // Địa chỉ Python BE của bạn
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosClient;
