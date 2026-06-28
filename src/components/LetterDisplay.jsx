import { useEffect, useState } from 'react'

const LETTERS = ['E', 'F', 'P', 'T', 'O', 'L', 'C', 'D']

function getRandomLetter(exclude) {
  const filtered = LETTERS.filter((l) => l !== exclude)
  return filtered[Math.floor(Math.random() * filtered.length)]
}

function LetterDisplay({ isMoving, speedLevel, onResponse, active }) {

  const [letter, setLetter] = useState('E')
  const [feedback, setFeedback] = useState(null)
  const [bgColor, setBgColor] = useState('#0f0f0f')

  const letterColor =
    speedLevel >= 4 ? '#ef4444' :
    speedLevel === 3 ? '#eab308' :
    '#22c55e'

  useEffect(() => {
    if (isMoving && active) {
      const newLetter = getRandomLetter(letter)
      setLetter(newLetter)
      setFeedback(null)
      setBgColor('#0f0f0f')
    }
  }, [isMoving])

  const handleResponse = (spoken) => {
    const correct = spoken === letter
    setFeedback(correct ? 'correct' : 'wrong')
    setBgColor(correct ? '#052e16' : '#2d0a0a')

    if (onResponse) {
      onResponse({ letter, spoken, correct })
    }

    setTimeout(() => {
      setFeedback(null)
      setBgColor('#0f0f0f')
    }, 800)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      background: bgColor,
      borderRadius: 16,
      transition: 'background 0.3s ease',
      padding: 24,
    }}>

      <div style={{
        fontSize: 180,
        fontWeight: 700,
        color: letterColor,
        lineHeight: 1,
        transition: 'color 0.3s ease',
        fontFamily: 'monospace',
      }}>
        {letter}
      </div>

      {feedback && (
        <div style={{
          marginTop: 24,
          fontSize: 28,
          fontWeight: 700,
          color: feedback === 'correct' ? '#22c55e' : '#ef4444',
        }}>
          {feedback === 'correct' ? '✓ Correct' : '✗ Wrong'}
        </div>
      )}

      <div style={{
        marginTop: 16,
        fontSize: 13,
        color: '#555',
      }}>
        Speed Level {speedLevel} · {
          speedLevel >= 4 ? 'Fast' :
          speedLevel === 3 ? 'Moderate' : 'Slow'
        }
      </div>

    </div>
  )
}

export default LetterDisplay
export { getRandomLetter, LETTERS }