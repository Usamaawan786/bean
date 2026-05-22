import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Cache to avoid re-fetching on every keystroke
let cachedUsers = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

async function fetchAllTaggableUsers() {
  if (cachedUsers && Date.now() - cacheTime < CACHE_TTL) return cachedUsers;

  // Fetch customers (has display_name, profile_picture, is_bean_official)
  const customers = await base44.entities.Customer.list("-created_date", 200);

  // Build user map keyed by email
  const userMap = {};
  for (const c of customers) {
    if (!c.display_name) continue;
    const email = c.user_email || c.created_by;
    if (!email) continue;
    userMap[email] = {
      email,
      display_name: c.display_name,
      profile_picture: c.profile_picture || null,
      is_bean_official: !!c.is_bean_official,
      tier: c.tier || null,
      customer_id: c.id,
    };
  }

  // Also pull unique authors from recent posts (gives us profile pictures from post data)
  try {
    const posts = await base44.entities.CommunityPost.list("-created_date", 100);
    for (const p of posts) {
      if (!p.author_email) continue;
      if (!userMap[p.author_email]) {
        userMap[p.author_email] = {
          email: p.author_email,
          display_name: p.author_name || p.author_email.split("@")[0],
          profile_picture: p.author_profile_picture || null,
          is_bean_official: false,
          tier: null,
        };
      } else {
        // Enrich profile picture from post if not already set
        if (!userMap[p.author_email].profile_picture && p.author_profile_picture) {
          userMap[p.author_email].profile_picture = p.author_profile_picture;
        }
      }
    }
  } catch { /* posts fetch is best-effort */ }

  cachedUsers = Object.values(userMap).filter(u => u.display_name);
  cacheTime = Date.now();
  return cachedUsers;
}

export default function MentionTextarea({ value, onChange, placeholder, className, currentUserEmail }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchTimeout = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(val);

    const textBeforeCursor = val.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const afterAt = textBeforeCursor.slice(atIndex + 1);
      // Only trigger if no space/newline after @ (user is still typing the name)
      if (!afterAt.includes(" ") && !afterAt.includes("\n")) {
        setMentionStart(atIndex);
        const query = afterAt.toLowerCase();

        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
          try {
            const all = await fetchAllTaggableUsers();
            // Filter by query, exclude self
            const filtered = all
              .filter(u => {
                if (u.email === currentUserEmail) return false;
                const name = u.display_name.toLowerCase();
                if (query.length === 0) return true;
                return name.includes(query) || name.startsWith(query);
              })
              // Sort: bean official first, then alphabetical
              .sort((a, b) => {
                if (a.is_bean_official && !b.is_bean_official) return -1;
                if (!a.is_bean_official && b.is_bean_official) return 1;
                return a.display_name.localeCompare(b.display_name);
              })
              .slice(0, 7);

            setSuggestions(filtered);
            setActiveSuggestion(0);
            setShowSuggestions(filtered.length > 0);
          } catch {
            setShowSuggestions(false);
          }
        }, 150);
        return;
      }
    }

    setShowSuggestions(false);
    setMentionStart(-1);
  };

  const handleSelectUser = (user) => {
    // Replace @query with @DisplayName (no spaces in tag)
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const textBefore = value.slice(0, mentionStart);
    const textAfter = value.slice(cursor);
    const tagName = user.display_name.replace(/\s+/g, "");
    const newVal = `${textBefore}@${tagName} ${textAfter}`;

    onChange(newVal);
    setShowSuggestions(false);
    setMentionStart(-1);

    // Restore focus with correct cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = textBefore.length + tagName.length + 2; // @ + name + space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (suggestions[activeSuggestion]) {
        e.preventDefault();
        handleSelectUser(suggestions[activeSuggestion]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close dropdown on outside touch/click
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        textareaRef.current && !textareaRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  // Prefetch user list when component mounts so it's instant on first @
  useEffect(() => {
    fetchAllTaggableUsers().catch(() => {});
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 bottom-full mb-2 bg-white border border-[#E8DED8] rounded-2xl shadow-2xl z-[200] overflow-hidden"
          style={{ maxHeight: "280px", overflowY: "auto" }}
        >
          <div className="px-3 py-2 border-b border-[#F5EBE8]">
            <span className="text-xs text-[#C9B8A6] font-medium">Tag someone</span>
          </div>
          {suggestions.map((u, idx) => (
            <button
              key={u.email}
              type="button"
              onPointerDown={(e) => { e.preventDefault(); handleSelectUser(u); }}
              className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                idx === activeSuggestion ? "bg-[#F5EBE8]" : "hover:bg-[#FAF7F5]"
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {u.profile_picture ? (
                  <img
                    src={u.profile_picture}
                    alt={u.display_name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-[#E8DED8]"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#C9B8A6] items-center justify-center flex-shrink-0 ${u.profile_picture ? "hidden" : "flex"}`}
                >
                  <span className="text-sm text-white font-bold">
                    {(u.display_name || "?")[0].toUpperCase()}
                  </span>
                </div>
                {/* Bean verified dot */}
                {u.is_bean_official && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#8B7355] rounded-full flex items-center justify-center border-2 border-white">
                    <span className="text-[7px] text-white">✓</span>
                  </div>
                )}
              </div>

              {/* Name + tier */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[#5C4A3A] truncate">
                    {u.display_name}
                  </span>
                  {u.is_bean_official && (
                    <span className="text-[10px] bg-[#8B7355] text-white px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                      Official
                    </span>
                  )}
                </div>
                {u.tier && (
                  <span className="text-xs text-[#C9B8A6]">{u.tier} Member</span>
                )}
              </div>

              <span className="text-[#D4C4B0] text-xs flex-shrink-0">@{u.display_name.replace(/\s+/g, "")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}