import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAthleteStore from '../store/useAthleteStore'
import useFaceTracking from '../hooks/useFaceTracking'
import useSpeechRecognition from '../hooks/useSpeechRecognition'

const LETTERS = ['E', 'F', 'P', 'T', 'O', 'L', 'C', 'D']
const TOTAL_TRIALS = 3
const LETTERS_PER_TRIAL = 10
const RESPONSE_TIMEOUT = 3000

const LETTER_SIZES = [220, 180, 140, 100, 70, 50, 36]
const SIZE_LABELS = ['6/60', '6/36', '6/24', '6/12', '6/9', '6/6', '6/5']

const CLARITY_OPTIONS = [
  {
    label: 'Grade 0 — No Oscillopsia',
    value: 'grade0',
    clinical: 'Image stable. No visual disturbance during movement.',
  },
  {
    label: 'Grade 1 — Mild Oscillopsia',
    value: 'grade1',
    clinical: 'Slight image movement. VOR partially compensating.',
  },
  {
    label: 'Grade 2 — Moderate Oscillopsia',
    value: 'grade2',
    clinical: 'Noticeable image blur or bounce. VOR deficit present.',
  },
  {
    label: 'Grade 3 — Severe Oscillopsia',
    value: 'grade3',
    clinical: 'Significant image instability or diplopia. Refer for vestibular assessment.',
  },
]

function getRandomLetter(exclude) {
  const filtered = LETTERS.filter((l) => l !== exclude)
  return filtered[Math.floor(Math.random() * filtered.length)]
}

