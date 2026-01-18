'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Volume2, TreeDeciduous, Database, ArrowDown, Check } from 'lucide-react'

interface Slide {
  id: number
  title: string
  script: string
  visual: React.ReactNode
}

interface EmbeddedVideoPlayerProps {
  title?: string
  slides?: Slide[]
  autoPlay?: boolean
}

// Default slides for "Trees in Java" explanation
const defaultSlides: Slide[] = [
  {
    id: 0,
    title: "What are Trees in Java?",
    script: "Welcome. Today we're answering the question: What are Trees in Java? Unlike arrays or lists which are linear, a Tree is a hierarchical data structure.",
    visual: (
      <div className="flex flex-col items-center justify-center h-full animate-in">
        <div className="bg-green-100 p-8 rounded-full mb-6 shadow-lg border-4 border-green-500">
          <TreeDeciduous size={80} className="text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800">Hierarchical Data</h2>
        <div className="flex gap-4 mt-6">
          <div className="bg-red-100 p-4 rounded text-center opacity-50">
            <div className="w-16 h-4 bg-red-300 mb-2 rounded"></div>
            <p className="text-xs font-mono">Array (Linear)</p>
          </div>
          <div className="bg-green-100 p-4 rounded text-center border-2 border-green-500 shadow-lg">
            <div className="flex justify-center mb-1"><div className="w-4 h-4 bg-green-500 rounded-full"></div></div>
            <div className="flex gap-2 justify-center"><div className="w-4 h-4 bg-green-400 rounded-full"></div><div className="w-4 h-4 bg-green-400 rounded-full"></div></div>
            <p className="text-xs font-mono mt-2">Tree (Hierarchical)</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 1,
    title: "Anatomy of a Tree",
    script: "A tree starts with a single Root node. This node branches out to Child nodes. Nodes with no children are called Leaves.",
    visual: (
      <div className="relative w-full max-w-md h-64 flex flex-col items-center justify-center pt-4">
        <div className="z-10 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg font-bold mb-8 animate-bounce">Root</div>
        <div className="absolute top-16 w-32 h-8 border-t-2 border-l-2 border-r-2 border-slate-400 rounded-t-xl"></div>
        <div className="flex gap-12 w-full justify-center">
          <div className="flex flex-col items-center">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-300 font-semibold mb-6">Parent</div>
            <div className="w-0.5 h-6 bg-slate-400 mb-1"></div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full border border-green-300 text-sm">Leaf</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-300 font-semibold mb-6">Parent</div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-slate-400 mb-1 rotate-12"></div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full border border-green-300 text-sm">Leaf</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-slate-400 mb-1 -rotate-12"></div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full border border-green-300 text-sm">Leaf</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Java Implementation",
    script: "In Java, we don't usually implement trees from scratch. We use the Collections Framework: specifically TreeSet and TreeMap.",
    visual: (
      <div className="flex flex-col gap-4 w-full max-w-lg">
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-orange-500 flex items-center gap-4 transition-all duration-500 hover:scale-105">
          <Database className="text-orange-500" />
          <div>
            <h3 className="font-mono text-lg font-bold">java.util.TreeSet</h3>
            <p className="text-sm text-slate-500">Stores unique elements in sorted order.</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-purple-500 flex items-center gap-4 transition-all duration-500 hover:scale-105">
          <Database className="text-purple-500" />
          <div>
            <h3 className="font-mono text-lg font-bold">java.util.TreeMap</h3>
            <p className="text-sm text-slate-500">Stores Key-Value pairs, sorted by Key.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Under the Hood: Red-Black Tree",
    script: "These classes use a Red-Black Tree algorithm internally. This is a self-balancing binary search tree.",
    visual: (
      <div className="flex items-center justify-center gap-2">
        <div className="relative">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold border-4 border-red-500 shadow-xl z-10">50</div>
          </div>
          <div className="flex justify-between w-48 border-t-2 border-slate-300 pt-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold border-4 border-black">20</div>
            <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold border-4 border-red-500">70</div>
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center mt-12">
            <p className="text-sm font-bold text-red-600 bg-red-100 inline-block px-2 py-1 rounded">Self-Balancing</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Why use them?",
    script: "Because they are balanced, operations like adding, removing, and searching are extremely fast, taking O(log N) time. Use them when you need your data sorted.",
    visual: (
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 flex flex-col items-center">
          <div className="text-3xl font-bold text-emerald-600 mb-2">O(log n)</div>
          <p className="text-center text-sm text-emerald-800">Fast Search</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex flex-col items-center">
          <ArrowDown className="text-blue-500 mb-2" />
          <p className="text-center text-sm text-blue-800">Always Sorted</p>
        </div>
        <div className="col-span-2 bg-slate-800 text-white p-4 rounded-lg font-mono text-sm shadow-inner">
          <span className="text-purple-400">TreeSet</span>&lt;<span className="text-yellow-400">Integer</span>&gt; nums = <span className="text-blue-400">new</span> ...;<br/>
          nums.add(5);<br/>
          nums.add(1); <span className="text-slate-500">// stored as [1, 5]</span>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Summary",
    script: "That's trees in a nutshell. Hierarchical, Sorted, and Efficient. Thanks for watching.",
    visual: (
      <div className="text-center animate-in">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-6 shadow-lg">
          <Check size={48} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Done!</h2>
        <p className="text-slate-600 mt-2">Java Trees Explained.</p>
      </div>
    )
  }
]

export function EmbeddedVideoPlayer({ title = "Trees in Java", slides = defaultSlides, autoPlay = false }: EmbeddedVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const [voiceAvailable, setVoiceAvailable] = useState(true)
  
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis
    } else {
      setVoiceAvailable(false)
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  const speakSlide = (index: number) => {
    if (!synthRef.current) return

    synthRef.current.cancel()

    const slide = slides[index]
    const utterance = new SpeechSynthesisUtterance(slide.script)
    utteranceRef.current = utterance

    const voices = synthRef.current.getVoices()
    const preferredVoice = voices.find(v => v.name.includes("Google US English")) || voices.find(v => v.lang.startsWith('en'))
    if (preferredVoice) utterance.voice = preferredVoice
    
    utterance.rate = 1.0
    utterance.pitch = 1.0

    utterance.onend = () => {
      if (index < slides.length - 1) {
        setCurrentSlide(index + 1)
        setTimeout(() => speakSlide(index + 1), 500)
      } else {
        setIsPlaying(false)
      }
    }

    utterance.onerror = () => {
      setTimeout(() => {
        if (index < slides.length - 1) {
          setCurrentSlide(index + 1)
          speakSlide(index + 1)
        } else {
          setIsPlaying(false)
        }
      }, 3000)
    }

    synthRef.current.speak(utterance)
  }

  const handlePlay = () => {
    setIsPlaying(true)
    setHasStarted(true)
    
    if (currentSlide === slides.length - 1) {
      setCurrentSlide(0)
      speakSlide(0)
    } else {
      if (synthRef.current && synthRef.current.paused) {
        synthRef.current.resume()
      } else {
        speakSlide(currentSlide)
      }
    }
  }

  const handlePause = () => {
    setIsPlaying(false)
    if (synthRef.current) {
      synthRef.current.pause()
    }
  }

  const handleReset = () => {
    setIsPlaying(false)
    setHasStarted(false)
    setCurrentSlide(0)
    if (synthRef.current) {
      synthRef.current.cancel()
    }
  }

  useEffect(() => {
    if (autoPlay && !hasStarted) {
      handlePlay()
    }
  }, [autoPlay])

  return (
    <div className="bg-white w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl flex flex-col relative border border-slate-200">
      {/* Screen Area */}
      <div className="flex-1 bg-gradient-to-br from-indigo-50 to-blue-50 relative flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10">
          <div className="bg-white/80 backdrop-blur px-4 py-1 rounded-full text-xs font-bold tracking-wider text-indigo-900 uppercase shadow-sm">
            Java Concepts Series
          </div>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
        </div>

        {/* Main Content Stage */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 z-0">
          {!hasStarted ? (
            <div className="text-center animate-in">
              <div 
                className="bg-indigo-600 text-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200 cursor-pointer hover:scale-110 transition-transform"
                onClick={handlePlay}
              >
                <Play size={32} fill="currentColor" className="ml-1" />
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{title}</h1>
              <p className="text-slate-500">1 Minute Explanation • AI Narrated</p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-3xl font-bold text-indigo-950 mb-2">{slides[currentSlide].title}</h2>
              </div>
              <div className="flex-1 w-full flex items-center justify-center">
                {slides[currentSlide].visual}
              </div>
            </>
          )}
        </div>

        {/* Subtitles */}
        {hasStarted && (
          <div className="absolute bottom-20 left-0 right-0 px-12 text-center">
            <div className="bg-black/70 backdrop-blur-sm text-white py-3 px-6 rounded-xl inline-block text-lg font-medium shadow-lg max-w-2xl">
              {slides[currentSlide].script}
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-20 bg-white border-t border-slate-100 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={isPlaying ? handlePause : handlePlay}
            className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
          </button>
          
          <button 
            onClick={handleReset}
            className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <RotateCcw size={18} />
          </button>

          <div className="flex flex-col ml-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Now Playing</span>
            <span className="text-sm font-semibold text-slate-800">{hasStarted ? slides[currentSlide].title : "Ready to Start"}</span>
          </div>
        </div>

        <div className="flex-1 mx-8 max-w-xs">
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-4">
            <div 
              className="h-full bg-indigo-600 transition-all duration-300 ease-linear"
              style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          {!voiceAvailable && <span className="text-xs text-red-500 font-bold mr-2">Voice Unavailable</span>}
          <Volume2 size={20} />
        </div>
      </div>
    </div>
  )
}
