import { useState, useEffect } from "react";
import axios from "axios";

export default function App() {
  // ---------------- States สำหรับระบบ Login ----------------
  // เช็คว่ามีข้อมูลเคยเซฟไว้ใน localStorage หรือเปล่า ถ้ามีก็เอามาใช้เลย
  const [loginEmail, setLoginEmail] = useState(localStorage.getItem("mailflow_user") || "");
  const [loginPassword, setLoginPassword] = useState(localStorage.getItem("mailflow_pass") || "");
  // ถ้ามีอีเมลในระบบ แปลว่าเคยล็อกอินไว้แล้ว ให้สถานะเป็น true ไปเลย
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("mailflow_user"));
  
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ---------------- States สำหรับระบบ Mail ----------------
  const [folders, setFolders] = useState([]);
  const [emails, setEmails] = useState([]);
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🛠️ แก้ไข: บังคับให้อ่านจาก localStorage โดยตรงเสมอ ป้องกัน React อัปเดตค่าไม่ทันตอนรีเฟรช
  const getAuthHeaders = () => ({
    headers: {
      'x-imap-user': localStorage.getItem("mailflow_user") || loginEmail,
      'x-imap-pass': localStorage.getItem("mailflow_pass") || loginPassword
    }
  });

  // ฟังก์ชันจัดการตอนกดปุ่ม Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await axios.post("http://localhost:5000/api/login", { 
        email: loginEmail, 
        password: loginPassword 
      });

      if (res.data.success) {
        // เมื่อ Login ผ่าน ให้เซฟข้อมูลลงใน Browser (localStorage)
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

  // ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    // เมื่อกดออกระบบ ให้ลบข้อมูลใน Browser ทิ้งให้หมด
    localStorage.removeItem("mailflow_user");
    localStorage.removeItem("mailflow_pass");
    
    setIsLoggedIn(false);
    setLoginEmail("");
    setLoginPassword("");
    setFolders([]);
    setEmails([]);
    setSelectedEmailId(null);
  };

  // ดึงรายชื่อโฟลเดอร์
  useEffect(() => {
    if (!isLoggedIn) return;
    axios.get("http://localhost:5000/api/folders", getAuthHeaders())
      .then(res => setFolders(res.data.data))
      .catch(err => {
        console.error("Folder Fetch Error:", err);
        // เอาเงื่อนไข handleLogout() ออก เพื่อไม่ให้เด้งออกตอนรีเฟรช
      });
  }, [isLoggedIn]);

  // ดึงอีเมล
  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    axios.get(`http://localhost:5000/api/emails?folder=${activeFolder}`, getAuthHeaders())
      .then(res => {
        setEmails(res.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Emails Fetch Error:", err);
        setLoading(false);
      });
  }, [activeFolder, isLoggedIn]);

  const selectedEmailData = emails.find(e => e.uid === selectedEmailId) || null;

  const getAvatar = (from) => {
    if (!from || from === '(ไม่ระบุผู้ส่ง)') return '?';
    return from.charAt(0).toUpperCase();
  };

  // =========================================================================
  // 1️⃣ หน้าจอ LOGIN
  // =========================================================================
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-sans p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">MailFlow</h1>
            <p className="text-sm text-gray-500">ลงชื่อเข้าใช้ด้วยบัญชี Rambler.ru ของคุณ</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input 
                type="email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="example@rambler.ru หรือ @ro.ru"
                className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
                autoComplete="off"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password / App Password</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
                autoComplete="new-password"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm">
                ❌ {loginError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoggingIn}
              className={`w-full py-2.5 px-4 rounded-md text-white font-medium transition-all ${
                isLoggingIn ? 'bg-primary/70 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg'
              }`}
            >
              {isLoggingIn ? "กำลังเชื่อมต่อ..." : "ลงชื่อเข้าใช้"}
            </button>
          </form>
          
          <div className="mt-6 text-center text-xs text-gray-400">
            * ระบบนี้ทำงานผ่านโปรโตคอล IMAP/SMTP <br/>กรุณาตรวจสอบให้แน่ใจว่าเปิดใช้งานในหน้าการตั้งค่าแล้ว
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2️⃣ หน้าจอหลัก WEBMAIL
  // =========================================================================
  return (
    <div className="h-screen flex bg-background text-foreground font-sans">
      
      {/* ---------------- Sidebar ---------------- */}
      <div className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="p-4 font-bold text-lg border-b border-sidebar-border/50 flex justify-between items-center">
          <span>📧 MailFlow</span>
        </div>
        <div className="p-4">
          <button className="w-full bg-primary text-white rounded-md py-2 px-4 font-medium hover:opacity-90 transition">
            📝 New Message
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="text-xs font-semibold text-sidebar-foreground/60 mb-2 px-3 uppercase tracking-wider">
            Folders
          </div>
          <ul className="space-y-1">
            {folders.map((folder, index) => (
              <li 
                key={index}
                onClick={() => {
                  if (activeFolder !== folder.path) {
                    setLoading(true);
                    setSelectedEmailId(null);
                    setActiveFolder(folder.path);
                  }
                }}
                className={`px-3 py-2 rounded-md cursor-pointer flex items-center gap-3 text-sm transition-colors ${
                  activeFolder === folder.path 
                    ? "bg-white/10 font-medium" 
                    : "hover:bg-white/5 text-sidebar-foreground/80"
                }`}
              >
                <span>📁</span>
                {folder.name}
              </li>
            ))}
          </ul>
        </div>
        
        {/* ปุ่ม Logout */}
        <div className="p-4 border-t border-sidebar-border/50">
           <button onClick={handleLogout} className="w-full text-sm py-2 px-4 rounded-md border border-sidebar-border text-sidebar-foreground hover:bg-white/5 transition">
             🚪 ออกจากระบบ
           </button>
        </div>
      </div>

      {/* ---------------- Main Content ---------------- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
          <h1 className="font-semibold text-lg text-foreground capitalize">
            {activeFolder} <span className="text-sm font-normal text-gray-500 ml-2">({emails.length} messages)</span>
          </h1>
          <div className="flex items-center gap-4">
            <input 
              type="text" 
              placeholder="Search in mail..." 
              className="px-4 py-1.5 bg-gray-100 border-none rounded-full text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium border border-gray-200 text-gray-600 truncate max-w-[150px]">
              {localStorage.getItem("mailflow_user") || loginEmail}
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Email List */}
          <div className="w-[420px] border-r border-border bg-card flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading messages...</div>
              ) : emails.length === 0 ? (
                <div className="p-8 text-center text-gray-400">ไม่มีจดหมายในกล่องนี้</div>
              ) : (
                <div className="flex flex-col">
                  {emails.map((email) => (
                    <div 
                      key={email.uid}
                      onClick={() => setSelectedEmailId(email.uid)}
                      className={`p-4 border-b border-border cursor-pointer transition-colors ${
                        selectedEmailId === email.uid ? "bg-blue-50/50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-semibold text-sm truncate pr-2">
                          {email.from}
                        </span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {email.date ? new Date(email.date).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <div className="font-medium text-sm text-gray-800 mb-1 truncate">
                        {email.subject}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        Click to view content...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Email Preview */}
          <div className="flex-1 bg-background overflow-y-auto flex flex-col">
            {!selectedEmailData ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-3">📬</div>
                  <p>เลือกจดหมายทางซ้ายเพื่อเปิดอ่าน</p>
                </div>
              </div>
            ) : (
              <div className="p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {selectedEmailData.subject}
                  </h2>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                        {getAvatar(selectedEmailData.from)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{selectedEmailData.from}</div>
                        <div className="text-xs text-gray-500">To: me</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {selectedEmailData.date ? new Date(selectedEmailData.date).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-border pt-6 text-gray-700 leading-relaxed space-y-4">
                  <p>นี่คือพื้นที่แสดงเนื้อหาจดหมาย</p>
                  <p>UID: {selectedEmailData.uid}</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}