'use client';

import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import {
  X,
  Plus,
  Search,
  Sparkles,
  GripVertical,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SkillsEditorProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  maxSkills?: number;
  suggestedSkills?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface SkillTagProps {
  skill: string;
  onRemove: () => void;
  disabled?: boolean;
  draggable?: boolean;
}

interface SkillSuggestionProps {
  skill: string;
  onAdd: () => void;
  isAdded: boolean;
}

// Common tech skills for suggestions
const DEFAULT_SUGGESTIONS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Python',
  'SQL',
  'AWS',
  'Docker',
  'Git',
  'REST APIs',
  'GraphQL',
  'MongoDB',
  'PostgreSQL',
  'Agile',
  'Scrum',
  'CI/CD',
  'Kubernetes',
  'Linux',
  'Java',
  'C++',
];

function SkillTag({ skill, onRemove, disabled, draggable }: SkillTagProps) {
  return (
    <div
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
        'bg-fire-50 border-fire-200 text-fire-700',
        'transition-all duration-200',
        draggable && 'cursor-grab active:cursor-grabbing',
        !disabled && 'hover:bg-fire-100 hover:border-fire-300'
      )}
    >
      {draggable && (
        <GripVertical className="h-3 w-3 text-fire-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <span className="text-sm font-medium">{skill}</span>
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 hover:bg-fire-200 transition-colors"
          aria-label={`Remove ${skill}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function SkillSuggestion({ skill, onAdd, isAdded }: SkillSuggestionProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={isAdded}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm',
        'transition-all duration-200',
        isAdded
          ? 'bg-green-50 border-green-200 text-green-600 cursor-default'
          : 'bg-stone-50 border-stone-200 text-charcoal-600 hover:bg-fire-50 hover:border-fire-300 hover:text-fire-600'
      )}
    >
      {isAdded ? (
        <Check className="h-3 w-3" />
      ) : (
        <Plus className="h-3 w-3" />
      )}
      {skill}
    </button>
  );
}

export function SkillsEditor({
  skills,
  onChange,
  maxSkills = 20,
  suggestedSkills = DEFAULT_SUGGESTIONS,
  placeholder = 'Add a skill...',
  disabled = false,
  className,
}: SkillsEditorProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestedSkills.filter(
    (skill) =>
      !skills.includes(skill) &&
      skill.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleAddSkill = useCallback(
    (skill: string) => {
      const trimmedSkill = skill.trim();
      if (
        trimmedSkill &&
        !skills.includes(trimmedSkill) &&
        skills.length < maxSkills
      ) {
        onChange([...skills, trimmedSkill]);
        setInputValue('');
      }
    },
    [skills, onChange, maxSkills]
  );

  const handleRemoveSkill = useCallback(
    (skillToRemove: string) => {
      onChange(skills.filter((skill) => skill !== skillToRemove));
    },
    [skills, onChange]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && skills.length > 0) {
      handleRemoveSkill(skills[skills.length - 1]);
    }
  };

  const isMaxReached = skills.length >= maxSkills;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Input Area */}
      <div
        className={cn(
          'rounded-xl border bg-white p-3 transition-all duration-200',
          isFocused
            ? 'border-fire-500 ring-2 ring-fire-500/20'
            : 'border-stone-200',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Current Skills */}
        <div className="flex flex-wrap gap-2 mb-2">
          {skills.map((skill) => (
            <SkillTag
              key={skill}
              skill={skill}
              onRemove={() => handleRemoveSkill(skill)}
              disabled={disabled}
            />
          ))}
        </div>

        {/* Input */}
        {!disabled && !isMaxReached && (
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-charcoal-400" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none"
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => handleAddSkill(inputValue)}
                className="rounded-lg bg-fire-500 px-3 py-1 text-xs font-medium text-white hover:bg-fire-600 transition-colors"
              >
                Add
              </button>
            )}
          </div>
        )}

        {/* Max reached message */}
        {isMaxReached && (
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            Maximum of {maxSkills} skills reached
          </div>
        )}
      </div>

      {/* Skills count */}
      <div className="flex items-center justify-between text-xs text-charcoal-500">
        <span>
          {skills.length} / {maxSkills} skills
        </span>
        {skills.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-red-500 hover:text-red-600 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Suggestions */}
      {!disabled && filteredSuggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-fire-500" />
            <span className="text-sm font-medium text-charcoal-700">
              Suggested Skills
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredSuggestions.slice(0, 10).map((skill) => (
              <SkillSuggestion
                key={skill}
                skill={skill}
                onAdd={() => handleAddSkill(skill)}
                isAdded={skills.includes(skill)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact skills display (read-only)
 */
export function SkillsDisplay({
  skills,
  maxVisible = 8,
  size = 'md',
  className,
}: {
  skills: string[];
  maxVisible?: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleSkills = showAll ? skills : skills.slice(0, maxVisible);
  const hiddenCount = skills.length - maxVisible;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visibleSkills.map((skill) => (
        <span
          key={skill}
          className={cn(
            'rounded-full bg-stone-100 border border-stone-200 text-charcoal-700',
            sizeClasses[size]
          )}
        >
          {skill}
        </span>
      ))}
      {hiddenCount > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={cn(
            'rounded-full bg-fire-50 border border-fire-200 text-fire-600 hover:bg-fire-100 transition-colors',
            sizeClasses[size]
          )}
        >
          +{hiddenCount} more
        </button>
      )}
      {showAll && skills.length > maxVisible && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className={cn(
            'rounded-full bg-stone-50 border border-stone-200 text-charcoal-500 hover:bg-stone-100 transition-colors',
            sizeClasses[size]
          )}
        >
          Show less
        </button>
      )}
    </div>
  );
}
