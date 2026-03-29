import { useState, useEffect } from "react";
import axios from "axios";

// 🌐 เปลี่ยน URL ตรงนี้เป็น URL ของ Render ที่คุณได้มา (เช่น https://xxx.onrender.com)
const API_BASE_URL = "https://mailflow-front.onrender.com"; 

export default function App() {
  const [loginEmail, setLoginEmail] = useState(localStorage.getItem("mailflow_user") || "");
  const [loginPassword, setLoginPassword] = useState(localStorage.getItem("mailflow_pass") || "");
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("mailflow_user"));
  
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [folders, setFolders] = useState([]);
  const [emails, setEmails] = useState([]);
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [emailContent, setEmailContent] = useState(""); // เก็บเนื้อหาเมลจริง
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);

  const getAuthHeaders = () => ({
    headers: {
      'x-imap-user': localStorage.getItem("mailflow_user") || loginEmail,
      'x-imap-pass': localStorage.getItem("mailflow_pass") || loginPassword
    }
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/login`, { 
        email: loginEmail, 
        password: loginPassword 
      });
      if (res.data.success) {
        localStorage.setItem("mailflow_user", loginEmail);
        localStorage.setItem("mailflow_pass", loginPassword);
        setIsLoggedIn(true);
        setLoading(true); 
      }
    } catch (err) {
      setLoginError(err.response?.data?.error || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setLoginEmail("");
    setLoginPassword("");
    setFolders([]);
    setEmails([]);
    setSelectedEmailId(null);
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    axios.get(`${API_BASE_URL}/api/folders`, getAuthHeaders())
      .then(res => setFolders(res.data.data))
      .catch(err => console.error(err));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    axios.get(`${API_BASE_URL}/api/emails?folder=${activeFolder}`, getAuthHeaders())
      .then(res => {
        setEmails(res.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [activeFolder, isLoggedIn]);

  // 📧 ดึงเนื้อหาเมลเมื่อมีการเลือกเมล
  useEffect(() => {
    if (selectedEmailId) {
      setContentLoading(true);
      setEmailContent("");
      axios.get(`${API_BASE_URL}/api/email-content?folder=${activeFolder}&uid=${selectedEmailId}`, getAuthHeaders())
        .then(res => {
          setEmailContent(res.data.content);
          setContentLoading(false);
        })
        .catch(err => {
          console.error(err);
          setEmailContent("ไม่สามารถดึงเนื้อหาจดหมายได้");
          setContentLoading(false);
        });
    }
  }, [selectedEmailId]);

  const selectedEmailData = emails.find(e => e.uid === selectedEmailId) || null;
  const getAvatar = (from) => from ? from.charAt(0).toUpperCase() : '?';

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">MailFlow</h1>
            <p className="text-sm text-gray-500 text-foreground">ลงชื่อเข้าใช้ด้วยบัญชี Rambler.ru ของคุณ</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-md" required autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-md" required autoComplete="new-password" />
            </div>
            {loginError && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{loginError}</div>}
            <button type="submit" disabled={isLoggingIn} className="w-full py-2.5 bg-primary text-white rounded-md font-medium">
              {isLoggingIn ? "กำลังเชื่อมต่อ..." : "ลงชื่อเข้าใช้"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background font-sans text-foreground">
      <div className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="p-4 font-bold text-lg border-b border-sidebar-border/50">📧 MailFlow</div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-1">
            {folders.map((folder, index) => (
              <li key={index} onClick={() => { setLoading(true); setSelectedEmailId(null); setActiveFolder(folder.path); }}
                className={`px-3 py-2 rounded-md cursor-pointer text-sm ${activeFolder === folder.path ? "bg-white/10 font-medium" : "hover:bg-white/5"}`}>
                📁 {folder.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 border-t border-sidebar-border/50">
           <button onClick={handleLogout} className="w-full text-sm py-2 px-4 rounded-md border border-sidebar-border hover:bg-white/5 transition">🚪 ออกจากระบบ</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
          <h1 className="font-semibold text-lg capitalize">{activeFolder} ({emails.length})</h1>
          <div className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full truncate max-w-[200px]">{loginEmail}</div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-[420px] border-r border-border bg-card overflow-y-auto">
            {loading ? <div className="p-8 text-center">Loading...</div> : 
              emails.map((email) => (
                <div key={email.uid} onClick={() => setSelectedEmailId(email.uid)}
                  className={`p-4 border-b border-border cursor-pointer ${selectedEmailId === email.uid ? "bg-blue-50/50" : "hover:bg-gray-50"}`}>
                  <div className="flex justify-between text-sm font-semibold"><span>{email.from}</span><span className="text-xs text-gray-400">{email.date ? new Date(email.date).toLocaleDateString() : ''}</span></div>
                  <div className="text-sm text-gray-800 truncate font-medium">{email.subject}</div>
                </div>
              ))
            }
          </div>

          <div className="flex-1 bg-background overflow-y-auto p-8">
            {!selectedEmailId ? (
              <div className="h-full flex items-center justify-center text-gray-400 flex-col"><div className="text-4xl">📬</div><p>เลือกจดหมายเพื่ออ่าน</p></div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold mb-4">{selectedEmailData?.subject}</h2>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">{getAvatar(selectedEmailData?.from)}</div>
                  <div><div className="font-semibold text-sm">{selectedEmailData?.from}</div><div className="text-xs text-gray-500">{new Date(selectedEmailData?.date).toLocaleString()}</div></div>
                </div>
                <div className="border-t border-border pt-6 whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {contentLoading ? "กำลังโหลดเนื้อหา..." : emailContent}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}