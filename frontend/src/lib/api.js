import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

export const uploadCsv = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const askQuestion = async (sessionId, question) => {
  const response = await api.post('/ask', {
    session_id: sessionId,
    question,
  });
  return response.data;
};

export const fetchExamples = async (sessionId = null) => {
  const url = sessionId ? `/examples?session_id=${sessionId}` : '/examples';
  const response = await api.get(url);
  return response.data;
};
