"use client";

import { useEffect, useState } from "react";
import { CommentItem } from "./CommentItem";
import { CommentForm } from "./CommentForm";

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    authorId: string;
    author: {
        name: string | null;
        image: string | null;
    };
}

interface CommentListProps {
    postId?: string;
    sheetMusicId?: string;
    currentUserId?: string;
    isAdmin?: boolean;
}

export function CommentList({ postId, sheetMusicId, currentUserId, isAdmin }: CommentListProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchComments = async () => {
        try {
            const query = new URLSearchParams();
            if (postId) query.append("postId", postId);
            if (sheetMusicId) query.append("sheetMusicId", sheetMusicId);

            const res = await fetch(`/api/comments?${query.toString()}`);
            if (!res.ok) throw new Error("댓글을 불러올 수 없습니다.");
            const data = await res.json();
            setComments(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [postId, sheetMusicId]);

    return (
        <div className="mt-8 pt-6 border-t border-stone-200">
            <h3 className="text-lg font-bold text-stone-800 mb-4">
                댓글 <span className="text-amber-600">{comments.length}</span>
            </h3>

            {loading ? (
                <div className="py-8 text-center text-sm text-stone-500 bg-stone-50 rounded-lg">댓글을 불러오는 중...</div>
            ) : (
                <div className="space-y-4">
                    {comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            onUpdate={fetchComments}
                        />
                    ))}
                    {comments.length === 0 && (
                        <div className="py-10 text-center text-sm text-stone-500 bg-stone-50 rounded-lg border border-stone-100">
                            가장 먼저 댓글을 남겨보세요.
                        </div>
                    )}
                </div>
            )}

            {currentUserId ? (
                <CommentForm
                    postId={postId}
                    sheetMusicId={sheetMusicId}
                    onSuccess={fetchComments}
                />
            ) : (
                <div className="mt-4 p-4 text-center text-sm text-stone-500 bg-stone-50 rounded-lg border border-stone-200">
                    댓글을 작성하려면 로그인이 필요합니다.
                </div>
            )}
        </div>
    );
}
