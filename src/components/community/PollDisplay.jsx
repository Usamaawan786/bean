import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, Clock, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

function VoterAvatars({ voters, limit = 5 }) {
  if (!voters?.length) return null;
  const shown = voters.slice(0, limit);
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((v, i) => (
        <div
          key={v.email}
          className="w-5 h-5 rounded-full border-2 border-white overflow-hidden flex-shrink-0 bg-[#F5EBE8] flex items-center justify-center"
          style={{ zIndex: shown.length - i }}
          title={v.name}
        >
          {v.picture ? (
            <img src={v.picture} alt={v.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[7px] font-bold text-[#8B7355]">{(v.name || "?")[0].toUpperCase()}</span>
          )}
        </div>
      ))}
      {voters.length > limit && (
        <div className="w-5 h-5 rounded-full border-2 border-white bg-[#8B7355] flex items-center justify-center flex-shrink-0">
          <span className="text-[7px] text-white font-bold">+{voters.length - limit}</span>
        </div>
      )}
    </div>
  );
}

export default function PollDisplay({ post, currentUser, onUpdate }) {
  const [showVoters, setShowVoters] = useState(null); // option id
  const [voting, setVoting] = useState(false);

  const options = post.poll_options || [];
  const totalVotes = options.reduce((sum, o) => sum + (o.voted_by?.length || 0), 0);

  // Which option has the current user voted for?
  const myVoteOptionId = options.find(o =>
    o.voted_by?.some(v => v.email === currentUser?.email)
  )?.id;

  const hasVoted = !!myVoteOptionId;
  const isPollEnded = post.poll_ends_at && new Date(post.poll_ends_at) < new Date();
  const isAuthor = currentUser?.email === post.author_email;
  // Show results if: user voted, poll ended, user is author, or not logged in
  const showResults = hasVoted || isPollEnded || !currentUser || isAuthor;

  const getPercent = (option) => {
    if (totalVotes === 0) return 0;
    return Math.round(((option.voted_by?.length || 0) / totalVotes) * 100);
  };

  const winningId = options.reduce((best, o) => {
    const bestCount = options.find(x => x.id === best)?.voted_by?.length || 0;
    return (o.voted_by?.length || 0) > bestCount ? o.id : best;
  }, options[0]?.id);

  const handleVote = async (optionId) => {
    if (!currentUser || voting || isPollEnded) return;

    setVoting(true);
    try {
      const voterData = {
        email: currentUser.email,
        name: currentUser.display_name || currentUser.full_name || currentUser.email.split("@")[0],
        picture: currentUser.profile_picture || null
      };

      const updatedOptions = options.map(o => {
        // Remove from old vote if switching
        const filteredVoters = (o.voted_by || []).filter(v => v.email !== currentUser.email);

        if (o.id === optionId) {
          // If clicking own vote, remove it (toggle)
          if (o.id === myVoteOptionId) {
            return { ...o, voted_by: filteredVoters };
          }
          return { ...o, voted_by: [...filteredVoters, voterData] };
        }
        return { ...o, voted_by: filteredVoters };
      });

      await base44.entities.CommunityPost.update(post.id, { poll_options: updatedOptions });
      if (onUpdate) onUpdate({ ...post, poll_options: updatedOptions });
    } catch (e) {
      toast.error("Failed to register vote");
    } finally {
      setVoting(false);
    }
  };

  if (!options.length) return null;

  return (
    <div className="mt-3 space-y-2">
      {/* Poll question */}
      {post.poll_question && (
        <p className="font-semibold text-[#5C4A3A] text-sm">{post.poll_question}</p>
      )}

      {/* Options */}
      {options.map(option => {
        const pct = getPercent(option);
        const isMyVote = option.id === myVoteOptionId;
        const isWinner = showResults && option.id === winningId && totalVotes > 0;
        const voters = option.voted_by || [];

        // Can vote: logged in, not ended, not author
        const canVote = currentUser && !isPollEnded && !isAuthor;

        return (
          <div key={option.id} className="relative">
            <button
              onClick={() => canVote && handleVote(option.id)}
              disabled={voting || !canVote}
              className={`relative w-full text-left rounded-2xl border-2 overflow-hidden transition-all ${
                canVote && !hasVoted
                  ? "cursor-pointer hover:border-[#8B7355] active:scale-[0.99]"
                  : "cursor-default"
              } ${
                isMyVote
                  ? "border-[#8B7355] bg-[#F5EBE8]"
                  : "border-[#E8DED8] bg-white"
              }`}
            >
              {/* Progress bar — always visible when votes exist */}
              {totalVotes > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`absolute inset-y-0 left-0 rounded-2xl ${
                    isMyVote ? "bg-[#8B7355]/20" : isWinner ? "bg-[#E8DED8]/60" : "bg-[#F5F1ED]"
                  }`}
                />
              )}

              <div className="relative flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Radio button for users who can still vote */}
                  {canVote && !hasVoted && (
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      isMyVote ? "border-[#8B7355] bg-[#8B7355]" : "border-[#C9B8A6]"
                    }`} />
                  )}
                  <span className={`text-sm font-medium truncate ${
                    isMyVote ? "text-[#5C4A3A]" : "text-[#6B5744]"
                  }`}>
                    {option.text}
                  </span>
                  {isMyVote && <span className="text-[#8B7355] text-xs flex-shrink-0">✓ You</span>}
                </div>

                {/* Always show avatars + % when there are votes */}
                {totalVotes > 0 && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {voters.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowVoters(showVoters === option.id ? null : option.id); }}
                        className="flex items-center gap-1"
                      >
                        <VoterAvatars voters={voters} />
                      </button>
                    )}
                    <span className={`text-sm font-bold min-w-[32px] text-right ${
                      isWinner ? "text-[#5C4A3A]" : "text-[#8B7355]"
                    }`}>
                      {pct}%
                    </span>
                  </div>
                )}
              </div>
            </button>

            {/* Voter list dropdown */}
            <AnimatePresence>
              {showVoters === option.id && voters.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  className="absolute left-0 right-0 z-20 bg-white border border-[#E8DED8] rounded-2xl shadow-xl p-3 mt-1"
                >
                  <p className="text-xs font-semibold text-[#8B7355] mb-2">Voted for "{option.text}"</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {voters.map(v => (
                      <div key={v.email} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-[#F5EBE8] flex items-center justify-center flex-shrink-0">
                          {v.picture
                            ? <img src={v.picture} alt={v.name} className="w-full h-full object-cover" />
                            : <span className="text-[8px] font-bold text-[#8B7355]">{(v.name || "?")[0].toUpperCase()}</span>
                          }
                        </div>
                        <span className="text-xs text-[#5C4A3A] font-medium truncate">{v.name}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Footer stats */}
      <div className="flex items-center gap-3 px-1 pt-1">
        <div className="flex items-center gap-1 text-xs text-[#C9B8A6]">
          <Users className="h-3 w-3" />
          <span>{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</span>
        </div>
        {post.poll_ends_at && (
          <div className="flex items-center gap-1 text-xs text-[#C9B8A6]">
            <Clock className="h-3 w-3" />
            <span>{isPollEnded ? "Poll ended" : `Ends ${new Date(post.poll_ends_at).toLocaleDateString()}`}</span>
          </div>
        )}
        {hasVoted && !isPollEnded && (
          <button
            onClick={() => handleVote(myVoteOptionId)}
            className="text-xs text-[#C9B8A6] hover:text-[#8B7355] transition-colors ml-auto"
          >
            Change vote
          </button>
        )}
      </div>
    </div>
  );
}