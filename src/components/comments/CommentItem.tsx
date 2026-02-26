"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CommentForm } from "./CommentForm";
import DOMPurify from "isomorphic-dompurify";

interface CommentItemProps {
    comment: any;
    currentUserId?: string;
    isAdmin?: boolean;
    onUpdate?: () => void;
}

export function CommentItem({ comment, currentUserId, isAdmin, onUpdate }: CommentItemProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const canModify = currentUserId === comment.authorId || isAdmin;

    const handleDelete = async () => {
        if (!confirm("댓글을 삭제하시겠습니까?")) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("삭제 실패");
            onUpdate?.();
            router.refresh();
        } catch (err) {
            alert("삭제에 실패했습니다.");
        } finally {
            setIsDeleting(false);
        }
    };

    const getRelativeTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
        if (diff < 60) return "방금 전";
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
        return `${Math.floor(diff / 86400)}일 전`;
    };

    if (isEditing) {
        return (
            <CommentForm
                commentId={comment.id}
                initialContent={comment.content}
                isEdit={true}
                onCancel={() => setIsEditing(false)}
                onSuccess={() => {
                    setIsEditing(false);
                    onUpdate?.();
                    router.refresh();
                }}
            />
        );
    }

    return (
        <div className="p-4 bg-white border border-stone-100 rounded-lg shadow-sm mb-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {comment.author?.image ? (
                        <img src={comment.author.image} alt={comment.author.name || "User"} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm">
                            {comment.author?.name?.[0] || "?"}
                        </div>
                    )}
                    <div>
                        <span className="font-semibold text-stone-800 text-sm">{comment.author?.name || "익명"}</span>
                        <span className="text-stone-400 text-xs ml-2">{getRelativeTime(comment.createdAt)}</span>
                    </div>
                </div>
                {canModify && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-xs text-stone-500 hover:text-amber-600"
                        >
                            수정
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="text-xs text-stone-500 hover:text-red-600"
                        >
                            삭제
                        </button>
                    </div>
                )}
            </div>
            <div
                className="prose prose-sm prose-stone max-w-none mt-2 prose-img:rounded-lg prose-img:border prose-img:border-stone-200 prose-img:max-h-96 prose-img:object-contain prose-p:my-1 prose-video:rounded-lg prose-video:max-h-96"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.content, { ADD_TAGS: ['iframe', 'video', 'source'] }) }}
            />
        </div>
    );
}
