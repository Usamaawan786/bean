import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function MentionTextarea({ value, onChange, placeholder, className }) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef(null);
  const searchTimeout = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(val);
    setCursorPos(cursor);

    // Detect @mention trigger
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@(\w*)$/);
    if (match) {
      const query = match[1];
      setMentionQuery(query);
      clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(async () => {
        if (query.length === 0) {
          // Show recent users
          try {
            const users = await base44.entities.User.list("-created_date", 8);
            setMentionUsers(users.filter(u => u.display_name || u.full_name));
            setShowSuggestions(true);
          } catch { setShowSuggestions(false); }
        } else {
          // Search users by display_name
          try {
            const all = await base44.entities.User.list("-created_date", 100);
            const filtered = all.filter(u => {
              const name = (u.display_name || u.full_name || "").toLowerCase();
              return name.startsWith(query.toLowerCase());
            }).slice(0, 6);
            setMentionUsers(filtered);
            setShowSuggestions(filtered.length > 0);
          } catch { setShowSuggestions(false); }
        }
      }, 200);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectUser = (u) => {
    const name = (u.display_name || u.full_name || "").replace(/\s+/g, "");
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfter = value.slice(cursorPos);
    // Replace the @query with @username
    const replaced = textBeforeCursor.replace(/@(\w*)$/, `@${name} `);
    onChange(replaced + textAfter);
    setShowSuggestions(false);
    // Refocus textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = replaced.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
      />
      {showSuggestions && mentionUsers.length > 0 && (
        <div className="absolute left-0 right-0 bg-white border border-[#E8DED8] rounded-2xl shadow-xl z-50 overflow-hidden mt-1">
          {mentionUsers.map(u => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelectUser(u); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#F5EBE8] transition-colors text-left"
            >
              {u.profile_picture ? (
                <img src={u.profile_picture} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#C9B8A6] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-white font-bold">{(u.display_name || u.full_name || "?")[0].toUpperCase()}</span>
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-[#5C4A3A]">{u.display_name || u.full_name}</div>
                <div className="text-xs text-[#C9B8A6]">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}