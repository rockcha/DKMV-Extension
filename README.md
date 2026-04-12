# DKMV Analyzer

DKMV Analyzer는 VS Code 안에서 선택한 코드 또는 파일 전체를 AI로 리뷰하고,
개선 코드까지 바로 생성/적용할 수 있도록 만든 확장 프로그램입니다.

## 주요 기능

- 코드 리뷰 생성: 선택 영역 또는 문서 전체를 분석해 리뷰 결과를 제공합니다.
- 모델 선택 분석: 원하는 AI 모델을 선택해 리뷰를 실행할 수 있습니다.
- 점수 기반 피드백: 버그, 유지보수성, 스타일, 보안 관점의 점수와 코멘트를 제공합니다.
- 개선 코드 생성: 리뷰 결과를 바탕으로 개선 코드를 생성합니다.
- 즉시 적용: 생성된 개선 코드를 선택 영역 또는 파일 전체에 바로 반영할 수 있습니다.
- 인증 연동: 로그인/토큰 인증 상태를 기반으로 기능 접근을 제어합니다.

## 기술 스택

- Extension Runtime: TypeScript, VS Code API
- Webview UI: React 19, Vite
- Build & Packaging: TypeScript Compiler, Vite, VSCE
- Lint: ESLint

## 화면 구성

- 상단 탭
- 인증하기(Token)
- 코드 입력(Code)
- 리뷰 생성(Result)
- 코드 개선(Improved)

- 코드 입력 화면
- 모델 선택
- 파일 선택 / 드래그 선택
- 코드 미리보기 및 분석 실행

- 리뷰 결과 화면
- 전체 점수 및 카테고리 점수
- 요약/세부 코멘트
- Raw JSON 확인 및 복사

- 코드 개선 화면
- 원문 코드 vs 개선 코드 비교
- 개선 코드 복사
- 선택 영역 적용 / 파일 전체 적용

## 프로젝트 구조 (폴더)

```text
DKMV-Extension/
├─ media/
├─ public/
├─ src/
│  ├─ assets/
│  ├─ extension.ts
│  └─ webview/
│     ├─ App.tsx
│     ├─ index.tsx
│     ├─ modelOptions.ts
│     ├─ types.ts
│     ├─ components/
│     ├─ hooks/
│     ├─ ui/
│     └─ utils/
├─ eslint.config.js
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
└─ README.md
```

## 참고사항

- 현재 버전: `0.0.3`
- 실행 명령어
- 개발 서버: `npm run dev`
- 빌드: `npm run build`
- 린트: `npm run lint`
- VSIX 패키징: `npm run vsix:package`
- API 엔드포인트 및 인증 방식은 `src/extension.ts`의 설정을 따릅니다.

