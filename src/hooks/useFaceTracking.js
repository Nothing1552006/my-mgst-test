import { useState, useEffect, useRef } from 'react'

export default function useFaceTracking(videoRef, neutralPosition) {

  const [isMoving, setIsMoving] = useState(false)
  const [isMovingLeft, setIsMovingLeft] = useState(false)
  const [isMovingRight, setIsMovingRight] = useState(false)
  const [isMovingUp, setIsMovingUp] = useState(false)
  const [isMovingDown, setIsMovingDown] = useState(false)
  const [faceDetected, setFaceDetected] = useState(true)
  const [movement, setMovement] = useState({ horizontal: 0, vertical: 0 })
  const [ready, setReady] = useState(false)

  const streamRef = useRef(null)
  const movingTimerRef = useRef(null)
  const lastYaw = useRef(null)
  const lastPitch = useRef(null)
  const lastTime = useRef(Date.now())

  useEffect(() => {
    startCamera()
    startGyroscope()
    return () => {
      stopCamera()
      window.removeEventListener('deviceorientation', handleOrientation, true)
      clearTimeout(movingTimerRef.current)
    }
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
      console.log('Camera not available, gyroscope only mode')
      setReady(true)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }

  const handleOrientation = (e) => {
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

      setMovement({ horizontal: yawDiff, vertical: pitchDiff })

      setIsMovingLeft(yawDiff < -2)
      setIsMovingRight(yawDiff > 2)
      setIsMovingUp(pitchDiff < -2)
      setIsMovingDown(pitchDiff > 2)

      if (yawSpeed > 15 || pitchSpeed > 15) {
        setIsMoving(true)
        clearTimeout(movingTimerRef.current)
        movingTimerRef.current = setTimeout(() => {
          setIsMoving(false)
        }, 600)
      }
    }

    lastYaw.current = currentYaw
    lastPitch.current = currentPitch
    lastTime.current = now
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

  return {
    isMoving,
    isMovingLeft,
    isMovingRight,
    isMovingUp,
    isMovingDown,
    faceDetected,
    movement,
    ready,
    headPose: { yaw: 0, pitch: 0, roll: 0 },
  }
}