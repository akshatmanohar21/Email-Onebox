import axios from 'axios';
import { Email, SearchParams } from '../types/shared';

const BASE_URL = 'http://localhost:5001/api';

export const api = {
    getAllEmails: async (): Promise<Email[]> => {
        const response = await axios.get(`${BASE_URL}/emails`);
        return response.data.emails;
    },

    searchEmails: async (params: SearchParams): Promise<Email[]> => {
        try {
            const response = await axios.get(`${BASE_URL}/emails/search`, { params });
            return response.data.emails;
        } catch (error) {
            console.error('Error searching emails:', error);
            return [];
        }
    },

    getFolders: async (): Promise<string[]> => {
        try {
            const response = await axios.get(`${BASE_URL}/folders`);
            return response.data.folders;
        } catch (error) {
            console.error('Error fetching folders:', error);
            return [];
        }
    },

    getAccounts: async (): Promise<string[]> => {
        try {
            const response = await axios.get(`${BASE_URL}/accounts`);
            console.log('API getAccounts response:', response.data); // Debug log
            return response.data; // Should directly use the array
        } catch (error) {
            console.error('Error fetching accounts:', error);
            return [];
        }
    },

    getSuggestedReply: async (emailId: string): Promise<string> => {
        try {
            const response = await axios.get(`${BASE_URL}/emails/${emailId}/suggest-reply`);
            return response.data.suggestedReply;
        } catch (error) {
            console.error('Error getting reply suggestion:', error);
            return '';
        }
    }
}; 