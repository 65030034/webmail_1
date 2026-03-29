import { useState, useEffect } from "react";
import axios from "axios";

// 🌐 เปลี่ยน URL ตรงนี้เป็น URL ของ Render ที่คุณได้มา
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
  const [emailContent, setEmailContent] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);

  // 🛠️ ดึง Headers จาก Storage โดยตรง เพื่อกัน Error เวลา Refresh
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

  // 1️⃣ หน้าจอ LOGIN
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans text-foreground">
        <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2 italic">MailFlow</h1>
            <p className="text-sm opacity-60">ลงชื่อเข้าใช้ด้วยบัญชี Unipony ของคุณ</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email Address</label>
              <input 
                type="email" 
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)} 
                className="w-full px-4 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/40 outline-none transition-all" 
                placeholder="" // ลบตัวอย่างออก
                required 
                autoComplete="off" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input 
                type="password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                className="w-full px-4 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/40 outline-none transition-all" 
                placeholder="Password" // เปลี่ยนเป็นคำทั่วไป
                required 
                autoComplete="new-password" 
              />
            </div>
            {loginError && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-100">⚠️ {loginError}</div>}
            <button 
              type="submit" 
              disabled={isLoggingIn} 
              className={`w-full py-2.5 bg-primary text-white rounded-md font-bold transition-all ${isLoggingIn ? "opacity-70 cursor-not-allowed" : "hover:bg-primary/90 active:scale-[0.98]"}`}
            >
              {isLoggingIn ? "กำลังเชื่อมต่อ..." : "ลงชื่อเข้าใช้"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2️⃣ หน้าจอหลัก WEBMAIL
  return (
    <div className="h-screen flex bg-background font-sans text-foreground">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="p-4 font-bold text-lg border-b border-sidebar-border/50">📧 MailFlow</div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-1">
            {folders.map((folder, index) => (
              <li key={index} onClick={() => { setLoading(true); setSelectedEmailId(null); setActiveFolder(folder.path); }}
                className={`px-3 py-2 rounded-md cursor-pointer text-sm transition-all ${activeFolder === folder.path ? "bg-white/10 font-bold" : "hover:bg-white/5 opacity-80"}`}>
                📁 {folder.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 border-t border-sidebar-border/50">
           <button onClick={handleLogout} className="w-full text-sm py-2 px-4 rounded-md border border-sidebar-border hover:bg-white/5 transition-all active:scale-95">🚪 ออกจากระบบ</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
          <h1 className="font-semibold text-lg capitalize truncate pr-4">{activeFolder} ({emails.length})</h1>
          <div className="text-xs font-medium px-3 py-1 bg-gray-100 rounded-full truncate max-w-[200px] text-gray-500 border border-gray-200">{loginEmail}</div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Email List */}
          <div className="w-[400px] border-r border-border bg-card overflow-y-auto">
            {loading ? <div className="p-12 text-center text-gray-400 animate-pulse">กำลังโหลด...</div> : 
              emails.length === 0 ? <div className="p-12 text-center text-gray-400">ไม่มีจดหมาย</div> :
              emails.map((email) => (
                <div key={email.uid} onClick={() => setSelectedEmailId(email.uid)}
                  className={`p-4 border-b border-border cursor-pointer transition-colors ${selectedEmailId === email.uid ? "bg-blue-50/50" : "hover:bg-gray-50"}`}>
                  <div className="flex justify-between text-sm font-semibold mb-1">
                    <span className="truncate pr-2">{email.from}</span>
                    <span className="text-[10px] text-gray-400 uppercase flex-shrink-0">{email.date ? new Date(email.date).toLocaleDateString() : ''}</span>
                  </div>
                  <div className="text-sm text-gray-800 truncate font-medium">{email.subject}</div>
                </div>
              ))
            }
          </div>

          {/* Email Preview */}
          <div className="flex-1 bg-background overflow-y-auto p-8 relative">
            {!selectedEmailId ? (
              <div className="h-full flex items-center justify-center text-gray-300 flex-col space-y-2 opacity-50">
                <div className="text-6xl">📫</div>
                <p className="font-medium text-lg">เลือกจดหมายเพื่อแสดงเนื้อหา</p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-4 leading-tight">{selectedEmailData?.subject}</h2>
                <div className="flex items-center gap-3 mb-8 border-b border-gray-50 pb-6">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">{getAvatar(selectedEmailData?.from)}</div>
                  <div>
                    <div className="font-bold text-sm text-gray-800">{selectedEmailData?.from}</div>
                    <div className="text-xs text-gray-400">{new Date(selectedEmailData?.date).toLocaleString('th-TH')}</div>
                  </div>
                </div>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words font-mono bg-gray-50 p-6 rounded-lg border border-gray-100 min-h-[400px]">
                  {contentLoading ? (
                    <div className="flex items-center gap-2 text-primary font-bold animate-pulse">
                      <span>⌛</span> กำลังดึงเนื้อหาจากเซิร์ฟเวอร์...
                    </div>
                  ) : emailContent}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
