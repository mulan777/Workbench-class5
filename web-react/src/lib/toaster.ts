import { toast as sonnerToast } from 'sonner'

const toast = (msg: string) => sonnerToast.success(msg)
toast.success = (msg: string) => sonnerToast.success(msg)
toast.error = (msg: string) => sonnerToast.error(msg)
export default toast
export function ToasterHost() { return null }
