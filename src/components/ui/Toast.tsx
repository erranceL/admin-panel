import type { ToastItem } from '../../types'

export default function ToastContainer({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed right-4 top-4 z-[60] flex w-[min(420px,calc(100vw-32px))] flex-col gap-3" aria-live="polite">
      {items.map((item) => {
        const tone = {
          success: 'border-[#10B981]/40 bg-[#10B981]/10 text-[#D1FAE5]',
          error: 'border-[#E85A7E]/40 bg-[#E85A7E]/10 text-[#FFE4EA]',
          warning: 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FEF3C7]',
          info: 'border-[#2DD4BF]/40 bg-[#2DD4BF]/10 text-[#CCFBF1]',
        }[item.type]

        return (
          <div key={item.id} className={`rounded-xl border p-3 shadow-xl backdrop-blur ${tone}`}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.message && <p className="mt-1 text-xs opacity-80">{item.message}</p>}
              </div>
              <button type="button" className="text-xs opacity-70 hover:opacity-100" onClick={() => onDismiss(item.id)} aria-label="关闭提示">
                关闭
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
