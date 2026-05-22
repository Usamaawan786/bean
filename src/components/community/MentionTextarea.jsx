import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function MentionTextarea({ value, onChange, placeholder, className }) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef(null);
  const searchTimeout = useRef(null);
  const dropdownRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(val);

    // Find the @ before the cursor
    const textBeforeCursor = val.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Only trigger if no spaces after @
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        const query = textAfterAt;
        setMentionQuery(query);
        setMentionStart(atIndex);

        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
          try {
            // Search via CommunityPost authors (publicly readable)
            // Use Customer entity which has broader read access
            const customers = await base44.entities.Customer.list("-created_date", 50);
            const filtered = customers.filter(c => {
              if (!c.display_name) return false;
              if (query.length === 0) return true;
              return c.display_name.toLowerCase().includes(query.toLowerCase());
            }).slice(0, 6);

            setMentionUsers(filtered);
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

  const handleSelectUser = (customer) => {
    const name = (customer.display_name || "").replace(/\s+/g, "");
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const textBefore = value.slice(0, mentionStart);
    const textAfter = value.slice(cursor);
    const newVal = `${textBefore}@${name} ${textAfter}`;
    onChange(newVal);
    setShowSuggestions(false);
    setMentionStart(-1);

    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = textBefore.length + name.length + 2; // @name + space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          textareaRef.current && !textareaRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

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
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-[#E8DED8] rounded-2xl shadow-2xl z-[100] overflow-hidden"
        >
          {mentionUsers.map(c => (
            <button
              key={c.id}
              type="button"
              onPointerDown={(e) => { e.preventDefault(); handleSelectUser(c); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#F5EBE8] active:bg-[#F5EBE8] transition-colors text-left"
            >
              {c.profile_picture ? (
                <img src={c.profile_picture} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#C9B8A6] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-white font-bold">{(c.display_name || "?")[0].toUpperCase()}</span>
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-[#5C4A3A]">{c.display_name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}