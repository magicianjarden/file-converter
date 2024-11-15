import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL
});

// Add interceptor to include user/guest ID
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user'));
  const guestId = localStorage.getItem('guestId');

  if (user) {
    config.headers['user-id'] = user.id;
  } else if (guestId) {
    config.headers['guest-id'] = guestId;
  }

  return config;
});

export const convertFile = async (formData, onProgress) => {
  try {
    const response = await axios.post(`${API_URL}/convert`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'guest-id': localStorage.getItem('guestId')
      },
      responseType: 'blob',
      onUploadProgress: onProgress
    });

    const contentDisposition = response.headers['content-disposition'];
    const contentType = response.headers['content-type'];
    
    let fileName = 'converted-file';
    if (contentDisposition) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches != null && matches[1]) {
        fileName = matches[1].replace(/['"]/g, '');
      }
    }

    const blob = new Blob([response.data], { type: contentType });
    
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fileName);
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    return { success: true };
  } catch (error) {
    console.error('API Error:', error);
    if (error.response?.data instanceof Blob) {
      const text = await error.response.data.text();
      try {
        const errorData = JSON.parse(text);
        throw new Error(errorData.details || 'Conversion failed');
      } catch (e) {
        throw new Error('Conversion failed');
      }
    }
    throw new Error(error.response?.data?.details || error.message);
  }
};

export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

export const getRecentConversions = async () => {
  const response = await api.get('/recent-conversions');
  return response.data;
};

export const downloadConversion = async (conversionId) => {
  const response = await api.get(`/download/${conversionId}`, {
    responseType: 'blob'
  });
  return response.data;
};