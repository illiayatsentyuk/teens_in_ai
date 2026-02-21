import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'

const MAX_DOTS = 3

function Home() {
    const [preview, setPreview] = useState(null)
    const [dots, setDots] = useState([]) // up to 3 points: [{ x, y }, ...]
    const [langFrom, setLangFrom] = useState('Ukrainian')
    const [langTo, setLangTo] = useState('English')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [showCamera, setShowCamera] = useState(false)
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
            setShowCamera(true)
        } catch (err) {
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
        if (!preview) return alert('Upload image first')
        if (dots.length === 0) return alert('Click on the image to place at least one dot (up to 3)')
        setLoading(true)
        setResult({ textFrom: 'Analyzing...', textTo: '...', thumbnail: null, elements: [] })

        const pointsDescription = dots.map((d, i) => `Point ${i + 1}: X:${d.x}%, Y:${d.y}%`).join('; ')

        const promptText = `The user marked ${dots.length} point(s) on this image at the following coordinates (percentage of image width and height): ${pointsDescription}.

For each marked point:
1. Identify the visible element at that location (object, text, region of interest).
2. Stroke (outline) that element — i.e. define its boundary.
3. Return the coordinates of that stroke for each element.

Provide your response as JSON with an "elements" array. Each element must have:
- "textFrom": name or description in ${langFrom}
- "textTo": name or description in ${langTo}
- "bbox": [ymin, xmin, ymax, xmax] — the bounding box of the stroked outline, in 0–1000 scale (e.g. 0,0 = top-left, 1000,1000 = bottom-right of the image).

If there is only one point, you may instead return a single object with "textFrom", "textTo", and "bbox" at the top level for backward compatibility.
Respond ONLY with the JSON object, no other text.`

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-5.2',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: promptText },
                            { type: 'image_url', image_url: { url: preview } }
                        ]
                    }],
                    response_format: { type: "json_object" }
                })
            })
            const data = await response.json()
            const parsed = JSON.parse(data.choices[0].message.content)

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
        const saved = JSON.parse(localStorage.getItem('dictionary') || '[]')
        const newItem = {
            id: Date.now() + index,
            image: item.thumbnail || preview,
            result: `${item.textFrom} - ${item.textTo}`,
            language: `${langFrom} -> ${langTo}`,
            date: new Date().toLocaleString()
        }
        localStorage.setItem('dictionary', JSON.stringify([newItem, ...saved]))
        alert('Збережено у словник!')
    }

    const saveToDictionary = () => {
        const saved = JSON.parse(localStorage.getItem('dictionary') || '[]')
        const itemsToSave = []

        if (result.elements && result.elements.length > 0) {
            result.elements.forEach((el, index) => {
                itemsToSave.push({
                    id: Date.now() + index,
                    image: el.thumbnail || preview,
                    result: `${el.textFrom} - ${el.textTo}`,
                    language: `${langFrom} -> ${langTo}`,
                    date: new Date().toLocaleString()
                })
            })
        } else {
            itemsToSave.push({
                id: Date.now(),
                image: result.thumbnail || preview,
                result: `${result.textFrom} - ${result.textTo}`,
                language: `${langFrom} -> ${langTo}`,
                date: new Date().toLocaleString()
            })
        }

        localStorage.setItem('dictionary', JSON.stringify([...itemsToSave, ...saved]))
        alert(`Збережено ${itemsToSave.length} пунктів у словник!`)
    }

    return (
        <main>
            <nav>
                <Link to="/dictionary">Відкрити словник</Link>
            </nav>

            <div>
                <input type="file" onChange={handleImageUpload} accept="image/*" />
                <button onClick={startCamera}>📷 Take Photo</button>
            </div>

            {showCamera && (
                <div>
                    <video ref={videoRef} autoPlay style={{ maxWidth: '100%' }}></video>
                    <div>
                        <button onClick={capturePhoto}>Capture</button>
                        <button onClick={stopCamera}>Cancel</button>
                    </div>
                </div>
            )}

            <div>
                {dots.length > 0 && <button type="button" onClick={clearDots}>Clear all dots</button>}

                <div>
                    <span>З: </span>
                    <select value={langFrom} onChange={e => setLangFrom(e.target.value)}>
                        <option value="Ukrainian">Ukrainian</option>
                        <option value="English">English</option>
                    </select>
                    <span> На: </span>
                    <select value={langTo} onChange={e => setLangTo(e.target.value)}>
                        <option value="English">English</option>
                        <option value="Ukrainian">Ukrainian</option>
                    </select>
                </div>

                <button onClick={analyzeImage} disabled={loading || dots.length === 0}>
                    {loading ? '...' : 'Analyze'}
                </button>
            </div>

            {preview && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                        src={preview}
                        onClick={handleImageClick}
                        alt="preview"
                        style={{ maxWidth: '100%', cursor: dots.length >= MAX_DOTS ? 'default' : 'crosshair' }}
                    />
                    {dots.map((dot, index) => (
                        <div
                            key={index}
                            onClick={(e) => { e.stopPropagation(); removeDot(index) }}
                            style={{
                                position: 'absolute',
                                left: `${dot.x}%`,
                                top: `${dot.y}%`,
                                width: '14px',
                                height: '14px',
                                background: 'red',
                                borderRadius: '50%',
                                transform: 'translate(-50%, -50%)',
                                cursor: 'pointer',
                                zIndex: 2,
                                border: '2px solid white',
                                boxSizing: 'border-box'
                            }}
                            title={`Point ${index + 1} (click to remove)`}
                        >
                            <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: 9, color: 'white', fontWeight: 'bold' }}>{index + 1}</span>
                        </div>
                    ))}

                    {result?.elements?.length > 0 && result.elements.map((el, i) => {
                        const dot = dots[i]
                        if (!dot) return null
                        return (
                            <div key={i} style={{
                                position: 'absolute',
                                left: `${dot.x}%`,
                                top: `${dot.y}%`,
                                transform: 'translate(15px, -50%)',
                                zIndex: 10,
                                background: 'white',
                                padding: '4px 8px',
                                border: '1px solid black',
                                borderRadius: '4px',
                                fontSize: '12px',
                                minWidth: '100px',
                                boxShadow: '2px 2px 5px rgba(0,0,0,0.2)'
                            }}>
                                {el.textFrom}: {el.textTo}
                                <div style={{ marginTop: '4px' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); saveItemToDictionary(el, i) }}
                                        style={{ fontSize: '10px', cursor: 'pointer' }}
                                    >
                                        Зберегти
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {result && !loading && (
                <div style={{ marginTop: '15px' }}>
                    <button
                        onClick={saveToDictionary}
                        style={{
                            padding: '10px 15px',
                            background: 'black',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Зберегти все
                    </button>
                    <button
                        onClick={clearDots}
                        style={{ marginLeft: '10px', padding: '10px 15px', cursor: 'pointer' }}
                    >
                        Очистити
                    </button>
                </div>
            )}
        </main>
    )
}

export default Home
