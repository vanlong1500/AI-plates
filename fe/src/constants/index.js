import axios from "axios";
import { APP_CONFIG } from "../constants";

const axiosClient = axios.create({
  baseURL: APP_CONFIG.API_URL,
  headers: { "Content-Type": "application/json" },
});

export default axiosClient;
