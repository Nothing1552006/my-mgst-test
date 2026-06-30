import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAthleteStore from '../store/useAthleteStore'
import useFaceTracking from '../hooks/useFaceTracking'
import useSpeechRecognition from '../hooks/useSpeechRecognition'

const LETTERS = ['2', '3', '5', '6', '8', '9', '4', '7']
const TOTAL_TRIALS = 3
const LETTERS_PER_TRIAL = 10

const LETTER_SIZES = [220, 180, 140, 100, 70, 50, 36]
const SIZE_LABELS = ['6/60', '6/36', '6/24', '6/12', '6/9', '6/6', '6/5']

const CLARITY_OPTIONS = [
  { label: 'Clear', grade: 0, color: 'var(--correct)' },
  { label: 'Mild Blur', grade: 1, color: 'var(--gray-400)' },
  { label: 'Moderate Blur', grade: 2, color: 'var(--gray-400)' },
  { label: 'Severe Blur', grade: 3, color: 'var(--wrong)' },
]

function getRandomLetter(exclude) {
  const filtered = LETTERS.filter((l) => l !== exclude)
  return filtered[Math.floor(Math.random() * filtered.length)]
}

function PendulumGuide({ isMovingLeft, isMovingRight, isMoving }) {
  const position = isMovingLeft ? -40 : isMovingRight ? 40 : 0
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: '80%', height: 2, background: 'var(--gray-900)', position: 'relative', borderRadius: 2 }}>
        <div style={{ position: 'absolute', left: '10%', top: -4, fontSize: 11, color: 'var(--gray-700)' }}>←</div>
        <div style={{ position: 'absolute', right: '10%', top: -4, fontSize: 11, color: 'var(--gray-700)' }}>→</div>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(calc(-50% + ${position}px), -50%)`,
          width: 12, height: 12, borderRadius: '50%',
          background: isMoving ? 'var(--white)' : 'var(--gray-700)',
          transition: 'transform 0.3s ease, background 0.2s ease',
        }} />
      </div>
      <p style={{ fontSize: 11, color: 'var(--gray-700)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {isMoving ? 'Movement detected' : 'Move head left → right → left'}
      </p>
    </div>
  )
}

function ProgressBar({ current, total }) {
  const percent = (current / total) * 100
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--gray-900)' }}>
      <div style={{ height: '100%', width: `${percent}%`, background: 'var(--white)', transition: 'width 0.3s ease' }} />
    </div>
  )
}

function ClarityButtonRow({ onRate }) {
  return (
    <div style={{ width: '100%', maxWidth: 360, marginTop: 20 }}>
      <p style={{
        fontSize: 11, color: 'var(--gray-600)', textAlign: 'center',
        letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10,
      }}>
        Examiner — rate clarity for this optotype
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        {CLARITY_OPTIONS.map((opt) => (
          <button
            key={opt.grade}
            onClick={() => onRate(opt)}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid var(--gray-700)',
              color: opt.color,
              fontSize: 12,
              padding: '12px 4px',
              textAlign: 'center',
            }}
          >
            {opt.label}
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

  const neutralPosition = location.state?.neutralPosition || { yaw: 0, pitch: 0, roll: 0 }
  const videoRef = useRef(null)

  const { isMoving, isMovingLeft, isMovingRight, ready, headStats, resetStats } = useFaceTracking(videoRef, neutralPosition)
  const { transcript, listening, supported, startListening } = useSpeechRecognition()

  const [phase, setPhase] = useState('intro')
  const [currentTrial, setCurrentTrial] = useState(1)
  const [currentLetter, setCurrentLetter] = useState('2')
  const [letterCount, setLetterCount] = useState(0)
  const [trialScores, setTrialScores] = useState([])
  const [currentScore, setCurrentScore] = useState(0)
  const [showLetter, setShowLetter] = useState(false)
  const [allTrialData, setAllTrialData] = useState([])
  const [letterSizeIndex, setLetterSizeIndex] = useState(0)
  const [awaitingClarity, setAwaitingClarity] = useState(false)
  const [micHeard, setMicHeard] = useState('')

  const lastLetter = useRef('2')
  const waitingRef = useRef(false)
  const letterShownAt = useRef(null)
  const currentScoreRef = useRef(0)
  const letterCountRef = useRef(0)
  const reactionTimesRef = useRef([])
  const letterSizeIndexRef = useRef(0)
  const letterClarityRef = useRef([])
  const pendingRecordRef = useRef(null)

  useEffect(() => { if (!athlete) navigate('/athlete') }, [])
  useEffect(() => { currentScoreRef.current = currentScore }, [currentScore])
  useEffect(() => { letterSizeIndexRef.current = letterSizeIndex }, [letterSizeIndex])

  // Letter appears on head movement — stays visible until examiner taps Next
  useEffect(() => {
    if (phase !== 'testing') return
    if (!isMoving) return
    if (waitingRef.current) return
    if (awaitingClarity) return
    if (letterCountRef.current >= LETTERS_PER_TRIAL) return

    const newLetter = getRandomLetter(lastLetter.current)
    lastLetter.current = newLetter
    setCurrentLetter(newLetter)
    setShowLetter(true)
    waitingRef.current = true
    letterShownAt.current = Date.now()
    setMicHeard('')
    pendingRecordRef.current = null

    // mic is best-effort only — never blocks progression
    try { startListening() } catch (e) { /* ignore, examiner-controlled anyway */ }

  }, [isMoving])

  // mic result shown as a hint only, does not auto-advance
  useEffect(() => {
    if (!transcript) return
    if (!waitingRef.current) return
    setMicHeard(transcript[0])
  }, [transcript])

  // Examiner taps "Handled by Examiner" — moves to clarity grading
  const handleExaminerNext = () => {
    const reactionTime = letterShownAt.current ? Date.now() - letterShownAt.current : 0
    pendingRecordRef.current = {
      letter: currentLetter,
      micHeard: micHeard || '-',
      reactionTime,
      sizeLabel: SIZE_LABELS[letterSizeIndexRef.current],
    }
    waitingRef.current = false
    setAwaitingClarity(true)
  }

  // Examiner taps a clarity grade — this is the actual scoring step
  const handleClarityTap = (option) => {
    const correct = option.grade === 0

    const record = {
      ...pendingRecordRef.current,
      clarityGrade: option.grade,
      clarityLabel: option.label,
      correct,
    }
    letterClarityRef.current = [...letterClarityRef.current, record]

    if (correct) {
      setCurrentScore((s) => { currentScoreRef.current = s + 1; return s + 1 })
      setLetterSizeIndex((p) => { const n = Math.min(p + 1, LETTER_SIZES.length - 1); letterSizeIndexRef.current = n; return n })
    } else {
      setLetterSizeIndex((p) => { const n = Math.max(p - 1, 0); letterSizeIndexRef.current = n; return n })
    }

    reactionTimesRef.current = [...reactionTimesRef.current, record.reactionTime]

    setAwaitingClarity(false)
    setShowLetter(false)
    setMicHeard('')

    const nextCount = letterCountRef.current + 1
    letterCountRef.current = nextCount
    setLetterCount(nextCount)

    if (nextCount >= LETTERS_PER_TRIAL) {
      setTimeout(() => endTrial(), 300)
    }
  }

  const endTrial = () => {
    const score = currentScoreRef.current
    const avgRT = reactionTimesRef.current.length > 0
      ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
      : 0

    const currentHeadStats = {
      avgSpeed: headStats.avgSpeed,
      peakSpeed: headStats.peakSpeed,
      swingCount: headStats.swingCount,
      speedLabel: headStats.avgSpeed < 20 ? 'Very Slow' : headStats.avgSpeed < 40 ? 'Slow' :
        headStats.avgSpeed < 80 ? 'Moderate' : headStats.avgSpeed < 120 ? 'Fast' : 'Very Fast',
    }
    resetStats()

    const grades = letterClarityRef.current.map((l) => l.clarityGrade)
    const avgGrade = grades.length > 0
      ? Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10
      : 0

    const trialData = {
      trial: currentTrial,
      score,
      avgReactionTime: avgRT,
      maxLetterSize: SIZE_LABELS[letterSizeIndexRef.current],
      avgClarityGrade: avgGrade,
      letterClarity: letterClarityRef.current,
      headMovement: currentHeadStats,
    }

    setAllTrialData((prev) => {
      const updated = [...prev, trialData]
      if (currentTrial >= TOTAL_TRIALS) {
        setTrialScores((s) => { const us = [...s, score]; setPhase('summary'); return us })
      } else {
        setTrialScores((s) => [...s, score])
        setCurrentTrial((t) => t + 1)
        currentScoreRef.current = 0
        setCurrentScore(0)
        letterCountRef.current = 0
        setLetterCount(0)
        reactionTimesRef.current = []
        letterClarityRef.current = []
        setLetterSizeIndex(0)
        letterSizeIndexRef.current = 0
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
    const status = accuracy >= 80 ? 'Good' : accuracy >= 50 ? 'Moderate' : 'Poor'

    const avgRT = allTrialData.length > 0
      ? Math.round(allTrialData.reduce((a, b) => a + b.avgReactionTime, 0) / allTrialData.length) : 0

    const overallAvgSpeed = allTrialData.length > 0
      ? Math.round(allTrialData.reduce((a, b) => a + (b.headMovement?.avgSpeed || 0), 0) / allTrialData.length) : 0
    const overallPeakSpeed = allTrialData.length > 0
      ? Math.max(...allTrialData.map((t) => t.headMovement?.peakSpeed || 0)) : 0
    const totalSwings = allTrialData.reduce((a, b) => a + (b.headMovement?.swingCount || 0), 0)

    const allLetterClarity = allTrialData.flatMap((t) => t.letterClarity || [])
    const overallAvgClarity = allLetterClarity.length > 0
      ? Math.round((allLetterClarity.reduce((a, b) => a + b.clarityGrade, 0) / allLetterClarity.length) * 10) / 10
      : 0

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
      hAvgClarityGrade: overallAvgClarity,
      hAllLetterClarity: allLetterClarity,
      hHeadMovement: {
        avgSpeed: overallAvgSpeed, peakSpeed: overallPeakSpeed, totalSwings,
        speedLabel: overallAvgSpeed < 20 ? 'Very Slow' : overallAvgSpeed < 40 ? 'Slow' :
          overallAvgSpeed < 80 ? 'Moderate' : overallAvgSpeed < 120 ? 'Fast' : 'Very Fast',
      },
    })

    navigate('/results')
  }

  const startTest = () => {
    setPhase('testing')
    setCurrentTrial(1)
    currentScoreRef.current = 0; setCurrentScore(0)
    letterCountRef.current = 0; setLetterCount(0)
    setTrialScores([]); setAllTrialData([])
    reactionTimesRef.current = []
    letterClarityRef.current = []
    setLetterSizeIndex(0); letterSizeIndexRef.current = 0
    setShowLetter(false)
    setAwaitingClarity(false)
    setMicHeard('')
    resetStats()
  }

  if (phase === 'intro') {
    return (
      <div className="page">
        <button className="btn-ghost" style={{ width: 'auto', padding: '0 0 32px 0', fontSize: 13 }} onClick={() => navigate('/calibration')}>← Back</button>
        <p className="section-title">Step 2 of 3</p>
        <h2 className="title-large">Gaze Stabilization Test</h2>
        <p className="subtitle" style={{ marginTop: 8 }}>{athlete?.name} · SVA {athlete?.sva}</p>
        <hr className="divider" />

        <div style={{ background: 'var(--gray-900)', border: '1px solid var(--gray-800)', padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--gray-400)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {`Optotypes are numbers, not letters.\nNumber stays on screen until examiner taps "Handled by Examiner".\nThen rate clarity: Clear / Mild / Moderate / Severe based on what athlete reports.\nMicrophone is optional — works in background only, never required.`}
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p className="section-title">Camera Status</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: ready ? 'var(--correct)' : 'var(--gray-700)' }} />
            <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>{ready ? 'Ready' : 'Loading...'}</span>
          </div>
        </div>

        <video ref={videoRef} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block', border: '1px solid var(--gray-800)', marginBottom: 20 }} playsInline muted />

        {!supported && <p style={{ color: 'var(--gray-600)', fontSize: 12, marginBottom: 12 }}>Mic not supported on this browser — examiner can still grade manually.</p>}

        <button className="btn-primary" onClick={startTest} disabled={!ready} style={{ opacity: !ready ? 0.4 : 1, cursor: !ready ? 'not-allowed' : 'pointer' }}>
          Start GST
        </button>
        <button className="btn-ghost" onClick={() => navigate('/')}>Cancel Test</button>
      </div>
    )
  }

  if (phase === 'trialbreak') {
    const last = allTrialData[allTrialData.length - 1]
    return (
      <div style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }}>
        <p className="section-title" style={{ marginBottom: 8 }}>Trial {currentTrial - 1} of {TOTAL_TRIALS} Complete</p>
        <p className="score-big">{trialScores[trialScores.length - 1]}<span style={{ fontSize: 32, color: 'var(--gray-700)' }}>/10</span></p>
        {last && (
          <>
            <p style={{ color: 'var(--gray-700)', fontSize: 12, marginTop: 4 }}>Avg response: {last.avgReactionTime}ms</p>
            <p style={{ color: 'var(--gray-700)', fontSize: 12 }}>Avg clarity grade: {last.avgClarityGrade} / 3</p>
            <p style={{ color: 'var(--gray-700)', fontSize: 12 }}>Head speed: {last.headMovement?.avgSpeed}°/s · {last.headMovement?.speedLabel}</p>
          </>
        )}
        <p style={{ color: 'var(--gray-700)', marginTop: 16, fontSize: 12 }}>Next trial in 3 seconds</p>
        <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      </div>
    )
  }

  if (phase === 'summary') {
    const total = trialScores.reduce((a, b) => a + b, 0)
    const max = TOTAL_TRIALS * LETTERS_PER_TRIAL
    const accuracy = Math.round((total / max) * 100)
    return (
      <div style={{ minHeight: '100vh', background: 'var(--black)', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p className="section-title">GST Complete</p>
        <p className="title-large">Trial Summary</p>
        <hr className="divider" />
        {trialScores.map((score, i) => (
          <div key={i} className="row">
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Trial {i + 1}</span>
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{score}/10 · {allTrialData[i]?.avgReactionTime}ms · clarity {allTrialData[i]?.avgClarityGrade}/3</span>
          </div>
        ))}
        <hr className="divider" />
        <div className="row"><span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Total Score</span><span style={{ fontSize: 13, color: 'var(--white)' }}>{total}/{max}</span></div>
        <div className="row"><span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Accuracy</span><span style={{ fontSize: 13, color: 'var(--white)' }}>{accuracy}%</span></div>
        <button className="btn-primary" onClick={finishTest} style={{ marginTop: 24 }}>Save and View Full Results →</button>
        <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--black)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', padding: '80px 24px',
    }}>
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <ProgressBar current={letterCount} total={LETTERS_PER_TRIAL} />

      <div style={{ position: 'absolute', top: 8, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '14px 24px 0' }}>
        <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>TRIAL {currentTrial}/{TOTAL_TRIALS}</span>
        <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>{letterCount}/{LETTERS_PER_TRIAL}</span>
        <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>{SIZE_LABELS[letterSizeIndex]}</span>
      </div>

      <div style={{ position: 'absolute', top: 44, right: 24, textAlign: 'right' }}>
        <p style={{ fontSize: 10, color: 'var(--gray-800)' }}>{headStats.currentSpeed}°/s · {headStats.speedLabel}</p>
      </div>

      {!awaitingClarity && <PendulumGuide isMovingLeft={isMovingLeft} isMovingRight={isMovingRight} isMoving={isMoving} />}

      {!awaitingClarity && showLetter && (
        <>
          <div style={{
            fontSize: LETTER_SIZES[letterSizeIndex],
            fontWeight: 200,
            color: 'var(--white)',
            lineHeight: 1,
            fontFamily: 'monospace',
            letterSpacing: '-0.05em',
            userSelect: 'none',
            minHeight: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {currentLetter}
          </div>

          {micHeard && (
            <p style={{ fontSize: 11, color: 'var(--gray-700)', marginTop: -8, marginBottom: 12 }}>
              mic heard "{micHeard}"
            </p>
          )}

          <button
            className="btn-primary"
            style={{ marginTop: 12, maxWidth: 280 }}
            onClick={handleExaminerNext}
          >
            Handled by Examiner →
          </button>
        </>
      )}

      {!showLetter && !awaitingClarity && (
        <p style={{ fontSize: 13, color: 'var(--gray-800)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 12 }}>
          Keep moving ↔
        </p>
      )}

      {awaitingClarity && (
        <>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 4 }}>
            Optotype was {currentLetter}
            {pendingRecordRef.current?.micHeard && pendingRecordRef.current.micHeard !== '-' && (
              <span style={{ color: 'var(--gray-700)' }}> · mic heard "{pendingRecordRef.current.micHeard}"</span>
            )}
          </p>
          <ClarityButtonRow onRate={handleClarityTap} />
        </>
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 24px',
        borderTop: '1px solid var(--gray-900)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: ready ? 'var(--correct)' : 'var(--wrong)' }} />
          <span style={{ fontSize: 11, color: 'var(--gray-700)' }}>{ready ? 'Ready' : 'Loading'}</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--gray-700)' }}>
          {awaitingClarity ? 'Waiting for examiner' : listening ? '🎤 Listening (optional)' : isMoving ? 'Keep moving' : '← Swing head →'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: listening ? 'var(--correct)' : 'var(--gray-800)' }} />
          <span style={{ fontSize: 11, color: 'var(--gray-700)' }}>{listening ? 'Mic on' : 'Mic off'}</span>
        </div>
      </div>
    </div>
  )
}

export default HorizontalGST