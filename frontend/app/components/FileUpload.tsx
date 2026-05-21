'use client'
import { useState, useRef } from 'react'

const API_URL = 'http://localhost:8000'

const SUPPORTED_FORMATS = ['pdf', 'txt', 'md', 'csv', 'html', 'doc', 'docx', 'xls', 'xlsx']

interface FileUploadProps {
  onExtracted: (text: string) => void
  existingContext?: string
  label?: string
}

export default function FileUpload({ onExtracted, existingContext = '', label = 'Enriquecer con documento' }: FileUploadProps) {
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!SUPPORTED_FORMATS.includes(ext)) {
      setError(`Formato .${ext} no soportado. Usa: ${SUPPORTED_FORMATS.join(', ')}`)
      return
    }

    setLoading(true)
    setError(null)
    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      bytes.forEach(b => binary += String.fromCharCode(b))
      const base64 = btoa(binary)

      const res = await fetch(`${API_URL}/api/opportunity/extract-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_base64: base64,
          file_format: ext,
          file_name: file.name,
          existing_context: existingContext
        })
      })

      if (!res.ok) throw new Error('Error al procesar el archivo')
      const data = await res.json()
      onExtracted(data.extracted_text)
      setFileName(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      setError('No se pudo extraer el contenido del archivo')
      setFileName(null)
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_FORMATS.map(f => `.${f}`).join(',')}
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="animate-spin">⟳</span>
            {fileName ? `Procesando ${fileName}...` : 'Procesando...'}
          </>
        ) : (
          <>
            <span>↑</span>
            {label}
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
