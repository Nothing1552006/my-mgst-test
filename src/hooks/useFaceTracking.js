import { useState, useEffect, useRef, useCallback } from 'react'

export default function useFaceTracking(videoRef, neutralPosition) {

  const [isMoving, setIsMoving] = useState(false)
  const [isMovingLeft, setIsMovingLeft] = useState(false)
  const [isMovingRight, setIsMovingRight] = useState(false)
  const [isMovingUp, setIsMovingUp] = useState(false)
  const [isMovingDown, setIsMovingDown] = useState(false)
  const [faceDetected, setFaceDetected] = useState(true)
  const [movement, setMovement] = useState({ horizontal: 0, vertical: 0 })
  const [ready, setReady] = useState(false)
  const [headStats, setHeadStats] = useState({
    currentSpeed: 0,
    avgSpeed: 0,
    peakSpeed: 0,
    swingCount: 0,
    speedLabel: 'Still',
  })

  const streamRef = useRef(null)
  const movingTimerRef = useRef(null)
  const lastYaw = useRef(null)
  const lastPitch = useRef(null)
  const lastTime = useRef(Date.now())
  const speedHistoryRef = useRef([])
  const peakSpeedRef = useRef(0)
  const swingCountRef = useRef(0)
  const wasMovingRef = useRef(false)

  const getSpeedLabel = (speed) => {
    if (speed < 20) return 'Still'
    if (speed < 40) return 'Slow'
    if (speed < 80) return 'Moderate'
    if (speed < 120) return 'Fast'
    return 'Very Fast'
  }

  const handleOrientation = useCallback((e) => {
    const currentYaw = e.alpha ?? 0
    const currentPitch = e.beta ?? 0
    const now = Date.now()
    const dt = (now - lastTime.current) / 1000

    if (lastYaw.current !== null && dt > 0 && dt < 0.3) {
      let yawDiff = currentYaw - lastYaw.current
      if (yawDiff > 180) yawDiff -= 360
      if (yawDiff < -180) yawDiff += 360

      const pitchDiff = currentPitch - lastPitch.current
      const yawSpeed = Math.abs(yawDiff / dt)
      const pitchSpeed = Math.abs(pitchDiff / dt)
      const totalSpeed = Math.max(yawSpeed, pitchSpeed)

      setMovement({ horizontal: yawDiff, vertical: pitchDiff })
      setIsMovingLeft(yawDiff < -2)
      setIsMovingRight(yawDiff > 2)
      setIsMovingUp(pitchDiff < -2)
      setIsMovingDown(pitchDiff > 2)

      if (totalSpeed > 15) {
        if (!wasMovingRef.current) {
          swingCountRef.current += 1
          wasMovingRef.current = true
        }

        speedHistoryRef.current.push(totalSpeed)

        if (totalSpeed > peakSpeedRef.current) {
          peakSpeedRef.current = totalSpeed
        }

        const avg = speedHistoryRef.current.length > 0
          ? Math.round(
              speedHistoryRef.current.reduce((a, b) => a + b, 0) /
              speedHistoryRef.current.length
            )
          : 0

        setHeadStats({
          currentSpeed: Math.round(totalSpeed),
          avgSpeed: avg,
          peakSpeed: Math.round(peakSpeedRef.current),
          swingCount: swingCountRef.current,
          speedLabel: getSpeedLabel(totalSpeed),
        })

        setIsMoving(true)
        clearTimeout(movingTimerRef.current)
        movingTimerRef.current = setTimeout(() => {
          setIsMoving(false)
          wasMovingRef.current = false
        }, 600)

      } else {
        wasMovingRef.current = false
      }
    }

    lastYaw.current = currentYaw
    lastPitch.current = currentPitch
    lastTime.current = now
  }, [])

  const startCamera = async () => {
    try {
      if (!videoRef?.current) return
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play()
        setReady(true)
      }
    } catch (e) {
      console.log('Camera not available — gyroscope only mode')
      setReady(true)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }

  const startGyroscope = () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      DeviceOrientationEvent.requestPermission()
        .then((result) => {
          if (result === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true)
          }
        })
        .catch(console.error)
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true)
    }
  }

  const resetStats = () => {
    speedHistoryRef.current = []
    peakSpeedRef.current = 0
    swingCountRef.current = 0
    wasMovingRef.current = false
    setHeadStats({
      currentSpeed: 0,
      avgSpeed: 0,
      peakSpeed: 0,
      swingCount: 0,
      speedLabel: 'Still',
    })
  }

  useEffect(() => {
    startCamera()
    startGyroscope()
    return () => {
      stopCamera()
      window.removeEventListener('deviceorientation', handleOrientation, true)
      clearTimeout(movingTimerRef.current)
    }
  }, [])

  return {
    isMoving,
    isMovingLeft,
    isMovingRight,
    isMovingUp,
    isMovingDown,
    faceDetected,
    movement,
    ready,
    headStats,
    resetStats,
    headPose: { yaw: 0, pitch: 0, roll: 0 },
  }
}