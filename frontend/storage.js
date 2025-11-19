/**
 * Graspit Local Storage Manager
 * Persists user data locally for seamless experience
 */

const STORAGE_KEYS = {
  HISTORY: 'graspit_history',
  PREFERENCES: 'graspit_preferences',
  DRAFT: 'graspit_draft'
};

const GraspitStorage = {
  /**
   * Save humanization to history
   */
  saveToHistory(entry) {
    const history = this.getHistory();

    const historyEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      original: entry.original,
      humanized: entry.humanized,
      originalScore: entry.originalScore,
      newScore: entry.newScore,
      improvement: entry.improvement,
      wordCount: entry.wordCount || entry.original.split(/\s+/).length
    };

    history.unshift(historyEntry);

    // Keep last 50 entries
    if (history.length > 50) {
      history.pop();
    }

    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    return historyEntry;
  },

  /**
   * Get all history
   */
  getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * Get single history entry
   */
  getHistoryEntry(id) {
    const history = this.getHistory();
    return history.find(entry => entry.id === id);
  },

  /**
   * Delete history entry
   */
  deleteHistoryEntry(id) {
    const history = this.getHistory();
    const filtered = history.filter(entry => entry.id !== id);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
  },

  /**
   * Clear all history
   */
  clearHistory() {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  },

  /**
   * Save draft text (auto-save)
   */
  saveDraft(text) {
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify({
      text,
      savedAt: new Date().toISOString()
    }));
  },

  /**
   * Get saved draft
   */
  getDraft() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DRAFT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Clear draft
   */
  clearDraft() {
    localStorage.removeItem(STORAGE_KEYS.DRAFT);
  },

  /**
   * Save user preferences
   */
  savePreferences(prefs) {
    const current = this.getPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    return updated;
  },

  /**
   * Get user preferences
   */
  getPreferences() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      return data ? JSON.parse(data) : {
        tone: 'smart',
        autoSave: true,
        showHistory: true
      };
    } catch {
      return {
        tone: 'smart',
        autoSave: true,
        showHistory: true
      };
    }
  },

  /**
   * Get storage stats
   */
  getStats() {
    const history = this.getHistory();
    const totalWords = history.reduce((sum, entry) => sum + entry.wordCount, 0);
    const avgImprovement = history.length > 0
      ? history.reduce((sum, entry) => sum + parseFloat(entry.improvement || 0), 0) / history.length
      : 0;

    return {
      totalEntries: history.length,
      totalWords,
      avgImprovement: avgImprovement.toFixed(1) + '%',
      oldestEntry: history.length > 0 ? history[history.length - 1].timestamp : null,
      newestEntry: history.length > 0 ? history[0].timestamp : null
    };
  },

  /**
   * Export history as JSON
   */
  exportHistory() {
    const history = this.getHistory();
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `graspit_history_${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
  },

  /**
   * Import history from JSON
   */
  importHistory(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) throw new Error('Invalid format');

      const current = this.getHistory();
      const merged = [...imported, ...current];

      // Deduplicate by id
      const unique = merged.filter((entry, index, self) =>
        index === self.findIndex(e => e.id === entry.id)
      );

      // Sort by timestamp descending
      unique.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Keep last 50
      const final = unique.slice(0, 50);

      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(final));
      return final.length;
    } catch (error) {
      throw new Error('Failed to import history: ' + error.message);
    }
  }
};

// Export for use
window.GraspitStorage = GraspitStorage;
