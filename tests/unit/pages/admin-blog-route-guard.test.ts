import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('admin blog pages route guard contract', () => {
  it('declares admin middleware on admin dashboard page without client-side duplicate guard', () => {
    const filePath = resolve(process.cwd(), 'pages/admin/index.vue')
    const content = readFileSync(filePath, 'utf8')

    expect(content).toContain("middleware: 'admin'")
    expect(content).toContain('requiresAuth: true')
    expect(content).not.toContain('watchEffect(')
  })

  it('declares admin middleware on blog admin index page', () => {
    const filePath = resolve(process.cwd(), 'pages/admin/blog/index.vue')
    const content = readFileSync(filePath, 'utf8')

    expect(content).toContain("middleware: 'admin'")
    expect(content).toContain('requiresAuth: true')
    expect(content).not.toContain('watchEffect(')
  })

  it('declares admin middleware on blog new page', () => {
    const filePath = resolve(process.cwd(), 'pages/admin/blog/new.vue')
    const content = readFileSync(filePath, 'utf8')

    expect(content).toContain("middleware: 'admin'")
    expect(content).toContain('requiresAuth: true')
  })

  it('declares admin middleware on blog edit page', () => {
    const filePath = resolve(process.cwd(), 'pages/admin/blog/[id]/edit.vue')
    const content = readFileSync(filePath, 'utf8')

    expect(content).toContain("middleware: 'admin'")
    expect(content).toContain('requiresAuth: true')
  })
})
