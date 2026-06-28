import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAthleteStore from '../store/useAthleteStore'

function CalibrationPage() {
  const navigate = useNavigate()
  const athlete = useAthleteStore((s) => s.athlete)

  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [calibrated, setCalibrated] = useState(false)
  const [countdown, setCountdown] = useState(null)

  useEffect(() => {
    if (!athlete) {
      navigate('/athlete')
      return
    }
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      setCameraError(false)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          setCameraReady(true)
        }
      }
    } catch (e) {
      console.error('Camera error:', e)
      setCameraError(true)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }

  const startCalibration = () => {
    setCountdown(3)
    let count = 3
    const timer = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count === 0) {
        clearInterval(timer)
        setCountdown(null)
        setCalibrated(true)
      }
    }, 1000)
  }

  const handleProceed = () => {
    stopCamera()
    navigate('/horizontal', {
      state: { neutralPosition: { yaw: 0, pitch: 0, roll: 0 } }
    })
  }

  const handleSkip = () => {
    stopCamera()
    navigate('/horizontal', {
      state: { neutralPosition: { yaw: 0, pitch: 0, roll: 0 } }
    })
  }

  return (
    <div className="page">

      <button
        className="btn-ghost"
        style={{ width: 'auto', padding: '0 0 32px 0', fontSize: 13 }}
        onClick={() => navigate('/athlete')}
      >
        ← Back
      </button>

      <p className="section-title">Step 1 of 3</p>
      <h2 className="title-large">Calibration</h2>
      <p className="subtitle" style={{ marginTop: 8 }}>
        {athlete?.name} · Set neutral head position
      </p>

      <hr className="divider" />

      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4/3',
        background: 'var(--gray-900)',
        border: '1px solid var(--gray-800)',
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: cameraReady ? 'block' : 'none',
          }}
          playsInline
          muted
        />

        {!cameraReady && !cameraError && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <p style={{ color: 'var(--gray-600)', fontSize: 13 }}>
              Starting camera...
            </p>
          </div>
        )}

        {cameraError && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 20,
          }}>
            <p style={{ color: 'var(--wrong)', fontSize: 13, textAlign: 'center' }}>
              Camera permission denied
            </p>
            <p style={{ color: 'var(--gray-600)', fontSize: 11, textAlign: 'center', lineHeight: 1.6 }}>
              Tap the lock icon in address bar → Camera → Allow → refresh
            </p>
            <button
              className="btn-secondary"
              onClick={startCamera}
              style={{ marginTop: 0, fontSize: 13 }}
            >
              Try Again
            </button>
          </div>
        )}

        {countdown !== null && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
          }}>
            <p style={{
              fontSize: 96,
              fontWeight: 200,
              color: 'var(--white)',
              lineHeight: 1,
            }}>
              {countdown}
            </p>
          </div>
        )}

        {calibrated && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
          }}>
            <p style={{
              fontSize: 16,
              fontWeight: 400,
              color: 'var(--white)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Calibrated ✓
            </p>
          </div>
        )}

        {cameraReady && (
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 10px',
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--correct)',
            }} />
            <p style={{ fontSize: 11, color: 'var(--white)' }}>
              Camera on
            </p>
          </div>
        )}
      </div>

      <div style={{
        border: '1px solid var(--gray-800)',
        padding: '16px',
        marginBottom: 20,
      }}>
        <p style={{
          fontSize: 12,
          color: 'var(--gray-500)',
          lineHeight: 1.8,
          whiteSpace: 'pre-line',
        }}>
          {`01 — Place phone on stand facing athlete\n02 — Athlete looks straight at camera\n03 — Head in neutral upright position\n04 — Press Calibrate and hold still for 3 seconds`}
        </p>
      </div>

      {!calibrated ? (
        <button
          className="btn-primary"
          onClick={startCalibration}
          disabled={countdown !== null}
          style={{
            opacity: countdown !== null ? 0.4 : 1,
            cursor: countdown !== null ? 'not-allowed' : 'pointer',
          }}
        >
          {countdown !== null
            ? `Hold still — ${countdown}`
            : 'Calibrate Neutral Position'}
        </button>
      ) : (
        <button className="btn-primary" onClick={handleProceed}>
          Start Horizontal GST →
        </button>
      )}

      <button
        className="btn-secondary"
        onClick={handleSkip}
        style={{ marginTop: 12 }}
      >
        Skip Calibration
      </button>

      <button className="btn-ghost" onClick={() => navigate('/')}>
        Cancel Test
      </button>

    </div>
  )
}

export default CalibrationPage