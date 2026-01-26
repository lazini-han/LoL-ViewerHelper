# 이슈 분석 보고서: CORS 오류

**이슈 번호**: ISSUE-001
**발생일**: 2026-01-26
**상태**: 분석 완료, 해결 방안 선택 대기

---

## 1. 문제 요약

로컬에서 `index.html` 파일을 브라우저로 직접 열었을 때 (`file://` 프로토콜), ES6 모듈이 CORS 정책에 의해 차단되어 앱이 동작하지 않음.

### 에러 메시지

```
Access to script at 'file:///...app.js' from origin 'null' has been blocked by CORS policy:
Cross origin requests are only supported for protocol schemes: chrome, chrome-extension,
chrome-untrusted, data, http, https, isolated-app.
```

---

## 2. 원인 분석

### 왜 발생하는가?

- **ES6 모듈**(`<script type="module">`)은 보안상의 이유로 CORS 정책을 따름
- `file://` 프로토콜은 origin이 `null`로 처리되어 **same-origin** 검사에 실패
- 일반 스크립트(`<script>`)는 이 제한이 없음

### 영향 범위

- **로컬 개발 테스트**: 파일을 직접 열어서 테스트 불가
- **GitHub Pages 배포**: `https://` 프로토콜이므로 **문제 없음**

---

## 3. 해결 방안 비교

| 방안 | 설명 | 난이도 | 유지보수 영향 | 위험성 |
|------|------|--------|---------------|--------|
| **A. 로컬 서버 사용** | Live Server, http-server 등으로 테스트 | 낮음 | 없음 | 낮음 |
| **B. 빌드 도구 도입** | Vite, Webpack으로 번들링 | 중간 | 빌드 단계 추가 | 중간 |
| **C. 모듈 통합** | 모든 JS를 하나로 합침 | 낮음 | **높음 (비권장)** | 높음 |
| **D. 크롬 플래그** | 보안 플래그 비활성화 | 낮음 | 없음 | 높음 |

---

## 4. 각 방안 상세

### 방안 A: 로컬 서버 사용 (권장)

**방법**:

```bash
# VS Code Live Server 확장 사용
# 또는 터미널에서:
npx serve
# 또는
python -m http.server 8080
```

**장점**:
- 코드 수정 불필요
- ES6 모듈 구조 유지
- 실제 배포 환경과 동일한 테스트

**단점**:
- 매번 서버 실행 필요
- 터미널/확장 프로그램 필요

**추천 이유**: 가장 간단하고, 코드 구조에 영향 없음

---

### 방안 B: 빌드 도구 도입 (Vite)

**방법**:

```bash
npm init -y
npm install -D vite
npx vite
```

**장점**:
- 핫 모듈 리로딩 (HMR) 지원
- 프로덕션 빌드 최적화
- 미래 확장성 좋음

**단점**:
- npm/Node.js 필요
- 빌드 단계 추가
- 프로젝트 구조 변경 필요
- GitHub Pages 배포 시 빌드 결과물 배포 필요

---

### 방안 C: 모든 모듈 통합 (비권장)

**방법**: 모든 JS 파일을 하나로 합치고 `type="module"` 제거

**장점**:
- file:// 에서 바로 동작

**단점**:
- **코드 유지보수 어려움**
- 파일 분리의 장점 상실
- 향후 기능 추가/수정 시 복잡도 증가
- 코드 충돌 가능성

**비권장 사유**: 단기적 해결책이나 장기적으로 개발 효율성 저하

---

### 방안 D: 크롬 보안 플래그 비활성화 (비권장)

**방법**:

```bash
chrome --allow-file-access-from-files
```

**장점**:
- 코드 수정 불필요

**단점**:
- 보안 위험
- 개발자만 사용 가능
- 다른 브라우저 불가

---

## 5. 권장 사항

### 즉시 적용: 방안 A (로컬 서버)

1. VS Code에서 **Live Server** 확장 설치
2. `index.html` 우클릭 → "Open with Live Server"
3. 또는 터미널에서 `npx serve` 실행

### 향후 고려: 방안 B (빌드 도구)

프로젝트가 커지고 다음 기능이 필요해지면 Vite 도입 검토:
- TypeScript
- CSS 전처리기 (SASS)
- 코드 압축/최적화

---

## 6. 결정 필요 사항

사용자에게 확인:

1. **로컬 서버 사용이 가능한가요?** (Live Server 또는 npx serve)
2. **빌드 도구 도입을 원하시나요?** (추후 확장성 고려)

---

*작성일: 2026-01-26*
