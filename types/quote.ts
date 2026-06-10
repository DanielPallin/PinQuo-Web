export interface ProfileRow {
    id: string
    username: string
    avatar_url: string | null
    is_pro: boolean
  }
  
  export interface TemplateStyleRow {
    bgGradient?: string
    textColor?: string
    fontFamily?: string
  }
  
  export interface TemplateRow {
    id: string
    name: string
    style_config: TemplateStyleRow | null
  }
  
  export interface QuoteWithRelations {
    id: string
    content: string
    quoted_email: string | null
    live_photo_url: string | null
    created_at: string
    publisher: ProfileRow | null
    quoted_user: ProfileRow | null
    templates: TemplateRow | null
  }