function PendulumGuide({ isMovingLeft, isMovingRight, isMoving }) {
  const position = isMovingLeft ? -40 : isMovingRight ? 40 : 0
  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    }}>
      <div style={{
        width: '80%',
        height: 2,
        background: 'var(--gray-900)',
        position: 'relative',
        borderRadius: 2,
      }}>
        <div style={{
          position: 'absolute',
          left: '10%',
          top: -4,
          fontSize: 11,
          color: 'var(--gray-700)',
        }}>←</div>
        <div style={{
          position: 'absolute',
          right: '10%',
          top: -4,
          fontSize: 11,
          color: 'var(--gray-700)',
        }}>→</div>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${position}px), -50%)`,
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
        {isMoving ? 'Movement detected' : 'Move head left → right → left'}
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

function ClarityRating({ onRate }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      zIndex: 100,
    }}>
      <p className="section-title" style={{ marginBottom: 8 }}>
        Visual Clarity Rating
      </p>
      <p style={{
        fontSize: 14,
        color: 'var(--gray-400)',
        marginBottom: 32,
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        How clearly could you see the letter while moving?
      </p>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: '100%',
        maxWidth: 320,
      }}>
        {CLARITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onRate(option)}
            style={{
              background: 'transparent',
              border: '1px solid var(--gray-700)',
              color: 'var(--white)',
              padding: '16px 20px',
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              {option.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--gray-600)' }}>
              {option.clinical}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function HorizontalGST() {
  const navigate = useNavigate()
  const location = useLocation()
  const athlete = useAthleteStore((s) => s.athlete)
  const saveSession = useAthleteStore((s) => s.saveSession)

  const neutralPosition = location.state?.neutralPosition ||
    { yaw: 0, pitch: 0, roll: 0 }
  const videoRef = useRef(null)

  const {
    isMoving,
    isMovingLeft,
    isMovingRight,
    ready,
    headStats,
    resetStats,
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
  const [allTrialData, setAllTrialData] = useState([])
  const [letterSizeIndex, setLetterSizeIndex] = useState(0)
  const [showClarity, setShowClarity] = useState(false)
  const [clarityRatings, setClarityRatings] = useState([])
  const [pendingAfterClarity, setPendingAfterClarity] = useState(false)
  const [sizeHistory, setSizeHistory] = useState([])
  const [trialHeadStats, setTrialHeadStats] = useState([])

  const lastLetter = useRef('E')
  const processedTranscript = useRef('')
  const waitingRef = useRef(false)
  const letterShownAt = useRef(null)
  const timeoutRef = useRef(null)
  const currentScoreRef = useRef(0)
  const letterCountRef = useRef(0)
  const reactionTimesRef = useRef([])
  const letterSizeIndexRef = useRef(0)
  const clarityRatingsRef = useRef([])

  useEffect(() => {
    if (!athlete) navigate('/athlete')
  }, [])

  useEffect(() => {
    currentScoreRef.current = currentScore
  }, [currentScore])

  useEffect(() => {
    letterSizeIndexRef.current = letterSizeIndex
  }, [letterSizeIndex])

  useEffect(() => {
    if (phase !== 'testing') return
    if (!isMoving) return
    if (waitingRef.current) return
    if (showClarity) return
    if (letterCountRef.current >= LETTERS_PER_TRIAL) return

    const newLetter = getRandomLetter(lastLetter.current)
    lastLetter.current = newLetter
    setCurrentLetter(newLetter)
    setFeedback(null)
    setShowLetter(true)
    waitingRef.current = true
    letterShownAt.current = Date.now()
    setSizeHistory((prev) => [...prev, letterSizeIndexRef.current])

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
      setLetterSizeIndex((prev) => {
        const next = Math.min(prev + 1, LETTER_SIZES.length - 1)
        letterSizeIndexRef.current = next
        return next
      })
    } else {
      setLetterSizeIndex((prev) => {
        const next = Math.max(prev - 1, 0)
        letterSizeIndexRef.current = next
        return next
      })
    }

    reactionTimesRef.current = [...reactionTimesRef.current, reactionTime]

    const nextCount = letterCountRef.current + 1
    letterCountRef.current = nextCount
    setLetterCount(nextCount)

    const isLastLetter = nextCount >= LETTERS_PER_TRIAL

    setTimeout(() => {
      setFeedback(null)
      setShowLetter(false)
      waitingRef.current = false

      if (isLastLetter) {
        setPendingAfterClarity(true)
        setShowClarity(true)
      }
    }, 800)
  }

  const handleClarityRating = (option) => {
    clarityRatingsRef.current = [...clarityRatingsRef.current, option]
    setClarityRatings([...clarityRatingsRef.current])
    setShowClarity(false)

    if (pendingAfterClarity) {
      setPendingAfterClarity(false)
      endTrial()
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

    const currentHeadStats = {
      avgSpeed: headStats.avgSpeed,
      peakSpeed: headStats.peakSpeed,
      swingCount: headStats.swingCount,
      speedLabel: headStats.avgSpeed < 20 ? 'Very Slow' :
        headStats.avgSpeed < 40 ? 'Slow' :
        headStats.avgSpeed < 80 ? 'Moderate' :
        headStats.avgSpeed < 120 ? 'Fast' : 'Very Fast',
    }

    setTrialHeadStats((prev) => [...prev, currentHeadStats])
    resetStats()

    const trialData = {
      trial: currentTrial,
      score,
      avgReactionTime: avgRT,
      maxLetterSize: SIZE_LABELS[letterSizeIndexRef.current],
      clarityRating: clarityRatingsRef.current[
        clarityRatingsRef.current.length - 1
      ]?.label || '-',
      headMovement: currentHeadStats,
    }

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
        clarityRatingsRef.current = []
        setClarityRatings([])
        setSizeHistory([])
        setLetterSizeIndex(0)
        letterSizeIndexRef.current = 0
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

    const overallAvgSpeed = allTrialData.length > 0
      ? Math.round(
          allTrialData.reduce((a, b) => a + (b.headMovement?.avgSpeed || 0), 0) /
          allTrialData.length
        )
      : 0

    const overallPeakSpeed = allTrialData.length > 0
      ? Math.max(...allTrialData.map((t) => t.headMovement?.peakSpeed || 0))
      : 0

    const totalSwings = allTrialData.reduce(
      (a, b) => a + (b.headMovement?.swingCount || 0), 0
    )

    const dominantClarity = allTrialData
      .map((t) => t.clarityRating)
      .filter(Boolean)
      .join(', ')

    const bestSize = allTrialData
      .map((t) => t.maxLetterSize)
      .filter(Boolean)
      .join(', ')

    saveSession({
      name: athlete?.name || 'Unknown',
      age: athlete?.age,
      sport: athlete?.sport,
      sva: athlete?.sva,
      dominantEye: athlete?.dominantEye,
      notes: athlete?.notes,
      date: athlete?.date,
      time: athlete?.time,
      hScore: `${total}/${max}`,
      hStatus: status,
      hAccuracy: accuracy,
      hTrialScores: scores,
      hAvgReactionTime: avgRT,
      hTrialData: allTrialData,
      hClarityRatings: dominantClarity,
      hBestSize: bestSize,
      hHeadMovement: {
        avgSpeed: overallAvgSpeed,
        peakSpeed: overallPeakSpeed,
        totalSwings,
        speedLabel: overallAvgSpeed < 20 ? 'Very Slow' :
          overallAvgSpeed < 40 ? 'Slow' :
          overallAvgSpeed < 80 ? 'Moderate' :
          overallAvgSpeed < 120 ? 'Fast' : 'Very Fast',
      },
      vScore: '-',
      vStatus: '-',
      vAccuracy: null,
      vTrialScores: [],
    })

    navigate('/results', {
      state: {
        neutralPosition: neutralPosition || { yaw: 0, pitch: 0, roll: 0 },
        fromHorizontal: true,
      }
    })
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
    setTrialHeadStats([])
    reactionTimesRef.current = []
    clarityRatingsRef.current = []
    setClarityRatings([])
    setSizeHistory([])
    setLetterSizeIndex(0)
    letterSizeIndexRef.current = 0
    setFeedback(null)
    setShowLetter(false)
    resetStats()
  }

  if (phase === 'intro') {
    return (
      <div className="page">
        <button
          className="btn-ghost"
          style={{ width: 'auto', padding: '0 0 32px 0', fontSize: 13 }}
          onClick={() => navigate('/calibration')}
        >
          ← Back
        </button>

        <p className="section-title">Step 2 of 3</p>
        <h2 className="title-large">Horizontal GST</h2>
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
              { arrow: '←', text: 'Head moves left' },
              { arrow: 'E', text: 'Letter appears — size adapts to performance', big: true },
              { arrow: '→', text: 'Keep moving + say the letter you see' },
              { arrow: '☑', text: 'Rate visual clarity after each trial' },
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
              whiteSpace: 'pre-line',
            }}>
              {`⚠ Do NOT stop your head to answer\nKeep moving like a pendulum throughout\nLetter size changes based on your performance`}
            </p>
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
          Start Horizontal GST
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
          <>
            <p style={{ color: 'var(--gray-700)', fontSize: 12, marginTop: 4 }}>
              Avg response: {allTrialData[allTrialData.length - 1].avgReactionTime}ms
            </p>
            <p style={{ color: 'var(--gray-700)', fontSize: 12 }}>
              Clarity: {allTrialData[allTrialData.length - 1].clarityRating}
            </p>
            <p style={{ color: 'var(--gray-700)', fontSize: 12 }}>
              Head speed: {allTrialData[allTrialData.length - 1].headMovement?.avgSpeed}°/s
              · {allTrialData[allTrialData.length - 1].headMovement?.speedLabel}
            </p>
            <p style={{ color: 'var(--gray-700)', fontSize: 12 }}>
              Peak: {allTrialData[allTrialData.length - 1].headMovement?.peakSpeed}°/s
              · Swings: {allTrialData[allTrialData.length - 1].headMovement?.swingCount}
            </p>
          </>
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
          Horizontal GST Complete
        </p>
        <p className="title-large">Trial Summary</p>

        <hr className="divider" />

        <div style={{ marginBottom: 24 }}>
          {trialScores.map((score, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}>
                <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                  Trial {i + 1}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                    {score}/10
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--gray-700)' }}>
                    {allTrialData[i]?.avgReactionTime}ms
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--gray-700)' }}>
                    {allTrialData[i]?.headMovement?.avgSpeed}°/s
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--gray-700)' }}>
                    {allTrialData[i]?.clarityRating?.split('—')[0]}
                  </span>
                </div>
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
            ['Avg Head Speed', `${allTrialData.reduce((a, b) => a + (b.headMovement?.avgSpeed || 0), 0) / allTrialData.length || 0}°/s`],
            ['Peak Head Speed', `${Math.max(...allTrialData.map((t) => t.headMovement?.peakSpeed || 0))}°/s`],
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

      {showClarity && (
        <ClarityRating onRate={handleClarityRating} />
      )}

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
          {SIZE_LABELS[letterSizeIndex]}
        </span>
      </div>

      <div style={{
        position: 'absolute',
        top: 44,
        right: 24,
        textAlign: 'right',
      }}>
        <p style={{
          fontSize: 10,
          color: 'var(--gray-800)',
          letterSpacing: '0.05em',
        }}>
          {headStats.currentSpeed}°/s · {headStats.speedLabel}
        </p>
      </div>

      <PendulumGuide
        isMovingLeft={isMovingLeft}
        isMovingRight={isMovingRight}
        isMoving={isMoving}
      />

      <div style={{
        fontSize: showLetter ? LETTER_SIZES[letterSizeIndex] : 0,
        fontWeight: 200,
        color: feedback === 'correct'
          ? 'var(--correct)'
          : feedback === 'wrong'
          ? 'var(--wrong)'
          : 'var(--white)',
        lineHeight: 1,
        fontFamily: 'monospace',
        letterSpacing: '-0.05em',
        transition: 'font-size 0.3s ease, color 0.2s ease',
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
          Keep moving ↔
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
          {listening ? '🎤 Listening' : isMoving ? 'Keep moving' : '← Swing head →'}
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

export default HorizontalGST