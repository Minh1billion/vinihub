import { useTranslation } from 'react-i18next'
import Button from '../../../components/Button.jsx'
import AddImage from '../AddImage.jsx'
import ImageProps from './ImageProps.jsx'
import TextProps from './TextProps.jsx'

const PROPS = { text: TextProps, image: ImageProps }

export default function InsertPanel({ edit, actions, selected, canvas }) {
  const { t } = useTranslation()
  const layer = edit.layers.find((x) => x.id === selected)
  const Props = layer && PROPS[layer.type]

  return (
    <>
      <div className="ed-btnrow">
        <Button variant="soft" size="sm" block icon="type" onClick={actions.addText}>{t('editor.text.add')}</Button>
        <AddImage onFile={actions.addImage}>
          {(open) => <Button variant="soft" size="sm" block icon="image" onClick={open}>{t('editor.image.add')}</Button>}
        </AddImage>
      </div>
      {!layer && <small>{t('editor.insert.hint')}</small>}
      {layer && (
        <fieldset className="ed-lock" disabled={layer.locked}>
          <Props layer={layer} patch={actions.patch} canvas={canvas} />
          <Button variant="danger" size="sm" block icon="trash" onClick={() => actions.remove(layer.id)}>{t('editor.layers.remove')}</Button>
        </fieldset>
      )}
      {layer?.locked && <small>{t('editor.layers.lockedHint')}</small>}
    </>
  )
}
