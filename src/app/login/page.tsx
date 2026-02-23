"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Music2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [devError, setDevError] = useState("");
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  // OAuthAccountNotLinked: 동일 이메일로 다른 로그인 방식으로 가입된 경우
  const isOAuthAccountNotLinked = errorParam === "OAuthAccountNotLinked";

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.ok) {
      window.location.href = "/";
    } else {
      setDevError("로그인에 실패했습니다. OAuth가 설정된 경우 개발용 로그인은 비활성화됩니다.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-600/20 text-amber-700 mb-4">
            <Music2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-stone-800 mb-2">
            미래도시
          </h1>
          <p className="text-stone-600">
            회원 전용 서비스입니다. 로그인해 주세요.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8 border border-amber-100">
          {isOAuthAccountNotLinked && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              이 이메일은 이미 다른 로그인 방식(다른 OAuth 또는 개발용 로그인)으로 등록되어 있습니다. Google로 다시 시도해 보시거나, 처음 가입할 때 사용한 방식으로 로그인해 주세요.
            </div>
          )}
          <div className="space-y-3">
            <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white border-2 border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-colors font-medium text-stone-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google로 로그인
              </button>
            <button
                onClick={() => signIn("naver", { callbackUrl: "/" })}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#03C75A] hover:bg-[#02b350] text-white transition-colors font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                </svg>
                네이버로 로그인
              </button>
            <button
                onClick={() => signIn("kakao", { callbackUrl: "/" })}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#FEE500] hover:bg-[#F5DC00] text-stone-800 transition-colors font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.477 3 2 6.463 2 10.65c0 3.465 2.369 6.488 5.678 7.913-.297.99-.998 3.76-1.165 4.77-.142.853.576 1.165 1.027.851 3.99-2.516 6.46-5.04 6.46-5.04 3.59.257 6.66-1.1 6.66-1.1.034-.033.055-.066.055-.099-.055-.132-3.52-2.178-3.52-2.178-.443-.298-.627-.298-.033-.959 3.553-3.963 4.928-7.636 4.928-7.636.024-.066.024-.132.024-.165 0-.264-1.32-.396-1.32-.396-3.553-.264-4.96-3.633-4.96-3.633-.088-.264-.176-.33-.352-.33-.176 0-.44.066-1.144.462-.882.462-2.114 1.056-3.52 1.584-.44.132-.704.198-.792.198-.176 0-.264-.132-.132-.33.792-1.32 1.848-3.168 1.848-3.168.088-.132.132-.264.132-.33 0-.132-.132-.198-.44-.264-1.848-.66-3.08-1.056-3.52-1.32-.44-.264-.704-.396-.704-.396-.176-.132-.044-.264.132-.33.176-.066 2.203-.396 2.203-.396.22-.066.352-.132.44-.132.088 0 .176.066.22.132.044.132.088.33.088.528 0 .066-.044.198-.044.33 0 .066.044.132.088.198.044.066.088.132.132.198.44.396 2.203 1.056 2.203 1.056s.22.066.308.198c.088.132.088.264.044.396-.044.132-.132.264-.22.33-.088.066-.352.264-.352.264s-2.555.792-2.555.792c-.44.132-.66.198-.88.198-.132 0-.264-.066-.352-.198-.088-.132-.132-.33-.132-.528 0-.66.44-1.32 1.32-1.848 2.555-1.584 4.4-1.584 4.4-1.584s.352-.066.484.066c.132.132.132.33.088.528-.044.198-.22.66-.484 1.056-.264.396-.572.924-.88 1.452-.044.066-.088.132-.088.198 0 .132.088.264.22.264h.88c.396 0 .792-.066 1.188-.198.176-.066.352-.132.484-.198.132-.066.22-.066.308.066.088.132.088.264.044.396-.044.132-.132.264-.22.396-.264.33-.572.66-.924.99-.088.066-.132.132-.176.198-.044.066-.044.132-.044.198 0 .132.132.264.308.264.396 0 .792-.066 1.188-.198.66-.264 1.232-.66 1.672-1.056.44-.396.748-.792.924-1.188.176-.396.22-.792.22-1.188 0-.396-.044-.792-.22-1.188-.176-.396-.44-.792-.792-1.188-.352-.396-.792-.792-1.32-1.056-.528-.264-1.056-.396-1.584-.396-.132 0-.264.066-.352.198-.088.132-.132.264-.088.396.044.132.132.264.22.33.088.066.22.132.352.198.264.132.572.33.88.528.308.198.572.396.792.594.22.198.396.396.528.594.132.198.22.396.264.594.044.198.044.396 0 .594-.044.198-.132.396-.264.594-.132.198-.308.396-.528.594-.22.198-.484.396-.792.594-.308.198-.616.396-.88.528-.264.132-.44.198-.528.198-.132 0-.22-.066-.264-.198-.044-.132-.044-.264 0-.396.044-.132.132-.264.264-.33.132-.066.308-.132.484-.198.44-.198.88-.462 1.32-.792.44-.33.792-.726 1.056-1.188.264-.462.396-.99.396-1.584 0-.594-.132-1.188-.396-1.716-.264-.528-.616-1.056-1.056-1.452-.44-.396-.924-.66-1.452-.858-.528-.198-1.056-.33-1.584-.33-.264 0-.528.066-.792.132-.264.066-.528.198-.792.33-.264.132-.528.264-.792.396-.264.132-.44.198-.616.264-.176.066-.352.132-.528.198-.176.066-.308.066-.44.066-.088 0-.176-.066-.22-.132-.044-.066-.044-.132-.044-.198 0-.066.044-.132.088-.198.132-.264.308-.462.528-.66.22-.198.44-.33.66-.462.22-.132.44-.198.66-.264.44-.132.88-.198 1.32-.198.616 0 1.232.132 1.848.396.616.264 1.144.66 1.584 1.188.44.528.792 1.188 1.056 1.848.264.66.396 1.452.396 2.244 0 .792-.132 1.584-.396 2.244-.264.66-.616 1.32-1.056 1.848-.44.528-.968.924-1.584 1.188-.616.264-1.232.396-1.848.396z" />
                </svg>
                카카오로 로그인
              </button>
          </div>

          <p className="mt-6 text-center text-sm text-stone-500">
            로그인하면 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다.
          </p>

          {/* 개발용 로그인 - OAuth 미설정 시 사용 */}
          <details className="mt-6 pt-6 border-t border-stone-200">
            <summary className="cursor-pointer text-sm text-stone-500 hover:text-stone-700">
              개발용 로그인 (OAuth 미설정 시)
            </summary>
            <form onSubmit={handleDevLogin} className="mt-3 space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 (아무거나)"
                className="w-full px-3 py-2 rounded border border-stone-200 text-sm"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호: test"
                className="w-full px-3 py-2 rounded border border-stone-200 text-sm"
                required
              />
              {devError && (
                <p className="text-xs text-red-600">{devError}</p>
              )}
              <button
                type="submit"
                className="w-full py-2 bg-stone-200 text-stone-700 rounded text-sm hover:bg-stone-300"
              >
                테스트 로그인
              </button>
            </form>
          </details>
        </div>
      </div>
    </div>
  );
}
