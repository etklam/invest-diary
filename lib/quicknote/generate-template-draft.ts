import type { QuickNoteTemplateData, QuickNoteTemplateKind } from '~/types/quicknote'

interface GenerateTemplateDraftInput {
  templateKind: QuickNoteTemplateKind
  date: string
  locale: string
  templateData: QuickNoteTemplateData
}

interface TemplateDraft {
  title: string
  content: string
}

function isZhLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith('zh')
}

function formatDate(date: string): string {
  return date.replace(/-/g, '/')
}

function normalizeSymbols(symbols: string | undefined): string {
  if (!symbols) return ''
  return symbols
    .split(',')
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean)
    .join(', ')
}

export function generateTemplateDraft(input: GenerateTemplateDraftInput): TemplateDraft {
  const isZh = isZhLocale(input.locale)
  const formattedDate = formatDate(input.date)
  const diaryLabel = isZh ? '日記' : 'Diary'
  const reflectionLabel = isZh ? '盤後反思' : 'Post-market Reflection'
  const observationLabel = isZh ? '市場觀察' : 'Market Observation'

  if (input.templateKind === 'blank') {
    return {
      title: `${formattedDate} ${diaryLabel}`,
      content: '',
    }
  }

  if (input.templateKind === 'trading') {
    const typeLabelMap = {
      buy: isZh ? '買入' : 'Buy',
      sell: isZh ? '賣出' : 'Sell',
      both: isZh ? '買賣都做' : 'Both',
    }
    const type = input.templateData.tradingType as 'buy' | 'sell' | 'both' | undefined
    const typeLabel = typeLabelMap[type || 'both']
    const symbols = normalizeSymbols(input.templateData.symbols)
    let content = `## ${isZh ? '今日操作' : "Today's Operation"}\n\n`
    content += `- ${isZh ? '操作' : 'Operation'}: ${typeLabel}\n`
    if (symbols) {
      content += `- ${isZh ? '標的' : 'Symbols'}: ${symbols}\n`
    }
    const moodLabelMap = {
      bullish: isZh ? '多頭' : 'Bullish',
      bearish: isZh ? '空頭' : 'Bearish',
      neutral: isZh ? '盤整' : 'Neutral',
    }
    if (input.templateData.marketMood) {
      const mood = moodLabelMap[input.templateData.marketMood as 'bullish' | 'bearish' | 'neutral'] || input.templateData.marketMood
      content += `- ${isZh ? '今日市場感覺' : 'Market feeling'}: ${mood}\n`
    }
    if (input.templateData.note) {
      content += `\n## ${isZh ? '快速備註' : 'Quick notes'}\n\n${input.templateData.note}\n`
    }

    return {
      title: `${formattedDate} ${typeLabel} ${diaryLabel}${symbols ? ` - ${symbols}` : ''}`,
      content,
    }
  }

  if (input.templateKind === 'reflection') {
    const stars = '⭐'.repeat(input.templateData.rating || 0)
    const goodPoints: string[] = []
    if (input.templateData.noRashTrading) {
      goodPoints.push(isZh ? '- 沒有胡亂操作' : '- No rash trading')
    }
    if (input.templateData.goodPoints) {
      goodPoints.push(input.templateData.goodPoints)
    }

    let content = `## ${isZh ? '今日市場狀況' : 'Market condition'}\n\n${input.templateData.marketCondition || '-'}\n\n`
    content += `## ${isZh ? '今日操作評價' : "Today's rating"}\n\n${stars}${stars ? ` (${input.templateData.rating}/5)` : ''}\n\n`
    if (goodPoints.length > 0) {
      content += `## ${isZh ? '做得好的地方' : 'What went well'}\n\n${goodPoints.join('\n')}\n\n`
    }
    if (input.templateData.improvePoints) {
      content += `## ${isZh ? '需要改進的地方' : 'Areas for improvement'}\n\n${input.templateData.improvePoints}\n`
    }

    return {
      title: `${formattedDate} ${reflectionLabel}`,
      content,
    }
  }

  const topic = input.templateData.topic?.trim()
  let content = `## ${isZh ? '觀察主題' : 'Topic'}: ${topic || '-'}\n\n`
  content += `**${isZh ? '觀察類型' : 'Observation type'}:** ${input.templateData.observationType || '-'}\n\n`
  if (input.templateData.observationContent) {
    content += `## ${isZh ? '觀察內容' : 'Observation content'}\n\n${input.templateData.observationContent}\n\n`
  }
  if (input.templateData.action) {
    content += `## ${isZh ? '後續行動' : 'Follow-up action'}\n\n${input.templateData.action}\n`
  }

  return {
    title: topic || `${formattedDate} ${observationLabel}`,
    content,
  }
}
