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

  // 1️⃣ หน้าจอ LOGIN (ปรับปรุงตามรูปภาพ)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans text-[#1e293b]">
        <div className="w-full max-w-md bg-white border border-[#e2e8f0] rounded-2xl shadow-xl p-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-[#0070f3] mb-3 italic tracking-tight">MailFlow</h1>
            <p className="text-gray-500 font-medium">ลงชื่อเข้าใช้ด้วยบัญชี Unipony ของคุณ</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2">Email Address</label>
              <input 
                type="email" 
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)} 
                className="w-full px-4 py-3 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl focus:ring-2 focus:ring-[#0070f3]/20 focus:border-[#0070f3] outline-none transition-all placeholder:text-gray-400" 
                placeholder="Email Address"
                required 
                autoComplete="off" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Password</label>
              <input 
                type="password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                className="w-full px-4 py-3 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl focus:ring-2 focus:ring-[#0070f3]/20 focus:border-[#0070f3] outline-none transition-all placeholder:text-gray-400" 
                placeholder="Password"
                required 
                autoComplete="new-password" 
              />
            </div>
            
            {loginError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                <span>⚠️</span> {loginError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoggingIn} 
              className={`w-full py-3.5 bg-[#0070f3] text-white rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] ${isLoggingIn ? "opacity-70 cursor-not-allowed" : "hover:bg-[#0060df]"}`}
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
    <div className="h-screen flex bg-[#f8fafc] font-sans text-[#1e293b]">
      {/* Sidebar */}
      <div className="w-64 bg-[#1e293b] text-white border-r border-white/10 flex flex-col shadow-2xl">
        <div className="p-6 font-bold text-2xl border-b border-white/5 tracking-tight text-[#38bdf8]">📧 MailFlow</div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {folders.map((folder, index) => (
              <li key={index} onClick={() => { setLoading(true); setSelectedEmailId(null); setActiveFolder(folder.path); }}
                className={`px-4 py-3 rounded-xl cursor-pointer text-sm transition-all flex items-center gap-3 ${activeFolder === folder.path ? "bg-[#38bdf8]/20 text-[#38bdf8] font-bold" : "hover:bg-white/5 opacity-70"}`}>
                <span className="text-lg">📁</span> {folder.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 border-t border-white/5">
           <button onClick={handleLogout} className="w-full text-sm py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all active:scale-95 flex items-center justify-center gap-2">🚪 ออกจากระบบ</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 border-b border-[#e2e8f0] bg-white flex items-center justify-between px-8 shadow-sm">
          <h1 className="font-bold text-xl capitalize truncate pr-4 text-[#1e293b]">{activeFolder} <span className="text-sm font-normal text-gray-400 ml-2">({emails.length})</span></h1>
          <div className="text-xs font-semibold px-4 py-2 bg-[#f1f5f9] rounded-full truncate max-w-[250px] text-gray-500 border border-[#e2e8f0] shadow-sm">{loginEmail}</div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Email List */}
          <div className="w-[420px] border-r border-[#e2e8f0] bg-white overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40 animate-pulse">
                 <div className="w-8 h-8 border-4 border-[#0070f3] border-t-transparent rounded-full animate-spin"></div>
                 <p className="font-medium text-sm">กำลังโหลดจดหมาย...</p>
              </div>
            ) : 
              emails.length === 0 ? (
                <div className="p-12 text-center text-gray-400 mt-20">
                  <div className="text-5xl mb-4">📭</div>
                  <p className="font-medium">ไม่มีจดหมายในโฟลเดอร์นี้</p>
                </div>
              ) :
              emails.map((email) => (
                <div key={email.uid} onClick={() => setSelectedEmailId(email.uid)}
                  className={`p-5 border-b border-[#f1f5f9] cursor-pointer transition-all border-l-4 ${selectedEmailId === email.uid ? "bg-[#f0f7ff] border-l-[#0070f3]" : "hover:bg-gray-50 border-l-transparent"}`}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="truncate pr-2 text-[#0070f3] uppercase tracking-wide">{email.from}</span>
                    <span className="text-gray-400 flex-shrink-0">{email.date ? new Date(email.date).toLocaleDateString('th-TH') : ''}</span>
                  </div>
                  <div className="text-[15px] text-[#1e293b] truncate font-bold leading-snug">{email.subject}</div>
                </div>
              ))
            }
          </div>

          {/* Email Preview */}
          <div className="flex-1 bg-[#f8fafc] overflow-y-auto p-10 relative custom-scrollbar">
            {!selectedEmailId ? (
              <div className="h-full flex items-center justify-center text-gray-300 flex-col space-y-4 opacity-50">
                <div className="text-8xl filter grayscale">📫</div>
                <p className="font-bold text-xl">เลือกจดหมายเพื่ออ่านเนื้อหา</p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-[#e2e8f0]">
                <h2 className="text-3xl font-extrabold mb-6 leading-tight text-[#1e293b]">{selectedEmailData?.subject}</h2>
                <div className="flex items-center gap-4 mb-10 border-b border-[#f1f5f9] pb-8">
                  <div className="w-12 h-12 rounded-full bg-[#0070f3] text-white flex items-center justify-center font-extrabold text-xl shadow-lg">{getAvatar(selectedEmailData?.from)}</div>
                  <div>
                    <div className="font-bold text-[16px] text-[#1e293b]">{selectedEmailData?.from}</div>
                    <div className="text-sm text-gray-400 font-medium">{new Date(selectedEmailData?.date).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}</div>
                  </div>
                </div>
                <div className="text-[#334155] leading-relaxed whitespace-pre-wrap break-words font-sans text-[16px] min-h-[400px]">
                  {contentLoading ? (
                    <div className="flex items-center gap-3 text-[#0070f3] font-bold animate-pulse py-10">
                      <div className="w-5 h-5 border-2 border-[#0070f3] border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังดึงเนื้อหาจากเซิร์ฟเวอร์...</span>
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
