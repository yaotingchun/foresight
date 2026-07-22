import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react'
import { useSimulation } from '../context/SimulationContext'
import { useSettings } from '../context/SettingsContext'
import { api } from '../lib/api'
import ReactMarkdown from 'react-markdown'
import { NODE_BY_ID } from '../data/serviceMapData'

// Basic markdown formatting for the chat
const MarkdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-indigo-700">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ children }) => <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded text-xs">{children}</code>
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'model', content: "Hi! I'm the Foresight AI Assistant. How can I help you manage your architecture today?" }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  // Grab the context
  const { incidents, activeRun, componentEffects } = useSimulation()
  const { businessContext } = useSettings()

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping])

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userMessage = { role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsTyping(true)

    try {
      // Build current metrics snapshot based on active run
      const currentMetrics = {}
      if (activeRun) {
        Object.entries(componentEffects).forEach(([id, eff]) => {
          currentMetrics[id] = { severity: eff.s, fault: eff.faultType }
        })
      }

      // Build system context
      const systemContext = {
        topology: Object.fromEntries(
          Object.entries(NODE_BY_ID).map(([id, n]) => [
            id, { dependencies: n.dependencies, metrics: n.metrics }
          ])
        ),
        incidents: activeRun && incidents.length > 0 ? [incidents[0]] : [], // Only pass active incident
        businessContext: businessContext,
        metrics: currentMetrics
      }

      const data = await api.chatWithAI(updatedMessages, systemContext)
      setMessages(prev => [...prev, { role: 'model', content: data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please try again." }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all duration-300 z-50 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <MessageSquare className="text-white" size={24} />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-2rem)] bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl flex flex-col overflow-hidden transition-all duration-300 z-50 transform origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={20} />
            <span className="font-bold text-sm">Foresight AI</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex items-start gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm'}`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`p-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'}`}>
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <ReactMarkdown components={MarkdownComponents}>{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-start gap-2.5 max-w-[85%] self-start">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
                <Bot size={14} />
              </div>
              <div className="p-3 bg-white border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-indigo-500">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-semibold">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-slate-100 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your system..."
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-full transition-colors"
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
