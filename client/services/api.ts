import axios from 'axios';

const API_URL = `http://${process.env.EXPO_PUBLIC_API_URL}:5555`;

export const authAPI = {
  register: async (email: string, password: string, firstName: string, lastName: string, role: string, department: string) => {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
      firstName,
      lastName,
      role,
      department
    });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    return response.data;
  },
};