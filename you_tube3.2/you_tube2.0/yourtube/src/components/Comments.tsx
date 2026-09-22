import React, { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import socket from "@/lib/socket";
import CommentReportDialog from "./CommentReportDialog";
import { ThumbsUp, ThumbsDown, Flag, Languages } from "lucide-react";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  userimage?: string;
  commentedon: string;
  parentId?: string | null;
  flagged?: boolean;
  edited?: boolean;
  Like?: number;
  Dislike?: number;
  location?: string;
}

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const canStillEdit = (c: Comment) => Date.now() - new Date(c.commentedon).getTime() < EDIT_WINDOW_MS;

// Turns "@username" into a highlighted span. This is a display-only
// highlight -- it doesn't verify the mentioned user exists.
const renderWithMentions = (text: string) => {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-blue-600 font-medium">{part}</span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
};

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "mostliked" | "relevant">("newest");
  const [likedByMe, setLikedByMe] = useState<Set<string>>(new Set());
  const [dislikedByMe, setDislikedByMe] = useState<Set<string>>(new Set());
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, { text: string; lang: string }>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [langMenuId, setLangMenuId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<{ target: "new" | "reply"; text: string } | null>(null);
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  // CAPTCHA gate, shown only when the backend tells us it's needed
  // (after several comments in quick succession).
  const [captcha, setCaptcha] = useState<{ id: string; question: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [pendingSubmit, setPendingSubmit] = useState<{ parentId: string | null } | null>(null);

  useEffect(() => {
    loadComments();
    socket.emit("join_video", videoId);
    const handleNewComment = (comment: Comment) => {
      setComments((prev) => (prev.some((c) => c._id === comment._id) ? prev : [...prev, comment]));
    };
    socket.on("new_comment", handleNewComment);
    return () => {
      socket.emit("leave_video", videoId);
      socket.off("new_comment", handleNewComment);
    };
  }, [videoId, sort]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`, { params: { sort } });
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // People who've already commented on this video -- used for a lightweight
  // @mention suggestion list without needing a separate user-search API.
  // This must be declared before any early return below -- React requires
  // every hook to run in the same order on every render, and a loading
  // check placed before a hook meant this hook simply wasn't called yet on
  // the first render, then suddenly was on the next one, which is exactly
  // what "Rendered more hooks than during the previous render" means.
  const knownCommenters = useMemo(
    () => Array.from(new Set(comments.map((c) => c.usercommented))).filter(Boolean),
    [comments]
  );

  if (loading) {
    return <div>Loading comments...</div>;
  }

  const submitWithCaptcha = async (parentId: string | null, extra: any = {}) => {
    const body = parentId ? replyText : newComment;
    if (!user || !body.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        commentbody: body,
        usercommented: user.name,
        userimage: user.image,
        parentId,
        ...extra,
      });
      setComments((prev) => [...prev, res.data.comment]);
      setCaptcha(null);
      setCaptchaAnswer("");
      setPendingSubmit(null);
      if (parentId) {
        setReplyingTo(null);
        setReplyText("");
      } else {
        setNewComment("");
      }
    } catch (error: any) {
      if (error?.response?.status === 428 || error?.response?.data?.requireCaptcha) {
        // Backend wants a CAPTCHA solved before it'll accept this comment.
        setCaptcha(error.response.data.captcha);
        setPendingSubmit({ parentId });
      } else {
        console.error("Error adding comment:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitComment = (parentId: string | null = null) => submitWithCaptcha(parentId);

  const handleCaptchaSubmit = () => {
    if (!pendingSubmit) return;
    submitWithCaptcha(pendingSubmit.parentId, { captchaId: captcha?.id, captchaAnswer });
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.post(`/comment/editcomment/${editingCommentId}`, { commentbody: editText });
      if (res.data) {
        setComments((prev) => prev.map((c) => (c._id === editingCommentId ? res.data : c)));
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error: any) {
      alert(error?.response?.data?.message || "Couldn't update comment");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id && c.parentId !== id));
      }
    } catch (error: any) {
      alert(error?.response?.data?.message || "Couldn't delete comment");
    }
  };

  const handleLikeComment = async (id: string) => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/comment/like/${id}`);
      setComments((prev) => prev.map((c) => (c._id === id ? { ...c, Like: res.data.likeCount, Dislike: res.data.dislikeCount } : c)));
      setLikedByMe((prev) => {
        const next = new Set(prev);
        res.data.liked ? next.add(id) : next.delete(id);
        return next;
      });
      if (res.data.liked) setDislikedByMe((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislikeComment = async (id: string) => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/comment/dislike/${id}`);
      setComments((prev) => prev.map((c) => (c._id === id ? { ...c, Like: res.data.likeCount, Dislike: res.data.dislikeCount } : c)));
      setDislikedByMe((prev) => {
        const next = new Set(prev);
        res.data.disliked ? next.add(id) : next.delete(id);
        return next;
      });
      if (res.data.disliked) setLikedByMe((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (error) {
      console.log(error);
    }
  };

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesTo = (id: string) => comments.filter((c) => c.parentId === id);

  const mentionSuggestions = (query: string) =>
    knownCommenters.filter((n) => n.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5);

  const handleTextChange = (
    value: string,
    setter: (v: string) => void,
    target: "new" | "reply"
  ) => {
    setter(value);
    const match = value.match(/@(\w*)$/);
    setMentionQuery(match ? { target, text: match[1] } : null);
  };

  const insertMention = (name: string, target: "new" | "reply") => {
    const apply = (value: string) => value.replace(/@\w*$/, `@${name} `);
    if (target === "new") setNewComment((v) => apply(v));
    else setReplyText((v) => apply(v));
    setMentionQuery(null);
  };

  const LANGUAGES = [
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi" },
    { code: "es", label: "Spanish" },
    { code: "fr", label: "French" },
    { code: "de", label: "German" },
    { code: "ar", label: "Arabic" },
    { code: "zh", label: "Chinese" },
    { code: "ja", label: "Japanese" },
  ];

  const handleTranslate = async (comment: Comment, targetLang: string) => {
    setTranslatingId(comment._id);
    setLangMenuId(null);
    try {
      const res = await axiosInstance.post("/translate", { text: comment.commentbody, targetLang });
      setTranslations((prev) => ({ ...prev, [comment._id]: { text: res.data.translatedText, lang: targetLang } }));
    } catch (error: any) {
      alert(error?.response?.data?.message || "Translation failed. Please try again.");
    } finally {
      setTranslatingId(null);
    }
  };

  const renderCommentBody = (comment: Comment) =>
    editingCommentId === comment._id ? (
      <div className="space-y-2">
        <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} />
        <div className="flex gap-2 justify-end">
          <Button
            onClick={async () => {
              try {
                await handleUpdateComment();
              } catch (error: any) {}
            }}
            disabled={!editText.trim()}
          >
            Save
          </Button>
          <Button variant="ghost" onClick={() => { setEditingCommentId(null); setEditText(""); }}>Cancel</Button>
        </div>
      </div>
    ) : (
      <>
        <p className="text-sm">{renderWithMentions(comment.commentbody)}</p>
        {translations[comment._id] && (
          <p className="text-sm text-gray-500 italic mt-1 border-l-2 border-gray-200 pl-2">
            {translations[comment._id].text}
          </p>
        )}
        {comment.flagged && (
          <p className="text-xs text-amber-600 mt-1">⚠ Flagged for review by automated moderation</p>
        )}
        <div className="flex gap-3 mt-2 text-sm text-gray-500 items-center relative">
          <button
            className={`flex items-center gap-1 ${likedByMe.has(comment._id) ? "text-blue-600" : ""}`}
            onClick={() => handleLikeComment(comment._id)}
          >
            <ThumbsUp className="w-3.5 h-3.5" /> {comment.Like || 0}
          </button>
          <button
            className={`flex items-center gap-1 ${dislikedByMe.has(comment._id) ? "text-blue-600" : ""}`}
            onClick={() => handleDislikeComment(comment._id)}
          >
            <ThumbsDown className="w-3.5 h-3.5" /> {comment.Dislike || 0}
          </button>
          {user && (
            <button onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}>Reply</button>
          )}
          <button onClick={() => setLangMenuId(langMenuId === comment._id ? null : comment._id)}>
            {translatingId === comment._id ? "Translating..." : "Translate"}
          </button>
          {langMenuId === comment._id && (
            <div className="absolute top-6 left-0 z-10 bg-popover text-popover-foreground border border-border rounded shadow-sm w-36 max-h-48 overflow-y-auto">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className="block w-full text-left px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleTranslate(comment, l.code)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
          {comment.userid === user?._id && canStillEdit(comment) && (
            <>
              <button onClick={() => handleEdit(comment)}>Edit</button>
              <button onClick={() => handleDelete(comment._id)}>Delete</button>
            </>
          )}
          {user && comment.userid !== user?._id && (
            <button onClick={() => setReportingId(comment._id)} className="flex items-center gap-1">
              <Flag className="w-3.5 h-3.5" /> Report
            </button>
          )}
        </div>
        {replyingTo === comment._id && (
          <div className="mt-2 space-y-2 relative">
            <Textarea
              placeholder="Add a reply... use @name to mention someone"
              value={replyText}
              onChange={(e) => handleTextChange(e.target.value, setReplyText, "reply")}
              className="min-h-[60px]"
            />
            {mentionQuery?.target === "reply" && mentionSuggestions(mentionQuery.text).length > 0 && (
              <div className="absolute z-10 bg-popover text-popover-foreground border border-border rounded shadow-sm mt-1 w-48">
                {mentionSuggestions(mentionQuery.text).map((n) => (
                  <button key={n} className="block w-full text-left px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground" onClick={() => insertMention(n, "reply")}>
                    @{n}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setReplyingTo(null)}>Cancel</Button>
              <Button onClick={() => handleSubmitComment(comment._id)} disabled={!replyText.trim() || isSubmitting}>Reply</Button>
            </div>
          </div>
        )}
      </>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold">{comments.length} Comments</h2>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="mostliked">Most liked</option>
          <option value="relevant">Most relevant</option>
        </select>
      </div>

      {user && (
        <div className="flex gap-4 relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment... use @name to mention someone"
              value={newComment}
              onChange={(e: any) => handleTextChange(e.target.value, setNewComment, "new")}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            {mentionQuery?.target === "new" && mentionSuggestions(mentionQuery.text).length > 0 && (
              <div className="absolute z-10 bg-popover text-popover-foreground border border-border rounded shadow-sm mt-1 w-48">
                {mentionSuggestions(mentionQuery.text).map((n) => (
                  <button key={n} className="block w-full text-left px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground" onClick={() => insertMention(n, "new")}>
                    @{n}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setNewComment("")} disabled={!newComment.trim()}>Cancel</Button>
              <Button onClick={() => handleSubmitComment(null)} disabled={!newComment.trim() || isSubmitting}>Comment</Button>
            </div>
          </div>
        </div>
      )}

      {captcha && (
        <div className="border rounded-lg p-4 bg-amber-50 space-y-2">
          <p className="text-sm font-medium">You're commenting quickly — quick check: {captcha.question}</p>
          <div className="flex gap-2">
            <Input
              type="number"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              className="w-24"
            />
            <Button size="sm" onClick={handleCaptchaSubmit} disabled={!captchaAnswer}>Submit</Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {topLevel.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No comments yet. Be the first to comment!</p>
        ) : (
          topLevel.map((comment) => (
            <div key={comment._id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={comment.userimage || ""} />
                <AvatarFallback>{comment.usercommented[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm">{comment.usercommented}</span>
                  <span className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(comment.commentedon))} ago
                    {comment.edited && " (edited)"}
                  </span>
                  {comment.location && <span className="text-xs text-gray-400">• {comment.location}</span>}
                </div>
                {renderCommentBody(comment)}

                {repliesTo(comment._id).length > 0 && (
                  <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100">
                    {repliesTo(comment._id).map((reply) => (
                      <div key={reply._id} className="flex gap-3">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={reply.userimage || ""} />
                          <AvatarFallback>{reply.usercommented[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-xs">{reply.usercommented}</span>
                            <span className="text-xs text-gray-600">
                              {formatDistanceToNow(new Date(reply.commentedon))} ago
                              {reply.edited && " (edited)"}
                            </span>
                          </div>
                          {renderCommentBody(reply)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {reportingId && (
        <CommentReportDialog commentId={reportingId} open={!!reportingId} onClose={() => setReportingId(null)} />
      )}
    </div>
  );
};

export default Comments;
