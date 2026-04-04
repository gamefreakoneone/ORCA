import { LogEntry } from "../simulation/worldModel";

interface CommandLogProps {
  log: LogEntry[];
}

export default function CommandLog({ log }: CommandLogProps) {
  return (
    <section className="panel-section command-log-section">
      <div className="section-header">
        <span>Claude Command Log</span>
        <span className="section-pill">Visible</span>
      </div>
      <div className="command-log">
        {log.length === 0 ? (
          <p className="muted-copy">No commands yet.</p>
        ) : (
          log
            .slice()
            .reverse()
            .map((entry, index) => (
              <article className={`log-entry ${entry.source}`} key={`${entry.tick}-${index}`}>
                <div className="log-meta">
                  <span>{entry.source}</span>
                  <span>t{entry.tick}</span>
                </div>
                <p>{entry.message}</p>
              </article>
            ))
        )}
      </div>
    </section>
  );
}
