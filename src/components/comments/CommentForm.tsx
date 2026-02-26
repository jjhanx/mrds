"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor, RichTextEditorHandle } from "@/components/board/RichTextEditor";

interface CommentFormProps {
    postId?: string;
    sheetMusicId?: string;
    onSuccess?: () => void;
    commentId?: string;
    initialContent?: string;
    isEdit?: boolean;
    onCancel?: () => void;
}

export function CommentForm({
    postId,
    sheetMusicId,
    onSuccess,
    commentId,
    initialContent = "",
    isEdit = false,
    onCancel
}: CommentFormProps) {
    const router = useRouter();
    const [editorKey, setEditorKey] = useState(Date.now());
    const [contentHtml, setContentHtml] = useState(initialContent);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const editorRef = useRef<RichTextEditorHandle>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        const payload = editorRef.current?.getContentForSubmit();
        const html = payload?.html ?? contentHtml;
        const inlineFiles = payload?.files ?? [];

        const isEmpty = !html?.replace(/<p><\/p>/g, "").replace(/<p>\s*<\/p>/g, "").trim();
        if (isEmpty && inlineFiles.length === 0) {
            setError("댓글 내용을 입력하거나 이미지를 넣어 주세요.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("content", html);
            if (!isEdit) {
                if (postId) formData.append("postId", postId);
                if (sheetMusicId) formData.append("sheetMusicId", sheetMusicId);
            }
            inlineFiles.forEach((file) => formData.append("attachments", file));

            const url = isEdit ? `/api/comments/${commentId}` : "/api/comments";
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                body: formData,
            });

            if (!res.ok) {
                throw new Error(isEdit ? "댓글 수정에 실패했습니다." : "댓글 등록에 실패했습니다.");
            }

            setContentHtml("");
            setEditorKey(Date.now());
            onSuccess?.();
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        editorRef.current?.insertMedia(files);
        e.target.value = "";
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 border border-stone-200 rounded-lg p-4 bg-white shadow-sm mt-4">
            {!isEdit && <h3 className="text-lg font-medium text-stone-800">댓글 쓰기</h3>}
            {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}
            <div>
                <RichTextEditor
                    key={editorKey}
                    ref={editorRef}
                    initialContent={initialContent}
                    placeholder="댓글을 입력하세요. Ctrl+V로 이미지나 동영상을 첨부할 수 있습니다."
                    onChange={setContentHtml}
                />
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-3 gap-3">
                    <input
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime"
                        multiple
                        onChange={handleFileSelect}
                        className="text-sm text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-700 file:font-medium hover:file:bg-amber-100 max-w-[200px]"
                    />
                    <div className="flex gap-2">
                        {isEdit && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 font-medium text-sm"
                            >
                                취소
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium text-sm"
                        >
                            {submitting ? "저장 중..." : isEdit ? "수정" : "등록"}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
