'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface ConfettiPiece {
  id: number
  x: number
  y: number
  rotation: number
  color: string
  size: number
  velocity: { x: number; y: number }
  rotationSpeed: number
  shape: 'square' | 'circle' | 'star'
}

interface ConfettiProps {
  /** Whether to show confetti */
  active: boolean
  /** Duration in ms before confetti stops spawning (default: 3000) */
  duration?: number
  /** Number of pieces to spawn (default: 100) */
  particleCount?: number
  /** Colors to use (default: rainbow) */
  colors?: string[]
  /** Callback when confetti animation is complete */
  onComplete?: () => void
}

const defaultColors = [
  '#ff0000', // red
  '#ff8800', // orange
  '#ffff00', // yellow
  '#00ff00', // green
  '#00ffff', // cyan
  '#0088ff', // blue
  '#8800ff', // purple
  '#ff00ff', // magenta
]

export function Confetti({
  active,
  duration = 3000,
  particleCount = 100,
  colors = defaultColors,
  onComplete,
}: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])
  const [isSpawning, setIsSpawning] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const createPiece = useCallback((id: number): ConfettiPiece => {
    const shapes: ('square' | 'circle' | 'star')[] = ['square', 'circle', 'star']
    return {
      id,
      x: Math.random() * window.innerWidth,
      y: -20,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 6,
      velocity: {
        x: (Math.random() - 0.5) * 10,
        y: Math.random() * 3 + 2,
      },
      rotationSpeed: (Math.random() - 0.5) * 20,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    }
  }, [colors])

  useEffect(() => {
    if (!active) {
      setIsSpawning(false)
      return
    }

    setIsSpawning(true)
    const spawnInterval = duration / particleCount
    let spawned = 0

    const spawnTimer = setInterval(() => {
      if (spawned >= particleCount) {
        clearInterval(spawnTimer)
        setIsSpawning(false)
        return
      }

      setPieces(prev => [...prev, createPiece(Date.now() + spawned)])
      spawned++
    }, spawnInterval)

    return () => clearInterval(spawnTimer)
  }, [active, duration, particleCount, createPiece])

  // Animation loop
  useEffect(() => {
    if (pieces.length === 0) {
      if (!isSpawning && active) {
        onComplete?.()
      }
      return
    }

    const animationFrame = requestAnimationFrame(() => {
      setPieces(prev =>
        prev
          .map(piece => ({
            ...piece,
            x: piece.x + piece.velocity.x,
            y: piece.y + piece.velocity.y,
            rotation: piece.rotation + piece.rotationSpeed,
            velocity: {
              x: piece.velocity.x * 0.99,
              y: piece.velocity.y + 0.1, // gravity
            },
          }))
          .filter(piece => piece.y < window.innerHeight + 50)
      )
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [pieces, isSpawning, active, onComplete])

  if (!mounted || pieces.length === 0) return null

  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: piece.x,
            top: piece.y,
            transform: `rotate(${piece.rotation}deg)`,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.shape !== 'star' ? piece.color : 'transparent',
            borderRadius: piece.shape === 'circle' ? '50%' : '0',
            clipPath: piece.shape === 'star'
              ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
              : undefined,
            background: piece.shape === 'star' ? piece.color : undefined,
          }}
        />
      ))}
    </div>,
    document.body
  )
}

// ============================================
// useConfetti hook for easy triggering
// ============================================

export function useConfetti() {
  const [isActive, setIsActive] = useState(false)

  const fire = useCallback(() => {
    setIsActive(true)
  }, [])

  const stop = useCallback(() => {
    setIsActive(false)
  }, [])

  const ConfettiComponent = useCallback(
    (props: Omit<ConfettiProps, 'active'>) => (
      <Confetti {...props} active={isActive} onComplete={stop} />
    ),
    [isActive, stop]
  )

  return { fire, stop, isActive, Confetti: ConfettiComponent }
}

// ============================================
// Preset confetti bursts
// ============================================

interface ConfettiBurstProps {
  trigger: boolean
  onComplete?: () => void
}

/** Success celebration - green/gold confetti */
export function SuccessConfetti({ trigger, onComplete }: ConfettiBurstProps) {
  return (
    <Confetti
      active={trigger}
      colors={['#22c55e', '#16a34a', '#fbbf24', '#f59e0b', '#84cc16']}
      particleCount={80}
      duration={2500}
      onComplete={onComplete}
    />
  )
}

/** Party celebration - rainbow confetti */
export function PartyConfetti({ trigger, onComplete }: ConfettiBurstProps) {
  return (
    <Confetti
      active={trigger}
      colors={defaultColors}
      particleCount={150}
      duration={4000}
      onComplete={onComplete}
    />
  )
}

/** Subtle celebration - muted colors */
export function SubtleConfetti({ trigger, onComplete }: ConfettiBurstProps) {
  return (
    <Confetti
      active={trigger}
      colors={['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8']}
      particleCount={50}
      duration={2000}
      onComplete={onComplete}
    />
  )
}

export default Confetti
