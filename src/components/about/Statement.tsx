import { about } from '../../content'

// The belief in large type, the story in a narrower column beneath it.
export function Statement() {
  const { belief, story } = about.statement
  return (
    <section className="statement" aria-labelledby="statement-title">
      <div className="container">
        <h2 id="statement-title" className="statement__belief">
          {belief}
        </h2>
        <div className="statement__story">
          <p>{story}</p>
          <p className="statement__by">
            {about.name}, {about.role}
          </p>
        </div>
      </div>
    </section>
  )
}
