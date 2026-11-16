import { useMemo, useState, type FormEvent } from 'react'
import { Check, CheckCircle2, Copy, Mail, MapPin, Send } from 'lucide-react'
import { Reveal } from './ui/animations'
import { SocialTooltip } from './ui/social-media'
import type { SocialItem } from './ui/social-media'
import contatoData from '../data/contato.json'
import linkedinIcon from '../assets/img/icons/linkedin.svg'

type Field = 'name' | 'email' | 'message'
type Errors = Partial<Record<Field, string>>

interface ContatoLink {
  id: string
  label: string
  href: string
  color: string
  brand?: string
}

interface ContatoData {
  email: string
  location: string
  availability: string
  links: ContatoLink[]
}

const DATA = contatoData as ContatoData

const EMAIL_HREF =
  DATA.links.find(link => link.id === 'email')?.href ?? `mailto:${DATA.email}`

const SOCIAL_ITEMS: SocialItem[] = DATA.links.map(link => ({
  href: link.href,
  ariaLabel: link.label,
  tooltip: link.label,
  color: link.color,
  svgUrl: link.brand
    ? `https://cdn.simpleicons.org/${link.brand}/000000`
    : linkedinIcon,
}))

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const FIELD_IDS: Record<Field, string> = {
  name: 'contact-name',
  email: 'contact-email',
  message: 'contact-message',
}

function buildMailto(name: string, email: string, message: string) {
  const subject = `Contato pelo portfólio: ${name}`
  const body = `Nome: ${name}\nE-mail: ${email}\n\n${message}`
  return `mailto:${DATA.email}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`
}

export function Contato() {
  const [values, setValues] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'sent'>('idle')
  const [mailtoHref, setMailtoHref] = useState(EMAIL_HREF)
  const [copied, setCopied] = useState(false)

  const socialItems = useMemo(() => SOCIAL_ITEMS, [])

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

    const href = buildMailto(
      values.name.trim(),
      values.email.trim(),
      values.message.trim(),
    )

    setMailtoHref(href)
    setStatus('sent')
    window.location.href = href
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(DATA.email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
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
              desenvolvimento web? Preencha o formulário (ele abre seu app de
              e-mail com a mensagem pronta) ou fale comigo pelos canais abaixo.
            </p>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <a
                  href={EMAIL_HREF}
                  className="inline-flex items-center gap-3 text-slate-900 font-medium hover:underline underline-offset-4"
                >
                  <Mail size={18} className="shrink-0" />
                  {DATA.email}
                </a>
                <button
                  type="button"
                  onClick={copyEmail}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <MapPin size={18} className="shrink-0" />
                {DATA.location} · {DATA.availability}
              </div>
            </div>

            <div className="pt-1 pb-14">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                Ou me encontre em
              </p>
              <SocialTooltip
                items={socialItems}
                className="flex-wrap justify-start"
                aria-label="Redes e canais de contato"
              />
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

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#171717] hover:bg-black
                      text-white text-sm font-semibold tracking-wide px-7 py-4 transition-colors
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
                  >
                    <Send size={16} />
                    Abrir e-mail com a mensagem
                  </button>

                  {status === 'sent' && (
                    <p role="status" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                      <CheckCircle2 size={18} className="shrink-0" />
                      Mensagem pronta no seu app de e-mail.
                    </p>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-zinc-400">
                  O formulário não usa servidor: ele monta a mensagem e abre seu
                  cliente de e-mail. Se nada abrir,{' '}
                  <a
                    href={mailtoHref}
                    className="font-medium text-zinc-600 underline underline-offset-4 hover:text-slate-900"
                  >
                    use este link
                  </a>{' '}
                  ou copie o endereço acima.
                </p>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export default Contato
