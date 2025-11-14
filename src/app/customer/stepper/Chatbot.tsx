import { Message, Role } from '@/types'
import { useRef, useEffect, useState } from 'react'

// Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

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
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Initialize speech recognition if available
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'de-DE' // German language, change to 'en-US' if needed
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[event.results.length - 1][0].transcript
          if (setInput) {
            setInput(transcript)
          }
        }
        
        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.log('Speech recognition error:', event.error)
          setIsRecording(false)
        }
        
        recognitionRef.current.onend = () => {
          setIsRecording(false)
        }
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.log('Error stopping recognition on cleanup:', error)
        }
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [setInput])

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(messageId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.log('Failed to copy text: ', err)
    }
  }

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.log('Error stopping speech recognition:', error)
        }
      }
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        try {
          mediaRecorder.stop()
        } catch (error) {
          console.log('Error stopping media recorder:', error)
        }
      }
      // Stop all audio tracks
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        audioStreamRef.current = null
      }
      setIsRecording(false)
    } else {
      // Start recording
      try {
        // Check if microphone permission was previously denied
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const permissionResult = await navigator.permissions.query({ name: 'microphone' as PermissionName })
            console.log("🚀 ~ toggleRecording ~ permissionResult:", permissionResult)
            
            if (permissionResult.state === 'denied' || permissionResult.state !== 'prompt') {
              setPermissionDenied(true)
              alert(
                'Mikrofonzugriff verweigert.\n\n' +
                'Bitte erlauben Sie den Mikrofonzugriff in Ihren Browser-Einstellungen:\n\n' +
                'iOS Safari:\n' +
                '1. Öffnen Sie Einstellungen > Safari\n' +
                '2. Scrollen Sie zu "Einstellungen für Websites"\n' +
                '3. Tippen Sie auf "Mikrofon"\n' +
                '4. Wählen Sie "Erlauben"\n\n' +
                'Chrome/Firefox:\n' +
                '1. Tippen Sie auf das Schloss-Symbol in der Adressleiste\n' +
                '2. Aktivieren Sie "Mikrofon"\n' +
                '3. Laden Sie die Seite neu'
              )
              return
            } 
          } catch {
            // Permissions API not supported, continue with getUserMedia
            console.log('Permissions API not supported, attempting direct access')
          }
        } 
        
        // Try Speech Recognition first (better for voice-to-text on supported browsers)
        if (recognitionRef.current) {
          // Speech Recognition works poorly on iOS, skip it for iOS devices
          try {
            recognitionRef.current.start()
            setIsRecording(true)
            setPermissionDenied(false)
            return
          } catch (speechError) {
            console.log('Speech Recognition failed, falling back to MediaRecorder:', speechError)
          }
        }
        
        // Fallback to MediaRecorder (works better on iOS)
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            } 
          })
          
          audioStreamRef.current = stream
          setPermissionDenied(false)
          
          const recorder = new MediaRecorder(stream)
          const audioChunks: BlobPart[] = []
          
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunks.push(event.data)
            }
          }
          
          recorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop())
            
            // Here you would typically send the audio to a transcription service
            // For now, we'll just show a message
            console.log('Audio recorded:', audioBlob)
            
            // You can add transcription service here
            // For example, send to OpenAI Whisper API or Google Speech-to-Text
            // if (setInput) {
            //   setInput('[Audio recorded - transcription not yet implemented]')
            // }
          }
          
          recorder.onerror = (event) => {
            console.log('MediaRecorder error:', event)
            alert('Fehler beim Aufnehmen. Bitte versuchen Sie es erneut.')
            stream.getTracks().forEach(track => track.stop())
            setIsRecording(false)
          }
          
          recorder.start()
          setMediaRecorder(recorder)
          setIsRecording(true)
        } catch (error) {
          setPermissionDenied(true)
          console.log('Error accessing microphone:', error)
          
          // Provide specific error messages
          const err = error as { name?: string; message?: string }
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            alert(
              'Mikrofonzugriff verweigert.\n\n' +
              'Um Sprachaufnahmen zu nutzen, müssen Sie den Mikrofonzugriff erlauben.\n\n' +
              'Bitte aktualisieren Sie die Berechtigung in Ihren Browser-Einstellungen und laden Sie die Seite neu.'
            )
          } else if (err.name === 'NotFoundError') {
            alert('Kein Mikrofon gefunden. Bitte überprüfen Sie, ob ein Mikrofon angeschlossen ist.')
          } else if (err.name === 'NotReadableError') {
            alert('Mikrofon wird bereits von einer anderen Anwendung verwendet.')
          } else {
            alert('Fehler beim Zugriff auf das Mikrofon. Bitte versuchen Sie es erneut.')
          }
        }
      } catch (error) {
        setIsRecording(false)
        console.log('Unexpected error in toggleRecording:', error)
        alert('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
      }
    }
  }

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
  //       console.log('Error loading chat history:', error)
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
  //     console.log('Error:', error)
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
    <div className="h-full w-full flex flex-col bg-gray-50">
      <div className="flex flex-col h-full w-full mx-auto bg-white">
        {/* Header - ChatGPT Style */}
        <div className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-10 flex-shrink-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">AI Investment Assistant</h2>
            {threadId && (
              <span className="text-xs text-gray-400 truncate max-w-32 sm:max-w-none font-mono">
                {threadId.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>

        {/* Messages Container - ChatGPT Style */}
        <div className="flex-1 overflow-y-auto min-h-0 max-h-full">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full px-4">
              <div className="text-center max-w-2xl">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-md">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">How can I help you today?</h3>
                <p className="text-sm text-gray-500">Ask me about investment options, risk analysis, or financial advice.</p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`group border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                message.role === Role.customer ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
                <div className="flex gap-3 sm:gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {message.role === Role.customer ? (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {message.role === Role.customer ? 'You' : 'AI Assistant'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      {/* Message Actions - Visible on hover */}
                      <button
                        onClick={() => copyToClipboard(message.content, message.id || `${index}`)}
                        className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                        title="Copy message"
                      >
                        {copiedId === (message.id || `${index}`) ? (
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="group border-b border-gray-100 bg-gray-50">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-gray-900">AI Assistant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form - ChatGPT Style */}
        <div className="border-t border-gray-200 bg-white sticky bottom-0 flex-shrink-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
            {/* Permission denied warning */}
            {permissionDenied && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800 font-medium">Mikrofonzugriff erforderlich</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Bitte erlauben Sie den Mikrofonzugriff in Ihren Browser-Einstellungen und laden Sie die Seite neu.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl shadow-sm hover:shadow-md focus-within:border-blue-400 focus-within:shadow-md transition-all">
                {!isRecording && (
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput && setInput(e.target.value)}
                    placeholder="Message AI Assistant..."
                    className="flex-1 px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-transparent focus:outline-none"
                    disabled={loading}
                  />
                )}
                
                {isRecording && (
                  <div className="flex-1 px-4 py-2.5 sm:py-3 flex items-center gap-2">
                    <div className="flex items-center gap-2 text-red-600">
                      <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                      <span className="text-sm sm:text-base font-medium">Recording...</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-1 pr-1.5">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`p-2 rounded-lg transition-all relative ${
                      isRecording
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : permissionDenied
                        ? 'text-yellow-600 hover:bg-yellow-50'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                    disabled={loading}
                    title={
                      isRecording 
                        ? 'Aufnahme stoppen' 
                        : permissionDenied
                        ? 'Mikrofonzugriff verweigert - Klicken für Hilfe'
                        : 'Sprachaufnahme starten'
                    }
                  >
                    {permissionDenied && !isRecording && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white"></div>
                    )}
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {!isRecording && (
                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className={`p-2 rounded-lg transition-all ${
                        input.trim() && !loading
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      title="Send message"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 512 512" fill="currentColor">
                        <path d="M483.589 222.024a51.197 51.197 0 0 0-23.762-23.762L73.522 11.331C48.074-.998 17.451 9.638 5.122 35.086A51.2 51.2 0 0 0 3.669 76.44l67.174 167.902L3.669 412.261c-10.463 26.341 2.409 56.177 28.75 66.639a51.314 51.314 0 0 0 18.712 3.624c7.754 0 15.408-1.75 22.391-5.12l386.304-186.982c25.45-12.326 36.089-42.949 23.763-68.398zM58.657 446.633c-8.484 4.107-18.691.559-22.798-7.925a17.065 17.065 0 0 1-.481-13.784l65.399-163.516h340.668L58.657 446.633zm42.121-219.358L35.379 63.759a16.64 16.64 0 0 1 4.215-18.773 16.537 16.537 0 0 1 19.063-2.884l382.788 185.173H100.778z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-gray-400 text-center mt-2">
                AI can make mistakes. Please verify important information.
              </p>
            </form>
          </div>
        </div>

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