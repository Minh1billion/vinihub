export default function Resizer({ rz, label, axis = 'x' }) {
  return (
    <div className={'resizer' + (axis === 'y' ? ' resizer-y' : '') + (rz.active ? ' active' : '')} {...rz.handle(label)}>
      <i aria-hidden="true" />
    </div>
  )
}
