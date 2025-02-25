import { Email } from "../types/shared";

interface EmailListProps {
    emails: Email[];
    onSelectEmail: (email: Email) => void;
}

const EmailList: React.FC<EmailListProps> = ({ emails, onSelectEmail }) => {
    return (
        <div className="flex-1 overflow-y-auto max-h-full p-4">
            <div className="space-y-2 p-4">
                {emails.map((email) => (
                    <div
                        key={email.messageId}
                        className="bg-white rounded-lg shadow p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => onSelectEmail(email)}
                    >
                        <div className="font-bold text-black">{email.from}</div>
                        <div className="text-gray-600">{email.subject}</div>
                        <div className="text-gray-400 text-sm">
                            {new Date(email.date).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EmailList;
