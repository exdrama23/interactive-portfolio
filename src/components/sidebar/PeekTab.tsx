interface PeekTabProps {
  visible: boolean
  onClick: () => void
}

export function PeekTab({ visible, onClick }: PeekTabProps) {
  return (
    <button
      type="button"
      aria-label="Abrir menu"
      tabIndex={visible ? 0 : -1}
      onClick={onClick}
      className={`sidebar-peek absolute top-1/2 right-0 -translate-y-1/2 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <span aria-hidden="true" className="sidebar-peek-dot" />
    </button>
  )
}

export default PeekTab
