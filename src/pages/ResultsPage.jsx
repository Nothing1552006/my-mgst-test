import { useNavigate } from 'react-router-dom'
import useAthleteStore from '../store/useAthleteStore'
import { exportCSV, exportPDF } from '../utils/exportHelpers'

function ResultsPage() {
  const navigate = useNavigate()
  const sessions = useAthleteStore((s) => s.sessions)
  const latest = sessions[0]

  const getTag = (status) => {
    if (status === 'Good') return 'tag tag-good'
    if (status === 'Moderate') return 'tag tag-moderate'
    if (status === 'Poor') return 'tag tag-poor'
    return 'tag'
  }

  const getRTInterpretation = (ms) => {
    if (!ms || ms === 0) return null
    if (ms < 800) return { label: 'Excellent', color: 'var(--correct)' }
    if (ms <= 1500) return { label: 'Normal', color: 'var(--gray-400)' }
    return { label: 'Slow', color: 'var(--wrong)' }
  }

  const getInterpretation = (hStatus, vStatus, hRT, vRT) => {
    if (hStatus === 'Good' && vStatus === 'Good') {
      return 'Athlete demonstrates good gaze stabilization in both horizontal and vertical planes. Vestibulo-ocular reflex is functioning within normal range. Suitable for full sports participation.'
    }
    if (hStatus === 'Poor' || vStatus === 'Poor') {
      return 'Athlete shows poor gaze stabilization in one or both planes. Further clinical assessment is strongly recommended before returning to sports. Consider vestibular rehabilitation.'
    }
    if (hStatus === 'Moderate' || vStatus === 'Moderate') {
      return 'Athlete shows moderate gaze stabilization. Monitor performance and retest after 2-4 weeks of vestibular training. Cleared for light training with caution.'
    }
    return 'Complete both horizontal and vertical tests for full interpretation.'
  }

  if (!latest) {
    return (
      <div className="page">
        <p style={{ color: 'var(--gray-600)', fontSize: 14 }}>
          No results found.
        </p>
        <button className="btn-primary" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    )
  }

  const hRT = getRTInterpretation(latest.hAvgReactionTime)
  const vRT = getRTInterpretation(latest.vAvgReactionTime)

  return (
    <div className="page">

      <button
        className="btn-ghost"
        style={{ width: 'auto', padding: '0 0 32px 0', fontSize: 13 }}
        onClick={() => navigate('/')}
      >
        ← Home
      </button>

      <p className="section-title">Test Complete</p>
      <h2 className="title-large">Results</h2>
      <p className="subtitle" style={{ marginTop: 6 }}>
        {latest.name} · {latest.sport}
      </p>
      <p style={{
        fontSize: 11,
        color: 'var(--gray-700)',
        marginTop: 4,
        letterSpacing: '0.04em',
      }}>
        {latest.date} · {latest.time}
      </p>

      <hr className="divider" />

      <div style={{ marginBottom: 24 }}>
        <p className="section-title">Athlete Info</p>
        {[
          { label: 'Age', value: latest.age },
          { label: 'Sport', value: latest.sport },
          { label: 'Dominant Eye', value: latest.dominantEye || '-' },
          { label: 'Baseline SVA', value: latest.sva },
          { label: 'Notes', value: latest.notes || '-' },
        ].map((item, i) => (
          <div key={i} className="row">
            <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
              {item.label}
            </span>
            <span style={{ fontSize: 13, color: 'var(--white)' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <hr className="divider" />

      <div style={{ marginBottom: 24 }}>
        <p className="section-title">Horizontal GST</p>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 16,
        }}>
          <div>
            <p className="score-big">{latest.hScore}</p>
            <p style={{
              fontSize: 12,
              color: 'var(--gray-600)',
              marginTop: 4,
            }}>
              Accuracy {latest.hAccuracy}%
            </p>
          </div>
          <span className={getTag(latest.hStatus)}>
            {latest.hStatus}
          </span>
        </div>

        {latest.hAvgReactionTime > 0 && (
          <div className="row">
            <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
              Avg Response Time
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--white)' }}>
                {latest.hAvgReactionTime}ms
              </span>
              {hRT && (
                <span style={{
                  fontSize: 11,
                  color: hRT.color,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  {hRT.label}
                </span>
              )}
            </div>
          </div>
        )}

        {latest.hTrialScores && latest.hTrialScores.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p className="section-title" style={{ marginBottom: 8 }}>
              Trial breakdown
            </p>
            {latest.hTrialScores.map((score, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
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
                    {latest.hTrialData?.[i] && (
                      <span style={{ fontSize: 11, color: 'var(--gray-700)' }}>
                        {latest.hTrialData[i].avgReactionTime}ms
                      </span>
                    )}
                    <span className={getTag(
                      score >= 8 ? 'Good' :
                      score >= 5 ? 'Moderate' : 'Poor'
                    )}>
                      {score >= 8 ? 'Good' : score >= 5 ? 'Moderate' : 'Poor'}
                    </span>
                  </div>
                </div>
                <div style={{
                  height: 3,
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
                      ? 'var(--gray-600)'
                      : 'var(--wrong)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="divider" />

      <div style={{ marginBottom: 24 }}>
        <p className="section-title">Vertical GST</p>

        {latest.vScore === '-' ? (
          <div>
            <p style={{
              fontSize: 13,
              color: 'var(--gray-600)',
              marginBottom: 12,
            }}>
              Vertical test not completed yet.
            </p>
            <button
  className="btn-secondary"
  onClick={() => navigate('/vertical', {
    state: {
      neutralPosition: { yaw: 0, pitch: 0, roll: 0 },
      fromResults: true,
    }
  })}
>
  Start Vertical GST →
</button>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: 16,
            }}>
              <div>
                <p className="score-big">{latest.vScore}</p>
                <p style={{
                  fontSize: 12,
                  color: 'var(--gray-600)',
                  marginTop: 4,
                }}>
                  Accuracy {latest.vAccuracy}%
                </p>
              </div>
              <span className={getTag(latest.vStatus)}>
                {latest.vStatus}
              </span>
            </div>

            {latest.vAvgReactionTime > 0 && (
              <div className="row">
                <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                  Avg Response Time
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--white)' }}>
                    {latest.vAvgReactionTime}ms
                  </span>
                  {vRT && (
                    <span style={{
                      fontSize: 11,
                      color: vRT.color,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>
                      {vRT.label}
                    </span>
                  )}
                </div>
              </div>
            )}

            {latest.vTrialScores && latest.vTrialScores.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p className="section-title" style={{ marginBottom: 8 }}>
                  Trial breakdown
                </p>
                {latest.vTrialScores.map((score, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
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
                        {latest.vTrialData?.[i] && (
                          <span style={{ fontSize: 11, color: 'var(--gray-700)' }}>
                            {latest.vTrialData[i].avgReactionTime}ms
                          </span>
                        )}
                        <span className={getTag(
                          score >= 8 ? 'Good' :
                          score >= 5 ? 'Moderate' : 'Poor'
                        )}>
                          {score >= 8 ? 'Good' : score >= 5 ? 'Moderate' : 'Poor'}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      height: 3,
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
                          ? 'var(--gray-600)'
                          : 'var(--wrong)',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <hr className="divider" />

      {latest.vScore !== '-' && (
        <div style={{ marginBottom: 24 }}>
          <p className="section-title">Overall Assessment</p>
          <div style={{
            border: '1px solid var(--gray-800)',
            padding: 20,
            marginBottom: 16,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                H-GST
              </span>
              <span className={getTag(latest.hStatus)}>
                {latest.hStatus}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                V-GST
              </span>
              <span className={getTag(latest.vStatus)}>
                {latest.vStatus}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                H Response
              </span>
              <span style={{
                fontSize: 13,
                color: hRT?.color || 'var(--gray-400)',
              }}>
                {latest.hAvgReactionTime}ms — {hRT?.label || '-'}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                V Response
              </span>
              <span style={{
                fontSize: 13,
                color: vRT?.color || 'var(--gray-400)',
              }}>
                {latest.vAvgReactionTime}ms — {vRT?.label || '-'}
              </span>
            </div>
            <div style={{
              borderTop: '1px solid var(--gray-800)',
              paddingTop: 14,
            }}>
              <p style={{
                fontSize: 12,
                color: 'var(--gray-500)',
                lineHeight: 1.8,
              }}>
                {getInterpretation(
                  latest.hStatus,
                  latest.vStatus,
                  latest.hAvgReactionTime,
                  latest.vAvgReactionTime,
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <hr className="divider" />

      <div style={{ marginBottom: 16 }}>
        <p className="section-title">Export</p>
        <button
          className="btn-primary"
          onClick={() => exportPDF(sessions)}
        >
          Download PDF Report
        </button>
        <button
          className="btn-secondary"
          onClick={() => exportCSV(sessions)}
        >
          Download Excel
        </button>
      </div>

      <hr className="divider" />

      <button
        className="btn-primary"
        onClick={() => navigate('/athlete')}
      >
        Test New Athlete
      </button>

      <button
        className="btn-ghost"
        onClick={() => navigate('/')}
      >
        Back to Home
      </button>

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

export default ResultsPage