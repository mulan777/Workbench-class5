import { api as rawApi } from './api'
import { createRoot } from 'react-dom/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export async function api(path: string, opts: RequestInit = {}) {
  return rawApi(path, opts)
}
export { upload, todayStr, weekOf, fmtDate } from './api'
export { default as toast, ToasterHost } from './toaster'
export type ConfirmOptions = { title?: string; description?: string; danger?: boolean }

let confirmResolver: ((v: boolean) => void) | null = null
let renderConfirm: ((opts: ConfirmOptions | null) => void) | null = null

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    confirmResolver = resolve
    renderConfirm!(opts)
  })
}

export function mountConfirmHost() {
  const div = document.createElement('div')
  document.body.appendChild(div)
  let current: ConfirmOptions | null = null
  const rerender = () => {
    createRoot(div).render(
      <Dialog open={!!current} onOpenChange={o => { if (!o) { current = null; renderConfirm!(null); confirmResolver?.(false); confirmResolver = null } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{current?.title || '确认操作'}</DialogTitle>
            <DialogDescription>{current?.description || '该操作不可撤销，确定继续吗？'}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { current = null; renderConfirm!(null); confirmResolver?.(false); confirmResolver = null }}>取消</Button>
            <Button
              variant={current?.danger ? 'destructive' : 'default'}
              onClick={() => {
                confirmResolver?.(true); confirmResolver = null
                current = null; renderConfirm!(null)
              }}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
  renderConfirm = (opts) => { current = opts; rerender() }
  rerender()
}

import { Toaster } from 'sonner'
export function GlobalHosts() {
  return (
    <>
      <Toaster
        position="bottom-center"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: '0.75rem',
            border: '1px solid hsl(var(--border))',
            boxShadow: '0 8px 24px -6px hsl(var(--shadow-warm) / .28)'
          }
        }}
      />
      <HostMount />
    </>
  )
}
function HostMount() {
  if (!renderConfirm) mountConfirmHost()
  return null
}
