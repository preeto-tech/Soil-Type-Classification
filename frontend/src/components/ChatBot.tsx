import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, User, Loader2, Trash2, MessageCircle, Image as ImageIcon, X, Sparkles } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
import { FertilityResultCard } from "./FertilityResultCard"
import { useLanguage } from "../context/LanguageContext"
import axios from "axios"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp?: string
  image?: string
  toolResult?: {
    tool: string
    fertilityLevel?: string
    nutrients?: any
    recommendations?: string[]
  }
}

export function ChatBot() {
  const { t, language } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize chat session
  useEffect(() => {
    initializeSession()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const initializeSession = async () => {
    try {
      const response = await axios.post("/chat/session")
      setSessionId(response.data.session_id)
      
      // Add welcome message
      setMessages([{
        role: "assistant",
        content: t("welcomeMessage")
      }])
    } catch (err) {
      console.error("Failed to initialize chat session:", err)
      setError("Failed to initialize chat. Please refresh the page.")
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if ((!inputMessage.trim() && !selectedImage) || !sessionId || loading) return

    const userMessage = inputMessage.trim() || "Analyze this image"
    const userImagePreview = imagePreview
    setInputMessage("")
    setError(null)

    // Add user message to UI with image preview
    const newMessage: Message = {
      role: "user",
      content: userMessage,
      image: userImagePreview || undefined
    }
    setMessages(prev => [...prev, newMessage])
    setLoading(true)

    try {
      let response

      if (selectedImage) {
        // Send with image using FormData
        const formData = new FormData()
        formData.append("session_id", sessionId)
        formData.append("message", userMessage)
        formData.append("language", language)
        formData.append("image", selectedImage)

        response = await axios.post("/chat/message", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
      } else {
        // Send text only
        response = await axios.post("/chat/message", {
          session_id: sessionId,
          message: userMessage,
          language: language
        })
      }

      // Check if response contains tool result
      if (response.data.tool_result) {
        // Add AI response with beautiful tool result
        setMessages(prev => [...prev, {
          role: "assistant",
          content: response.data.message,
          toolResult: {
            tool: response.data.tool_result.tool,
            fertilityLevel: response.data.tool_result.fertility_level,
            nutrients: response.data.tool_result.nutrients,
            recommendations: response.data.tool_result.recommendations
          }
        }])
      } else {
        // Regular text response
        setMessages(prev => [...prev, {
          role: "assistant",
          content: response.data.message
        }])
      }

      // Clear image after successful send
      handleRemoveImage()
    } catch (err: unknown) {
      console.error("Failed to send message:", err)
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Failed to get response. Please try again.")
      } else {
        setError("An unexpected error occurred")
      }
      
      // Remove the user message if request failed
      setMessages(prev => prev.slice(0, -1))
      setInputMessage(userMessage) // Restore the message
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = async () => {
    if (!sessionId) return

    try {
      await axios.delete(`/chat/clear/${sessionId}`)
      setMessages([{
        role: "assistant",
        content: t("welcomeMessage")
      }])
      setError(null)
    } catch (err) {
      console.error("Failed to clear chat:", err)
    }
  }

  const handleAnalyzeFertility = async (nutrients: any) => {
    if (!sessionId) return

    setLoading(true)
    try {
      const response = await axios.post("/chat/analyze-fertility", {
        session_id: sessionId,
        nutrients
      })

      // Add tool result as a message
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `I've analyzed your soil fertility! Here are the results:`,
        toolResult: {
          tool: "fertility_analyzer",
          fertilityLevel: response.data.fertility_level,
          nutrients: response.data.nutrients,
          recommendations: response.data.recommendations
        }
      }])
    } catch (err) {
      console.error("Failed to analyze fertility:", err)
      setError("Failed to analyze fertility. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          {t("chatTitle")}
        </CardTitle>
        <CardDescription>
          {t("chatDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="p-4 border-b bg-gray-50">
            <p className="text-xs text-gray-600 mb-2">{t("quickActions")}:</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAnalyzeFertility({
                N: 245, P: 8.1, K: 560, ph: 7.31, ec: 0.63, oc: 0.78,
                S: 11.6, zn: 0.29, fe: 0.43, cu: 0.57, Mn: 7.73, B: 0.74
              })}
              disabled={loading}
              className="w-full text-xs"
            >
              <Sparkles className="h-3 w-3 mr-2" />
              {t("analyzeSampleData")}
            </Button>
          </div>
        )}

        <ScrollArea 
          ref={scrollRef}
          className="flex-1 p-4 space-y-4"
        >
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                )}
                
                <div
                  className={`rounded-lg ${
                    message.toolResult ? "p-0 w-full max-w-full" : "px-4 py-2 max-w-[80%]"
                  } ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.toolResult ? "" : "bg-muted"
                  }`}
                >
                  {message.image && (
                    <img 
                      src={message.image} 
                      alt="Uploaded" 
                      className="rounded-md mb-2 max-w-full h-auto max-h-48 object-cover"
                    />
                  )}
                  {!message.toolResult ? (
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-4 pt-4">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <p className="text-sm font-medium">{message.content}</p>
                      </div>
                      {message.toolResult.tool === "fertility_analyzer" && (
                        <FertilityResultCard
                          fertilityLevel={message.toolResult.fertilityLevel!}
                          nutrients={message.toolResult.nutrients}
                          recommendations={message.toolResult.recommendations!}
                        />
                      )}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-5 w-5 text-secondary-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="rounded-lg px-4 py-2 bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}
        </ScrollArea>

        <div className="border-t p-4 space-y-3">
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="rounded-md h-20 object-cover border-2 border-primary"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemoveImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !sessionId}
              title={t("uploadImageButton")}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t("placeholder")}
              disabled={loading || !sessionId}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={(!inputMessage.trim() && !selectedImage) || loading || !sessionId}
              size="icon"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleClearChat}
              disabled={messages.length <= 1 || loading}
              title={t("clearChat")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}

