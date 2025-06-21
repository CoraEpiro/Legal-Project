import axios from 'axios';
import OpenAI from 'openai';

const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_ENGINE_ID = process.env.GOOGLE_CSE_ENGINE_ID;
const MODEL = 'gpt-4o';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface MemoryContext {
  userInfo: {
    name?: string;
    age?: number;
    location?: string;
    occupation?: string;
  };
  conversationContext: {
    currentTopic?: string;
    legalIssues?: string[];
    preferences?: string[];
  };
  importantDetails: string[];
}

// =================================================================================
// 0. MEMORY MANAGEMENT SYSTEM
// =================================================================================
function extractUserInfo(messages: Message[]): MemoryContext {
  const context: MemoryContext = {
    userInfo: {},
    conversationContext: {},
    importantDetails: []
  };

  // Extract information from all messages
  const allText = messages.map(m => m.content).join(' ');
  
  // Extract name patterns
  const namePatterns = [
    /(?:adım|adim|adı|adı|mənim adım|menim adim)\s+(?:budur\s+)?([A-Za-zğüşıöçƏəĞÜŞIÖÇ\s]+)/gi,
    /(?:adım|adim)\s+([A-Za-zğüşıöçƏəĞÜŞIÖÇ\s]+)/gi,
    /(?:adım|adim)\s+(?:budur\s+)?([A-Za-zğüşıöçƏəĞÜŞIÖÇ\s]+)/gi
  ];
  
  for (const pattern of namePatterns) {
    const match = allText.match(pattern);
    if (match && match[1]) {
      context.userInfo.name = match[1].trim();
      break;
    }
  }

  // Extract age patterns
  const agePatterns = [
    /(?:yaşım|yasim|yaş|yas)\s+(?:budur\s+)?(\d+)/gi,
    /(\d+)\s+(?:yaşında|yasinda|yaş|yas)/gi,
    /(?:yaşım|yasim)\s+(?:budur\s+)?(\d+)/gi
  ];
  
  for (const pattern of agePatterns) {
    const match = allText.match(pattern);
    if (match && match[1]) {
      context.userInfo.age = parseInt(match[1]);
      break;
    }
  }

  // Extract location
  const locationPatterns = [
    /(?:yaşadığım|yasadigim|yaşadığı|yasadigi)\s+(?:yer|şəhər|seher)\s+(?:budur\s+)?([A-Za-zğüşıöçƏəĞÜŞIÖÇ\s]+)/gi,
    /(?:Bakı|Baku|Gəncə|Gence|Sumqayıt|Sumqayit|Naxçıvan|Naxcivan)/gi
  ];
  
  for (const pattern of locationPatterns) {
    const match = allText.match(pattern);
    if (match && match[1]) {
      context.userInfo.location = match[1].trim();
      break;
    }
  }

  // Extract legal issues mentioned
  const legalKeywords = ['hüquqi', 'hukuki', 'qanun', 'kanun', 'məhkəmə', 'mahkeme', 'vəsiqə', 'vesike', 'mülk', 'mulk', 'miras', 'boşanma', 'bosanma'];
  const mentionedIssues = legalKeywords.filter(keyword => 
    allText.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (mentionedIssues.length > 0) {
    context.conversationContext.legalIssues = mentionedIssues;
  }

  return context;
}

function createMemoryPrompt(context: MemoryContext): string {
  let memoryPrompt = '';
  
  if (context.userInfo.name) {
    memoryPrompt += `İstifadəçinin adı: ${context.userInfo.name}\n`;
  }
  if (context.userInfo.age) {
    memoryPrompt += `İstifadəçinin yaşı: ${context.userInfo.age}\n`;
  }
  if (context.userInfo.location) {
    memoryPrompt += `İstifadəçinin yaşadığı yer: ${context.userInfo.location}\n`;
  }
  if (context.conversationContext.legalIssues?.length) {
    memoryPrompt += `Müzakirə edilən hüquqi mövzular: ${context.conversationContext.legalIssues.join(', ')}\n`;
  }
  
  return memoryPrompt;
}

function buildEnhancedHistory(messages: Message[], context: MemoryContext): Message[] {
  const memoryPrompt = createMemoryPrompt(context);
  
  if (!memoryPrompt) {
    return messages.slice(-8); // Keep more context if no specific info
  }
  
  const enhancedMessages: Message[] = [
    {
      role: 'system',
      content: `Sən Azərbaycan dilində danışan hüquqşünas köməkçisisən. İstifadəçi haqqında məlumat:\n${memoryPrompt}\nBu məlumatları cavablarında istifadə et və yadda saxla.`
    },
    ...messages.slice(-6) // Keep recent conversation
  ];
  
  return enhancedMessages;
}

// =================================================================================
// 1. INTENT CLASSIFICATION
// =================================================================================
type Intent = 'LegalQuestion' | 'CasualConversation' | 'VagueLegalInquiry';

async function classifyUserIntent(question: string, history: Message[], openai: OpenAI): Promise<Intent> {
    const formattedHistory = history.map(m => `${m.role}: ${m.content}`).join('\n');
    const prompt = `
        Conversation History:
        ${formattedHistory}

        User's Latest Message: "${question}"

        Classify the user's latest message into one of three categories:
        1. LegalQuestion - A specific, detailed legal question that can be answered with legal sources
        2. VagueLegalInquiry - A vague mention of a legal issue that needs more details (e.g., "I have a problem", "We have some asset issue")
        3. CasualConversation - General chat, greetings, or non-legal questions

        Respond with only one word: LegalQuestion, VagueLegalInquiry, or CasualConversation.
    `;
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // Use a faster model for classification
            messages: [{ role: 'system', content: prompt }],
            temperature: 0,
            max_tokens: 15,
        });
        const result = response.choices[0].message.content?.trim() || 'CasualConversation';
        if (result === 'LegalQuestion') return 'LegalQuestion';
        if (result === 'VagueLegalInquiry') return 'VagueLegalInquiry';
        return 'CasualConversation';
    } catch (error) {
        console.error('⚠️ Intent classification failed, defaulting to casual:', error);
        return 'CasualConversation';
    }
}

