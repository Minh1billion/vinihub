function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.length > 4 && part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  )
}

function parse(text) {
  const blocks = []
  let list = null
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*]\s+(.*)/)
    const number = line.match(/^\s*\d+[.)]\s+(.*)/)
    if (bullet || number) {
      const type = bullet ? 'ul' : 'ol'
      if (!list || list.type !== type) { list = { type, items: [] }; blocks.push(list) }
      list.items.push((bullet || number)[1])
      continue
    }
    list = null
    if (!line.trim()) continue
    const heading = line.match(/^#{1,4}\s+(.*)/)
    blocks.push(heading ? { type: 'h', text: heading[1] } : { type: 'p', text: line })
  }
  return blocks
}

export default function RichText({ text }) {
  return (
    <div className="rich">
      {parse(text).map((b, i) => {
        if (b.type === 'ul') return <ul key={i}>{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>
        if (b.type === 'ol') return <ol key={i}>{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>
        if (b.type === 'h') return <h3 key={i}>{inline(b.text)}</h3>
        return <p key={i}>{inline(b.text)}</p>
      })}
    </div>
  )
}
