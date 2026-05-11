import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

interface TagInputProps {
  /** 현재 선택된 태그 목록 */
  value: string[];
  /** 변경 콜백 */
  onChange: (tags: string[]) => void;
  /** 자동완성 추천 후보 전체 목록 */
  suggestions?: string[];
  /** 입력란 placeholder */
  placeholder?: string;
  /** 사용자 정의 태그 입력 허용 여부 (기본 false - 추천 목록의 값만 선택 가능) */
  allowCustom?: boolean;
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "클릭하여 검색·선택",
  allowCustom = false,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const valueSet = useMemo(() => new Set(value), [value]);

  // 이미 선택된 항목은 제외하고 추천 후보 구성
  const availableSuggestions = useMemo(
    () => suggestions.filter((s) => !valueSet.has(s)),
    [suggestions, valueSet]
  );

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || valueSet.has(t)) return;
    onChange([...value, t]);
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((v) => v !== tag));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && allowCustom && input.trim()) {
      // cmdk는 highlighted 항목이 있으면 자체 처리하므로
      // 입력값과 정확히 일치하는 후보가 없을 때만 신규 태그로 추가
      const exactMatch = availableSuggestions.find(
        (s) => s.toLowerCase() === input.trim().toLowerCase()
      );
      if (!exactMatch) {
        e.preventDefault();
        addTag(input);
      }
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  // 외부 클릭 시 닫기
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div
            className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card p-2 focus-within:border-foreground transition-colors min-h-[44px]"
            onClick={() => {
              setOpen(true);
              const inp = containerRef.current?.querySelector(
                "input[data-tag-input]"
              ) as HTMLInputElement | null;
              inp?.focus();
            }}
          >
            {value.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-md bg-foreground text-background px-2 py-1 text-xs"
              >
                {t}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(t);
                  }}
                  className="hover:opacity-80"
                  aria-label={`${t} 제거`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              data-tag-input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (!open) setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleInputKeyDown}
              placeholder={value.length ? "" : placeholder}
              className="flex-1 min-w-[140px] bg-transparent outline-none text-sm py-1 px-1"
            />
          </div>
        </PopoverAnchor>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          // 입력 포커스 유지를 위해 자동 포커스 차단
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter>
            {/* 검색은 외부 input과 동기화 */}
            <CommandInput
              value={input}
              onValueChange={setInput}
              placeholder="검색..."
              className="hidden"
            />
            <CommandList>
              <CommandEmpty>
                {allowCustom && input.trim()
                  ? `"${input.trim()}" 추가하려면 Enter`
                  : "결과가 없습니다."}
              </CommandEmpty>
              <CommandGroup>
                {availableSuggestions.slice(0, 200).map((s) => (
                  <CommandItem
                    key={s}
                    value={s}
                    onSelect={() => {
                      addTag(s);
                    }}
                  >
                    {s}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
