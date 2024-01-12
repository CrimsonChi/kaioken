import { EffectTag } from "./constants"

type ValidUrl = `http${"s" | ""}://${string}`
type ValidPath = `/${string}`
type ValidUrlOrPath = ValidUrl | ValidPath | string
type ListOfUrlsOrPaths = string
type FileName = string

type FormAction = ValidUrlOrPath
type InputType =
  | "button"
  | "checkbox"
  | "color"
  | "date"
  | "datetime-local"
  | "email"
  | "file"
  | "hidden"
  | "image"
  | "month"
  | "number"
  | "password"
  | "radio"
  | "range"
  | "reset"
  | "search"
  | "submit"
  | "tel"
  | "text"
  | "time"
  | "url"
  | "week"

type LanguageCode =
  | "en"
  | "fr"
  | "es"
  | "de"
  | "it"
  | "pt"
  | "ru"
  | "zh"
  | string
type MediaQuery = string
type MediaType = string
type MimeType = string
type ReferrerPolicy =
  | "no-referrer"
  | "no-referrer-when-downgrade"
  | "origin"
  | "origin-when-cross-origin"
  | "unsafe-url"

type AnchorRel =
  | "alternate"
  | "author"
  | "bookmark"
  | "external"
  | "help"
  | "license"
  | "next"
  | "nofollow"
  | "noreferrer"
  | "noopener"
  | "prev"
  | "search"
  | "tag"

type LinkRel =
  | "alternate"
  | "archives"
  | "author"
  | "bookmark"
  | "external"
  | "first"
  | "help"
  | "icon"
  | "last"
  | "license"
  | "next"
  | "nofollow"
  | "noreferrer"
  | "pingback"
  | "prefetch"
  | "preload"
  | "prev"
  | "search"
  | "sidebar"
  | "stylesheet"
  | "tag"
  | "up"

type Target = "_blank" | "_self" | "_parent" | "_top"

type EncType =
  | "application/x-www-form-urlencoded"
  | "multipart/form-data"
  | "text/plain"

type IFrameSandbox =
  | "allow-forms"
  | "allow-modals"
  | "allow-orientation-lock"
  | "allow-pointer-lock"
  | "allow-popups"
  | "allow-popups-to-escape-sandbox"
  | "allow-presentation"
  | "allow-same-origin"
  | "allow-scripts"
  | "allow-top-navigation"
  | "allow-top-navigation-by-user-activation"
type InputAccept = "audio/*" | "video/*" | "image/*" | MimeType
type AutoComplete = "on" | "off"
type FormMethod = "get" | "post"

type Direction = "ltr" | "rtl" | "auto"

type FocussableElementTags =
  | "a"
  | "area"
  | "audio"
  | "button"
  | "details"
  | "dialog"
  | "embed"
  | "iframe"
  | "input"
  | "label"
  | "menu"
  | "meter"
  | "object"
  | "optgroup"
  | "option"
  | "output"
  | "progress"
  | "select"
  | "summary"
  | "textarea"
  | "video"

type LoadableElementTags =
  | "img"
  | "iframe"
  | "link"
  | "script"
  | "source"
  | "track"

type ErrorableElementTags = "img" | "iframe" | "link" | "script" | "source"

type GlobalAttributes = {
  accessKey?: string
  autocapitalize?: "on" | "off" | "none" | "sentences" | "words" | "characters"
  className?: string
  contentEditable?: boolean
  dir?: Direction
  draggable?: boolean | "auto"
  hidden?: boolean
  id?: string
  lang?: LanguageCode
  spellcheck?: boolean | "default"
  style?: string | Partial<CSSStyleDeclaration>
  tabIndex?: number
  title?: string
  translate?: "yes" | "no"
}

type KeyboardEventAttributes = {
  onkeyup?: (e: KeyboardEvent) => void
  onkeydown?: (e: KeyboardEvent) => void
  onkeypress?: (e: KeyboardEvent) => void
}

