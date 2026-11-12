import { useState, type FormEvent } from 'react'
import { Mail, MapPin, Send, CheckCircle2 } from 'lucide-react'
import { Reveal } from './ui/animations'

type Field = 'name' | 'email' | 'message'
type Errors = Partial<Record<Field, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const FIELD_IDS: Record<Field, string> = {
  name: 'contact-name',
  email: 'contact-email',
  message: 'contact-message',
}

export function Contato() {
  const [values, setValues] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  function validate(): Errors {
    const next: Errors = {}

    if (!values.name.trim()) next.name = 'Informe seu nome.'
    else if (values.name.trim().length < 2) next.name = 'O nome deve ter pelo menos 2 caracteres.'

    if (!values.email.trim()) next.email = 'Informe seu e-mail.'
    else if (!EMAIL_RE.test(values.email.trim())) next.email = 'Informe um e-mail válido.'

    if (!values.message.trim()) next.message = 'Escreva uma mensagem.'
    else if (values.message.trim().length < 10) next.message = 'A mensagem deve ter pelo menos 10 caracteres.'

    return next
  }

  function handleChange(field: Field, value: string) {
    setValues(prev => ({ ...prev, [field]: value }))
    setErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
    if (status === 'sent') setStatus('idle')
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const next = validate()
    setErrors(next)

    const firstError = (Object.keys(next) as Field[])[0]
    if (firstError) {
      document.getElementById(FIELD_IDS[firstError])?.focus()
      return
    }

    setStatus('sending')
    // Envio simulado (sem backend). Substitua por sua API/serviço de e-mail.
    window.setTimeout(() => {
      setStatus('sent')
      setValues({ name: '', email: '', message: '' })
    }, 700)
  }

  const inputClass = (field: Field) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-zinc-400 outline-none transition
     focus:ring-2 ${
       errors[field]
         ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
         : 'border-zinc-300 focus:border-slate-900 focus:ring-slate-900/10'
     }`

  return (
    <section
      id="contato"
      className="fadeable relative z-10 w-full bg-white text-black font-sans"
    >
      <div className="max-w-5xl mx-auto px-8 md:px-16 py-24 md:py-32 border-t border-zinc-200">
        <Reveal>
          <p className="text-[#a3a3a3] text-sm font-medium mb-2 tracking-wide">
            Contato
          </p>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight max-w-2xl mb-14">
            Vamos conversar sobre o seu próximo projeto.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-16">
          <Reveal
            className="md:col-span-5 space-y-8 text-[15px] leading-relaxed text-zinc-600"
            delay={0.1}
          >
            <p>
              Tem uma ideia, uma vaga ou quer trocar uma ideia sobre
              desenvolvimento web? Preencha o formulário ou me encontre nos
              canais abaixo.
            </p>

            <div className="space-y-4">
              <a
                href="mailto:contato@exemplo.com"
                className="flex items-center gap-3 text-slate-900 font-medium hover:underline underline-offset-4"
              >
                <Mail size={18} className="shrink-0" />
                contato@exemplo.com
              </a>

              <div className="flex items-center gap-3">
                <MapPin size={18} className="shrink-0" />
                Brasil — disponível para trabalho remoto
              </div>
            </div>
          </Reveal>

          <Reveal className="md:col-span-7" delay={0.15}>
            <form noValidate onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor={FIELD_IDS.name}
                    className="block text-sm font-semibold text-slate-900 mb-2"
                  >
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={FIELD_IDS.name}
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={values.name}
                    onChange={e => handleChange('name', e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? `${FIELD_IDS.name}-error` : undefined}
                    placeholder="Seu nome"
                    className={inputClass('name')}
                  />
                  {errors.name && (
                    <p id={`${FIELD_IDS.name}-error`} className="mt-2 text-sm text-red-600">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor={FIELD_IDS.email}
                    className="block text-sm font-semibold text-slate-900 mb-2"
                  >
                    E-mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={FIELD_IDS.email}
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={e => handleChange('email', e.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? `${FIELD_IDS.email}-error` : undefined}
                    placeholder="voce@exemplo.com"
                    className={inputClass('email')}
                  />
                  {errors.email && (
                    <p id={`${FIELD_IDS.email}-error`} className="mt-2 text-sm text-red-600">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor={FIELD_IDS.message}
                  className="block text-sm font-semibold text-slate-900 mb-2"
                >
                  Mensagem <span className="text-red-500">*</span>
                </label>
                <textarea
                  id={FIELD_IDS.message}
                  name="message"
                  rows={6}
                  value={values.message}
                  onChange={e => handleChange('message', e.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? `${FIELD_IDS.message}-error` : undefined}
                  placeholder="Conte um pouco sobre o que você precisa..."
                  className={`${inputClass('message')} resize-y min-h-[140px]`}
                />
                {errors.message && (
                  <p id={`${FIELD_IDS.message}-error`} className="mt-2 text-sm text-red-600">
                    {errors.message}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#171717] hover:bg-black disabled:opacity-60
                    text-white text-sm font-semibold tracking-wide px-7 py-4 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
                >
                  <Send size={16} />
                  {status === 'sending' ? 'Enviando...' : 'Enviar mensagem'}
                </button>

                {status === 'sent' && (
                  <p role="status" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 size={18} />
                    Mensagem enviada com sucesso!
                  </p>
                )}
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export default Contato