// =================================================================================
// 2. CONVERSATIONAL PIPELINE
// =================================================================================
async function generateCasualResponse(question: string, history: Message[], openai: OpenAI): Promise<string> {
    const systemPrompt = `
        Sən Azərbaycan dilində danışan köməkçi bir hüquqşünassan.
        İstifadəçi hüquqi bir sual vermədikdə, sərbəst və köməkçi bir şəkildə cavab ver. 
        Onları hüquqi bir sual verməyə təşviq et.
        Cavabı təmiz mətn formatında təqdim et, HTML teqlər olmadan. 
        Sadə və təbii bir dildə yaz.
        
        MƏHƏM QAYDALAR:
        - İstifadəçinin adını bilirsənsə, hər cavabda salam vermə! Yalnız lazım olduqda istifadə et.
        - Salam vermək üçün yalnız ilk dəfə və ya uzun fasilədən sonra istifadə et.
        - Cavablarını təbii və dostcasına saxla.
        - Hər dəfə "Salam [ad]" demə! Bu annoying olur.
        - İstifadəçinin adını yalnız məzmunla əlaqəli olduqda istifadə et.
        - HTML teqlər istifadə etmə, sadə mətn cavab ver.
    `;
    const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: question }
    ];

    try {
        const response = await openai.chat.completions.create({ model: MODEL, messages });
        const content = response.choices[0].message.content || '';
        // Return content wrapped in casual-answer div for styling
        return `<div class="casual-answer">${content}</div>`;
    } catch (error) {
        console.error('❌ Casual response generation failed:', error);
        throw new Error('Failed to generate casual response.');
    }
}

// =================================================================================
// 3. VAGUE INQUIRY HANDLING
// =================================================================================
async function generateVagueInquiryResponse(question: string, history: Message[], openai: OpenAI): Promise<string> {
    const systemPrompt = `
        Sən Azərbaycan dilində danışan hüquqşünas köməkçisisən.
        İstifadəçi hüquqi bir məsələ haqqında qeyri-müəyyən məlumat verib. 
        Onlardan daha ətraflı məlumat almaq üçün suallar ver.
        Məsələn:
        - "Hansı növ hüquqi məsələdir?"
        - "Nə vaxt baş verib?"
        - "Kimlər iştirak edib?"
        - "Hansı sənədlər var?"
        
        Cavabı sadə və dostcasına təqdim et. Təmiz mətn formatında yaz, HTML teqlər olmadan.
        
        MƏHƏM QAYDALAR:
        - İstifadəçinin adını bilirsənsə, hər cavabda salam vermə!
        - Salam vermək üçün yalnız ilk dəfə və ya uzun fasilədən sonra istifadə et.
        - Cavablarını təbii və dostcasına saxla.
        - Hər dəfə "Salam [ad]" demə! Bu annoying olur.
        - İstifadəçinin adını yalnız məzmunla əlaqəli olduqda istifadə et.
        - HTML teqlər istifadə etmə, sadə mətn cavab ver.
    `;
    const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: question }
    ];

    try {
        const response = await openai.chat.completions.create({ model: MODEL, messages });
        const content = response.choices[0].message.content || '';
        // Return content wrapped in vague-inquiry div for styling
        return `<div class="vague-inquiry">${content}</div>`;
    } catch (error) {
        console.error('❌ Vague inquiry response generation failed:', error);
        throw new Error('Failed to generate vague inquiry response.');
    }
}

