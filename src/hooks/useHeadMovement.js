import { useState, useEffect, useRef } from 'react'

export default function useHeadMovement() {

  const [yaw, setYaw] = useState(0)
  const [pitch, setPitch] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [speedLevel, setSpeedLevel] = useState(1)
  const [isMoving, setIsMoving] = useState(false)
  const [permitted, setPermitted] = useState(false)
  const [sensorWorking, setSensorWorking] = useState(false)

  const lastYaw = useRef(null)
  const lastPitch = useRef(null)
  const lastTime = useRef(Date.now())
  const movingTimer = useRef(null)
  const readingCount = useRef(0)

  const getSpeedLevel = (spd) => {
    if (spd >= 160) return 5
    if (spd >= 140) return 4
    if (spd >= 120) return 3
    if (spd >= 100) return 2
    return 1
  }

  const startListening = () => {
    const handleOrientation = (e) => {

      readingCount.current += 1

      if (readingCount.current > 2) {
        setSensorWorking(true)
      }

      const currentYaw = e.alpha ?? 0
      const currentPitch = e.beta ?? 0
      const now = Date.now()

      if (lastYaw.current === null) {
        lastYaw.current = currentYaw
        lastPitch.current = currentPitch
        lastTime.current = now
        return
      }

      const dt = (now - lastTime.current) / 1000

      if (dt > 0 && dt < 0.5) {
        let yawDiff = currentYaw - lastYaw.current
        if (yawDiff > 180) yawDiff -= 360
        if (yawDiff < -180) yawDiff += 360

        const pitchDiff = currentPitch - lastPitch.current
        const yawSpeed = Math.abs(yawDiff / dt)
        const pitchSpeed = Math.abs(pitchDiff / dt)
        const totalSpeed = Math.max(yawSpeed, pitchSpeed)

        setYaw(Math.round(currentYaw))
        setPitch(Math.round(currentPitch))
        setSpeed(Math.round(totalSpeed))
        setSpeedLevel(getSpeedLevel(totalSpeed))

        if (totalSpeed > 15) {
          setIsMoving(true)
          clearTimeout(movingTimer.current)
          movingTimer.current = setTimeout(() => {
            setIsMoving(false)
          }, 600)
        }
      }

      lastYaw.current = currentYaw
      lastPitch.current = currentPitch
      lastTime.current = now
    }

    window.addEventListener('deviceorientation', handleOrientation, true)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
      clearTimeout(movingTimer.current)
    }
  }

  const requestPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const result = await DeviceOrientationEvent.requestPermission()
        if (result === 'granted') {
          setPermitted(true)
          startListening()
        }
      } catch (e) {
        console.error('Permission error', e)
      }
    } else {
      setPermitted(true)
      startListening()
    }
  }

  useEffect(() => {
    requestPermission()
  }, [])

  return {
    yaw,
    pitch,
    speed,
    speedLevel,
    isMoving,
    permitted,
    sensorWorking,
    requestPermission,
  }
}