type FocusEventAttributes = {
  onblur?: (e: FocusEvent) => void
  onfocus?: (e: FocusEvent) => void
}

type InputEventAttributes = {
  onchange?: (e: Event) => void
  oninput?: (e: Event) => void
  onreset?: (e: Event) => void
  onsubmit?: (e: Event) => void
}

type MouseEventAttributes = {
  onclick?: (e: MouseEvent) => void
  ondblclick?: (e: MouseEvent) => void
  onmousedown?: (e: MouseEvent) => void
  onmouseenter?: (e: MouseEvent) => void
  onmouseleave?: (e: MouseEvent) => void
  onmousemove?: (e: MouseEvent) => void
  onmouseout?: (e: MouseEvent) => void
  onmouseover?: (e: MouseEvent) => void
  onmouseup?: (e: MouseEvent) => void
}

type EventAttributes<T extends string> = KeyboardEventAttributes &
  MouseEventAttributes &
  (T extends FocussableElementTags ? FocusEventAttributes : {}) &
  (T extends "input" | "select" | "textarea" ? InputEventAttributes : {}) &
  (T extends LoadableElementTags ? { onload?: (e: Event) => void } : {}) &
  (T extends ErrorableElementTags ? { onerror?: (e: Event) => void } : {})

type ElementReference<T extends HTMLElement> = T | null | string

