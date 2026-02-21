import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import '../styles/Dictionary.css'

function Dictionary() {
    const [items, setItems] = useState([])
    const listRef = useRef(null)

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('dictionary') || '[]')
        setItems(saved)
    }, [])

    const deleteItem = (id) => {
        if (!window.confirm('Ви впевнені, що хочете видалити цей запис?')) return
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
        pdf.save('dictionary.pdf')
    }

    return (
        <main className="dictionary-container">
            <nav className="dictionary-header">
                <div>
                    <Link to="/" className="back-link">← Назад до аналізу</Link>
                    <h1>Ваші збережені результати</h1>
                </div>
                {items.length > 0 && (
                    <button onClick={downloadPDF} className="download-btn">
                        Завантажити PDF
                    </button>
                )}
            </nav>

            {items.length === 0 ? (
                <div className="empty-state">
                    <p>У словнику поки що немає записів.</p>
                </div>
            ) : (
                <div ref={listRef} style={{ background: 'white', padding: '10px' }}>
                    <h2 style={{ paddingLeft: '20px' }}>Ваш Словник</h2>
                    <ul className="dictionary-list">
                        {items.map(item => (
                            <li key={item.id} className="dictionary-item">
                                <div className="item-visual">
                                    <img src={item.image} alt="thumbnail" className="item-thumbnail" />
                                </div>
                                <div className="item-info">
                                    <span className="item-date">{item.date}</span>
                                    <div className="item-lang"><strong>Мова:</strong> {item.language}</div>
                                    <div className="item-result">{item.result}</div>
                                    <button className="delete-btn" data-html2canvas-ignore onClick={() => deleteItem(item.id)}>Видалити</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </main>
        
    )
}

export default Dictionary
