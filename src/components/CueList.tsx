import type { Cue } from '../types'
import { formatTime } from '../lib/time'
import './CueList.css'

interface CueListProps {
  cues: Cue[]
  onUpdate: (id: string, patch: Partial<Pick<Cue, 'name' | 'remark'>>) => void
  onDelete: (id: string) => void
  onJump: (time: number) => void
}

export function CueList({ cues, onUpdate, onDelete, onJump }: CueListProps) {
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
            Press <kbd>M</kbd> twice for a duration cue, or <kbd>B</kbd> for a flash bullet.
          </p>
        </div>
      ) : (
        <ul className="cue-rows">
          {cues.map((cue) => {
            const timeLabel =
              cue.type === 'bullet' || cue.end == null
                ? formatTime(cue.start)
                : `${formatTime(cue.start)} – ${formatTime(cue.end)}`

            return (
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
                    <span className="cue-time">{timeLabel}</span>
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
            )
          })}
        </ul>
      )}
    </aside>
  )
}
