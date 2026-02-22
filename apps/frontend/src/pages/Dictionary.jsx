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

        // Temporarily widen the list so cards fill the PDF page width
        const PDF_CAPTURE_WIDTH = 960
        const listEl = element.querySelector('.dictionary-list')
        const prevElementWidth = element.style.width
        const prevListCols = listEl ? listEl.style.gridTemplateColumns : ''
        const prevListMaxWidth = listEl ? listEl.style.maxWidth : ''

        element.style.width = `${PDF_CAPTURE_WIDTH}px`
        if (listEl) {
            listEl.style.gridTemplateColumns = `repeat(1, ${PDF_CAPTURE_WIDTH - 40}px)`
            listEl.style.maxWidth = `${PDF_CAPTURE_WIDTH}px`
        }

        // Capture the full list, not just the visible viewport
        const canvas = await html2canvas(element, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            height: element.scrollHeight,
            width: PDF_CAPTURE_WIDTH,
            windowHeight: element.scrollHeight,
            windowWidth: PDF_CAPTURE_WIDTH,
            scrollX: 0,
            scrollY: 0,
        })

        // Restore original styles
        element.style.width = prevElementWidth
        if (listEl) {
            listEl.style.gridTemplateColumns = prevListCols
            listEl.style.maxWidth = prevListMaxWidth
        }

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
        pdf.text('Your Dictionary', pdfWidth / 2, 15, { align: 'center' })

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

    return (
        <div className="dictionary-container">
            <header className="dictionary-header">
                <div>
                    <Link to="/" className="doodle-button">
                        ← Назад
                    </Link>
                </div>
                <h1>Ваш Словник</h1>
                {items.length > 0 && (
                    <button onClick={downloadPDF} className="doodle-button download-btn">
                        📦 PDF
                    </button>
                )}
            </header>

            {items.length === 0 ? (
                <div className="empty-state">
                    <p>У словнику поки що немає записів. Сфотографуйте щось!</p>
                </div>
            ) : (
                <div ref={listRef} className="dictionary-content">
                    <ul  className="dictionary-list">
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
                                        Видалити
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
