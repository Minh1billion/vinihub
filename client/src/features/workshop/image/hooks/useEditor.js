import useHistory from '../../shared/hooks/useHistory.js'
import { initialEdit } from '../utils/edit.js'

export default function useEditor() {
  const { present, ...rest } = useHistory({ storeKey: 'editor.history', initial: initialEdit })
  return { edit: present, ...rest }
}
