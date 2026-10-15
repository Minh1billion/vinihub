import { useRef } from 'react'

export default function AddImage({ onFile, children }) {
  const ref = useRef(null)
  return (
    <>
      {children(() => ref.current.click())}
      <input ref={ref} type="file" accept="image/*" hidden
        onChange={(e) => { const file = e.target.files[0]; e.target.value = ''; if (file) onFile(file) }} />
    </>
  )
}
