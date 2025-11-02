import { Message, Role } from '@/types'
import { useRef, useEffect } from 'react'

// interface Message {
//   id?: string
//   role: Role.customer | 'assistant'
//   content: string
//   timestamp: Date
//   index?: number
// }

interface ChatbotProps {
  sessionId?: string
  threadId?: string
  setInput?: (input: string) => void
  messages?: Message[]
  handleSubmit?: (e: React.FormEvent) => void
  loading?: boolean
  input?: string
  // setMessages?: (messages: Message[]) => void
  // setLoading?: (loading: boolean) => void
  // setSessionId?: (sessionId: string) => void
  // setThreadId?: (threadId: string) => void
  // buttonRef?: React.RefObject<HTMLButtonElement>
  // clearChat?: () => void
  // onBackToChat?: () => void
  // onNext?: () => void
  // backButtonText?: string
  // nextButtonText?: string
  // showBackButton?: boolean
  // showNextButton?: boolean
  // product?: {
  //   name?: string
  //   description?: string
  // }
}

export default function Chatbot({
  // sessionId,
  threadId,
  setInput,
  messages = [],
  handleSubmit,
  loading = false,
  input = '',
  // onBackToChat,
  // onNext,
  // backButtonText = "Back",
  // nextButtonText = "Next",
  // showBackButton = true,
  // showNextButton = true,
  // product,
}: ChatbotProps) {
  // const [messages, setMessages] = useState<Message[]>([])
  // const [input, setInput] = useState('')
  // const [loading, setLoading] = useState(false)
  // const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null)
  // const [threadId, setThreadId] = useState<string | null>(initialThreadId || null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history on component mount
  // useEffect(() => {
  //   const loadChatHistory = async () => {
  //     if (!sessionId && !threadId) return

  //     try {
  //       const response = await fetch(`/api/phase/chat?threadId=${threadId}&sessionId=${sessionId}`)
  //       if (response.ok) {
  //         const data = await response.json()
  //         console.log("🚀 ~ loadChatHistory ~ data.messages?.length:", data.messages?.length)
  //         if (data.messages?.length > 0) {
  //           setMessages(data.messages.map((msg: Message) => ({
  //             ...msg,
  //             timestamp: new Date(msg.timestamp)
  //           })))
  //         } else {
  //           // if (product?.name && product?.description) {
  //             // console.log("🚀 ~ loadChatHistory ~ product:", product)
  //             // const productMsg: string = await generateProductPrompt({ name: product?.name, description: product?.description })
  //             const productMsg = 'Create a professional one-page investment product factsheet (like VVKN-1) in PDF style. Include: product overview, investment goal, key performance table, strategy details, risk indicators (SRI, Sharpe Ratio, Max Drawdown), fees & costs, asset allocation chart, and risk disclaimer. Design it clean, corporate, and data-driven with sections and tables clearly structured.';
  //             await sendMessage(productMsg)
  //           // }
  //         }
  //       }
  //     } catch (error) {
  //       console.error('Error loading chat history:', error)
  //     }
  //   }

  //   loadChatHistory()
  // }, [sessionId, threadId])


  // const handleFormSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!input.trim() || loading) return
  //   await sendMessage();
  // };

  // const sendMessage = async (messageOverride: string = '') => {
  //   // e.preventDefault()
  //   // if (!input.trim() || loading) return

  //   const messageToSend = messageOverride.length > 0 ? messageOverride : input.trim();
  //   const messageNotAppended = messageOverride.length > 0;
  //   console.log("🚀 ~ sendMessage ~ messageToSend:", messageToSend)
  //   if (!messageToSend || loading) return;

  //   const userMessage: Message = {
  //     role: Role.customer,
  //     content: messageToSend,
  //     timestamp: new Date()
  //   }
  //   if (!messageNotAppended) {
  //     setMessages(prev => [...prev, userMessage])
  //   }
  //   setInput('')
  //   setLoading(true)

  //   try {
  //     const response = await fetch('/api/phase/chat', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         message: userMessage.content,
  //         sessionId,
  //         threadId
  //       }),
  //     })

  //     if (!response.ok) {
  //       throw new Error('Failed to get response')
  //     }

  //     const data = await response.json()

  //     // Update session and thread IDs from response
  //     if (data.sessionId && !sessionId) {
  //       setSessionId(data.sessionId)
  //     }
  //     if (data.threadId && !threadId) {
  //       setThreadId(data.threadId)
  //     }

  //     const botMessage: Message = {
  //       role: Role.assistant,
  //       content: data.message,
  //       timestamp: new Date()
  //     }

  //     setMessages(prev => [...prev, botMessage])
  //   } catch (error) {
  //     console.error('Error:', error)
  //     const errorMessage: Message = {
  //       role: Role.assistant,
  //       content: 'Sorry, I encountered an error. Please try again.',
  //       timestamp: new Date()
  //     }
  //     setMessages(prev => [...prev, errorMessage])
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // const generateProductPrompt = (product: { name: string, description: string }): string => {
  //   return `
  //     You are a professional copywriter and legal tech expert.

  //     Here is a product:
  //     ---
  //     Name: ${product.name}
  //     Description: ${product.description}

  //     Your task:
  //     1. Write a short, engaging marketing description for this product (2–3 sentences).
  //     2. Suggest an ideal customer persona who would benefit most.
  //     3. List three short bullet points highlighting key benefits (not repeating the features verbatim).
  //     4. Suggest a catchy tagline or headline.

  //     Format your output clearly with headers for each section.
  //   `;
  // }


  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto border border-gray-300 rounded-lg sm:rounded-xl bg-white shadow-lg">
        {/* Header */}
        <div className="bg-blue-600 text-white p-3 sm:p-4 rounded-t-lg sm:rounded-t-xl flex-shrink-0 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
          <h2 className="text-base sm:text-lg font-semibold">AI Investment Assistant</h2>
          <div className="flex items-center space-x-2">
            {threadId && (
              <span className="text-xs opacity-75 truncate max-w-32 sm:max-w-none">
                <span className="hidden sm:inline">Thread: </span>{threadId}
              </span>
            )}
            {/* <button
              onClick={clearChat}
              className="text-xs bg-blue-700 hover:bg-blue-800 px-2 py-1 rounded"
            >
              New Chat
            </button> */}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0 max-h-full">
          {messages.length === 0 && (
            <div className="text-gray-500 text-center py-8 sm:py-12">
              <div className="mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm sm:text-base font-medium mb-2">Start a conversation!</p>
                <p className="text-xs sm:text-sm text-gray-400">Ask me about investment options, risks, or any questions you have.</p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex ${message.role === Role.customer ? 'justify-end' : 'justify-start'
                }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-xs lg:max-w-md xl:max-w-lg px-3 sm:px-4 py-2 sm:py-3 rounded-lg ${message.role === Role.customer
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
              >
                <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <span className="text-xs opacity-75 block mt-1 sm:mt-2">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-lg rounded-bl-none">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-gray-600"></div>
                  <span className="text-xs sm:text-sm">Nachdenken</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput && setInput(e.target.value)}
              placeholder="Ask about investment options, risks, or advice..."
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium whitespace-nowrap"
              // ref={buttonRef}
            >
              <span className="">Send</span>
              {/* <span className="sm:hidden">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </span> */}
            </button>
          </div>
        </form>

        {/* Navigation Buttons */}
        {/* <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg flex-shrink-0">
          {showBackButton && (
            <button
              onClick={onBackToChat}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{backButtonText}</span>
            </button>
          )}

          {!showBackButton && <div></div>}

          {showNextButton && (
            <button
              onClick={onNext}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span>{nextButtonText}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div> */}
      </div>
    </div>
  )
}