// =================================================================================
// 4. LEGAL PIPELINE
// =================================================================================
async function searchTrustedSources(query: string): Promise<SearchResult[]> {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_ENGINE_ID) throw new Error('Google CSE not configured.');
  const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: { key: GOOGLE_CSE_API_KEY, cx: GOOGLE_CSE_ENGINE_ID, q: query, num: 5 },
  });
  return (response.data.items || []).map((item: any) => ({
    title: item.title, link: item.link, snippet: item.snippet,
  }));
}

async function generateLegalAnswer(question: string, history: Message[], openai: OpenAI): Promise<string> {
    console.log(`🔎 Searching trusted sources for: "${question}"`);
    const searchResults = await searchTrustedSources(question);
    if (searchResults.length === 0) return "<p>Sualınızla bağlı etibarlı mənbə tapılmadı.</p>";

    const context = searchResults
        .map((r, i) => `Mənbə [${i + 1}]: ${r.title} (${r.link})\n\nMəzmun: ${r.snippet}`)
        .join('\n\n---\n\n');

    const systemPrompt = `
        Sən Azərbaycan qanunvericiliyi üzrə ixtisaslaşmış bir hüquqşünas köməkçisisən.
        Verilmiş mənbələrin qısa məzmununa (snippet) və söhbət tarixcəsinə əsaslanaraq istifadəçinin sualına cavab hazırla.
        Cavabların yalnız Azərbaycan dilində olmalıdır.
        Cavabında mütləq istinad etdiyin mənbələri nömrələrlə qeyd et, məsələn: [1], [2] və s.
        Cavabı HTML formatında təqdim et. Əsas terminləri <strong> teqi ilə, siyahıları isə <ol> və <li> teqləri ilə formatla.
        
        MƏHƏM QAYDALAR:
        - İstifadəçinin adını bilirsənsə, hər cavabda salam vermə!
        - Salam vermək üçün yalnız ilk dəfə və ya uzun fasilədən sonra istifadə et.
        - Cavablarını professional və dəqiq saxla.
        - Hər dəfə "Salam [ad]" demə! Bu annoying olur.
        - İstifadəçinin adını yalnız məzmunla əlaqəli olduqda istifadə et.
        - Birbaşa suala cavab ver, lazımsız salamlamalardan çəkin.
    `;
    const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: `Sual: ${question}\n\nMənbələr:\n${context}` },
    ];
    
    try {
        const response = await openai.chat.completions.create({ model: MODEL, messages });
        const answer = response.choices[0].message.content || '';
        const sourcesHtml = searchResults.map((r, i) => `<li>[${i + 1}] <a href="${r.link}" target="_blank">${r.title}</a></li>`).join('');
        return `<div class="legal-answer">${answer}</div><br><div class="legal-sources"><strong>İstinadlar:</strong><ul>${sourcesHtml}</ul></div>`;
    } catch (error) {
        console.error('❌ Legal answer generation failed:', error);
        throw new Error('Failed to generate legal answer.');
    }
}

// =================================================================================
// 5. MAIN EXPORTED FUNCTION
// =================================================================================
export async function generateAnswer(question: string, fullHistory: Message[]): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key is not configured');
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // Extract and build memory context
  const memoryContext = extractUserInfo(fullHistory);
  console.log('🧠 Memory context:', memoryContext);
  
  // Build enhanced history with memory
  const enhancedHistory = buildEnhancedHistory(fullHistory, memoryContext);

  const intent = await classifyUserIntent(question, enhancedHistory, openai);
  console.log(`🤖 Intent classified as: ${intent}`);

  if (intent === 'LegalQuestion') {
    if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_ENGINE_ID) {
      return "<p>Hüquqi axtarış xidməti konfiqurasiya edilməyib. Zəhmət olmasa, daha sonra cəhd edin.</p>";
    }
    return await generateLegalAnswer(question, enhancedHistory, openai);
  } else if (intent === 'VagueLegalInquiry') {
    return await generateVagueInquiryResponse(question, enhancedHistory, openai);
  } else {
    return await generateCasualResponse(question, enhancedHistory, openai);
  }
}

export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  if (!text) return '';

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}. Do not add any commentary or extra text. Retain the original markdown formatting (like **bold** or *italics*). Just provide the translation.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0,
      max_tokens: 1500,
    });
    return response.choices[0].message.content || text;
  } catch (error) {
    console.error('Error translating text:', error);
    // In case of translation error, return original text to avoid crashing.
    return text;
  }
}
