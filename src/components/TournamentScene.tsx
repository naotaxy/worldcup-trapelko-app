import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type TournamentSceneProps = {
  activeGroup: string
}

export function TournamentScene({ activeGroup }: TournamentSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const activeGroupRef = useRef(activeGroup)

  useEffect(() => {
    activeGroupRef.current = activeGroup
  }, [activeGroup])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2('#070906', 0.045)

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120)
    camera.position.set(0, 6, 22)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor('#0d170d', 1)
    mount.appendChild(renderer.domElement)

    const groupRoot = new THREE.Group()
    scene.add(groupRoot)

    const colors = [
      '#e23d3d',
      '#2ca36a',
      '#e0b336',
      '#4f7fdd',
      '#d9632c',
      '#38a9a6',
      '#9854d7',
      '#c93e79',
      '#2f8dcc',
      '#7faa2a',
      '#d05c40',
      '#87904f',
    ]

    colors.forEach((color, index) => {
      const radius = 3.4 + index * 0.48
      const geometry = new THREE.TorusGeometry(radius, 0.009, 8, 160)
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.24,
      })
      const ring = new THREE.Mesh(geometry, material)
      ring.rotation.x = Math.PI / 2.45
      ring.rotation.z = index * 0.24
      ring.userData.groupCode = String.fromCharCode(65 + index)
      groupRoot.add(ring)
    })

    const particleGeometry = new THREE.BufferGeometry()
    const positions: number[] = []
    const particleColors: number[] = []
    const color = new THREE.Color()

    for (let index = 0; index < 384; index += 1) {
      const lane = index % 12
      const angle = (index / 384) * Math.PI * 2 * 8
      const radius = 3.4 + lane * 0.48 + Math.sin(index * 0.7) * 0.16
      positions.push(Math.cos(angle) * radius, Math.sin(index * 0.15) * 2.2, Math.sin(angle) * radius)
      color.set(colors[lane])
      particleColors.push(color.r, color.g, color.b)
    }

    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(particleColors, 3))
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    groupRoot.add(particles)

    const lineGeometry = new THREE.BufferGeometry()
    const linePositions: number[] = []
    for (let index = 0; index < 96; index += 1) {
      const lane = index % 12
      const base = 3.4 + lane * 0.48
      const a = index * 0.39
      const b = a + 0.42 + (lane % 3) * 0.16
      linePositions.push(Math.cos(a) * base, Math.sin(index) * 1.6, Math.sin(a) * base)
      linePositions.push(Math.cos(b) * (base + 0.38), Math.cos(index) * 1.2, Math.sin(b) * (base + 0.38))
    }
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    const lineMaterial = new THREE.LineBasicMaterial({
      color: '#f5f1df',
      transparent: true,
      opacity: 0.08,
    })
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    groupRoot.add(lines)

    const light = new THREE.HemisphereLight('#f8f0d2', '#11170d', 1.1)
    scene.add(light)

    let pointerX = 0
    let pointerY = 0
    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth - 0.5
      pointerY = event.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', onPointerMove)

    const resize = () => {
      const width = mount.clientWidth || window.innerWidth
      const height = mount.clientHeight || window.innerHeight
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)

    let raf = 0
    const startedAt = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startedAt) / 1000
      const activeIndex = activeGroupRef.current.charCodeAt(0) - 65
      groupRoot.rotation.y = elapsed * 0.045 + pointerX * 0.16
      groupRoot.rotation.x = -0.18 + pointerY * 0.08
      particles.rotation.y = elapsed * 0.024
      lines.rotation.z = elapsed * -0.018
      camera.lookAt(0, 0, 0)

      groupRoot.children.forEach((child) => {
        if (!(child instanceof THREE.Mesh)) return
        const code = child.userData.groupCode as string | undefined
        const groupIndex = code ? code.charCodeAt(0) - 65 : -1
        const material = child.material as THREE.MeshBasicMaterial
        material.opacity = groupIndex === activeIndex ? 0.82 : 0.22
      })

      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointerMove)
      resizeObserver.disconnect()
      renderer.dispose()
      particleGeometry.dispose()
      particleMaterial.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
      groupRoot.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          ;(child.material as THREE.Material).dispose()
        }
      })
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div className="tournament-scene" ref={mountRef} aria-hidden="true" />
}
