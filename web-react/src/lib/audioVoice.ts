export function playVoice(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.pitch = 1.35
    utterance.rate = 0.92
    utterance.volume = 0.8
    window.speechSynthesis.speak(utterance)
  } catch (_) {}
}
