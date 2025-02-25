import { Email } from "../types";

interface EmailDetailProps {
    email: Email;
    onBack: () => void;
}

const EmailDetail: React.FC<EmailDetailProps> = ({ email, onBack }) => {
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
        </div>
    );
};

export default EmailDetail;
