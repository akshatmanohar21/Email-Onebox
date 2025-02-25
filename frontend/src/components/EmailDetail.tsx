import { EmailDocument } from "../types/shared";
import { useState } from 'react';
import { api } from '../services/api';

interface EmailDetailProps {
    email: EmailDocument;
    onBack: () => void;
}

const EmailDetail: React.FC<EmailDetailProps> = ({ email, onBack }) => {
    const [suggestedReply, setSuggestedReply] = useState<string>('');
    const [loadingReply, setLoadingReply] = useState(false);

    const handleGetReply = async () => {
        setLoadingReply(true);
        try {
            console.log('Email object:', email);
            console.log('Email ID:', email.id);
            console.log('Email messageId:', email.messageId);
            
            const reply = await api.getSuggestedReply(email.id);
            setSuggestedReply(reply);
        } catch (error) {
            console.error('Error getting reply suggestion:', error);
        }
        setLoadingReply(false);
    };

    return (
        <div className="p-4 w-full h-full overflow-auto bg-gray-50">
            <button 
                onClick={onBack} 
                className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-black"
            >
                Back to list
            </button>
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold mb-2 text-black">{email.subject}</h2>
                <div className="mb-4 text-black">
                    <span className="font-bold">From:</span> {email.from}
                </div>
                <div className="mb-4 text-black">
                    <span className="font-bold">Date:</span> {new Date(email.date).toLocaleString()}
                </div>
                <div className="mb-4 text-black">
                    <span className="font-bold">Category:</span> {email.category}
                </div>
                <div className="mb-4 text-black">
                    <span className="font-bold">Folder:</span> {email.folder}
                </div>
                <div className="whitespace-pre-wrap text-black">{email.body}</div>
            </div>
            {suggestedReply && (
                <div className="mt-4 p-4 bg-gray-100 rounded">
                    <h3 className="font-bold mb-2">Suggested Reply:</h3>
                    <p>{suggestedReply}</p>
                </div>
            )}
            <button 
                onClick={handleGetReply}
                disabled={loadingReply}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
                {loadingReply ? 'Generating...' : 'Suggest Reply'}
            </button>
        </div>
    );
};

export default EmailDetail;
