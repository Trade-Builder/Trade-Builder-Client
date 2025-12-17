# [CREATIVE_AI](https://enderpawar.github.io/CREATIVE_AI/)

복잡한 코드 설계 없이 머신러닝 파이프라인을 시각적으로 설계하고 Python 코드로 자동 변환할 수 있는 노드 기반 에디터입니다. [배포 링크](https://enderpawar.github.io/CREATIVE_AI/)

![Animation](https://github.com/user-attachments/assets/68fcc332-ec0b-4e4e-8048-f018ed11d5d2)

## LogicListPage 
- 작성한 로직 리스트를 보여주는 페이지입니다.
<img width="2560" height="1345" alt="image" src="https://github.com/user-attachments/assets/eae47ea8-4928-4904-a572-b05de7caca26" />
<details> 
  <summary>LogicListPage 세부 기능 소개(클릭)</summary>

1. 다크모드/ 라이트모드 토글 기능 
![LogicListPage](https://github.com/user-attachments/assets/462ad6c9-1781-4274-b160-01abc0f4b70b)
- 사용자 선호 환경에 따라 다크모드 / 라이트모드로 전환할 수 있습니다.

2. 로직 리스트 순서 바꾸기 기능 
![LogicListPage-index change](https://github.com/user-attachments/assets/98b56d2a-2ccc-447b-bd40-30e47e5f1ca6)
- 작성한 로직 리스트의 순서를 바꿀 수 있습니다.
</details>

## LogicEditorPage
- 파이프라인 로직을 편집할 수 있는 페이지입니다.
<img width="2560" height="1347" alt="image" src="https://github.com/user-attachments/assets/a54b0bb8-f359-4de5-a02a-0f2f4ae8dbd9" />
<details>
  <summary>LogicEditorPage 세부 기능 소개(클릭)</summary>
  
1. 비주얼 노드 시각화 
![LogicEditorPage-node create](https://github.com/user-attachments/assets/7e7f9e9f-2fe8-4598-babc-2247f849d72b)
![LogicEditorPage2](https://github.com/user-attachments/assets/d8ff0d92-614f-4278-94f6-11c1c0e0f930)
- 좌측 사이드바에서 노드를 끌어와 배치하여 코드를 완성해보세요. AI 학습 코드를 생성하기 위해 복잡한 코드 설계가 필요 없이 비주얼 노드를 이용하여 보다 직관적으로 코드를 설계할 수 있습니다. 
  
2. shift+좌클릭으로 캔버스 영역 내 노드 중복 선택 & 삭제/복사/잘라내기/붙여넣기 메뉴 홀더
![LogicEditorPage-drag modal](https://github.com/user-attachments/assets/2324d725-92af-4e72-ba18-9246996b6ac8)
- 편리한 드래그 홀더 기능을 통해 쉽게 파이프라인 캔버스를 편집할 수 있습니다.

3. Gemini API 노드 배치 가이드 
![LogicEditorPage-nodeguide](https://github.com/user-attachments/assets/7b8f8b36-2e0f-4e77-9aa7-adddd9d7f116)
- 파이썬 코드에 대한 지식이 전무한 초보자도 gemini api가 제공하는 노드별 기능 설명 및 input output 배치 가이드를 통해 파이프라인 설계를 보다 쉽게 학습할 수 있습니다

4. AI 생성기반 노드 자동 배치  
![LogicEditorPage-canvas auto set](https://github.com/user-attachments/assets/93bcda2e-ae76-4a72-ba1f-16fbddd30398)
- 복잡하게 노드를 일일히 배치할 필요없이 Gemini가 작성한 노드 배치 가이드를 토대로 캔버스에 노드를 자동배치할 수 있습니다.

5. 작성한 코드는 py, ipynb(주피터) 코드로 다운 가능
![LogicEditorPage-pythoncode](https://github.com/user-attachments/assets/34af6453-1f6e-4b80-99ae-323b662795b3)
- 배치한 노드 파이프라인은 json 파일로 저장된 후, pipelineTocode 기능을 통해 json 파일에서 python 코드로 파싱되어 사용자가 의도한 AI 학습 코드를 출력합니다. 파싱된 AI 코드는 py 또는 ipynb 파일로 다운로드 가능합니다.
</details>

### 사용 예시 영상 : https://www.youtube.com/watch?v=rLLQUx_rLU4
<img width="1838" height="986" alt="image" src="https://github.com/user-attachments/assets/ab49808e-b9c0-4f77-90a7-a2a2b3c2ae80" />
- 대학생의 주간 학습 시간, 수면 시간, 이전 학기 학점을 기반으로 현재 학기의 예상 학점(평점)을 예측하는 선형 회귀(Regression) 문제 시나리오를 기준으로 파이썬코드를 출력하는 데모 영상을 보여드립니다. 사용된 csv는 현재 github 리포지토리 내 example 폴더에 있습니다

### 사용 예시 영상(ver2.1 캔버스에 노드 자동 배치 기능) : https://youtu.be/W5-blXBJotk
<img width="2553" height="1171" alt="image" src="https://github.com/user-attachments/assets/e7d2672e-5f3d-4db0-82d6-a3cea71f3225" />
- 캔버스에 노드를 자동 배치하는 기능을 추가한 데모 영상입니다.

## 주요 기능 요약

### 시각적 노드 에디터
- 드래그 앤 드롭으로 ML 파이프라인 구성
- 10가지 전문 ML 노드 타입 제공
- 실시간 그래프 시각화

###  AI 자동 생성 (NEW!)
- **Gemini AI 통합**: 자연어 프롬프트로 파이프라인 자동 생성
- 예시: "아이리스 데이터로 꽃 분류하는 랜덤 포레스트 모델 만들어줘"
- 노드 배치 및 연결 자동화

### 데이터 관리
- CSV 파일 업로드 및 관리
- 데이터 미리보기 (행/열 개수, 샘플 표시)
- Base64 인코딩으로 코드에 데이터 임베딩

### Python 코드 생성
- 노드 그래프 → Python 코드 자동 변환
- Jupyter Notebook (.ipynb) 내보내기
- Python 스크립트 (.py) 다운로드
- 토폴로지 정렬로 실행 순서 최적화

## 시작하기

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

### Gemini AI 설정 
- 해당 프로그램은 Tier 1 이상 Gemini api 에서 작동합니다. Google AI Studio API는 Tier 1 단계까지 무료 발급이 가능하므로 API 발급 후 사용해주시길 바랍니다. 
 [Google AI Studio](https://aistudio.google.com/app/apikey)에서 무료 API 키 발급


## 🎯 사용 가능한 노드

1. **Data Loader** - CSV 데이터 로드
2. **Preprocessor** - 데이터 전처리
3. **Data Split** - Train/Test 분할
4. **Scaler** - 데이터 정규화/스케일링
5. **Feature Selection** - 특성 선택
6. **Classifier** - 분류 모델 (Logistic, RandomForest, SVM 등)
7. **Regressor** - 회귀 모델 (Linear, Ridge, Lasso 등)
8. **Neural Network** - 신경망 모델
9. **Evaluate** - 모델 평가
10. **Predict** - 예측 수행
11. **Clustering** - 클러스터링
12. **Hyperparam Tune** - 하이퍼파라미터 튜닝

## 🔧 기술 스택

- **React 19** - UI 프레임워크
- **Vite** - 빌드 도구
- **Rete.js** - 노드 에디터 라이브러리 ([공식문서](https://retejs.org/))
- **TypeScript** - 타입 안전성
- **Gemini AI** - 자동 파이프라인 생성
- **localStorage** - 데이터 영속성

## 📖 사용 예시

### 1. 수동으로 파이프라인 구성
1. 좌측 사이드바에서 "Data Loader" 노드를 드래그
2. "Data Split" → "Scaler" → "Classifier" -> "..." 순서로 추가
3. 노드 간 연결 (출력 → 입력)
4. 각 노드의 파라미터 설정
5. "코드 생성" 버튼으로 Python 코드 확인

### 2. AI로 자동 생성 (NEW!)
1. 우측 "🤖 AI 파이프라인 생성" 섹션으로 이동
2. 프롬프트 입력: "이 시나리오는 **"대학생의 주간 학습 시간, 수면 시간, 이전 학기 학점"**을 기반으로 **"현재 학기의 예상 학점(평점)"**을 예측하는 선형 회귀(Regression) 문제입니다."
3. "✨ AI로 파이프라인 생성하기" 클릭
4. 자동 생성된 노드 확인 및 수정

### 3. 코드 내보내기
- **Jupyter Notebook**: 셀 단위로 구성된 .ipynb 파일
- **Python Script**: 실행 가능한 .py 파일
- **미리보기**: 코드 확인 후 복사 가능

## 🌟 주요 업데이트

### v2.1 - AI 캔버스 자동배치 기능
- 캔버스에 추가하기 버튼을 눌러 노드를 자동 배치

### v2.0 - AI 자동 생성 추가
- Gemini AI 통합
- 자연어 프롬프트 지원
- 자동 노드 배치 및 연결

### v1.0 - ML Pipeline Builder
- 10가지 ML 노드 구현
- Python 코드 자동 생성
- CSV 데이터 관리
- Jupyter Notebook 내보내기

## 📝 라이선스

MIT License

---

> ### 이전 프로젝트 히스토리

본 프로젝트의 UI는 Trade Builder(노드 기반 주식매매 프로그램 - 동아리 팀 프로젝트)의 UI를 개선시켜 제작되었습니다. 
CREATIVE AI의 제작자(enderpawar)는 해당 프로젝트에서 프론트엔드 파트를 담당하였으며, Rete js를 사용해 UI를 직접 개발하였습니다. 
다른 사람이 작성한 코드 없이 이전 프로젝트에서 오직 본인이 작성한 UI를 개선시켜 CREATIVE AI에서 노드 편집기 및 메인 페이지로 활용하였음을 공지합니다.
프로젝트 주소 : https://github.com/Trade-Builder/Trade-Builder-Client
<details>
<summary>레거시 문서 보기</summary>


> ### 메인 화면: 
<img width="3840" height="2160" alt="image" src="https://github.com/user-attachments/assets/71f293be-4334-40ee-a3a5-17ad7654dac9" />


> ### 에디터 화면:
<img width="3840" height="2160" alt="image" src="https://github.com/user-attachments/assets/c26b5160-7989-4672-8f78-2b7108de1844" />

</details>
