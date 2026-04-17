/**
 * Composable for generating Schema.org JSON-LD structured data.
 * Used across pages to provide search engines and AI with structured information.
 */
export function useStructuredData() {
  const config = useRuntimeConfig()
  const { locale } = useI18n()

  const siteUrl = computed(() =>
    String(config.public.siteUrl || 'https://trade-basic.com').replace(/\/+$/, '')
  )

  const appName = computed(() =>
    String(config.public.appName || '投資日記')
  )

  /** Inject a JSON-LD script tag via useHead */
  function injectJsonLd(data: Record<string, unknown> | (() => Record<string, unknown>)) {
    useHead(() => {
      const resolved = typeof data === 'function' ? data() : data
      return {
        script: [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify(resolved),
          },
        ],
      }
    })
  }

  /** WebSite + SoftwareApplication schema (global) */
  function injectWebSiteSchema() {
    injectJsonLd(() => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${siteUrl.value}/#website`,
          name: appName.value,
          url: siteUrl.value,
          inLanguage: locale.value,
          description: 'Personal investment diary and stock portfolio tracking application',
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${siteUrl.value}/articles?search={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@type': 'SoftwareApplication',
          '@id': `${siteUrl.value}/#app`,
          name: appName.value,
          url: siteUrl.value,
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          featureList: [
            'Investment journaling',
            'Stock portfolio tracking',
            'Trading alerts & reminders',
            'Seasonal analysis tools',
            'Position sizing calculator',
            'Financial freedom calculator',
          ],
        },
      ],
    }))
  }

  /** BlogPosting schema for individual articles */
  function injectBlogPostingSchema(post: {
    title?: string
    excerpt?: string
    coverImage?: string
    publishedAt?: string | Date
    updatedAt?: string | Date
    slug?: string
    author?: { name?: string | null }
  }) {
    injectJsonLd(() => {
      if (!post.title) return {}
      const slug = post.slug || ''
      return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt || '',
        image: post.coverImage || undefined,
        datePublished: post.publishedAt
          ? new Date(post.publishedAt).toISOString()
          : undefined,
        dateModified: post.updatedAt
          ? new Date(post.updatedAt).toISOString()
          : undefined,
        url: `${siteUrl.value}/articles/${encodeURIComponent(slug)}`,
        inLanguage: locale.value,
        author: {
          '@type': 'Person',
          name: post.author?.name || appName.value,
        },
        publisher: {
          '@type': 'Organization',
          name: appName.value,
          url: siteUrl.value,
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${siteUrl.value}/articles/${encodeURIComponent(slug)}`,
        },
      }
    })
  }

  /** CollectionPage + ItemList schema for article listings */
  function injectCollectionPageSchema(posts: Array<{
    title?: string
    slug?: string
    publishedAt?: string | Date
  }>) {
    injectJsonLd(() => ({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${appName.value} - Articles`,
      url: `${siteUrl.value}/articles`,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: posts.map((post, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${siteUrl.value}/articles/${encodeURIComponent(post.slug || '')}`,
          name: post.title || '',
        })),
      },
    }))
  }

  /** Organization schema */
  function injectOrganizationSchema() {
    injectJsonLd(() => ({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: appName.value,
      url: siteUrl.value,
      logo: `${siteUrl.value}/icon-512x512.png`,
      description: 'Personal investment diary and stock portfolio tracking platform',
    }))
  }

  /** BreadcrumbList schema */
  function injectBreadcrumbSchema(items: Array<{ name: string; url?: string }>) {
    injectJsonLd(() => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
          ? `${siteUrl.value}${item.url}`
          : undefined,
      })),
    }))
  }

  /** FAQPage schema */
  function injectFAQSchema(questions: Array<{ question: string; answer: string }>) {
    injectJsonLd(() => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: questions.map((q) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: q.answer,
        },
      })),
    }))
  }

  return {
    siteUrl,
    appName,
    injectJsonLd,
    injectWebSiteSchema,
    injectBlogPostingSchema,
    injectCollectionPageSchema,
    injectOrganizationSchema,
    injectBreadcrumbSchema,
    injectFAQSchema,
  }
}
