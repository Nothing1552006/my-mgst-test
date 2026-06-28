import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAthleteStore from '../store/useAthleteStore'

function AthleteForm() {
  const navigate = useNavigate()
  const setAthlete = useAthleteStore((s) => s.setAthlete)

  const [form, setForm] = useState({
    name: '',
    age: '',
    sport: '',
    sva: '',
    dominantEye: 'Right',
    notes: '',
  })

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  const validate = () => {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.age) newErrors.age = 'Age is required'
    if (!form.sport.trim()) newErrors.sport = 'Sport is required'
    if (!form.sva.trim()) newErrors.sva = 'SVA is required'
    return newErrors
  }

  const handleStart = () => {
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setAthlete({
      ...form,
      date: new Date().toLocaleDateString('en-IN'),
      time: new Date().toLocaleTimeString('en-IN'),
    })
    navigate('/calibration')
  }

  return (
    <div className="page">

      <button
        className="btn-ghost"
        style={{ width: 'auto', padding: '0 0 32px 0', fontSize: 13 }}
        onClick={() => navigate('/')}
      >
        ← Back
      </button>

      <p className="section-title">New Test</p>
      <h2 className="title-large">Athlete Details</h2>
      <p className="subtitle">
        Enter athlete information before starting the MGST.
      </p>

      <hr className="divider" />

      <span className="label">Full Name</span>
      <input
        name="name"
        placeholder="e.g. Arjun Kumar"
        value={form.name}
        onChange={handleChange}
        autoComplete="off"
      />
      {errors.name && (
        <p style={{ color: 'var(--wrong)', fontSize: 12, marginTop: 4 }}>
          {errors.name}
        </p>
      )}

      <span className="label">Age</span>
      <input
        name="age"
        type="number"
        placeholder="e.g. 22"
        value={form.age}
        onChange={handleChange}
      />
      {errors.age && (
        <p style={{ color: 'var(--wrong)', fontSize: 12, marginTop: 4 }}>
          {errors.age}
        </p>
      )}

      <span className="label">Sport</span>
      <input
        name="sport"
        placeholder="e.g. Cricket, Football, Swimming"
        value={form.sport}
        onChange={handleChange}
        autoComplete="off"
      />
      {errors.sport && (
        <p style={{ color: 'var(--wrong)', fontSize: 12, marginTop: 4 }}>
          {errors.sport}
        </p>
      )}

      <span className="label">Baseline SVA</span>
      <input
        name="sva"
        placeholder="e.g. 6/6, 6/9, 6/12"
        value={form.sva}
        onChange={handleChange}
        autoComplete="off"
      />
      {errors.sva && (
        <p style={{ color: 'var(--wrong)', fontSize: 12, marginTop: 4 }}>
          {errors.sva}
        </p>
      )}

      <span className="label">Dominant Eye</span>
      <select
        name="dominantEye"
        value={form.dominantEye}
        onChange={handleChange}
        style={{
          width: '100%',
          padding: '14px',
          border: 'none',
          borderBottom: '1px solid var(--gray-700)',
          background: 'transparent',
          color: 'var(--white)',
          fontSize: '15px',
          marginTop: '8px',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      >
        <option value="Right" style={{ background: '#000' }}>Right</option>
        <option value="Left" style={{ background: '#000' }}>Left</option>
        <option value="Unknown" style={{ background: '#000' }}>Unknown</option>
      </select>

      <span className="label">Clinical Notes (optional)</span>
      <input
        name="notes"
        placeholder="e.g. Post-concussion, previous injury"
        value={form.notes}
        onChange={handleChange}
        autoComplete="off"
      />

      <hr className="divider" />

      <div style={{
        background: 'var(--gray-900)',
        border: '1px solid var(--gray-800)',
        padding: '16px',
        marginBottom: '8px',
      }}>
        <p style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.7 }}>
          Before starting — place phone on a stand at eye level, 
          facing the athlete at 2–3 metres distance. 
          The front camera will track head movement automatically.
        </p>
      </div>

      <button className="btn-primary" onClick={handleStart}>
        Continue to Calibration →
      </button>

      <button className="btn-ghost" onClick={() => navigate('/')}>
        Cancel
      </button>

    </div>
  )
}

export default AthleteForm