interface HtmlElementAttributes {
  a: {
    download?: FileName
    href?: ValidUrlOrPath
    hreflang?: LanguageCode
    media?: MediaQuery
    target?: Target
    rel?: AnchorRel
    type?: MediaType
    ping?: ListOfUrlsOrPaths
  }
  abbr: {}
  address: {}
  area: HtmlElementAttributes["a"] & {
    alt?: string
    coords?: string
    shape?: "default" | "rect" | "circle" | "poly"
  }
  article: {}
  aside: {}
  audio: {
    src?: ValidUrlOrPath
    controls?: boolean
    autoplay?: boolean
    loop?: boolean
    muted?: boolean
  }
  b: {}
  base: {
    href?: ValidUrlOrPath
    target?: Target
  }
  bdi: {}
  bdo: {}
  big: {}
  blockquote: {
    cite?: string
  }
  body: {}
  br: {}
  button: {
    autofocus?: "autofocus"
    disabled?: boolean
    form?: ElementReference<HTMLFormElement>
    formAction?: FormAction
    formEnctype?: EncType
    formMethod?: FormMethod
    type?: "button" | "reset" | "submit"
  }
  canvas: {
    width?: string | number
    height?: string | number
  }
  caption: {}
  cite: {}
  code: {}
  col: {
    span?: string | number
  }
  colgroup: {
    span?: string | number
  }
  data: {
    value?: string
  }
  datalist: {}
  dd: {}
  del: {
    cite?: string
    dateTime?: string
  }
  details: {
    open?: boolean
  }
  dfn: {}
  dialog: {
    open?: boolean
  }
  div: {}
  dl: {}
  dt: {}
  em: {}
  embed: {
    src?: ValidUrlOrPath
    type?: string
    width?: string | number
    height?: string | number
  }
  fieldset: {
    disabled?: boolean
    form?: ElementReference<HTMLFormElement>
    name?: string
  }
  figcaption: {}
  figure: {}
  footer: {}
  form: {
    acceptCharset?: string
    action?: FormAction | ((data: FormData) => void)
    autocomplete?: AutoComplete
    enctype?: EncType
    method?: FormMethod
    name?: string
    novalidate?: boolean
    target?: string
  }
  h1: {}
  h2: {}
  h3: {}
  h4: {}
  h5: {}
  h6: {}
  head: {}
  header: {}
  hgroup: {}
  hr: {}
  html: {
    lang?: LanguageCode
  }
  i: {}
  iframe: {
    src?: ValidUrlOrPath
    srcdoc?: string
    name?: string
    sandbox?: IFrameSandbox
    width?: string | number
    height?: string | number
  }
  img: {
    alt?: string
    src?: ValidUrlOrPath
    crossOrigin?: string
    useMap?: string
    width?: string | number
    height?: string | number
  }
  input: {
    accept?: InputAccept
    alt?: string
    autocomplete?: AutoComplete
    autofocus?: boolean
    checked?: boolean
    dirName?: Direction
    disabled?: boolean
    form?: ElementReference<HTMLFormElement>
    formAction?: FormAction
    formEnctype?: EncType
    formMethod?: FormMethod
    formNoValidate?: boolean
    formTarget?: Target
    height?: string | number
    list?: ElementReference<HTMLDataListElement>
    max?: string | number
    maxLength?: string | number
    min?: string | number
    minLength?: string | number
    multiple?: boolean
    name?: string
    pattern?: RegExp
    placeholder?: string
    readOnly?: boolean
    required?: boolean
    size?: string | number
    src?: ValidUrlOrPath
    step?: string | number
    type?: InputType
    value?: string | number
    width?: string | number
  }
  ins: {
    cite?: string
    dateTime?: string
  }
  kbd: {}
  label: {
    htmlFor?: string
    form?: ElementReference<HTMLFormElement>
  }
  legend: {}
  li: {
    value?: number
  }
  link: {
    crossOrigin?: string
    disabled?: boolean
    fetchPriority?: "auto" | "high" | "low"
    href?: ValidUrlOrPath
    hreflang?: LanguageCode
    integrity?: string
    media?: MediaQuery
    referrerPolicy?: ReferrerPolicy
    rel?: LinkRel
    sizes?: string
    type?: MediaType
    title?: string
  }
  main: {}
  map: {
    name?: string
  }
  mark: {}
  menu: {}
  meta: {
    charset?: "utf-8"
    content?: string
    httpEquiv?: string
    name?: string
  }
  meter: {
    value?: string | number
    min?: string | number
    max?: string | number
    low?: string | number
    high?: string | number
    optimum?: string | number
  }
  nav: {}
  noscript: {}
  object: {
    data?: ValidUrlOrPath
    type?: MediaType
    name?: string
    useMap?: string
    width?: string | number
    height?: string | number
  }
  ol: {
    reversed?: boolean
    start?: string | number
    type?: "1" | "a" | "A" | "i" | "I"
  }
  optgroup: {
    disabled?: boolean
    label?: string
  }
  option: {
    disabled?: boolean
    label?: string
    selected?: boolean
    value?: string
  }
  output: {
    for?: string
    form?: ElementReference<HTMLFormElement>
    name?: string
  }
  p: {}
  picture: {}
  pre: {}
  progress: {
    value?: string | number
    max?: string | number
  }
  q: {
    cite?: string
  }
  rp: {}
  rt: {}
  ruby: {}
  s: {}
  samp: {}
  script: {
    async?: boolean
    crossOrigin?: string
    defer?: boolean
    integrity?: string
    noModule?: boolean
    nonce?: string
    referrerPolicy?: ReferrerPolicy
    src?: ValidUrlOrPath
    type?: string
  }
  search: {}
  section: {}
  select: {
    autofocus?: boolean
    disabled?: boolean
    form?: ElementReference<HTMLFormElement>
    multiple?: boolean
    name?: string
    required?: boolean
    size?: string | number
  }
  slot: {
    name?: string
  }
  small: {}
  source: {
    src?: ValidUrlOrPath
    srcset?: string
    type?: MediaType
    media?: MediaQuery
    height?: string | number
    width?: string | number
  }
  span: {}
  strong: {}
  style: {
    media?: MediaQuery
    nonce?: string
    type?: "text/css"
    title?: string
  }
  sub: {}
  summary: {}
  sup: {}
  table: {}
  tbody: {}
  td: {
    colSpan?: string | number
    rowSpan?: string | number
    headers?: string
  }
  template: {}
  textarea: {
    autocomplete?: AutoComplete
    autocorrect?: "on" | "off"
    autofocus?: boolean
    cols?: string | number
    dirName?: Direction
    disabled?: boolean
    form?: ElementReference<HTMLFormElement>
    maxLength?: string | number
    minLength?: string | number
    name?: string
    placeholder?: string
    readOnly?: boolean
    required?: boolean
    rows?: string | number
    wrap?: "hard" | "soft"
  }
  tfoot: {}
  th: {
    abbr?: string
    colSpan?: string | number
    rowSpan?: string | number
    headers?: string
    scope?: "col" | "row" | "colgroup" | "rowgroup"
  }
  thead: {}
  time: {
    dateTime?: string
  }
  title: {}
  tr: {}
  track: {
    default?: boolean
    kind?: "subtitles" | "captions" | "descriptions" | "chapters" | "metadata"
    label?: string
    src?: ValidUrlOrPath
    srclang?: LanguageCode
  }
  u: {}
  ul: {}
  var: {}
  video: {
    src?: ValidUrlOrPath
    poster?: ValidUrlOrPath
    width?: string | number
    height?: string | number
    autoplay?: boolean
    controls?: boolean
    loop?: boolean
    muted?: boolean
  }
}

