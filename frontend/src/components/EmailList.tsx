import { Email } from "../types";

interface EmailListProps {
    emails: Email[];
    onSelectEmail: (email: Email) => void;
}

const EmailList: React.FC<EmailListProps> = ({ emails, onSelectEmail }) => {
    return (
        <div className="divide-y divide-gray-200 w-full h-full overflow-auto bg-gray-50">
            {emails.length === 0 ? (
                <div className="flex items-center justify-center h-full text-black">
                    No emails found
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm m-2">
                    {emails.map((email) => (
                        <div
                            key={email.messageId}
                            className="flex items-center p-4 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            onClick={() => onSelectEmail(email)}
                        >
                            <div className="flex-1">
                                <div className="font-bold text-black">{email.from}</div>
                                <div className="text-sm text-black">{email.subject}</div>
                                <div className="text-xs text-black">
                                    Category: {email.category}
                                </div>
                            </div>
                            <div className="text-sm text-black">
                                {new Date(email.date).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmailList;
