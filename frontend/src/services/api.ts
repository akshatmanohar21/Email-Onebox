import axios from 'axios';
import { Email, SearchParams } from '../types';

const API_BASE_URL = 'http://localhost:5001/api';

export const api = {
    getAllEmails: async (): Promise<Email[]> => {
        const response = await axios.get(`${API_BASE_URL}/emails`);
        return response.data.emails;
    },

    searchEmails: async (params: SearchParams): Promise<Email[]> => {
        try {
            const queryString = new URLSearchParams(params as Record<string, string>).toString();
            const response = await fetch(`${API_BASE_URL}/emails/search?${queryString}`);
            const data = await response.json();
            
            // Add debug log
            console.log('API Response:', data);
            
            // Check if response has emails property
            return data.emails || [];
        } catch (error) {
            console.error('Error in searchEmails:', error);
            throw error;
        }
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