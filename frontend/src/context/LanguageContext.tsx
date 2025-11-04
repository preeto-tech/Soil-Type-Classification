import { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { motion } from "framer-motion"

type Language = "en" | "hi"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")
  const [showLanguageModal, setShowLanguageModal] = useState(true)
  const [translations, setTranslations] = useState<any>(null)

  // Load translations dynamically
  useEffect(() => {
    const loadTranslations = async () => {
      if (language === "en") {
        const enModule = await import("../translations/en")
        setTranslations(enModule.en)
      } else if (language === "hi") {
        const hiModule = await import("../translations/hi")
        setTranslations(hiModule.hi)
      }
    }
    loadTranslations()
  }, [language])

  // Check if language is already selected (from localStorage)
  useEffect(() => {
    const savedLanguage = localStorage.getItem("selectedLanguage") as Language
    if (savedLanguage) {
      setLanguageState(savedLanguage)
      setShowLanguageModal(false)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("selectedLanguage", lang)
    setShowLanguageModal(false)
  }

  const t = (key: string): string => {
    if (!translations) return key
    return translations[key] || key
  }

  // Show language modal if not selected
  if (showLanguageModal) {
    return (
      <LanguageSelectionModal
        onSelect={(lang) => {
          setLanguage(lang)
        }}
      />
    )
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

function LanguageSelectionModal({ onSelect }: { onSelect: (lang: Language) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Select Your Language / अपनी भाषा चुनें
        </h2>
        <div className="space-y-4">
          <button
            onClick={() => onSelect("en")}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="font-semibold text-lg text-gray-900">English</div>
            <div className="text-sm text-gray-600">Continue in English</div>
          </button>
          <button
            onClick={() => onSelect("hi")}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="font-semibold text-lg text-gray-900">हिंदी</div>
            <div className="text-sm text-gray-600">हिंदी में जारी रखें</div>
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}

