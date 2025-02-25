import axios from 'axios';
import { Email, SearchParams } from '../types';

const API_BASE_URL = 'http://localhost:5001/api';

export const api = {
    getAllEmails: async (): Promise<Email[]> => {
        const response = await axios.get(`${API_BASE_URL}/emails`);
        return response.data.emails;
    },

    searchEmails: async (params: SearchParams): Promise<Email[]> => {
        const response = await axios.get(`${API_BASE_URL}/emails/search`, { params });
        return response.data.emails;
    },

    getFolders: async (): Promise<string[]> => {
        const response = await axios.get(`${API_BASE_URL}/folders`);
        return response.data.folders;
    },

    getAccounts: async (): Promise<string[]> => {
        const response = await axios.get(`${API_BASE_URL}/accounts`);
        return response.data.accounts;
    }
}; 