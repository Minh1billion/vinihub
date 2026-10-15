import { useCallback, useReducer } from 'react'
import { initialEdit } from '../utils/edit.js'

const LIMIT = 100
const WINDOW = 700

const blank = () => ({ past: [], present: initialEdit, future: [], key: null, at: 0 })

function reducer(state, action) {
  switch (action.type) {
    case 'commit': {
      const present = typeof action.change === 'function' ? action.change(state.present) : { ...state.present, ...action.change }
      if (present === state.present) return state
      const merge = action.key && action.key === state.key && action.at - state.at < WINDOW
      return {
        past: merge ? state.past : [...state.past, state.present].slice(-LIMIT),
        present,
        future: [],
        key: action.key || null,
        at: action.at,
      }
    }
    case 'undo':
      if (!state.past.length) return state
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
        key: null,
        at: 0,
      }
    case 'redo':
      if (!state.future.length) return state
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
        key: null,
        at: 0,
      }
    case 'clear':
      return { ...blank(), present: action.next || initialEdit }
    default:
      return state
  }
}

export default function useEditor() {
  const [state, dispatch] = useReducer(reducer, undefined, blank)
  const commit = useCallback((change, key) => dispatch({ type: 'commit', change, key, at: Date.now() }), [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])
  const clear = useCallback((next) => dispatch({ type: 'clear', next }), [])
  return { edit: state.present, commit, undo, redo, clear, canUndo: state.past.length > 0, canRedo: state.future.length > 0 }
}
