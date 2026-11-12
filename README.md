# 산책 다이어리 (다산동 반려동물 산책 SNS)

> **상태: 재개 — 새 이름 "왈왈" (2026-11-12).** 같은 날 한 번 접었다가, 업체가 협찬한 실물 보상을 중심으로
> 다시 시작한다. 베네핏 정의와 로드맵은 [WALWAL_PLAN.md](WALWAL_PLAN.md). 지금은 0단계(방송으로 사전 등록 견주를 모으고,
> 그 숫자로 협찬 업체 3곳 확보).

다산동 아웃렛 주변 반려동물 보호자를 위한 산책 기록/공유 서비스 프로토타입.

- 프로젝트 배경, 기능 원안, 결정/미정 사항: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
- 코드 작성 규칙: [CLAUDE.md](CLAUDE.md)
- 조사·검토 문서: [RESEARCH_YOUTUBE.md](RESEARCH_YOUTUBE.md)(유튜브 댓글 조사), [SURVEY.md](SURVEY.md)(설문 초안),
  [REVIEW_2026-11.md](REVIEW_2026-11.md)(전체 재검토), [KEYRING_QUOTES.md](KEYRING_QUOTES.md)(키링 업체 비교),
  [QR_RULES.md](QR_RULES.md)(키링 QR 주소 설계)

## 실행 방법

빌드 없이 정적 파일만 있으면 됨. `index.html`을 로컬 서버로 띄워서 확인한다
(geolocation은 `file://`에서 막힐 수 있어 `http://localhost` 필요).

```bash
npx serve .
```

지도는 Leaflet + OpenStreetMap이라 가입이나 토큰 없이 바로 뜬다.
