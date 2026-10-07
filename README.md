# 상식한입

상식과 견문을 넓히는 학습형 퀴즈 앱 (안드로이드). 기획은 [PLAN.md](PLAN.md) 참고.

## 개발

```bash
npm install
npm run dev        # 브라우저에서 미리보기
npm run cap:sync   # 웹 빌드 후 android/ 에 반영
```

## 배포

- `main`에 push하면 GitHub Actions가 서명된 APK를 빌드한다 (Actions 실행 결과의 Artifacts).
- `package.json`의 `version`을 올리고 같은 이름의 태그(`v0.1.0`)를 push하면 Releases에 APK가 올라간다.
- 서명 키는 저장소 밖에 보관하고 GitHub Secrets에 등록되어 있다:
  `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