interface SvgGlobalAttributes {
  fill?: string
  stroke?: string
  strokeWidth?: string | number
}

interface SvgElementAttributes {
  svg: {
    width?: string | number
    height?: string | number
    viewBox?: string
    preserveAspectRatio?: string
    xmlns?: string
  }
  circle: {
    cx?: string | number
    cy?: string | number
    r?: string | number
  }
  clipPath: {
    clipPathUnits?: "userSpaceOnUse" | "objectBoundingBox"
  }
  ellipse: {
    cx?: string | number
    cy?: string | number
    rx?: string | number
    ry?: string | number
  }
  line: {
    x1?: string | number
    y1?: string | number
    x2?: string | number
    y2?: string | number
  }
  path: {
    d?: string
  }
  polygon: {
    points?: string
  }
  polyline: {
    points?: string
  }
  rect: {
    x?: string | number
    y?: string | number
    width?: string | number
    height?: string | number
  }
}

type ElementMap = {
  [K in keyof HtmlElementAttributes]: HtmlElementAttributes[K] &
    GlobalAttributes &
    EventAttributes<K> &
    JSX.InternalProps<K>
} & {
  [K in keyof SvgElementAttributes]: SvgElementAttributes[K] &
    SvgGlobalAttributes &
    GlobalAttributes &
    EventAttributes<K> &
    JSX.InternalProps<K>
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ElementMap {}

    type Element = VNode | VNode[] | string | number | null

    type InternalProps<
      K extends keyof HtmlElementAttributes | keyof SvgElementAttributes
    > = {
      children?: Element[]
      ref?: K extends keyof HTMLElementTagNameMap
        ? Ref<HTMLElementTagNameMap[K]>
        : K extends keyof SVGElementTagNameMap
        ? Ref<SVGElementTagNameMap[K]>
        : never
    }
  }
}

export interface VNode {
  type?: string | Function
  props: {
    [key: string]: any
    children: VNode[]
  }
  parent?: VNode
  child?: VNode
  sibling?: VNode
  prev?: VNode
  effectTag?: EffectTag
  hooks: any[]
  dt?: number
}

export type Rec = Record<string, any>

export interface RouteChildProps {
  params: Rec
  query: Rec
}

export type Ref<T> = { current: T | null }

export type Context<T> = {
  Provider: ({ value, children }: ProviderProps<T>) => JSX.Element
  value: () => T
}

export type ProviderProps<T> = {
  value: T
  children?: JSX.Element[]
}

export type ElementProps<T extends keyof JSX.IntrinsicElements> =
  JSX.IntrinsicElements[T]
