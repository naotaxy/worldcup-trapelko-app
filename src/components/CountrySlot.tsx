import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { GroupCode } from '../types'

export type SlotCountry = {
  id: string
  label: string
  shortName: string
  flag: string
  group: GroupCode
}

type CountrySlotProps = {
  countries: SlotCountry[]
  resultCountry: SlotCountry | null
  spinKey: number
  spinning: boolean
}

const reelSize = 5

export function CountrySlot({ countries, resultCountry, spinKey, spinning }: CountrySlotProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const meshesRef = useRef<THREE.Mesh[]>([])
  const spinningRef = useRef(spinning)
  const idleCountries = useMemo(() => buildVisibleCountries(countries, resultCountry), [countries, resultCountry])
  const [rollingCountries, setRollingCountries] = useState<SlotCountry[]>([])
  const visibleCountries = spinning && rollingCountries.length > 0 ? rollingCountries : idleCountries

  useEffect(() => {
    spinningRef.current = spinning
  }, [spinning])

  useEffect(() => {
    if (!spinning || countries.length === 0) return

    let ticks = 0
    const timer = window.setInterval(() => {
      ticks += 1
      setRollingCountries(buildVisibleCountries(shuffleCountries(countries), null))
      if (ticks >= 20) {
        window.clearInterval(timer)
        setRollingCountries(buildVisibleCountries(countries, resultCountry))
      }
    }, 70)

    return () => window.clearInterval(timer)
  }, [countries, resultCountry, spinKey, spinning])

  const textures = useMemo(() => visibleCountries.map((country, index) => createCountryTexture(country, index === 2)), [visibleCountries])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100)
    camera.position.set(0, 0, 8.4)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor('#0c140b', 1)
    mount.appendChild(renderer.domElement)

    const reel = new THREE.Group()
    scene.add(reel)

    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(4.9, 1.24),
      new THREE.MeshBasicMaterial({ color: '#d8c783', transparent: true, opacity: 0.18 }),
    )
    frame.position.z = -0.08
    scene.add(frame)

    meshesRef.current = Array.from({ length: reelSize }, (_, index) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(4.5, 1.06),
        new THREE.MeshBasicMaterial({ transparent: true }),
      )
      mesh.position.y = (2 - index) * 1.18
      mesh.position.z = index === 2 ? 0.18 : -0.06
      mesh.scale.setScalar(index === 2 ? 1.05 : 0.9)
      reel.add(mesh)
      return mesh
    })

    const resize = () => {
      const width = mount.clientWidth || 360
      const height = mount.clientHeight || 280
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(mount)

    let raf = 0
    const startedAt = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startedAt) / 1000
      reel.rotation.y = Math.sin(elapsed * 1.2) * 0.08
      reel.rotation.x = spinningRef.current ? Math.sin(elapsed * 12) * 0.025 : Math.sin(elapsed * 0.8) * 0.015
      meshesRef.current.forEach((mesh, index) => {
        mesh.rotation.z = index === 2 ? Math.sin(elapsed * 2.2) * 0.01 : 0
      })
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      meshesRef.current.forEach((mesh) => {
        const material = mesh.material as THREE.MeshBasicMaterial
        material.map?.dispose()
        material.dispose()
        mesh.geometry.dispose()
      })
      meshesRef.current = []
      frame.geometry.dispose()
      ;(frame.material as THREE.Material).dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  useEffect(() => {
    meshesRef.current.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      material.map?.dispose()
      material.map = textures[index] || null
      material.needsUpdate = true
      mesh.position.z = index === 2 ? 0.18 : -0.06
      mesh.scale.setScalar(index === 2 ? 1.05 : 0.9)
    })
  }, [textures])

  return <div className="country-slot-canvas" ref={mountRef} aria-hidden="true" />
}

function buildVisibleCountries(countries: SlotCountry[], resultCountry: SlotCountry | null): SlotCountry[] {
  const fallback = countries[0]
  if (!fallback) return []
  const picked = resultCountry || fallback
  const pool = countries.filter((country) => country.id !== picked.id)
  const around = shuffleCountries(pool).slice(0, reelSize - 1)
  return [around[0] || picked, around[1] || picked, picked, around[2] || picked, around[3] || picked]
}

function shuffleCountries(countries: SlotCountry[]): SlotCountry[] {
  return [...countries].sort(() => Math.random() - 0.5)
}

function createCountryTexture(country: SlotCountry, active: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 212
  const context = canvas.getContext('2d')
  if (!context) return new THREE.CanvasTexture(canvas)

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, active ? '#f7f0d0' : '#263226')
  gradient.addColorStop(1, active ? '#d8c783' : '#121a12')
  context.fillStyle = gradient
  roundRect(context, 0, 0, canvas.width, canvas.height, 34)
  context.fill()

  context.strokeStyle = active ? '#fff8d7' : '#394332'
  context.lineWidth = active ? 7 : 4
  roundRect(context, 8, 8, canvas.width - 16, canvas.height - 16, 28)
  context.stroke()

  context.fillStyle = active ? '#11170d' : '#f5f1df'
  context.font = '900 54px system-ui, sans-serif'
  context.fillText(`GROUP ${country.group}`, 42, 64)

  context.font = '900 118px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
  context.fillText(flagGlyph(country.flag), 40, 171)

  context.font = '900 78px system-ui, sans-serif'
  fitText(context, country.label, 208, 136, 500, 78)

  context.fillStyle = active ? '#31412f' : '#d8c783'
  context.font = '900 48px system-ui, sans-serif'
  context.fillText(country.shortName, 210, 184)

  context.fillStyle = active ? '#11170d' : '#f4ce59'
  context.font = '900 64px system-ui, sans-serif'
  context.textAlign = 'right'
  context.fillText('DRAFT', 852, 124)
  context.textAlign = 'left'

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function flagGlyph(flag: string): string {
  if (flag === 'gb-eng') return '🏴 ENG'
  if (flag === 'gb-sct') return '🏴 SCO'
  if (!/^[a-z]{2}$/.test(flag)) return flag.toUpperCase()
  return String.fromCodePoint(...[...flag.toUpperCase()].map((letter) => 127397 + letter.charCodeAt(0)))
}

function fitText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, size: number) {
  let nextSize = size
  context.font = `900 ${nextSize}px system-ui, sans-serif`
  while (context.measureText(text).width > maxWidth && nextSize > 42) {
    nextSize -= 3
    context.font = `900 ${nextSize}px system-ui, sans-serif`
  }
  context.fillText(text, x, y)
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}
