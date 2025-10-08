const mongoose = require('mongoose');

const SearchHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  query: { type: String, required: true },
  filters: mongoose.Schema.Types.Mixed,
  results: [{
    type: { type: String, enum: ['task', 'user', 'message', 'file', 'project'], required: true },
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    relevance: Number,
    snippet: String
  }],
  resultCount: { type: Number, default: 0 },
  searchTime: Number, // milliseconds
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const SearchIndexSchema = new mongoose.Schema({
  entityType: { type: String, enum: ['task', 'user', 'message', 'file', 'project'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  content: { type: String, required: true }, // indexed content
  metadata: {
    title: String,
    description: String,
    tags: [String],
    category: String,
    priority: String,
    status: String,
    assignedTo: mongoose.Schema.Types.ObjectId,
    team: mongoose.Schema.Types.ObjectId,
    department: mongoose.Schema.Types.ObjectId,
    createdBy: mongoose.Schema.Types.ObjectId,
    createdAt: Date,
    updatedAt: Date
  },
  searchVector: [String], // for full-text search
  lastIndexed: { type: Date, default: Date.now }
}, { timestamps: true });

const SavedSearchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  query: { type: String, required: true },
  filters: mongoose.Schema.Types.Mixed,
  isPublic: { type: Boolean, default: false },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'edit'], default: 'view' }
  }],
  lastUsed: Date,
  useCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = {
  SearchHistory: mongoose.model('SearchHistory', SearchHistorySchema),
  SearchIndex: mongoose.model('SearchIndex', SearchIndexSchema),
  SavedSearch: mongoose.model('SavedSearch', SavedSearchSchema)
}; 