import { useNavigate } from 'react-router-dom'
import useAthleteStore from '../store/useAthleteStore'

function HomePage() {
  const navigate = useNavigate()
  const sessions = useAthleteStore((s) => s.sessions)

  const getStatusTag = (status) => {
    if (status === 'Good') return 'tag tag-good'
    if (status === 'Moderate') return 'tag tag-moderate'
    if (status === 'Poor') return 'tag tag-poor'
    if (status === '-') return 'tag'
    return 'tag'
  }

  const getStatusLabel = (status) => {
    if (status === '-') return 'Pending'
    return status
  }

  return (
    <div className="page">

      <div style={{ marginBottom: 48 }}>
        <p className="section-title">Clinical Tool</p>
        <h1 className="title-large">
          Modified Gaze<br />Stabilization Test
        </h1>
        <p className="subtitle" style={{ marginTop: 12 }}>
          Face-tracking based vestibulo-ocular reflex screening for athletes.
        </p>
      </div>

      <button
        className="btn-primary"
        onClick={() => navigate('/athlete')}
      >
        Start New Test
      </button>

      <hr className="divider" />

      <div style={{ marginTop: 8 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <p className="section-title" style={{ marginBottom: 0 }}>
            Past Sessions
          </p>
          <p style={{ fontSize: 11, color: 'var(--gray-700)' }}>
            {sessions.length} record{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {sessions.length === 0 && (
          <div style={{
            border: '1px solid var(--gray-900)',
            padding: '24px 16px',
            textAlign: 'center',
          }}>
            <p style={{
              color: 'var(--gray-700)',
              fontSize: 13,
            }}>
              No sessions recorded yet.
            </p>
            <p style={{
              color: 'var(--gray-800)',
              fontSize: 12,
              marginTop: 6,
            }}>
              Start a new test to see results here.
            </p>
          </div>
        )}

        {sessions.map((s, i) => (
          <div key={i} style={{
            borderBottom: '1px solid var(--gray-900)',
            padding: '16px 0',
          }}>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 8,
            }}>
              <div>
                <p style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--white)',
                }}>
                  {s.name}
                </p>
                <p style={{
                  fontSize: 12,
                  color: 'var(--gray-600)',
                  marginTop: 3,
                }}>
                  {s.sport} · Age {s.age} · SVA {s.sva}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  fontSize: 11,
                  color: 'var(--gray-700)',
                }}>
                  {s.date}
                </p>
                <p style={{
                  fontSize: 11,
                  color: 'var(--gray-800)',
                  marginTop: 2,
                }}>
                  {s.time}
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: 8,
              marginTop: 8,
              flexWrap: 'wrap',
            }}>
              <span className={getStatusTag(s.hStatus)}>
                H — {getStatusLabel(s.hStatus)}
              </span>
              <span className={getStatusTag(s.vStatus)}>
                V — {getStatusLabel(s.vStatus)}
              </span>

              {s.hAccuracy > 0 && (
                <span className="tag">
                  H {s.hAccuracy}%
                </span>
              )}
              {s.vAccuracy > 0 && (
                <span className="tag">
                  V {s.vAccuracy}%
                </span>
              )}
            </div>

            {s.hAvgReactionTime > 0 && (
              <p style={{
                fontSize: 11,
                color: 'var(--gray-700)',
                marginTop: 8,
              }}>
                H Response: {s.hAvgReactionTime}ms
                {s.vAvgReactionTime > 0 && ` · V Response: ${s.vAvgReactionTime}ms`}
              </p>
            )}

          </div>
        ))}
      </div>

      <p style={{
        fontSize: 11,
        color: 'var(--gray-800)',
        marginTop: 48,
        textAlign: 'center',
        letterSpacing: '0.05em',
      }}>
        MGST · Clinical Research Tool
      </p>

    </div>
  )
}

export default HomePage