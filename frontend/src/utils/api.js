// frontend/src/utils/api.js
const API_BASE_URL = window._env_?.API_BASE_URL || 
  (process.env.NODE_ENV === "production" 
    ? "https://my-monetized-blog.onrender.com/api" 
    : "http://localhost:5000/api");

export default API_BASE_URL;