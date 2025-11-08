import Link from 'next/link'

export default function Home() {
  return (
    <div className="container">
      <div className="view active" id="mainView">
        <h1>Welcome to PokéScanner</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>
          Scan and collect your Pokemon cards digitally
        </p>
        <Link href="/scan" className="scan-button">
          Start Scanning
        </Link>
      </div>
    </div>
  )
}