import { forwardRef, useImperativeHandle, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

export type PDFViewerRef = { goToPage: (p: number) => void }

export default forwardRef<PDFViewerRef, { url: string | null }>(function PDFViewer({ url }, ref) {
  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState<number>(0)

  useImperativeHandle(ref, () => ({
    goToPage: (p: number) => {
      if (!numPages) return
      const clamped = Math.max(1, Math.min(numPages, p))
      setPageNum(clamped)
    }
  }), [numPages])

  if (!url) return <div className="p-4 text-sm text-gray-500">Upload a PDF to begin.</div>

  return (
    <div className="p-3">
      <Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
        <Page pageNumber={pageNum} width={720} />
      </Document>
      <div className="mt-2 flex items-center justify-between">
        <button className="px-3 py-1 border rounded" onClick={() => setPageNum(p => Math.max(1, p - 1))}>Prev</button>
        <span className="text-sm">{pageNum} / {numPages || '?'}</span>
        <button className="px-3 py-1 border rounded" onClick={() => setPageNum(p => (numPages ? Math.min(numPages, p + 1) : p))}>Next</button>
      </div>
    </div>
  )
})
