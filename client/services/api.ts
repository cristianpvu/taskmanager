import axios from 'axios';
import { IP } from '../data/ip';

const API_URL = `http://${IP}:5555`;

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
