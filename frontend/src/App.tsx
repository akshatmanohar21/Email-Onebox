import { useState, useEffect } from "react";
import EmailList from "./components/EmailList";
import EmailDetail from "./components/EmailDetail";
import { Email, SearchParams } from "./types";
import { api } from "./services/api";

const App: React.FC = () => {
    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [currentAccount, setCurrentAccount] = useState<string>("");
    const [accounts, setAccounts] = useState<string[]>([]);
    const [folders, setFolders] = useState<string[]>([]);
    const [currentFolder, setCurrentFolder] = useState<string>("");
    const [currentCategory, setCurrentCategory] = useState<string>("");
    const [loading, setLoading] = useState(true);

    const categories = [
        "All",
        "Interested",
        "Meeting Booked",
        "Not Interested",
        "Spam",
        "Out of Office"
    ];

    useEffect(() => {
        const initializeData = async () => {
            try {
                const [accountsData, foldersData] = await Promise.all([
                    api.getAccounts(),
                    api.getFolders()
                ]);
                setAccounts(accountsData);
                setFolders(foldersData);
                if (accountsData.length > 0) {
                    setCurrentAccount(accountsData[0]);
                }
            } catch (error) {
                console.error('Error initializing data:', error);
            }
        };
        initializeData();
    }, []);

    useEffect(() => {
        const fetchEmails = async () => {
            setLoading(true);
            try {
                const searchParams: SearchParams = {};
                if (currentAccount) searchParams.account = currentAccount;
                if (currentFolder) searchParams.folder = currentFolder;
                if (currentCategory && currentCategory !== "All") {
                    searchParams.category = currentCategory;
                    console.log('Applying category filter:', currentCategory);
                }
                
                console.log('Fetching emails with params:', searchParams);
                
                const emailsData = await api.searchEmails(searchParams);
                console.log('Received emails:', emailsData.length, 'matching category:', currentCategory);
                
                setEmails(emailsData);
            } catch (error) {
                console.error('Error fetching emails:', error);
            }
            setLoading(false);
        };
        fetchEmails();
    }, [currentAccount, currentFolder, currentCategory]);

    return (
        <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            height: "100vh", 
            width: "100vw",
            backgroundColor: "#f1f3f4" 
        }}>
            <header style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem",
                backgroundColor: "#f1f3f4",
                borderBottom: "1px solid #ddd"
            }}>
                <div style={{ 
                    fontSize: "1.5rem", 
                    fontWeight: "bold",
                    color: "black"
                }}>
                    Mailbox
                </div>
                <div>
                    <select
                        value={currentAccount}
                        onChange={(e) => setCurrentAccount(e.target.value)}
                        style={{ 
                            padding: "0.5rem", 
                            borderRadius: "4px",
                            color: "white",
                            backgroundColor: "#1a1a1a"
                        }}
                    >
                        {accounts.map((account) => (
                            <option key={account} value={account}>
                                {account}
                            </option>
                        ))}
                    </select>
                </div>
            </header>
            <div style={{ 
                display: "flex", 
                flex: 1, 
                overflow: "hidden",
                width: "100%"
            }}>
                <aside style={{ 
                    width: "200px", 
                    backgroundColor: "#f1f3f4", 
                    padding: "1rem",
                    borderRight: "1px solid #ddd"
                }}>
                    <div style={{ marginBottom: "1rem" }}>
                        <select 
                            value={currentFolder}
                            onChange={(e) => setCurrentFolder(e.target.value)}
                            style={{ 
                                width: "100%", 
                                padding: "0.5rem",
                                color: "white",
                                backgroundColor: "#1a1a1a"
                            }}
                        >
                            <option value="">All Folders</option>
                            {folders.map((folder) => (
                                <option key={folder} value={folder}>
                                    {folder}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <select
                            value={currentCategory}
                            onChange={(e) => setCurrentCategory(e.target.value)}
                            style={{ 
                                width: "100%", 
                                padding: "0.5rem",
                                color: "white",
                                backgroundColor: "#1a1a1a"
                            }}
                        >
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>
                </aside>
                <main style={{ 
                    flex: "1 1 auto",
                    display: "flex", 
                    overflow: "hidden",
                    backgroundColor: "#f1f3f4",
                    padding: "1rem",
                    width: "calc(100% - 200px)",
                    height: "calc(100vh - 64px)"
                }}>
                    <div style={{ 
                        flex: 1,
                        display: "flex",
                        width: "100%",
                        maxWidth: "100%"
                    }}>
                        {loading ? (
                            <div className="flex items-center justify-center w-full text-black">
                                Loading...
                            </div>
                        ) : selectedEmail ? (
                            <EmailDetail email={selectedEmail} onBack={() => setSelectedEmail(null)} />
                        ) : (
                            <EmailList emails={emails} onSelectEmail={setSelectedEmail} />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
