import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://youtube-clone-api-jr83.onrender.com",
  withCredentials: false,
});

export default axiosInstance;
