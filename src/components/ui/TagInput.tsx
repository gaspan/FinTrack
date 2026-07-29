import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { TagQueries } from '@/lib/queries';
import { Tag } from '@/types';
import { useTheme, type Theme } from '@/constants/theme';

export interface TagInputRef {
  commitPending: () => Promise<number[]>;
}

interface TagInputProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
}

export const TagInput = forwardRef<TagInputRef, TagInputProps>(({ selectedTags, onTagsChange }, ref) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const db = useSQLiteContext();
  const [inputText, setInputText] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    async commitPending(): Promise<number[]> {
      const name = inputText.trim();
      if (!name) return selectedTags.map(t => t.id);
      if (selectedTags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        return selectedTags.map(t => t.id);
      }
      const newTag = await new TagQueries(db).create(name);
      const updated = [...selectedTags, newTag];
      onTagsChange(updated);
      setInputText('');
      setSuggestions([]);
      setShowSuggestions(false);
      return updated.map(t => t.id);
    }
  }), [inputText, selectedTags, db, onTagsChange]);

  const searchTags = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const results = await new TagQueries(db).search(query);
    const filtered = results.filter(t => !selectedTags.find(s => s.id === t.id));
    setSuggestions(filtered);
    setShowSuggestions(true);
  }, [db, selectedTags]);

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchTags(text), 300);
  };

  const addTag = (tag: Tag) => {
    onTagsChange([...selectedTags, tag]);
    setInputText('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const createAndAdd = async () => {
    const name = inputText.trim();
    if (!name) return;
    const tagQueries = new TagQueries(db);
    const newTag = await tagQueries.create(name);
    onTagsChange([...selectedTags, newTag]);
    setInputText('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const removeTag = (tag: Tag) => {
    onTagsChange(selectedTags.filter(t => t.id !== tag.id));
  };

  return (
    <View>
      <View style={styles.tagContainer}>
        {selectedTags.map(tag => (
          <View key={tag.id} style={[styles.tagChip, { backgroundColor: tag.color + '20', borderColor: tag.color }]}>
            <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
            <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={tag.color} />
            </TouchableOpacity>
          </View>
        ))}
        <TextInput
          style={styles.input}
          placeholder="Tambah tag..."
          placeholderTextColor={theme.colors.textSecondary}
          value={inputText}
          onChangeText={handleTextChange}
          onSubmitEditing={createAndAdd}
          returnKeyType="done"
        />
      </View>
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={styles.suggestionItem}
              onPress={() => addTag(tag)}
            >
              <View style={[styles.suggestionDot, { backgroundColor: tag.color }]} />
              <Text style={styles.suggestionText}>{tag.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

TagInput.displayName = 'TagInput';

const makeStyles = (theme: Theme) => StyleSheet.create({
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    minHeight: 44,
    alignItems: 'center',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.round,
    borderWidth: 1,
  },
  tagText: {
    ...theme.typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    flex: 1,
    minWidth: 100,
    paddingVertical: 4,
  },
  suggestions: {
    marginTop: 4,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    maxHeight: 160,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
  },
  suggestionText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
});