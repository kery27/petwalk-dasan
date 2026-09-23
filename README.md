# 산책 다이어리 (다산동 반려동물 산책 SNS)

다산동 아웃렛 주변 반려동물 보호자를 위한 산책 기록/공유 서비스 프로토타입.

- 프로젝트 배경, 기능 원안, 결정/미정 사항: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
- 코드 작성 규칙: [CLAUDE.md](CLAUDE.md)

## 실행 방법 (현재 단계)

빌드 없이 정적 파일만 있으면 됨. `index.html`을 로컬 서버로 띄워서 확인한다
(geolocation은 `file://`에서 막힐 수 있어 `http://localhost` 필요).

```bash
npx serve .
```

첫 실행 시 Mapbox Access Token 입력 화면이 뜬다 — [account.mapbox.com](https://account.mapbox.com/access-tokens/)에서
발급받은 토큰을 입력하면 브라우저 localStorage에 저장되어 이후에는 다시 묻지 않는다.
