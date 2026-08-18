'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NaverRedirectPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin/traffic') }, [router])
  return null
}
