import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Paperclip, StopCircle, Loader2, Camera, User, FileText, CheckCircle2, ShieldCheck, Database, Zap, Plane, Globe } from 'lucide-react';
import { Message, MessageRole, AppState, Attachment } from './types';
import { sendMessageToGemini } from './services/geminiService';
import { LegalDocumentRenderer } from './components/LegalDocumentRenderer';

// Helper to encode files to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      }
    };
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Self-Test State
  const [isSelfTesting, setIsSelfTesting] = useState(true);
  const [testStep, setTestStep] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Startup Self-Test Protocol (Simulated)
  useEffect(() => {
    const steps = [
      { delay: 800, action: () => setTestStep(1) }, // Connect to GDS
      { delay: 1600, action: () => setTestStep(2) }, // Verify Airline API
      { delay: 2400, action: () => setTestStep(3) }, // Enable FlightGenius Core
      { delay: 3200, action: () => setIsSelfTesting(false) }, // Complete
    ];

    let timeouts: ReturnType<typeof setTimeout>[] = [];
    steps.forEach(step => {
      timeouts.push(setTimeout(step.action, step.delay));
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  // Initial Greeting
  useEffect(() => {
    if (!isSelfTesting && messages.length === 0) {
      setMessages([
        {
          id: 'init',
          role: MessageRole.MODEL,
          text: "أهلاً بك في **FlightGenius AI Ultimate**. ✈️\n\nأنا وكيلك الشخصي لحجز وإدارة رحلات الطيران. \n\n**القدرات المفعلة:**\n* بحث أسعار لحظي (Real-time)\n* روابط حجز مباشرة من المصدر\n* تحليل الرحلات المعقدة\n\nإلى أين تريد السفر اليوم؟",
          timestamp: Date.now()
        }
      ]);
    }
  }, [isSelfTesting]);

  const handleSendMessage = async () => {
    if ((!inputText.trim() && attachments.length === 0) || appState === AppState.PROCESSING) return;

    const currentText = inputText;
    const currentAttachments = [...attachments];
    
    setInputText('');
    setAttachments([]);
    setAppState(AppState.PROCESSING);

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: currentText,
      attachments: currentAttachments,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    // Add thinking placeholder
    const thinkingId = 'thinking-' + Date.now();
    setMessages(prev => [...prev, {
      id: thinkingId,
      role: MessageRole.MODEL,
      text: '',
      isThinking: true,
      timestamp: Date.now()
    }]);

    try {
      const response = await sendMessageToGemini(messages, currentText, currentAttachments);
      
      setMessages(prev => prev.filter(m => m.id !== thinkingId).concat({
        id: Date.now().toString(),
        role: MessageRole.MODEL,
        text: response.text,
        groundingChunks: response.groundingChunks,
        timestamp: Date.now()
      }));

    } catch (error) {
       setMessages(prev => prev.filter(m => m.id !== thinkingId).concat({
        id: Date.now().toString(),
        role: MessageRole.MODEL,
        text: "عذراً، حدث خطأ في الاتصال بشبكة الطيران.",
        timestamp: Date.now()
      }));
    } finally {
      setAppState(AppState.IDLE);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      const isImage = file.type.startsWith('image/');
      
      const newAttachment: Attachment = {
        type: isImage ? 'image' : 'image', 
        mimeType: file.type,
        data: base64
      };

      setAttachments(prev => [...prev, newAttachment]);
    } catch (e) {
      console.error("File upload error", e);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setAppState(AppState.RECORDING);
    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("يرجى السماح باستخدام الميكروفون");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && appState === AppState.RECORDING) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          if (typeof reader.result === 'string') {
            const base64Audio = reader.result.split(',')[1];
            
            setAppState(AppState.PROCESSING);
            
            const userMsg: Message = {
              id: Date.now().toString(),
              role: MessageRole.USER,
              text: "🎤 [رسالة صوتية]",
              timestamp: Date.now()
            };
            setMessages(prev => [...prev, userMsg]);

            const thinkingId = 'thinking-' + Date.now();
            setMessages(prev => [...prev, {
                id: thinkingId,
                role: MessageRole.MODEL,
                text: '',
                isThinking: true,
                timestamp: Date.now()
            }]);

            const response = await sendMessageToGemini(messages, "الرجاء الاستماع للرسالة الصوتية والرد بصفتك FlightGenius.", [{
              type: 'audio',
              mimeType: 'audio/mp3',
              data: base64Audio
            }]);

             setMessages(prev => prev.filter(m => m.id !== thinkingId).concat({
                id: Date.now().toString(),
                role: MessageRole.MODEL,
                text: response.text,
                groundingChunks: response.groundingChunks,
                timestamp: Date.now()
            }));

            setAppState(AppState.IDLE);
          }
        };
      };
    }
  };

  // ----------------------------------------------------------------------
  // RENDER: SELF-TEST SCREEN
  // ----------------------------------------------------------------------
  if (isSelfTesting) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white relative overflow-hidden font-eng">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-50"></div>
        
        <div className="z-10 flex flex-col items-center gap-8 max-w-md w-full p-8">
          {/* Logo Animation */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-2 border-flight-sky flex items-center justify-center animate-pulse">
               <Plane className="w-12 h-12 text-flight-sky" />
            </div>
            <div className="absolute top-0 left-0 w-full h-full border-t-2 border-flight-sky rounded-full animate-spin"></div>
          </div>

          <h1 className="text-3xl font-bold tracking-[0.2em] text-white animate-pulse">FlightGenius</h1>
          <p className="text-xs text-flight-sky tracking-widest uppercase">Ultimate AI Edition</p>

          <div className="w-full space-y-4">
            
            {/* Step 1: Database */}
            <div className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-500 ${testStep >= 1 ? 'bg-gray-900 border-flight-sky/50' : 'bg-transparent border-gray-800 opacity-50'}`}>
              <div className="flex items-center gap-3">
                 <Database className={`w-5 h-5 ${testStep >= 1 ? 'text-flight-sky' : 'text-gray-500'}`} />
                 <span className="text-sm">Connecting to GDS Amadeus</span>
              </div>
              {testStep >= 1 && <CheckCircle2 className="w-5 h-5 text-flight-sky animate-bounce" />}
            </div>

            {/* Step 2: Security */}
            <div className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-500 ${testStep >= 2 ? 'bg-gray-900 border-flight-sky/50' : 'bg-transparent border-gray-800 opacity-50'}`}>
              <div className="flex items-center gap-3">
                 <Globe className={`w-5 h-5 ${testStep >= 2 ? 'text-flight-sky' : 'text-gray-500'}`} />
                 <span className="text-sm">Verifying Live Pricing APIs</span>
              </div>
               {testStep >= 2 && <CheckCircle2 className="w-5 h-5 text-flight-sky animate-bounce" />}
            </div>

            {/* Step 3: AI Core */}
            <div className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-500 ${testStep >= 3 ? 'bg-gray-900 border-flight-sky/50' : 'bg-transparent border-gray-800 opacity-50'}`}>
              <div className="flex items-center gap-3">
                 <Zap className={`w-5 h-5 ${testStep >= 3 ? 'text-flight-sky' : 'text-gray-500'}`} />
                 <span className="text-sm">Activating FlightGenius Core</span>
              </div>
               {testStep >= 3 && <CheckCircle2 className="w-5 h-5 text-flight-sky animate-bounce" />}
            </div>

          </div>
          
          <div className="text-[10px] text-gray-600 font-mono mt-8">
            SYSTEM READY: 2025.12.22_ULTIMATE
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // RENDER: MAIN APP
  // ----------------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen bg-black text-slate-200 overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-flight-sky/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-flight-gold/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="absolute top-0 w-full z-10 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-flight-sky to-blue-700 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.3)]">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-eng text-xl font-bold text-white tracking-wide">FlightGenius</h1>
            <p className="text-[10px] text-flight-sky uppercase tracking-[0.2em] opacity-80">Ultimate Edition</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-green-500 font-mono bg-green-900/20 px-2 py-1 rounded border border-green-900/30">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          LIVE GDS
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto z-10 p-4 md:p-8 pt-24 pb-32">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
            >
              <div className={`max-w-[90%] md:max-w-[80%] flex gap-4 ${msg.role === MessageRole.USER ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${
                  msg.role === MessageRole.USER ? 'bg-gray-800' : 'bg-flight-sky/10 border border-flight-sky/30'
                }`}>
                  {msg.role === MessageRole.USER ? <User className="w-4 h-4" /> : <Plane className="w-4 h-4 text-flight-sky" />}
                </div>

                {/* Content */}
                <div className="flex flex-col gap-2 w-full">
                  {msg.isThinking ? (
                     <div className="flex flex-col gap-2 p-4 rounded-xl bg-gray-900/50 border border-gray-800">
                        <div className="flex items-center gap-2 text-flight-sky/70 text-sm animate-pulse">
                           <Loader2 className="w-4 h-4 animate-spin" />
                           <span>Verifying live prices & availability...</span>
                        </div>
                        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                           <div className="h-full bg-flight-sky/50 w-1/2 animate-[shimmer_2s_infinite]"></div>
                        </div>
                     </div>
                  ) : (
                    <>
                       {msg.attachments && msg.attachments.length > 0 && (
                         <div className="flex gap-2 mb-2">
                            {msg.attachments.map((att, i) => (
                              <div key={i} className="bg-gray-900 rounded-lg p-2 border border-gray-700">
                                 <FileText className="w-5 h-5 text-gray-400" />
                              </div>
                            ))}
                         </div>
                       )}

                       <LegalDocumentRenderer content={msg.text} groundingChunks={msg.groundingChunks} />
                    </>
                  )}
                  <span className="text-[10px] text-gray-600 px-1 opacity-50">
                    {new Date(msg.timestamp).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Zero-UI Input Area */}
      <footer className="fixed bottom-0 left-0 w-full p-4 md:p-8 z-20 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-3xl mx-auto relative group">
          
          <div className="absolute -top-12 left-0 w-full flex justify-center gap-4 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
             <span className="bg-black/80 backdrop-blur-md border border-gray-800 text-xs px-3 py-1 rounded-full text-flight-sky shadow-lg shadow-black">
               Smart Flight Search Active
             </span>
          </div>

          <div className="relative bg-[#0F0F0F] rounded-2xl border border-gray-800 focus-within:border-flight-sky/50 transition-all duration-300 shadow-2xl shadow-black">
            
            {attachments.length > 0 && (
              <div className="flex gap-2 p-3 border-b border-gray-800">
                {attachments.map((_, i) => (
                   <div key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded flex items-center">
                     <FileText className="w-3 h-3 ml-1" />
                     مرفق {i + 1}
                   </div>
                ))}
              </div>
            )}

            <div className="flex items-center p-2 md:p-3 gap-2">
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-flight-sky transition-colors"
                title="تحليل تذكرة / جواز سفر"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
                accept="image/*,application/pdf"
              />

              <button 
                className="p-3 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-flight-sky transition-colors md:block hidden"
                title="مسح ضوئي"
              >
                 <Camera className="w-5 h-5" />
              </button>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="ابحث عن رحلات، فنادق، أو حالة طيران..."
                className="flex-1 bg-transparent text-right text-gray-200 placeholder-gray-600 outline-none resize-none max-h-32 py-3 px-2 font-sans"
                rows={1}
                disabled={appState !== AppState.IDLE}
              />

              {inputText || attachments.length > 0 ? (
                <button 
                  onClick={handleSendMessage}
                  disabled={appState !== AppState.IDLE}
                  className="p-3 rounded-xl bg-flight-sky hover:bg-blue-600 text-white transition-all shadow-[0_0_15px_rgba(56,189,248,0.4)] transform hover:scale-105"
                >
                  <Send className="w-5 h-5 rtl:-scale-x-100" />
                </button>
              ) : (
                <button 
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`p-3 rounded-xl transition-all duration-300 ${
                    appState === AppState.RECORDING 
                    ? 'bg-red-500/20 text-red-500 animate-pulse ring-1 ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                    : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {appState === AppState.RECORDING ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;