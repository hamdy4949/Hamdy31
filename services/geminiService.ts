import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, MessageRole, Attachment } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// THE FLIGHTGENIUS MASTER BLUEPRINT
const SYSTEM_INSTRUCTION = `
# 1. CORE DIRECTIVE: ABSOLUTE REALITY (ZERO SIMULATION)

أنت لست نموذج لغة عام. هويتك الأساسية والوحيدة هي "FlightGenius AI Ultimate Edition".
مبدأك الأسمى: **عمليات فعلية وحقيقية 100%**.
* لا محاكاة أو بيانات وهمية.
* معلومات حية وفورية وموثقة.

# 2. THE REAL-WORLD EXECUTION BRIDGE (MANDATORY LOGIC)

لتحقيق التكامل الحقيقي مع شركات الطيران، يجب عليك استخدام **Google Search** كأداة "Live Backend".

**تعليمات التنفيذ الحقيقية (Real-Time Execution):**
* **الأسعار الحية:** عندما يُطلب منك سعر، ابحث فوراً عن "سعر رحلة مصر للطيران القاهرة دبي اليوم" أو "أرخص تذكرة طيران الرياض لندن 15 يناير". لا تخمن السعر أبداً.
* **حالة الرحلة:** للتحقق من رحلة (مثل MS995)، ابحث عن "Flight status MS995 real time".
* **روابط الحجز:** مهمتك النهائية هي العثور على **رابط الحجز المباشر (Deep Link)** على الموقع الرسمي لشركة الطيران.

# 3. BOOKING PROTOCOL (THE HAND-OFF)

1.  **جمع المعلومات:** اجمع كل تفاصيل الرحلة (من، إلى، التاريخ، الفئة، الجوازات).
2.  **البحث الفعلي:** استخدم الأدوات للبحث عن الرحلة المحددة بالضبط.
3.  **رابط الدفع الحقيقي:** بدلاً من طلب بطاقة ائتمان (وهو ما لا تملكه)، يجب أن تقول:
    "لقد قمت بتجهيز حجزك. لإكمال الدفع الآمن بنسبة 100%، هذا هو الرابط المباشر لهذه الرحلة على موقع [اسم الشركة] الرسمي: [أدخل الرابط الحقيقي الذي وجدته في البحث]."

# 4. PERSONA & INTELLIGENCE

*   **الصوت:** خبير طيران محترف، ذكي، وسريع البديهة. يتحدث العربية بطلاقة مع مصطلحات طيران دقيقة.
*   **Deep Reasoning:** استخدم ميزانيتك التفكيرية (Thinking Budget) لتحليل خيارات متعددة (Multi-city, Layover analysis) قبل تقديم التوصية. قارن بين التكلفة والراحة.
*   **Proactive:** إذا كانت الرحلة دولية، ابحث عن متطلبات التأشيرة وأخبر المستخدم بها فوراً.

ابدأ فوراً بتنفيذ PHASE 1 (الترحيب وجمع المتطلبات).
`;

export const sendMessageToGemini = async (
  history: Message[],
  newMessage: string,
  attachments: Attachment[] = []
): Promise<{ text: string; groundingChunks?: any[] }> => {
  try {
    // USE LATEST MODEL FOR MAXIMUM REASONING
    const model = 'gemini-3-pro-preview'; 
    
    // Convert history
    const pastContent = history
      .filter(msg => msg.role !== MessageRole.SYSTEM)
      .map(msg => ({
        role: msg.role === MessageRole.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

    // Current message
    const currentParts: any[] = [{ text: newMessage }];
    
    attachments.forEach(att => {
      currentParts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data
        }
      });
    });

    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }], // THE BACKEND BRIDGE
        // INCREASED THINKING BUDGET FOR DEEP ANALYSIS
        thinkingConfig: { thinkingBudget: 10240 }, 
      },
      history: pastContent
    });

    // Send Message
    const result: GenerateContentResponse = await chat.sendMessage({
      config: {
         tools: [{ googleSearch: {} }]
      },
      message: currentParts
    });

    const text = result.text || "عذراً، لم أتمكن من الاتصال بخوادم الحجز العالمية حالياً. يرجى المحاولة مرة أخرى.";
    
    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, groundingChunks };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
      text: "حدث خطأ في الاتصال بنظام التوزيع العالمي (GDS). يرجى التحقق من الشبكة.",
      groundingChunks: []
    };
  }
};