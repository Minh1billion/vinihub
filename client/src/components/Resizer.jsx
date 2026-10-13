export default function Resizer({ rz, label }) {
  return (
    <div className={'resizer' + (rz.active ? ' active' : '')} {...rz.handle(label)}>
      <i aria-hidden="true" />
    </div>
  )
}
