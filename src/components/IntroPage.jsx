import { useState, useEffect } from 'react';
import './IntroPage.css';

const IntroPage = ({ onComplete }) => {
  const [showContent, setShowContent] = useState(false);
  const fullText = "TRADE BUILDER";
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showButton, setShowButton] = useState(false);

  // 타이핑 효과
  useEffect(() => {
    setTimeout(() => setShowContent(true), 500);
  }, []);

  useEffect(() => {
    if (!showContent) return;
    
    if (currentIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + fullText[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 80);
      return () => clearTimeout(timeout);
    } else {
      // 타이핑 완료 후 버튼 표시
      setTimeout(() => setShowButton(true), 300);
    }
  }, [currentIndex, showContent]);

  return (
    <div className="intro-page">
      {/* 배경 GIF */}
      <div className="intro-background-gif">
        <img 
          src="/인트로 애니메이션.gif" 
          alt="Background Animation"
          className="background-gif"
        />
        <div className="gif-overlay"></div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className={`intro-content ${showContent ? 'show' : ''}`}>
        <div className="intro-icon">
          <div className="icon-circle">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <path 
                d="M20 50 L35 35 L45 45 L60 25" 
                stroke="currentColor" 
                strokeWidth="4" 
                strokeLinecap="round"
                strokeLinejoin="round"
                className="chart-path"
              />
              <circle cx="20" cy="50" r="4" fill="currentColor" className="chart-dot" />
              <circle cx="35" cy="35" r="4" fill="currentColor" className="chart-dot" />
              <circle cx="45" cy="45" r="4" fill="currentColor" className="chart-dot" />
              <circle cx="60" cy="25" r="4" fill="currentColor" className="chart-dot" />
            </svg>
          </div>
        </div>

        <h1 className="intro-title">
          <span className="typing-text">
            {displayedText.split('').map((char, index) => (
              <span 
                key={index} 
                className="letter"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </span>
          <span className="cursor">|</span>
        </h1>

        <p className="intro-subtitle">
          노드 기반 비주얼 에디터로 암호화폐 자동매매를
          <br />
          쉽게 구축하세요
        </p>

        {/* 특징 카드들 */}
        <div className="feature-cards">
          <div className="feature-card" style={{ animationDelay: '0.2s' }}>
            <div className="feature-icon">🧩</div>
            <h3>노드 기반 에디터</h3>
            <p>드래그 앤 드롭으로 매매 전략 설계</p>
          </div>
          
          <div className="feature-card" style={{ animationDelay: '0.4s' }}>
            <div className="feature-icon">💹</div>
            <h3>실시간 자동매매</h3>
            <p>Upbit API 연동 즉시 실행</p>
          </div>
          
          <div className="feature-card" style={{ animationDelay: '0.6s' }}>
            <div className="feature-icon">⚡</div>
            <h3>멀티 전략 실행</h3>
            <p>여러 로직 동시 독립 운영</p>
          </div>
        </div>

        {/* 시작 버튼 */}
        <button 
          className={`start-button ${showButton ? 'show' : ''}`}
          onClick={onComplete}
        >
          시작하기
          <span className="button-arrow">→</span>
        </button>
      </div>
    </div>
  );
};

export default IntroPage;
