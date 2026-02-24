"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { UserCheck, UserX, Loader2, ShieldPlus, Trash2 } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  role: string;
  introMessage: string | null;
  createdAt: string;
}

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}/approve`, {
      method: "POST",
    });
    if (res.ok) fetchUsers();
  };

  const handleReject = async (id: string) => {
    if (!confirm("정말 거절하시겠습니까?")) return;
    const res = await fetch(`/api/admin/users/${id}/reject`, {
      method: "POST",
    });
    if (res.ok) fetchUsers();
  };

  const handlePromote = async (id: string) => {
    if (!confirm("이 회원을 관리자로 지정하시겠습니까?")) return;
    const res = await fetch(`/api/admin/users/${id}/promote`, {
      method: "POST",
    });
    if (res.ok) fetchUsers();
    else {
      const data = await res.json();
      alert(data.error || "실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
    if (res.ok) fetchUsers();
    else {
      alert("회원 삭제에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const pendingUsers = users.filter((u) => u.status === "pending");

  return (
    <div className="space-y-6">
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="font-semibold text-amber-800 mb-2">
            승인 대기 ({pendingUsers.length}명)
          </h2>
          <div className="space-y-2">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-lg p-4 border border-amber-100 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{u.name || "이름 없음"}</span>
                    <span className="text-stone-500 text-sm ml-2">
                      {u.email}
                    </span>
                    {u.introMessage && (
                      <div className="mt-2 p-2 bg-stone-50 rounded text-sm text-stone-600 whitespace-pre-wrap">
                        {u.introMessage}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(u.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-sm font-medium"
                    >
                      <UserCheck className="w-4 h-4" />
                      승인
                    </button>
                    <button
                      onClick={() => handleReject(u.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm font-medium"
                    >
                      <UserX className="w-4 h-4" />
                      거절
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
        <h2 className="font-semibold text-stone-800 p-4 border-b">
          전체 회원 목록
        </h2>
        <div className="divide-y">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between p-4 hover:bg-stone-50"
            >
              <div>
                <span className="font-medium">{u.name || "이름 없음"}</span>
                <span className="text-stone-500 text-sm ml-2">{u.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm px-2 py-0.5 rounded ${u.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : u.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                >
                  {u.status === "approved"
                    ? "승인"
                    : u.status === "pending"
                      ? "대기"
                      : "거절"}
                </span>
                {u.role === "admin" ? (
                  <span className="text-sm bg-stone-200 text-stone-700 px-2 py-0.5 rounded">
                    관리자
                  </span>
                ) : (
                  <>
                    {u.status === "approved" && (
                      <button
                        onClick={() => handlePromote(u.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 text-xs font-medium"
                      >
                        <ShieldPlus className="w-3.5 h-3.5" />
                        관리자 지정
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </button>
                  </>
                )}
                <span className="text-stone-400 text-xs">
                  {format(new Date(u.createdAt), "PP", { locale: ko })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
