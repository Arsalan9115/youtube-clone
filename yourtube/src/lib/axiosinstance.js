import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://youtube-clone-backend-api.onrender.com",
  withCredentials: false,
});

export default axiosInstance;
