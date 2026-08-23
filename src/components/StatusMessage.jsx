
export default function StatusMessage({ type, text }) {
  if (!text) return null

  const styles = type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'

  return <p className={`rounded-lg px-3 py-2 text-sm ${styles}`}>{text}</p>
}
