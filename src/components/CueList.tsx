import { useEffect, useState } from 'react'
import type { Cue } from '../types'
import { formatTime, parseTime } from '../lib/time'
import './CueList.css'

interface CueListProps {
  cues: Cue[]
  mediaDuration: number
  onUpdate: (id: string, patch: Partial<Pick<Cue, 'name' | 'remark' | 'start' | 'end'>>) => void
  onDelete: (id: string) => void
  onJump: (time: number) => void
}

function TimeField({
  valueSec,
  withHours,
  ariaLabel,
  onCommit,
}: {
  valueSec: number
  withHours: boolean
  ariaLabel: string
  onCommit: (sec: number) => void
}) {
  const [text, setText] = useState(formatTime(valueSec, withHours))

  useEffect(() => {
    setText(formatTime(valueSec, withHours))
  }, [valueSec, withHours])

  return (
    <input
      className="cue-time-input"
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const parsed = parseTime(text)
        if (parsed == null) {
          setText(formatTime(valueSec, withHours))
          return
        }
        onCommit(parsed)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          ;(e.target as HTMLInputElement).blur()
        }
      }}
    />
  )
}

export function CueList({ cues, mediaDuration, onUpdate, onDelete, onJump }: CueListProps) {
  const withHours = mediaDuration >= 3600

  return (
    <aside className="cue-list">
      <div className="cue-list-header">
        <h2>Cue List</h2>
        <span className="cue-count">{cues.length}</span>
      </div>

      {cues.length === 0 ? (
        <div className="cue-empty">
          <p>No cues yet</p>
          <p className="cue-empty-hint">
            Press <kbd>M</kbd> to start a cue, <kbd>N</kbd> to stop it, or <kbd>B</kbd> for a flash bullet.
          </p>
        </div>
      ) : (
        <ul className="cue-rows">
          {cues.map((cue) => (
            <li key={cue.id} className={`cue-row cue-${cue.type}`}>
              <div className="cue-thumb">
                {cue.thumbnail ? (
                  <img src={cue.thumbnail} alt="" />
                ) : (
                  <div className="cue-thumb-ph" aria-hidden>
                    {cue.type === 'bullet' ? '•' : '◇'}
                  </div>
                )}
              </div>

              <div className="cue-body">
                <div className="cue-top">
                  <span className="cue-num">#{cue.number}</span>
                  <span className={`cue-type-tag ${cue.type}`}>{cue.type}</span>
                </div>

                <div className="cue-times">
                  <TimeField
                    valueSec={cue.start}
                    withHours={withHours}
                    ariaLabel={`Cue ${cue.number} start`}
                    onCommit={(sec) => onUpdate(cue.id, { start: sec })}
                  />
                  {cue.type === 'cue' && (
                    <>
                      <span className="cue-time-sep">–</span>
                      <TimeField
                        valueSec={cue.end ?? cue.start}
                        withHours={withHours}
                        ariaLabel={`Cue ${cue.number} end`}
                        onCommit={(sec) => onUpdate(cue.id, { end: sec })}
                      />
                    </>
                  )}
                </div>

                <label className="cue-field">
                  <span className="sr-only">Name</span>
                  <input
                    type="text"
                    placeholder="Cue name"
                    value={cue.name}
                    onChange={(e) => onUpdate(cue.id, { name: e.target.value })}
                  />
                </label>

                <label className="cue-field">
                  <span className="sr-only">Remark</span>
                  <textarea
                    placeholder="Remark"
                    rows={2}
                    value={cue.remark}
                    onChange={(e) => onUpdate(cue.id, { remark: e.target.value })}
                  />
                </label>

                <div className="cue-actions">
                  <button type="button" className="cue-jump" onClick={() => onJump(cue.start)}>
                    Jump
                  </button>
                  <button
                    type="button"
                    className="cue-delete"
                    onClick={() => onDelete(cue.id)}
                    aria-label={`Delete cue ${cue.number}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
