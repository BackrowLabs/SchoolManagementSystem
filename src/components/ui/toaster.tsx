import { useEffect } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastState } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const icons = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
  error:   <XCircle className="h-4 w-4 text-red-500 shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
  default: <Info className="h-4 w-4 text-blue-500 shrink-0" />,
}

export function Toaster() {
  const { toasts, register, dismiss } = useToastState()
  useEffect(() => { register() }, [register])

  return (
    <div className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg",
            "animate-in slide-in-from-bottom-4 fade-in-0 duration-200",
            t.variant === 'success' && "border-emerald-200",
            t.variant === 'error'   && "border-red-200",
            t.variant === 'warning' && "border-amber-200",
            (!t.variant || t.variant === 'default') && "border-border",
          )}
        >
          {icons[t.variant ?? 'default']}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{t.title}</p>
            {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
