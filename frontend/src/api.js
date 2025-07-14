import axios from "axios"
import { ACCESS_TOKEN } from "./constsnts"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
})

api.interceptors.request.use(
    (config)=> {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token){
            config.headers.Authorization = `Bearer ${token}`;
        }//Create an authorization header(done by axios), if it has a token then we imbed 'Bearer' into the token.
        return config
    },
    (error)=>{
        return Promise.reject(error);
    }
)
export const minioClient = {
  getFileUrl: (filePath) => {
    return `${import.meta.env.VITE_MINIO_URL}/${filePath}`;
  },
  getPresignedUrl: async (fileKey) => {
    const response = await api.get(`/files/presigned-url?key=${fileKey}`);
    return response.data.url;
  }
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api