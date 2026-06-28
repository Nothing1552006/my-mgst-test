import { useState, useEffect, useRef } from 'react'

export default function useSpeechRecognition() {

  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      setSupported(true)
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 1

      recognition.onresult = (e) => {
        const said = e.results[0][0].transcript
          .trim()
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
        setTranscript(said)
        setListening(false)
      }

      recognition.onend = () => {
        setListening(false)
      }

      recognition.onerror = (e) => {
        console.error('Speech error', e.error)
        setListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      setTranscript('')
      setListening(true)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop()
      setListening(false)
    }
  }

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1
    window.speechSynthesis.speak(utterance)
  }

  return {
    transcript,
    listening,
    supported,
    startListening,
    stopListening,
    speak,
  }
}