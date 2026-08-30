# ISSUE-003: Firebase API Key 공개 노출 경고

## 문제 요약

Firebase config에 포함된 Google API Key가 Git 저장소에 커밋되어 Google Cloud Platform에서 "API key exposed" 경고 메일이 발송됨.

## 원인 분석

- `js/services/firebaseConfig.js`에 API Key가 하드코딩되어 있음
- Git 저장소가 public일 경우 누구나 API Key를 볼 수 있음
- Google은 GitHub 등 공개 저장소를 스캔하여 노출된 API Key를 감지하고 경고함

## 중요한 사실

**Firebase 웹 API Key는 설계상 공개되는 값입니다.** 일반적인 서버 비밀키와 다릅니다.

- Firebase 웹 SDK는 클라이언트(브라우저)에서 실행되므로 API Key가 반드시 코드에 포함됨
- API Key 자체는 프로젝트를 "식별"하는 역할만 하고, 데이터 접근 권한을 부여하지 않음
- 실제 보안은 **Firestore 보안 규칙** + **API Key 제한**으로 보장됨
- Firebase 공식 문서에서도 이를 명시: "API keys for Firebase are not secret"

## 해결 방안 비교표

| 방안 | 난이도 | 효과 | 위험성 |
| ---- | ------ | ---- | ------ |
| A. Google Cloud Console에서 API Key 제한 설정 | 낮음 | 높음 | 없음 |
| B. 환경 변수 + 빌드 시스템 도입 | 높음 | 중간 | 중간 |
| C. Firebase App Check 추가 | 중간 | 높음 | 낮음 |

## 각 방안 상세

### 방안 A: API Key 제한 설정 (권장)

Google Cloud Console에서 API Key에 사용 제한을 걸어 악용을 방지합니다.

**설정 방법:**
1. [Google Cloud Console](https://console.cloud.google.com/) > API 및 서비스 > 사용자 인증 정보
2. "Browser key (auto created by Firebase)" 선택
3. **애플리케이션 제한사항** → "HTTP 리퍼러(웹사이트)" 선택
4. 허용 도메인 추가:
   - `localhost` (개발용)
   - `127.0.0.1` (개발용)
   - GitHub Pages 도메인 (배포 시)
5. **API 제한사항** → "키 제한" 선택 후 필요한 API만 허용:
   - Identity Toolkit API
   - Cloud Firestore API
   - Token Service API

**장점:**
- 가장 간단하고 즉시 적용 가능
- Firebase 공식 권장 방법
- 허용된 도메인/API 외에서는 Key가 작동하지 않음
- 코드 변경 불필요

**단점:**
- 경고 메일 자체가 다시 올 수 있음 (Key가 코드에 있으므로)

### 방안 B: 환경 변수 + 빌드 시스템

Vite/Webpack 등 빌드 도구를 도입하여 `.env` 파일에서 config를 주입합니다.

**장점:**
- API Key가 소스 코드에 직접 노출되지 않음

**단점:**
- 현재 프로젝트는 빌드 도구 없이 순수 ES6 모듈로 구성됨
- 빌드 시스템 도입은 프로젝트 구조를 크게 변경함
- 빌드 결과물에는 여전히 Key가 포함됨 (클라이언트 코드이므로)
- 근본적 해결이 아님

### 방안 C: Firebase App Check

앱의 정당성을 검증하는 추가 보안 레이어를 도입합니다.

**장점:**
- 앱이 아닌 곳에서의 API 호출을 차단
- reCAPTCHA Enterprise 연동으로 봇 방지

**단점:**
- 추가 설정/코드 필요
- reCAPTCHA Enterprise 설정이 필요할 수 있음
- 방안 A와 함께 사용하면 좋지만, 단독으로는 과도할 수 있음

## 권장 사항

**방안 A (API Key 제한 설정)** 를 권장합니다.

- Firebase 웹 API Key는 공개되어도 괜찮도록 설계된 값이므로, 코드에서 숨기는 것보다 **사용 범위를 제한**하는 것이 올바른 접근
- 이미 Firestore 보안 규칙으로 데이터 접근이 보호되고 있으므로, API Key 제한까지 추가하면 충분한 보안 수준
- 프로젝트 구조 변경 없이 Google Cloud Console에서만 설정하면 됨

## 불확실한 요소

- GitHub Pages 배포 시 정확한 도메인을 알아야 HTTP 리퍼러 제한에 추가할 수 있음
- Google의 경고 메일은 Key가 코드에 존재하는 한 반복될 수 있으나, 실제 보안 위험은 없음
