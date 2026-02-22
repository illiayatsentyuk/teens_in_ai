import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import '../styles/Dictionary.css'

function Dictionary() {
    const [items, setItems] = useState([])
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const listRef = useRef(null)

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('dictionary') || '[]')
        setItems(saved)
    }, [])

    const deleteItem = (id) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return
        const updated = items.filter(item => item.id !== id)
        setItems(updated)
        localStorage.setItem('dictionary', JSON.stringify(updated))
    }

    const downloadPDF = async () => {
        const element = listRef.current
        if (!element) return

        // Hide buttons temporarily if needed, but we targeting listRef which doesn't have them
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        })

        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')

        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`${Date.now()}_dictionary.pdf`)
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
                                    <button className="delete-btn" data-html2canvas-ignore onClick={() => deleteItem(item.id)}>
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default Dictionary
