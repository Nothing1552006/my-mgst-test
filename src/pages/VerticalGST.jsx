import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAthleteStore from '../store/useAthleteStore'
import useFaceTracking from '../hooks/useFaceTracking'
import useSpeechRecognition from '../hooks/useSpeechRecognition'

const LETTERS = ['E', 'F', 'P', 'T', 'O', 'L', 'C', 'D']
const TOTAL_TRIALS = 3
const LETTERS_PER_TRIAL = 10
const RESPONSE_TIMEOUT = 3000

function getRandomLetter(exclude) {
  const filtered = LETTERS.filter((l) => l !== exclude)
  return filtered[Math.floor(Math.random() * filtered.length)]
}

function PendulumGuide({ isMovingUp, isMovingDown, isMoving }) {
  const position = isMovingUp ? -40 : isMovingDown ? 40 : 0
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    }}>
      <div style={{
        height: 80,
        width: 2,
        background: 'var(--gray-900)',
        position: 'relative',
        borderRadius: 2,
      }}>
        <div style={{
          position: 'absolute',
          top: '10%',
          left: -4,
          fontSize: 11,
          color: 'var(--gray-700)',
        }}>↑</div>
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: -4,
          fontSize: 11,
          color: 'var(--gray-700)',
        }}>↓</div>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, calc(-50% + ${position}px))`,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: isMoving ? 'var(--white)' : 'var(--gray-700)',
          transition: 'transform 0.3s ease, background 0.2s ease',
        }} />
      </div>
      <p style={{
        fontSize: 11,
        color: 'var(--gray-700)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {isMoving ? 'Movement detected' : 'Move head up → down → up'}
      </p>
    </div>
  )
}

function ProgressBar({ current, total }) {
  const percent = (current / total) * 100
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 2,
      background: 'var(--gray-900)',
    }}>
      <div style={{
        height: '100%',
        width: `${percent}%`,
        background: 'var(--white)',
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}

function VerticalGST() {
  const navigate = useNavigate()
  const location = useLocation()
  const athlete = useAthleteStore((s) => s.athlete)
  const sessions = useAthleteStore((s) => s.sessions)
  const saveSession = useAthleteStore((s) => s.saveSession)

  const neutralPosition = location.state?.neutralPosition || { yaw: 0, pitch: 0, roll: 0 }
  const videoRef = useRef(null)

  const {
    isMoving,
    isMovingUp,
    isMovingDown,
    ready,
  } = useFaceTracking(videoRef, neutralPosition)

  const {
    transcript,
    listening,
    supported,
    startListening,
  } = useSpeechRecognition()

  const [phase, setPhase] = useState('intro')
  const [currentTrial, setCurrentTrial] = useState(1)
  const [currentLetter, setCurrentLetter] = useState('E')
  const [letterCount, setLetterCount] = useState(0)
  const [trialScores, setTrialScores] = useState([])
  const [currentScore, setCurrentScore] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [showLetter, setShowLetter] = useState(false)
  const [reactionTimes, setReactionTimes] = useState([])
  const [allTrialData, setAllTrialData] = useState([])

  const lastLetter = useRef('E')
  const processedTranscript = useRef('')
  const waitingRef = useRef(false)
  const letterShownAt = useRef(null)
  const timeoutRef = useRef(null)
  const currentScoreRef = useRef(0)
  const letterCountRef = useRef(0)
  const reactionTimesRef = useRef([])

  useEffect(() => {
    if (!athlete) navigate('/athlete')
  }, [])

  useEffect(() => {
    currentScoreRef.current = currentScore
  }, [currentScore])

  useEffect(() => {
    if (phase !== 'testing') return
    if (!isMoving) return
    if (waitingRef.current) return
    if (letterCountRef.current >= LETTERS_PER_TRIAL) return

    const newLetter = getRandomLetter(lastLetter.current)
    lastLetter.current = newLetter
    setCurrentLetter(newLetter)
    setFeedback(null)
    setShowLetter(true)
    waitingRef.current = true
    letterShownAt.current = Date.now()

    setTimeout(() => {
      if (waitingRef.current) startListening()
    }, 500)

    timeoutRef.current = setTimeout(() => {
      if (waitingRef.current) handleResponse(null)
    }, RESPONSE_TIMEOUT)

  }, [isMoving])

  useEffect(() => {
    if (!transcript) return
    if (!waitingRef.current) return
    if (transcript === processedTranscript.current) return
    processedTranscript.current = transcript
    clearTimeout(timeoutRef.current)
    handleResponse(transcript[0])
  }, [transcript])

  const handleResponse = (spokenLetter) => {
    const reactionTime = letterShownAt.current
      ? Date.now() - letterShownAt.current
      : RESPONSE_TIMEOUT

    const correct = spokenLetter === currentLetter
    setFeedback(correct ? 'correct' : 'wrong')

    if (correct) {
      setCurrentScore((s) => {
        currentScoreRef.current = s + 1
        return s + 1
      })
    }

    reactionTimesRef.current = [...reactionTimesRef.current, reactionTime]
    setReactionTimes([...reactionTimesRef.current])

    const nextCount = letterCountRef.current + 1
    letterCountRef.current = nextCount
    setLetterCount(nextCount)

    if (nextCount >= LETTERS_PER_TRIAL) {
      waitingRef.current = false
      setTimeout(() => endTrial(), 1000)
    } else {
      setTimeout(() => {
        setFeedback(null)
        setShowLetter(false)
        waitingRef.current = false
      }, 800)
    }
  }

  const endTrial = () => {
    const score = currentScoreRef.current
    const avgRT = reactionTimesRef.current.length > 0
      ? Math.round(
          reactionTimesRef.current.reduce((a, b) => a + b, 0) /
          reactionTimesRef.current.length
        )
      : 0

    const trialData = { trial: currentTrial, score, avgReactionTime: avgRT }

    setAllTrialData((prev) => {
      const updated = [...prev, trialData]

      if (currentTrial >= TOTAL_TRIALS) {
        setTrialScores((s) => {
          const updatedScores = [...s, score]
          setPhase('summary')
          return updatedScores
        })
      } else {
        setTrialScores((s) => [...s, score])
        setCurrentTrial((t) => t + 1)
        currentScoreRef.current = 0
        setCurrentScore(0)
        letterCountRef.current = 0
        setLetterCount(0)
        reactionTimesRef.current = []
        setReactionTimes([])
        setFeedback(null)
        setShowLetter(false)
        setPhase('trialbreak')
        setTimeout(() => setPhase('testing'), 3000)
      }

      return updated
    })
  }

  const finishTest = () => {
    const scores = trialScores
    const total = scores.reduce((a, b) => a + b, 0)
    const max = TOTAL_TRIALS * LETTERS_PER_TRIAL
    const accuracy = Math.round((total / max) * 100)
    const status =
      accuracy >= 80 ? 'Good' :
      accuracy >= 50 ? 'Moderate' : 'Poor'

    const avgRT = allTrialData.length > 0
      ? Math.round(
          allTrialData.reduce((a, b) => a + b.avgReactionTime, 0) /
          allTrialData.length
        )
      : 0

    const latest = sessions[0]

    saveSession({
      name: athlete?.name || latest?.name || 'Unknown',
      age: athlete?.age || latest?.age,
      sport: athlete?.sport || latest?.sport,
      sva: athlete?.sva || latest?.sva,
      dominantEye: athlete?.dominantEye || latest?.dominantEye,
      notes: athlete?.notes || latest?.notes,
      date: athlete?.date || latest?.date,
      time: athlete?.time || latest?.time,
      hScore: latest?.hScore || '-',
      hStatus: latest?.hStatus || '-',
      hAccuracy: latest?.hAccuracy || 0,
      hTrialScores: latest?.hTrialScores || [],
      hAvgReactionTime: latest?.hAvgReactionTime || 0,
      hTrialData: latest?.hTrialData || [],
      vScore: `${total}/${max}`,
      vStatus: status,
      vAccuracy: accuracy,
      vTrialScores: scores,
      vAvgReactionTime: avgRT,
      vTrialData: allTrialData,
    })

    navigate('/results')
  }

  const startTest = () => {
    setPhase('testing')
    setCurrentTrial(1)
    currentScoreRef.current = 0
    setCurrentScore(0)
    letterCountRef.current = 0
    setLetterCount(0)
    setTrialScores([])
    setAllTrialData([])
    reactionTimesRef.current = []
    setReactionTimes([])
    setFeedback(null)
    setShowLetter(false)
  }

  if (phase === 'intro') {
    return (
      <div className="page">
        <button
          className="btn-ghost"
          style={{ width: 'auto', padding: '0 0 32px 0', fontSize: 13 }}
          onClick={() => navigate('/results')}
        >
          ← Back
        </button>

        <p className="section-title">Step 3 of 3</p>
        <h2 className="title-large">Vertical GST</h2>
        <p className="subtitle" style={{ marginTop: 8 }}>
          {athlete?.name} · SVA {athlete?.sva}
        </p>

        <hr className="divider" />

        <div style={{ marginBottom: 8 }}>
          <p className="section-title">How it works</p>
          <div style={{
            border: '1px solid var(--gray-800)',
            padding: 16,
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {[
              { arrow: '↑', text: 'Head moves up' },
              { arrow: 'E', text: 'Letter appears silently on screen', big: true },
              { arrow: '↓', text: 'Keep moving + say the letter you see' },
              { arrow: '↑', text: 'Next letter appears on next swing' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: i < 3 ? '1px solid var(--gray-900)' : 'none',
              }}>
                <span style={{
                  fontSize: item.big ? 40 : 28,
                  color: 'var(--white)',
                  fontFamily: item.big ? 'monospace' : 'inherit',
                  fontWeight: item.big ? 200 : 400,
                  minWidth: 40,
                }}>
                  {item.arrow}
                </span>
                <p style={{
                  fontSize: 13,
                  color: 'var(--gray-400)',
                  textAlign: 'center',
                  flex: 1,
                  paddingLeft: 12,
                }}>
                  {item.text}
                </p>
                <span style={{
                  fontSize: 11,
                  color: 'var(--gray-700)',
                  minWidth: 24,
                  textAlign: 'right',
                }}>
                  0{i + 1}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            background: 'var(--gray-900)',
            border: '1px solid var(--gray-800)',
            padding: 14,
            marginBottom: 16,
          }}>
            <p style={{
              fontSize: 12,
              color: 'var(--gray-400)',
              lineHeight: 1.8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              ⚠ Do NOT stop your head to answer{'\n'}
              Keep moving like a pendulum throughout{'\n'}
              No voice hints — read what you see
            </p>
          </div>

          <div style={{
            border: '1px solid var(--gray-800)',
            padding: 14,
          }}>
            <p className="section-title" style={{ marginBottom: 8 }}>
              Test details
            </p>
            {[
              ['Trials', '3'],
              ['Letters per trial', '10'],
              ['Total letters', '30'],
              ['Response timeout', '3 seconds'],
              ['Reaction time', 'Recorded automatically'],
            ].map(([label, value], i) => (
              <div key={i} className="row">
                <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                  {label}
                </span>
                <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <hr className="divider" />

        <div style={{ marginBottom: 20 }}>
          <p className="section-title">Camera Status</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: ready ? 'var(--correct)' : 'var(--gray-700)',
            }} />
            <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>
              {ready ? 'Ready' : 'Loading...'}
            </span>
          </div>
        </div>

        <video
          ref={videoRef}
          style={{
            width: '100%',
            aspectRatio: '4/3',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: 'block',
            border: '1px solid var(--gray-800)',
            marginBottom: 20,
          }}
          playsInline
          muted
        />

        {!supported && (
          <p style={{ color: 'var(--wrong)', fontSize: 12, marginBottom: 12 }}>
            Voice not supported. Please use Chrome browser.
          </p>
        )}

        <button
          className="btn-primary"
          onClick={startTest}
          disabled={!ready}
          style={{
            opacity: !ready ? 0.4 : 1,
            cursor: !ready ? 'not-allowed' : 'pointer',
          }}
        >
          Start Vertical GST
        </button>

        <button className="btn-ghost" onClick={() => navigate('/')}>
          Cancel Test
        </button>
      </div>
    )
  }

  if (phase === 'trialbreak') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--black)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 8,
      }}>
        <p className="section-title" style={{ marginBottom: 8 }}>
          Trial {currentTrial - 1} of {TOTAL_TRIALS} Complete
        </p>
        <p className="score-big">
          {trialScores[trialScores.length - 1]}
          <span style={{ fontSize: 32, color: 'var(--gray-700)' }}>/10</span>
        </p>
        <p style={{
          color: 'var(--gray-500)',
          marginTop: 8,
          fontSize: 13,
          letterSpacing: '0.05em',
        }}>
          {trialScores[trialScores.length - 1] >= 8 ? 'Good' :
           trialScores[trialScores.length - 1] >= 5 ? 'Moderate' : 'Poor'}
        </p>
        {allTrialData[allTrialData.length - 1] && (
          <p style={{ color: 'var(--gray-700)', fontSize: 12, marginTop: 4 }}>
            Avg response: {allTrialData[allTrialData.length - 1].avgReactionTime}ms
          </p>
        )}
        <p style={{
          color: 'var(--gray-700)',
          marginTop: 16,
          fontSize: 12,
          letterSpacing: '0.05em',
        }}>
          Next trial in 3 seconds
        </p>
        <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      </div>
    )
  }

  if (phase === 'summary') {
    const total = trialScores.reduce((a, b) => a + b, 0)
    const max = TOTAL_TRIALS * LETTERS_PER_TRIAL
    const accuracy = Math.round((total / max) * 100)
    const avgRT = allTrialData.length > 0
      ? Math.round(
          allTrialData.reduce((a, b) => a + b.avgReactionTime, 0) /
          allTrialData.length
        )
      : 0

    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--black)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <p className="section-title" style={{ marginBottom: 8 }}>
          Vertical GST Complete
        </p>
        <p className="title-large">Trial Summary</p>

        <hr className="divider" />

        <div style={{ marginBottom: 24 }}>
          {trialScores.map((score, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}>
                <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                  Trial {i + 1}
                </span>
                <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                  {score}/10 · {allTrialData[i]?.avgReactionTime}ms
                </span>
              </div>
              <div style={{
                height: 4,
                background: 'var(--gray-900)',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(score / 10) * 100}%`,
                  background: score >= 8
                    ? 'var(--correct)'
                    : score >= 5
                    ? 'var(--gray-500)'
                    : 'var(--wrong)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        <hr className="divider" />

        <div style={{ marginBottom: 32 }}>
          {[
            ['Total Score', `${total}/${max}`],
            ['Accuracy', `${accuracy}%`],
            ['Avg Response Time', `${avgRT}ms`],
            ['Status', accuracy >= 80 ? 'Good' :
              accuracy >= 50 ? 'Moderate' : 'Poor'],
          ].map(([label, value], i) => (
            <div key={i} className="row">
              <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                {label}
              </span>
              <span style={{
                fontSize: 13,
                color: label === 'Status'
                  ? accuracy >= 80
                    ? 'var(--correct)'
                    : accuracy >= 50
                    ? 'var(--gray-400)'
                    : 'var(--wrong)'
                  : 'var(--white)',
                fontWeight: label === 'Status' ? 600 : 400,
              }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={finishTest}>
          Save and View Full Results →
        </button>

        <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: feedback === 'correct'
        ? '#0a1a0a'
        : feedback === 'wrong'
        ? '#1a0a0a'
        : 'var(--black)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.2s ease',
      position: 'relative',
      padding: '80px 24px',
    }}>

      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />

      <ProgressBar current={letterCount} total={LETTERS_PER_TRIAL} />

      <div style={{
        position: 'absolute',
        top: 8,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        padding: '14px 24px 0',
      }}>
        <span style={{ fontSize: 12, color: 'var(--gray-600)', letterSpacing: '0.06em' }}>
          TRIAL {currentTrial}/{TOTAL_TRIALS}
        </span>
        <span style={{ fontSize: 12, color: 'var(--gray-600)', letterSpacing: '0.06em' }}>
          {letterCount}/{LETTERS_PER_TRIAL}
        </span>
        <span style={{ fontSize: 12, color: 'var(--gray-600)', letterSpacing: '0.06em' }}>
          SCORE {currentScore}
        </span>
      </div>

      <PendulumGuide
        isMovingUp={isMovingUp}
        isMovingDown={isMovingDown}
        isMoving={isMoving}
      />

      <div style={{
        fontSize: showLetter ? 220 : 0,
        fontWeight: 200,
        color: feedback === 'correct'
          ? 'var(--correct)'
          : feedback === 'wrong'
          ? 'var(--wrong)'
          : 'var(--white)',
        lineHeight: 1,
        fontFamily: 'monospace',
        letterSpacing: '-0.05em',
        transition: 'font-size 0.15s ease, color 0.2s ease',
        userSelect: 'none',
        minHeight: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {showLetter ? currentLetter : ''}
      </div>

      {feedback && (
        <p style={{
          fontSize: 13,
          color: feedback === 'correct' ? 'var(--correct)' : 'var(--wrong)',
          letterSpacing: '0.12em',
          marginTop: 12,
          textTransform: 'uppercase',
        }}>
          {feedback === 'correct' ? 'Correct' : 'Wrong'}
        </p>
      )}

      {!showLetter && !feedback && (
        <p style={{
          fontSize: 13,
          color: 'var(--gray-800)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginTop: 12,
        }}>
          Keep moving ↕
        </p>
      )}

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        borderTop: '1px solid var(--gray-900)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: ready ? 'var(--correct)' : 'var(--wrong)',
          }} />
          <span style={{ fontSize: 11, color: 'var(--gray-700)' }}>
            {ready ? 'Ready' : 'Loading'}
          </span>
        </div>

        <span style={{ fontSize: 11, color: 'var(--gray-700)', letterSpacing: '0.05em' }}>
          {listening ? '🎤 Listening' : isMoving ? 'Keep moving' : '↑ Swing head ↓'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: listening ? 'var(--correct)' : 'var(--gray-800)',
          }} />
          <span style={{ fontSize: 11, color: 'var(--gray-700)' }}>
            {listening ? 'Mic on' : 'Mic off'}
          </span>
        </div>
      </div>

    </div>
  )
}

export default VerticalGST