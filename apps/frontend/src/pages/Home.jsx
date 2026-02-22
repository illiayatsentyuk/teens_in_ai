import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import '../styles/Home.css'

const MAX_DOTS = 3

function Home() {
    const [preview, setPreview] = useState(null)
    const [dots, setDots] = useState([]) // up to 3 points: [{ x, y }, ...]
    const [langFrom, setLangFrom] = useState('Ukrainian')
    const [langTo, setLangTo] = useState('English')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [showCamera, setShowCamera] = useState(false)
    const [savedIndices, setSavedIndices] = useState([])
    const [isWarningChecked, setIsWarningChecked] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const videoRef = useRef(null)
    const streamRef = useRef(null)

    const handleImageUpload = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => setPreview(reader.result)
            reader.readAsDataURL(file)
        }
    }

    const startCamera = async () => {
        setPreview(null)
        setResult(null)
        setDots([])
        // Mount the video element first so videoRef.current exists when the stream arrives
        setShowCamera(true)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
        } catch (err) {
            setShowCamera(false)
            alert('Camera access denied: ' + err.message)
        }
    }

    const capturePhoto = () => {
        const video = videoRef.current
        if (!video || !video.videoWidth || !video.videoHeight) {
            alert('Video not ready')
            return
        }
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        setPreview(dataUrl)
        stopCamera()
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setShowCamera(false)
    }

    const handleImageClick = (e) => {
        if (dots.length >= MAX_DOTS) return
        const rect = e.target.getBoundingClientRect()
        const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100)
        const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100)
        setDots(prev => [...prev, { x: xPct, y: yPct }])
        setResult(null)
    }

    const removeDot = (index) => {
        setDots(prev => prev.filter((_, i) => i !== index))
        setResult(null)
    }

    const clearDots = () => {
        setDots([])
        setResult(null)
        setSavedIndices([])
    }

    const cropImage = (imageSrc, bbox) => {
        return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const [ymin, xmin, ymax, xmax] = bbox
                const startX = (xmin / 1000) * img.width
                const startY = (ymin / 1000) * img.height
                const width = ((xmax - xmin) / 1000) * img.width
                const height = ((ymax - ymin) / 1000) * img.height

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, startX, startY, width, height, 0, 0, width, height)
                resolve(canvas.toDataURL('image/jpeg'))
            }
            img.src = imageSrc
        })
    }

    const analyzeImage = async () => {
        if (!isWarningChecked) return alert('Please confirm that you agree not to share personal data.')
        if (!preview) return alert('Upload image first')
        if (dots.length === 0) return alert('Click on the image to place at least one dot (up to 3)')
        setLoading(true)
        setSavedIndices([])
        setResult({ textFrom: 'Analyzing...', textTo: '...', thumbnail: null, elements: [] })

        const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || 'http://localhost:3000'

        try {
            const response = await fetch(`${apiUrl}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: preview,
                    langFrom,
                    langTo,
                    dots
                })
            })
            if (!response.ok) {
                const errText = await response.text()
                throw new Error(errText || `HTTP ${response.status}`)
            }
            const jsonString = await response.json()
            const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString

            const elements = parsed.elements || (parsed.bbox ? [{ textFrom: parsed.textFrom, textTo: parsed.textTo, bbox: parsed.bbox }] : [])
            const thumbnails = await Promise.all(elements.map(el => cropImage(preview, el.bbox)))

            const elementsWithThumbnails = elements.map((el, i) => ({ ...el, thumbnail: thumbnails[i] }))

            setResult({
                textFrom: elementsWithThumbnails.map(e => e.textFrom).join('; '),
                textTo: elementsWithThumbnails.map(e => e.textTo).join('; '),
                thumbnail: elementsWithThumbnails[0]?.thumbnail ?? null,
                elements: elementsWithThumbnails
            })
        } catch (err) {
            alert('Error: ' + err.message)
            setResult(null)
        } finally {
            setLoading(false)
        }
    }

    const saveItemToDictionary = (item, index) => {
        if (savedIndices.includes(index)) return
        const saved = JSON.parse(localStorage.getItem('dictionary') || '[]')
        const newItem = {
            id: Date.now() + index,
            image: item.thumbnail || preview,
            result: `${item.textFrom} - ${item.textTo}`,
            language: `${langFrom} -> ${langTo}`,
            date: new Date().toLocaleString()
        }
        localStorage.setItem('dictionary', JSON.stringify([newItem, ...saved]))
        setSavedIndices(prev => [...prev, index])
        alert('Saved to dictionary!')
    }

    const saveToDictionary = () => {
        const saved = JSON.parse(localStorage.getItem('dictionary') || '[]')
        const itemsToSave = []
        const currentElements = result.elements || []

        currentElements.forEach((el, index) => {
            if (!savedIndices.includes(index)) {
                itemsToSave.push({
                    id: Date.now() + index,
                    image: el.thumbnail || preview,
                    result: `${el.textFrom} - ${el.textTo}`,
                    language: `${langFrom} -> ${langTo}`,
                    date: new Date().toLocaleString()
                })
            }
        })

        if (itemsToSave.length === 0) {
            alert('All items already saved!')
            return
        }

        localStorage.setItem('dictionary', JSON.stringify([...itemsToSave, ...saved]))
        setSavedIndices(prev => [...Array(currentElements.length).keys()])
        alert(`Збережено ${itemsToSave.length} пунктів у словник!`)
    }

    return (
        <div className="home-container">
            <header className="header-top">
                <Link to="/" className="logo-link">
                    <h1 className="logo">Perekladon</h1>
                </Link>
                <div className="burger-menu-icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                    <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                    <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                </div>



                <div className={`mobile-nav-overlay ${isMenuOpen ? 'open' : ''}`}>
                    <Link to="/" onClick={() => setIsMenuOpen(false)} className="nav-link">Home</Link>
                    <Link to="/dictionary" onClick={() => setIsMenuOpen(false)} className="nav-link">Dictionary</Link>
                </div>

                {/* <div className="header-left desktop-only">
                    <div className="doodle-button">
                        <span role="img" aria-label="globe">🌐</span> CHOOSE LANGUAGE
                    </div>
                     <div className="lang-selector-box">
                        <div className="lang-dropdowns">
                            <div>
                                <span>From: </span>
                                <select className="doodle-select" value={langFrom} onChange={e => setLangFrom(e.target.value)}>
                                    <option value="Ukrainian">Ukrainian</option>
                                    <option value="English">English</option>
                                </select>
                            </div>
                            <div>
                                <span> To: </span>
                                <select className="doodle-select" value={langTo} onChange={e => setLangTo(e.target.value)}>
                                    <option value="English">English</option>
                                    <option value="Ukrainian">Ukrainian</option>
                                </select>
                            </div>
                        </div>
                    </div> 
                </div> */}

                <div className="header-right desktop-only">
                    <Link to="/dictionary" className="doodle-button">
                        <span role="img" aria-label="book">📖</span> OPEN DICTIONARY
                    </Link>
                </div>
            </header>

            <main className="main-content">
                <div className="camera-box">
                    <h2 className="camera-box-title">How to use:</h2>
                    <ul style={{ color: '#ffeb3b', fontWeight: 'bold', margin: '0 0 1rem', paddingLeft: '1.25rem', lineHeight: 1.5, textAlign: 'center', listStyle: "none" }}>
                        <li>1. Upload a photo or take a photo <br />(give access to camera)</li>
                        <li>2. Click on the photo to choose an object <br />(up to 3 points)</li>
                        <li>3. Click the &quot;Analyze&quot; button</li>
                        <li>4. Save results to the dictionary</li>
                    </ul>
                    <h2 className="camera-box-title">SNAP A PHOTO!</h2>

                    <div className="preview-container">
                        {!preview && !showCamera && (
                            <div className="camera-icon-placeholder">
                                <svg viewBox="0 0 512 512" width="150" fill="currentColor" style={{ opacity: 0.8, color: 'white' }}>
                                    <path d="M512 144c0-26.5-21.5-48-48-48h-72l-20.2-40.3C363.6 39.1 347.1 32 329.7 32H182.3c-17.4 0-33.9 7.1-42.1 23.7L120 96H48C21.5 96 0 117.5 0 144v272c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V144zM256 400c-66.2 0-120-53.8-120-120s53.8-120 120-120 120 53.8 120 120-53.8 120-120 120zm0-192c-39.7 0-72 32.3-72 72s32.3 72 72 72 72-32.3 72-72-32.3-72-72-72zm112-64c-13.3 0-24-10.7-24-24s10.7-24 24-24 24 10.7 24 24-10.7 24-24 24z" />
                                </svg>
                            </div>
                        )}

                        {showCamera && (
                            <div className="camera-view">
                                <video ref={videoRef} autoPlay></video>
                                <div className="camera-overlay-controls">
                                    <button className="doodle-button" onClick={capturePhoto}>Capture</button>
                                    <button className="doodle-button" onClick={stopCamera}>Cancel</button>
                                </div>
                            </div>
                        )}

                        {preview && !showCamera && (
                            <div style={{ position: 'relative' }}>
                                <img
                                    src={preview}
                                    onClick={handleImageClick}
                                    alt="preview"
                                    style={{ width: '100%', display: 'block', cursor: dots.length >= MAX_DOTS ? 'default' : 'crosshair' }}
                                />
                                {dots.map((dot, index) => (
                                    <div
                                        key={index}
                                        onClick={(e) => { e.stopPropagation(); removeDot(index) }}
                                        style={{
                                            position: 'absolute',
                                            left: `${dot.x}%`,
                                            top: `${dot.y}%`,
                                            width: '20px',
                                            height: '20px',
                                            background: 'red',
                                            borderRadius: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            cursor: 'pointer',
                                            zIndex: 2,
                                            border: '3px solid white',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: 12, color: 'white', fontWeight: 'bold' }}>{index + 1}</span>
                                    </div>
                                ))}

                                {result?.elements?.length > 0 && result.elements.map((el, i) => {
                                    const dot = dots[i]
                                    if (!dot) return null
                                    const isRightSide = dot.x > 50
                                    const isMobile = window.innerWidth <= 480
                                    const yOffset = isMobile ? (i * 35) - 35 : (i * 45) - 45
                                    const horizontalGap = isMobile ? 15 : 35
                                    const labelMaxWidth = isMobile ? '120px' : '180px'

                                    return (
                                        <div key={i} className="dot-label" style={{
                                            position: 'absolute',
                                            left: `${dot.x}%`,
                                            top: `${dot.y}%`,
                                            transform: isRightSide
                                                ? `translate(calc(-100% - ${horizontalGap}px), calc(-50% + ${yOffset}px))`
                                                : `translate(${horizontalGap}px, calc(-50% + ${yOffset}px))`,
                                            zIndex: 20 + i,
                                            pointerEvents: 'auto',
                                            maxWidth: labelMaxWidth,
                                            fontSize: isMobile ? '0.8rem' : '1.1rem',
                                            padding: isMobile ? '4px 8px' : '8px 15px'
                                        }}>
                                            {el.textFrom}: {el.textTo}
                                            <div style={{ marginTop: '2px' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); saveItemToDictionary(el, i) }}
                                                    style={{ fontSize: isMobile ? '12px' : '14px', cursor: savedIndices.includes(i) ? 'default' : 'pointer', fontFamily: 'var(--font-doodle)', padding: '2px 3px' }}
                                                    disabled={savedIndices.includes(i)}
                                                >
                                                    {savedIndices.includes(i) ? 'Saved' : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="camera-box-footer">
                        <button className="doodle-button" onClick={startCamera}>
                            <span role="img" aria-label="camera">📷</span> OPEN CAMERA
                        </button>
                        <button
                            className="analyze-button"
                            onClick={analyzeImage}
                            disabled={loading || dots.length === 0 || !isWarningChecked}
                        >
                            {loading ? '...' : 'Analyze'}
                        </button>
                        <div className="upload-btn-wrapper">
                            <label className="doodle-button" style={{ cursor: 'pointer' }}>
                                <span role="img" aria-label="upload">📤</span> UPLOAD PHOTO
                                <input type="file" onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>
                    <div className="lang-selector-box">
                        <div className="lang-dropdowns">
                            <div>
                                <select className="doodle-select" value={langFrom} onChange={e => setLangFrom(e.target.value)}>
                                    <option value="Ukrainian">Ukrainian</option>
                                    <option value="English">English</option>
                                </select>
                            </div>
                            <div>
                                <select className="doodle-select" value={langTo} onChange={e => setLangTo(e.target.value)}>
                                    <option value="English">English</option>
                                    <option value="Ukrainian">Ukrainian</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="camera-box-warning">
                        <input
                            type="checkbox"
                            style={{ width: '20px', height: '20px' }}
                            checked={isWarningChecked}
                            onChange={(e) => setIsWarningChecked(e.target.checked)}
                        />
                        <p style={{ fontSize: '18px' }}>Do not give the system access to your personal data. All data is stored only in the browser!</p>
                    </div>
                </div>

                {result && !loading && (
                    <div className="post-analyze-actions">
                        <button
                            className="doodle-button"
                            onClick={saveToDictionary}
                            disabled={savedIndices.length === (result.elements?.length || 0)}
                            style={{ background: '#28a745', color: 'white', margin: '15px' }}
                        >
                            {savedIndices.length === (result.elements?.length || 0) ? 'Saved!' : 'Save to dictionary'}
                        </button>
                        <button
                            className="doodle-button"
                            onClick={clearDots}
                            style={{ margin: '0 auto' }}
                        >
                            Clear
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}

export default Home

