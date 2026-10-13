import { about } from '../../content'
import { Monogram } from './Monogram'

// Aamir's letter in one reading column: body paragraphs, the punchlines set large, then his signature.
export function Letter() {
  return (
    <section className="letter" aria-labelledby="letter-title">
      <div className="container">
        <div className="letter__inner">
          <h2 id="letter-title" className="sr-only">
            A note from {about.name}
          </h2>
          {about.letter.map(({ text, pull }) => (
            <p key={text} className={pull ? 'letter__pull' : 'letter__text'}>
              {text}
            </p>
          ))}
          <div className="letter__by">
            <Monogram initials={about.initials} size={48} />
            <p>
              <strong>— {about.name}</strong>
              <span>{about.role}, MRKTKings</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
