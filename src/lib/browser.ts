export function isInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const rules = [
    "WebView",
    "(iPhone|iPod|iPad)(?!.*Safari)",
    "Android.*(wv|.0.0.0)",
    "FBAN",
    "FBAV", // Facebook
    "Instagram",
    "Line",
    "KAKAOTALK",
    "NAVER", // Naver
    "Daum", // Daum
    "Twitter", // Twitter
    "Snapchat",
  ];
  
  const regex = new RegExp(`(${rules.join("|")})`, "ig");
  return Boolean(navigator.userAgent.match(regex));
}

export function tryOpenExternalBrowser(url: string = window.location.href): void {
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("kakaotalk")) {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    return;
  }

  // Fallback for others
  const confirmMsg = "현재 브라우저에서는 보안 정책(disallowed_useragent)으로 인해 구글 로그인이 제한됩니다.\n\n주소를 복사하여 Chrome 또는 Safari 브라우저에서 열어주시겠습니까?";
  if (window.confirm(confirmMsg)) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        alert("주소가 복사되었습니다. 외부 브라우저(크롬, 사파리 등)의 주소창에 붙여넣기 해주세요.");
      }).catch(() => {
        alert("주소 복사에 실패했습니다. 우측 상단 메뉴에서 '다른 브라우저로 열기'를 선택해주세요.");
      });
    } else {
      alert("우측 상단 메뉴에서 '다른 브라우저로 열기'를 선택해주세요.");
    }
  }
}
