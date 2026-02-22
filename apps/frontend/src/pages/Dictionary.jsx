import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import '../styles/Dictionary.css'

function Dictionary() {
    const [items, setItems] = useState([])
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [sentenceState, setSentenceState] = useState({})
    const [isSentenceStarted, setIsSentenceStarted] = useState(false)
    const [loadingItemId, setLoadingItemId] = useState(null)
    const listRef = useRef(null)

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('dictionary') || '[]')
        setItems(saved)
    }, [])

    const createSentence = async (id, resultText) => {
        setLoadingItemId(id)
        setIsSentenceStarted(true)
        const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || 'http://localhost:3000'

        try {
            const wordsArray = resultText.split('-').map(w => w.trim())
            const response = await fetch(`${apiUrl}/sentence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: wordsArray }),
            })
            const data = await response.json()
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data

            const sentence = parsedData.sentence || parsedData.text || ""
            const translated = parsedData.translatedSentences || parsedData.translatedSentence || ""

            setSentenceState(prev => ({
                ...prev,
                [id]: { sentence, translated }
            }))
        } catch (err) {
            console.error('Failed to generate sentence:', err)
            alert('Failed to generate sentence. Please try again.')
        } finally {
            setIsSentenceStarted(false)
            setLoadingItemId(null)
        }
    }
    const deleteItem = (id) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return
        const updated = items.filter(item => item.id !== id)
        setItems(updated)
        localStorage.setItem('dictionary', JSON.stringify(updated))
    }

    const downloadPDF = async () => {
        const element = listRef.current
        if (!element) return

        const PDF_CAPTURE_WIDTH = 960

        // Clone off-screen so the visible layout is never disturbed
        const clone = element.cloneNode(true)
        clone.style.cssText = `
            position: fixed;
            top: -99999px;
            left: -99999px;
            width: ${PDF_CAPTURE_WIDTH}px;
            z-index: -1;
            pointer-events: none;
        `
        const cloneList = clone.querySelector('.dictionary-list')
        if (cloneList) {
            cloneList.style.gridTemplateColumns = `repeat(1, ${PDF_CAPTURE_WIDTH - 40}px)`
            cloneList.style.maxWidth = `${PDF_CAPTURE_WIDTH}px`
        }
        document.body.appendChild(clone)

        // Capture the full list height from the clone
        const canvas = await html2canvas(clone, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            height: clone.scrollHeight,
            width: PDF_CAPTURE_WIDTH,
            windowHeight: clone.scrollHeight,
            windowWidth: PDF_CAPTURE_WIDTH,
            scrollX: 0,
            scrollY: 0,
        })

        document.body.removeChild(clone)

        const pdf = new jsPDF('p', 'mm', 'a4')
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfPageHeight = pdf.internal.pageSize.getHeight()

        // --- Title bar on page 1 ---
        const titleH = 24
        pdf.setFillColor(47, 6, 76)
        pdf.rect(0, 0, pdfWidth, titleH, 'F')

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(18)
        pdf.setTextColor(255, 255, 255)
        pdf.text('Perekladon(by RoboLegion)', pdfWidth / 2, 15, { align: 'center' })

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor(200, 200, 200)
        pdf.text(new Date().toLocaleDateString('uk-UA'), pdfWidth - 6, 20, { align: 'right' })

        // Separator line
        pdf.setDrawColor(57, 137, 222)
        pdf.setLineWidth(0.8)
        pdf.line(0, titleH, pdfWidth, titleH)

        const contentY = titleH + 4

        // --- Content image ---
        const imgData = canvas.toDataURL('image/png')
        const pdfImgWidth = pdfWidth
        const pdfImgHeight = (canvas.height * pdfImgWidth) / canvas.width

        // Draw the image starting after the title on page 1
        pdf.addImage(imgData, 'PNG', 0, contentY, pdfImgWidth, pdfImgHeight)

        // Add extra pages if the content is taller than the first page
        let contentShown = pdfPageHeight - contentY
        let page = 1
        while (contentShown < pdfImgHeight) {
            pdf.addPage()
            pdf.addImage(imgData, 'PNG', 0, contentY - page * pdfPageHeight, pdfImgWidth, pdfImgHeight)
            contentShown += pdfPageHeight
            page++
        }

        pdf.save(`${Date.now()}_dictionary.pdf`)
    }

    const deleteAllItems = () => {
        if (!window.confirm('Are you sure you want to delete all items?')) return
        setItems([])
        localStorage.removeItem('dictionary')
    }

    return (
        <div className="dictionary-container">
            <header className="dictionary-header">
                <div className="burger-menu-icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                    <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                    <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                </div>

                <div className={`mobile-nav-overlay ${isMenuOpen ? 'open' : ''}`}>
                    <Link to="/" onClick={() => setIsMenuOpen(false)} className="nav-link">Home</Link>
                    <Link to="/dictionary" onClick={() => setIsMenuOpen(false)} className="nav-link">Dictionary</Link>
                </div>

                <div className="desktop-only">
                    <Link to="/" className="doodle-button">
                        ← Back
                    </Link>
                </div>
                <h1>Your Dictionary</h1>
                {items.length > 0 ? (
                    <button onClick={downloadPDF} className="doodle-button download-btn">
                        📦 PDF
                    </button>
                ) : <div style={{ width: '40px' }}></div>}
            </header>

            {items.length === 0 ? (
                <div className="empty-state">
                    <p>Your dictionary is empty. Snap some photos to add items!</p>
                </div>
            ) : (
                <div ref={listRef} className="dictionary-content">
                    <ul className="dictionary-list">
                        {items.map(item => (
                            <li key={item.id} className="dictionary-item">
                                <div className="item-visual">
                                    <img src={item.image} alt="thumbnail" className="item-thumbnail" />
                                </div>
                                <div className="item-info">
                                    <span className="item-date">{item.date}</span>
                                    <div className="item-lang">{item.language}</div>
                                    <div className="item-result">{item.result}</div>
                                    <div className="item-actions" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <button className="delete-btn" data-html2canvas-ignore onClick={() => deleteItem(item.id)}>
                                            Delete
                                        </button>
                                        <button
                                            className="doodle-button"
                                            data-html2canvas-ignore
                                            onClick={() => createSentence(item.id, item.result)}
                                            disabled={isSentenceStarted && loadingItemId === item.id}
                                            style={{ fontSize: '0.9rem', padding: '5px 15px' }}
                                        >
                                            {loadingItemId === item.id ? '...' : (sentenceState[item.id] ? 'Regenerate' : 'Create Sentence')}
                                        </button>
                                    </div>
                                    {sentenceState[item.id] && (
                                        <div className="generated-sentence" style={{
                                            marginTop: '15px',
                                            padding: '12px',
                                            background: '#f8f9ff',
                                            borderRadius: '10px',
                                            borderLeft: '4px solid var(--bg-blue)',
                                            fontSize: '0.95rem',
                                            lineHeight: '1.4'
                                        }}>
                                            <div style={{ marginBottom: '6px' }}>
                                                <strong>Sentence:</strong> {sentenceState[item.id].sentence}
                                            </div>
                                            {sentenceState[item.id].translated && (
                                                <div style={{ color: '#444' }}>
                                                    <strong>Translated:</strong> {sentenceState[item.id].translated}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                        <button className="delete-btn" data-html2canvas-ignore style={{ alignSelf: 'flex-start', marginTop: '20px', fontSize: '1.2rem' }} onClick={() => deleteAllItems()}>
                            Delete All
                        </button>
                    </ul>
                </div>
            )}
        </div>
    )
}

export default Dictionary
