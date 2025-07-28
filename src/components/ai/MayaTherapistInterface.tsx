/**
 * Maya Therapist Interface - Enhanced interface for therapists with professional tools
 * Provides client insights, assessment tools, and therapeutic guidance
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Stethoscope, 
  Send, 
  Bot, 
  Users, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  FileText,
  Calendar,
  Brain,
  Target,
  Shield,
  Clock,
  ChevronDown,
  BarChart3,
  MessageSquare,
  UserCheck,
  ClipboardList,
  BookOpen,
  Eye,
  Settings,
  Plus,
  Edit3,
  UserPlus,
  RotateCcw,
  Save,
  X,
  Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';

import { agentService, AgentCallResponse } from '@/services/agentService';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

interface TherapistMessage {
  id: string;
  content: string;
  type: 'therapist' | 'maya' | 'system' | 'client-data';
  timestamp: Date;
  agentUsed?: string[];
  confidence?: number;
  isLoading?: boolean;
  clinicalInsights?: ClinicalInsight[];
  clientId?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

interface ClinicalInsight {
  type: 'assessment' | 'progress' | 'risk' | 'intervention' | 'trend';
  summary: string;
  confidence: number;
  recommendations: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  evidence?: string[];
}

interface MayaTherapistInterfaceProps {
  therapistId: string;
  clientId?: string;
  sessionId?: string;
  className?: string;
  mode?: 'consultation' | 'client-focused' | 'general';
}

const THERAPIST_TOOLS = [
  {
    id: 'client-assessment',
    label: 'Assess Client State',
    icon: ClipboardList,
    prompt: "Maya, please provide a comprehensive assessment of my client's current mental health state based on our recent interactions. Include risk factors, progress indicators, and intervention recommendations.",
    category: 'assessment',
    requiresClientId: true
  },
  {
    id: 'treatment-planning',
    label: 'Treatment Planning',
    icon: Target,
    prompt: "Help me develop evidence-based treatment strategies and goals for this client. Consider their presentation, history, and therapeutic needs.",
    category: 'planning',
    requiresClientId: true
  },
  {
    id: 'crisis-assessment',
    label: 'Crisis Assessment',
    icon: AlertTriangle,
    prompt: "Conduct an immediate crisis assessment for this client. Evaluate suicide risk, safety planning needs, and escalation requirements.",
    category: 'crisis',
    requiresClientId: true
  },
  {
    id: 'progress-analysis',
    label: 'Progress Analysis',
    icon: TrendingUp,
    prompt: "Analyze this client's therapeutic progress over time. Identify improvements, setbacks, and patterns in their journey.",
    category: 'analysis',
    requiresClientId: true
  },
  {
    id: 'group-dynamics',
    label: 'Group Dynamics',
    icon: Users,
    prompt: "Analyze the dynamics of this group session. Identify participation patterns, therapeutic moments, and intervention opportunities.",
    category: 'group',
    requiresClientId: false
  },
  {
    id: 'onboard-user',
    label: 'Onboard New User',
    icon: UserCheck,
    prompt: "Help me onboard a new user to the platform. Guide me through the intake process, assessment questions, and initial group recommendations.",
    category: 'administration',
    requiresClientId: false
  },
  {
    id: 'create-group',
    label: 'Create Therapeutic Group',
    icon: Users,
    prompt: "Assist me in creating a new therapeutic group. Help determine group type, size limits, focus areas, and member selection criteria.",
    category: 'administration',
    requiresClientId: false
  },
  {
    id: 'manage-group',
    label: 'Manage Group',
    icon: Users,
    prompt: "Help me manage an existing group. I need assistance with member adjustments, group settings, or facilitation strategies.",
    category: 'administration',
    requiresClientId: false
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: UserCheck,
    prompt: "Assist with user account management. Help me review user profiles, adjust permissions, or handle account issues.",
    category: 'administration',
    requiresClientId: false
  },
  {
    id: 'session-planning',
    label: 'Session Planning',
    icon: Calendar,
    prompt: "Help me plan and schedule therapeutic sessions. Consider client needs, group dynamics, and treatment goals.",
    category: 'administration',
    requiresClientId: false
  },
  {
    id: 'intervention-suggestions',
    label: 'Intervention Ideas',
    icon: Stethoscope,
    prompt: "Suggest evidence-based therapeutic interventions and techniques that would be appropriate for this client's current presentation and treatment goals.",
    category: 'intervention',
    requiresClientId: true
  },
  {
    id: 'documentation-help',
    label: 'Documentation Support',
    icon: FileText,
    prompt: "Help me draft clinical documentation for this session, including progress notes, treatment plan updates, and any necessary assessments.",
    category: 'documentation',
    requiresClientId: true
  },
  {
    id: 'research-insights',
    label: 'Research & Evidence',
    icon: BookOpen,
    prompt: "Provide current research and evidence-based practices relevant to this client's diagnosis and treatment approach.",
    category: 'research',
    requiresClientId: false
  }
];

const CATEGORY_COLORS = {
  'assessment': 'bg-blue-50 text-blue-700 border-blue-200',
  'planning': 'bg-green-50 text-green-700 border-green-200',
  'crisis': 'bg-red-50 text-red-700 border-red-200',
  'analysis': 'bg-purple-50 text-purple-700 border-purple-200',
  'group': 'bg-orange-50 text-orange-700 border-orange-200',
  'administration': 'bg-teal-50 text-teal-700 border-teal-200',
  'intervention': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'documentation': 'bg-gray-50 text-gray-700 border-gray-200',
  'research': 'bg-yellow-50 text-yellow-700 border-yellow-200'
};

const RISK_LEVEL_COLORS = {
  'low': 'bg-green-100 text-green-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'high': 'bg-orange-100 text-orange-800',
  'critical': 'bg-red-100 text-red-800'
};

// Interactive Form Interfaces
interface OnboardingFormData {
  firstName: string;
  lastName: string;
  email: string;
  recoveryGoals: string[];
  wellnessGoals: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredGroups: string[];
}

interface GroupFormData {
  name: string;
  description: string;
  type: 'recovery' | 'wellness' | 'general';
  maxMembers: number;
  isPrivate: boolean;
  tags: string[];
}

interface UserEditFormData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'member' | 'facilitator' | 'therapist';
  recoveryGoals: string[];
  wellnessGoals: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  groupAssignments: string[];
  accountStatus: 'active' | 'inactive' | 'suspended';
}

interface SessionPlanningFormData {
  sessionType: 'individual' | 'group' | 'crisis' | 'assessment';
  clientId?: string;
  groupId?: string;
  date: string;
  duration: number;
  objectives: string[];
  interventions: string[];
  materials: string[];
  notes: string;
}

interface InteractiveFormProps {
  type: 'onboarding' | 'groupCreation' | 'groupEdit' | 'userEdit' | 'sessionPlanning';
  data?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

// Form Components
function OnboardingForm({ 
  data, 
  onSubmit, 
  onCancel, 
  isProcessing 
}: { 
  data: any; 
  onSubmit: (data: OnboardingFormData) => void; 
  onCancel: () => void;
  isProcessing: boolean;
}) {
  const [formData, setFormData] = useState<OnboardingFormData>({
    firstName: '',
    lastName: '',
    email: '',
    recoveryGoals: [],
    wellnessGoals: [],
    experienceLevel: 'beginner',
    preferredGroups: []
  });

  const availableGroups = data?.availableGroups || [];
  
  const recoveryOptions = [
    'Addiction Recovery',
    'Trauma Healing',
    'Grief Processing',
    'Relationship Recovery',
    'Self-Harm Recovery'
  ];

  const wellnessOptions = [
    'Anxiety Management',
    'Depression Support',
    'Stress Reduction',
    'Sleep Improvement',
    'Emotional Regulation'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">New User Onboarding</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isProcessing}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                disabled={isProcessing}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Experience Level */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Experience Level</h3>
          <div className="space-y-2">
            {['beginner', 'intermediate', 'advanced'].map((level) => (
              <label key={level} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="experienceLevel"
                  value={level}
                  checked={formData.experienceLevel === level}
                  onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value as any })}
                  disabled={isProcessing}
                  className="text-blue-600"
                />
                <span className="capitalize">{level}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Recovery Goals */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recovery Goals</h3>
          <div className="space-y-2">
            {recoveryOptions.map((goal) => (
              <label key={goal} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  value={goal}
                  checked={formData.recoveryGoals.includes(goal)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, recoveryGoals: [...formData.recoveryGoals, goal] });
                    } else {
                      setFormData({ ...formData, recoveryGoals: formData.recoveryGoals.filter(g => g !== goal) });
                    }
                  }}
                  disabled={isProcessing}
                  className="text-blue-600"
                />
                <span>{goal}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Wellness Goals */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Wellness Goals</h3>
          <div className="space-y-2">
            {wellnessOptions.map((goal) => (
              <label key={goal} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  value={goal}
                  checked={formData.wellnessGoals.includes(goal)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, wellnessGoals: [...formData.wellnessGoals, goal] });
                    } else {
                      setFormData({ ...formData, wellnessGoals: formData.wellnessGoals.filter(g => g !== goal) });
                    }
                  }}
                  disabled={isProcessing}
                  className="text-blue-600"
                />
                <span>{goal}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Group Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommended Groups</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {availableGroups.length > 0 ? (
              availableGroups.map((group: any) => (
                <label key={group.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    value={group.id}
                    checked={formData.preferredGroups.includes(group.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, preferredGroups: [...formData.preferredGroups, group.id] });
                      } else {
                        setFormData({ ...formData, preferredGroups: formData.preferredGroups.filter(g => g !== group.id) });
                      }
                    }}
                    disabled={isProcessing}
                    className="text-blue-600"
                  />
                  <span>{group.name} ({group.type})</span>
                </label>
              ))
            ) : (
              <p className="text-gray-500">No groups available</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Creating User...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Complete Onboarding
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function GroupCreationForm({ 
  onSubmit, 
  onCancel, 
  isProcessing 
}: { 
  onSubmit: (data: GroupFormData) => void; 
  onCancel: () => void;
  isProcessing: boolean;
}) {
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    type: 'general',
    maxMembers: 10,
    isPrivate: false,
    tags: []
  });

  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSubmit(formData);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Therapeutic Group</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isProcessing}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Group Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Group Name *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Anxiety Support Circle"
            required
            disabled={isProcessing}
          />
        </div>

        {/* Group Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the group's purpose, goals, and target members..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            required
            disabled={isProcessing}
          />
        </div>

        {/* Group Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Group Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            disabled={isProcessing}
          >
            <option value="recovery">Recovery Support</option>
            <option value="wellness">Wellness & Mental Health</option>
            <option value="general">General Peer Support</option>
          </select>
        </div>

        {/* Max Members */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Members
          </label>
          <Input
            type="number"
            value={formData.maxMembers}
            onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 10 })}
            min={4}
            max={20}
            disabled={isProcessing}
          />
          <p className="text-xs text-gray-500 mt-1">Recommended: 6-12 members for optimal group dynamics</p>
        </div>

        {/* Privacy Setting */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isPrivate"
            checked={formData.isPrivate}
            onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
            disabled={isProcessing}
            className="text-blue-600"
          />
          <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700">
            Private Group (requires invitation to join)
          </label>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags (for searchability)
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add a tag..."
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={addTag}
              disabled={isProcessing}
              size="sm"
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-blue-900"
                  disabled={isProcessing}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Creating Group...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create Group
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SessionPlanningForm({ 
  data, 
  onSubmit, 
  onCancel, 
  isProcessing 
}: { 
  data: any; 
  onSubmit: (data: SessionPlanningFormData) => void; 
  onCancel: () => void;
  isProcessing: boolean;
}) {
  const [formData, setFormData] = useState<SessionPlanningFormData>({
    sessionType: 'individual',
    clientId: data?.clientId || '',
    groupId: data?.groupId || '',
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    objectives: [],
    interventions: [],
    materials: [],
    notes: ''
  });

  const [objectiveInput, setObjectiveInput] = useState('');
  const [interventionInput, setInterventionInput] = useState('');
  const [materialInput, setMaterialInput] = useState('');

  const availableClients = data?.availableClients || [];
  const availableGroups = data?.availableGroups || [];

  const sessionTypes = [
    { value: 'individual', label: 'Individual Therapy' },
    { value: 'group', label: 'Group Session' },
    { value: 'crisis', label: 'Crisis Intervention' },
    { value: 'assessment', label: 'Assessment Session' }
  ];

  const commonObjectives = [
    'Assess current mental state',
    'Review treatment goals',
    'Process recent experiences',
    'Develop coping strategies',
    'Address crisis situations',
    'Monitor medication compliance',
    'Evaluate progress'
  ];

  const commonInterventions = [
    'Cognitive Behavioral Therapy (CBT)',
    'Dialectical Behavior Therapy (DBT)',
    'Mindfulness exercises',
    'Exposure therapy',
    'Crisis safety planning',
    'Psychoeducation',
    'Group facilitation techniques'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || formData.objectives.length === 0) {
      toast.error('Please set a date and at least one objective');
      return;
    }
    if (formData.sessionType === 'individual' && !formData.clientId) {
      toast.error('Please select a client for individual sessions');
      return;
    }
    if (formData.sessionType === 'group' && !formData.groupId) {
      toast.error('Please select a group for group sessions');
      return;
    }
    onSubmit(formData);
  };

  const addObjective = (objective?: string) => {
    const objToAdd = objective || objectiveInput.trim();
    if (objToAdd && !formData.objectives.includes(objToAdd)) {
      setFormData({ ...formData, objectives: [...formData.objectives, objToAdd] });
      setObjectiveInput('');
    }
  };

  const addIntervention = (intervention?: string) => {
    const intToAdd = intervention || interventionInput.trim();
    if (intToAdd && !formData.interventions.includes(intToAdd)) {
      setFormData({ ...formData, interventions: [...formData.interventions, intToAdd] });
      setInterventionInput('');
    }
  };

  const addMaterial = () => {
    if (materialInput.trim() && !formData.materials.includes(materialInput.trim())) {
      setFormData({ ...formData, materials: [...formData.materials, materialInput.trim()] });
      setMaterialInput('');
    }
  };

  const removeItem = (array: string[], item: string, field: keyof SessionPlanningFormData) => {
    setFormData({ 
      ...formData, 
      [field]: array.filter(i => i !== item) 
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Plan Therapeutic Session</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isProcessing}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Session Type & Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Type *
            </label>
            <select
              value={formData.sessionType}
              onChange={(e) => setFormData({ ...formData, sessionType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={isProcessing}
            >
              {sessionTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Date *
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Session Objectives */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session Objectives *
          </label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                placeholder="Add a session objective..."
                disabled={isProcessing}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={() => addObjective()}
                disabled={isProcessing}
                size="sm"
              >
                Add
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">Common objectives:</div>
            <div className="flex flex-wrap gap-2">
              {commonObjectives.map((obj) => (
                <button
                  key={obj}
                  type="button"
                  onClick={() => addObjective(obj)}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                  disabled={isProcessing || formData.objectives.includes(obj)}
                >
                  {obj}
                </button>
              ))}
            </div>
            
            <div className="space-y-2">
              {formData.objectives.map((objective) => (
                <div key={objective} className="flex items-center justify-between bg-green-50 p-2 rounded">
                  <span className="text-sm">{objective}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(formData.objectives, objective, 'objectives')}
                    className="text-red-600 hover:text-red-800"
                    disabled={isProcessing}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isProcessing}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isProcessing ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Planning Session...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Create Session Plan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function MayaTherapistInterface({ 
  therapistId, 
  clientId, 
  sessionId: propSessionId, 
  className,
  mode = 'general'
}: MayaTherapistInterfaceProps) {
  const [messages, setMessages] = useState<TherapistMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(propSessionId || '');
  const [showTools, setShowTools] = useState(true);
  const [activeClientId, setActiveClientId] = useState<string>(clientId || '');
  const [mayaAvailable, setMayaAvailable] = useState(true);
  const [currentInsights, setCurrentInsights] = useState<ClinicalInsight[]>([]);
  const [activeForm, setActiveForm] = useState<InteractiveFormProps | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeTherapistSession();
  }, [therapistId, activeClientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeTherapistSession = async () => {
    const newSessionId = propSessionId || `therapist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    
    const contextSuffix = activeClientId ? ` for client ${activeClientId}` : '';
    const modeDescription = {
      'consultation': 'professional consultation and clinical guidance',
      'client-focused': `focused support for your work with${contextSuffix}`,
      'general': 'therapeutic guidance and professional support'
    };

    const welcomeMessage: TherapistMessage = {
      id: `welcome-${Date.now()}`,
      content: `Hello Dr. ${therapistId}! I'm Maya, your AI clinical assistant. I'm here to provide ${modeDescription[mode]}.\n\n**Available Support:**\n• Clinical assessments and risk evaluation\n• Evidence-based treatment planning\n• Crisis intervention guidance\n• Progress analysis and insights\n• Group dynamics assessment\n• Documentation assistance\n• Current research and best practices\n\n**Professional Standards:**\n• All guidance follows evidence-based practices\n• HIPAA-compliant interactions\n• Crisis situations escalated appropriately\n• Licensed professional oversight recommended\n\nHow can I assist with your clinical work today?`,
      type: 'maya',
      timestamp: new Date(),
      agentUsed: ['facilitator', 'insight'],
      confidence: 1.0,
      clientId: activeClientId
    };

    setMessages([welcomeMessage]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: TherapistMessage = {
      id: `system-${Date.now()}`,
      content,
      type: 'system',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const handleOnboardingSubmit = async (formData: OnboardingFormData) => {
    setIsProcessingAction(true);
    setActiveForm(null);

    try {
      // Create the user account
      const response = await api.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: Math.random().toString(36).slice(-8), // Temporary password
        recoveryGoals: formData.recoveryGoals,
        wellnessGoals: formData.wellnessGoals,
        experienceLevel: formData.experienceLevel
      });

      // Assign to selected groups
      if (formData.preferredGroups.length > 0) {
        for (const groupId of formData.preferredGroups) {
          await api.post(`/therapist/groups/${groupId}/members`, {
            userId: response.user.id,
            role: 'member'
          }).catch(console.error);
        }
      }

      const successMessage = `
**✅ User Successfully Onboarded!**

**New User Details:**
- **Name:** ${formData.firstName} ${formData.lastName}
- **Email:** ${formData.email}
- **Experience Level:** ${formData.experienceLevel}
- **Recovery Goals:** ${formData.recoveryGoals.join(', ') || 'None specified'}
- **Wellness Goals:** ${formData.wellnessGoals.join(', ') || 'None specified'}
- **Assigned Groups:** ${formData.preferredGroups.length} groups

A temporary password has been sent to the user's email. They can log in and complete their profile setup.

**Next Steps:**
1. Schedule an initial assessment session
2. Review their group placements
3. Set up regular check-ins
4. Monitor initial engagement

Would you like me to help you schedule their first session?
      `;

      addSystemMessage(successMessage);
      toast.success('User onboarded successfully!');

    } catch (error) {
      console.error('Onboarding error:', error);
      addSystemMessage(`❌ Error during onboarding: ${error.message}\n\nPlease try again or contact support if the issue persists.`);
      toast.error('Failed to onboard user');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleGroupCreationSubmit = async (formData: GroupFormData) => {
    setIsProcessingAction(true);
    setActiveForm(null);

    try {
      const response = await api.post('/therapist/groups', formData);
      
      const successMessage = `
**✅ Group Successfully Created!**

**Group Details:**
- **Name:** ${formData.name}
- **Type:** ${formData.type}
- **Max Members:** ${formData.maxMembers}
- **Privacy:** ${formData.isPrivate ? 'Private' : 'Public'}
- **Tags:** ${formData.tags.join(', ') || 'None'}

**Group ID:** ${response.data.group.id}

The group is now active and ready for member assignments.

**Next Steps:**
1. Add members to the group
2. Schedule the first session
3. Set group guidelines
4. Assign co-facilitators if needed

Would you like me to help you add members to this group?
      `;

      addSystemMessage(successMessage);
      toast.success('Group created successfully!');

    } catch (error) {
      console.error('Group creation error:', error);
      addSystemMessage(`❌ Error creating group: ${error.message}\n\nPlease try again or contact support if the issue persists.`);
      toast.error('Failed to create group');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSessionPlanningSubmit = async (formData: SessionPlanningFormData) => {
    setIsProcessingAction(true);
    setActiveForm(null);

    try {
      const response = await api.post('/therapist/sessions', formData);
      
      const successMessage = `
**✅ Session Successfully Planned!**

**Session Details:**
- **Type:** ${formData.sessionType}
- **Date:** ${formData.date}
- **Duration:** ${formData.duration} minutes
- **Objectives:** ${formData.objectives.length} objectives defined
- **Interventions:** ${formData.interventions.length} interventions planned

**Session ID:** ${response.data.session.id}

The session has been scheduled and is ready for implementation.

**Preparation Checklist:**
- [ ] Review client/group background
- [ ] Prepare materials and resources
- [ ] Set up therapeutic environment
- [ ] Review crisis protocols if needed

Would you like me to help you prepare documentation for this session?
      `;

      addSystemMessage(successMessage);
      toast.success('Session planned successfully!');

    } catch (error) {
      console.error('Session planning error:', error);
      addSystemMessage(`❌ Error planning session: ${error.message}\n\nPlease try again or contact support if the issue persists.`);
      toast.error('Failed to plan session');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleAdministrativeTask = async (content: string, sessionId: string): Promise<AgentCallResponse> => {
    // Determine which administrative function is being requested
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('onboard')) {
      return await handleUserOnboarding(content, sessionId);
    } else if (lowerContent.includes('create group')) {
      return await handleGroupCreation(content, sessionId);
    } else if (lowerContent.includes('manage group')) {
      return await handleGroupManagement(content, sessionId);
    } else if (lowerContent.includes('user management')) {
      return await handleUserManagement(content, sessionId);
    } else if (lowerContent.includes('session planning')) {
      return await handleSessionPlanning(content, sessionId);
    } else {
      // Fallback to general agent
      return await agentService.callAgent('facilitator', content, sessionId);
    }
  };

  const handleUserOnboarding = async (content: string, sessionId: string): Promise<AgentCallResponse> => {
    try {
      // Get platform data to provide context for onboarding
      const [users, groups] = await Promise.all([
        api.getAllUsers().catch(() => []),
        api.getAllGroups().catch(() => [])
      ]);

      // Check if user wants to start the onboarding process
      const wantsToStart = content.toLowerCase().includes('start') || 
                          content.toLowerCase().includes('begin') ||
                          content.toLowerCase().includes('new user');

      if (wantsToStart) {
        // Create onboarding form
        const onboardingResponse = `
**Starting User Onboarding Process**

I'll guide you through creating a new user account. Let me prepare the onboarding form for you.

**Available Groups for Matching:** ${groups.length} groups
**Current Platform Users:** ${users.length} users

Click the **"Start Onboarding"** button below to begin the guided onboarding process.
        `;

        // Add a system message with the form trigger
        setTimeout(() => {
          setActiveForm({
            type: 'onboarding',
            data: { availableGroups: groups },
            onSubmit: async (formData: OnboardingFormData) => {
              await handleOnboardingSubmit(formData);
            },
            onCancel: () => {
              setActiveForm(null);
              addSystemMessage('Onboarding process cancelled. Let me know if you need help with anything else.');
            }
          });
        }, 500);

        return {
          recommendation: 'facilitator',
          result: {
            success: true,
            response: onboardingResponse,
            agentUsed: ['system', 'matching'],
            toolsUsed: ['getUserData', 'getGroupData', 'onboardingForm'],
            confidence: 0.95,
            metadata: { isAdministrative: true, taskType: 'onboarding', showForm: true }
          }
        };
      }

      const onboardingContext = `
**User Onboarding Assistant**

Available Groups: ${groups.length} groups
Current Users: ${users.length} users

**Onboarding Process:**
1. **Initial Assessment**
   - Mental health goals and preferences
   - Experience level with therapy/support groups
   - Specific areas of focus (anxiety, depression, recovery, etc.)
   - Communication preferences

2. **Group Matching**
   - Assess compatibility with existing groups
   - Consider group dynamics and member balance
   - Evaluate therapeutic goals alignment

3. **Account Setup**
   - Profile completion
   - Privacy settings configuration
   - Platform orientation

4. **Initial Support Plan**
   - Recommended group assignments
   - Introduction timeline
   - Check-in schedule

Would you like to **start onboarding a new user** now? Just say "start onboarding" and I'll guide you through the process.
      `;

      return {
        recommendation: 'facilitator',
        result: {
          success: true,
          response: onboardingContext,
          agentUsed: ['system', 'matching'],
          toolsUsed: ['getUserData', 'getGroupData', 'onboardingGuidance'],
          confidence: 0.95,
          metadata: { isAdministrative: true, taskType: 'onboarding' }
        }
      };
    } catch (error) {
      console.error('Error in user onboarding:', error);
      return await agentService.callAgent('facilitator', content, sessionId);
    }
  };

  const handleGroupCreation = async (content: string, sessionId: string): Promise<AgentCallResponse> => {
    try {
      const groups = await api.getAllGroups().catch(() => []);
      
      // Check if user wants to start the creation process
      const wantsToStart = content.toLowerCase().includes('start') || 
                          content.toLowerCase().includes('create') ||
                          content.toLowerCase().includes('new group');

      if (wantsToStart) {
        const creationResponse = `
**Starting Group Creation Process**

I'll help you create a new therapeutic group. Let me prepare the group creation form.

**Current Platform Groups:** ${groups.length}

Click the **"Create Group"** button below to begin setting up your new therapeutic group.
        `;

        // Add form trigger
        setTimeout(() => {
          setActiveForm({
            type: 'groupCreation',
            data: {},
            onSubmit: async (formData: GroupFormData) => {
              await handleGroupCreationSubmit(formData);
            },
            onCancel: () => {
              setActiveForm(null);
              addSystemMessage('Group creation cancelled. Let me know if you need help with anything else.');
            }
          });
        }, 500);

        return {
          recommendation: 'facilitator',
          result: {
            success: true,
            response: creationResponse,
            agentUsed: ['system', 'matching'],
            toolsUsed: ['getGroupData', 'groupCreationForm'],
            confidence: 0.95,
            metadata: { isAdministrative: true, taskType: 'groupCreation', showForm: true }
          }
        };
      }
      
      const groupCreationContext = `
**Group Creation Assistant**

Current Platform Groups: ${groups.length}

**Group Creation Process:**

1. **Group Planning**
   - Determine therapeutic focus (recovery, wellness, general support)
   - Set group size limits (recommended: 6-12 members)
   - Define meeting frequency and format
   - Establish group rules and guidelines

2. **Member Selection Criteria**
   - Compatible experience levels
   - Complementary therapeutic needs
   - Balanced group dynamics
   - Appropriate risk levels

3. **Group Configuration**
   - Privacy settings (open/closed)
   - Facilitator assignments
   - Communication preferences
   - Progress tracking methods

4. **Launch Preparation**
   - Initial session planning
   - Member introductions
   - Goal setting framework
   - Crisis protocols

**Available Group Types:**
- Recovery Groups (addiction, trauma recovery)
- Wellness Groups (anxiety, depression, stress management)
- General Support Groups (peer support, life transitions)

Would you like to **create a new group** now? Just say "create group" and I'll guide you through the process.
      `;

      return {
        recommendation: 'facilitator',
        result: {
          success: true,
          response: groupCreationContext,
          agentUsed: ['system', 'matching'],
          toolsUsed: ['getGroupData', 'groupCreationGuidance'],
          confidence: 0.95,
          metadata: { isAdministrative: true, taskType: 'groupCreation' }
        }
      };
    } catch (error) {
      console.error('Error in group creation:', error);
      return await agentService.callAgent('facilitator', content, sessionId);
    }
  };

  const handleGroupManagement = async (content: string, sessionId: string): Promise<AgentCallResponse> => {
    try {
      const groups = await api.getAllGroups().catch(() => []);
      
      const groupManagementContext = `
**Group Management Assistant**

Active Groups: ${groups.length}

**Group Management Functions:**

1. **Member Management**
   - Add/remove group members
   - Adjust member roles and permissions
   - Handle member conflicts or issues
   - Monitor participation levels

2. **Group Settings**
   - Modify privacy settings
   - Update group description and goals
   - Adjust size limits
   - Change meeting schedules

3. **Facilitation Support**
   - Session planning assistance
   - Intervention strategies
   - Group dynamic assessment
   - Progress monitoring

4. **Administrative Tasks**
   - Archive inactive groups
   - Merge similar groups
   - Generate group reports
   - Handle technical issues

**Recent Group Activity:**
${groups.slice(0, 5).map((group: any) => 
  `- ${group.name} (${group.memberCount || 0} members) - ${group.type}`
).join('\n')}

Which group would you like to manage, or what specific management task do you need help with?
      `;

      return {
        recommendation: 'facilitator',
        result: {
          success: true,
          response: groupManagementContext,
          agentUsed: ['system', 'facilitator'],
          toolsUsed: ['getGroupData', 'groupManagementTools'],
          confidence: 0.95,
          metadata: { isAdministrative: true, taskType: 'groupManagement' }
        }
      };
    } catch (error) {
      console.error('Error in group management:', error);
      return await agentService.callAgent('facilitator', content, sessionId);
    }
  };

  const handleUserManagement = async (content: string, sessionId: string): Promise<AgentCallResponse> => {
    try {
      const users = await api.getAllUsers().catch(() => []);
      
      const userManagementContext = `
**User Management Assistant**

Total Platform Users: ${users.length}

**User Management Functions:**

1. **Profile Management**
   - Update user information
   - Adjust privacy settings
   - Modify therapeutic goals
   - Update group assignments

2. **Account Administration**
   - Role adjustments (member, facilitator)
   - Permission modifications
   - Account status changes
   - Technical issue resolution

3. **Progress Monitoring**
   - Review user engagement
   - Track therapeutic progress
   - Monitor group participation
   - Assess platform utilization

4. **Safety & Compliance**
   - Handle crisis situations
   - Review concerning behavior
   - Implement safety protocols
   - Maintain privacy compliance

**User Statistics:**
- Active Members: ${users.filter((u: any) => u.role === 'member').length}
- Facilitators: ${users.filter((u: any) => u.role === 'facilitator').length}
- Therapists: ${users.filter((u: any) => u.role === 'therapist').length}

What user management task do you need assistance with?
      `;

      return {
        recommendation: 'facilitator',
        result: {
          success: true,
          response: userManagementContext,
          agentUsed: ['system', 'facilitator'],
          toolsUsed: ['getUserData', 'userManagementTools'],
          confidence: 0.95,
          metadata: { isAdministrative: true, taskType: 'userManagement' }
        }
      };
    } catch (error) {
      console.error('Error in user management:', error);
      return await agentService.callAgent('facilitator', content, sessionId);
    }
  };

  const handleSessionPlanning = async (content: string, sessionId: string): Promise<AgentCallResponse> => {
    try {
      const [clients, groups] = await Promise.all([
        api.getAllUsers().catch(() => []),
        api.getAllGroups().catch(() => [])
      ]);

      // Check if user wants to start the planning process
      const wantsToStart = content.toLowerCase().includes('start') || 
                          content.toLowerCase().includes('plan') ||
                          content.toLowerCase().includes('schedule');

      if (wantsToStart) {
        const planningResponse = `
**Starting Session Planning Process**

I'll help you plan a therapeutic session. Let me prepare the session planning form.

**Available Resources:**
- **Clients:** ${clients.length} available
- **Groups:** ${groups.length} active groups

Click the **"Plan Session"** button below to begin creating your session plan.
        `;

        // Add form trigger
        setTimeout(() => {
          setActiveForm({
            type: 'sessionPlanning',
            data: { availableClients: clients, availableGroups: groups },
            onSubmit: async (formData: SessionPlanningFormData) => {
              await handleSessionPlanningSubmit(formData);
            },
            onCancel: () => {
              setActiveForm(null);
              addSystemMessage('Session planning cancelled. Let me know if you need help with anything else.');
            }
          });
        }, 500);

        return {
          recommendation: 'facilitator',
          result: {
            success: true,
            response: planningResponse,
            agentUsed: ['system', 'scheduling'],
            toolsUsed: ['getClientData', 'getGroupData', 'sessionPlanningForm'],
            confidence: 0.95,
            metadata: { isAdministrative: true, taskType: 'sessionPlanning', showForm: true }
          }
        };
      }

      const sessionPlanningContext = `
**Session Planning Assistant**

Available Clients: ${clients.length}
Available Groups: ${groups.length}

**Session Planning Framework:**

1. **Session Preparation**
   - Define therapeutic objectives
   - Select appropriate interventions
   - Prepare discussion topics
   - Gather necessary resources

2. **Individual Sessions**
   - Client assessment and goals
   - Treatment plan review
   - Progress evaluation
   - Next steps planning

3. **Group Sessions**
   - Group dynamic assessment
   - Facilitation strategies
   - Conflict resolution plans
   - Member engagement techniques

4. **Crisis Sessions**
   - Immediate safety assessment
   - Crisis intervention protocols
   - Follow-up planning
   - Resource coordination

**Session Types:**
- Initial Intake Sessions
- Regular Therapy Sessions  
- Group Facilitation Sessions
- Crisis Intervention Sessions
- Progress Review Sessions

**Planning Considerations:**
- Client/group therapeutic goals
- Current mental health status
- Previous session outcomes
- Risk factors and safety needs
- Available intervention strategies

Would you like to **plan a session** now? Just say "plan session" and I'll guide you through the process.
      `;

      return {
        recommendation: 'facilitator',
        result: {
          success: true,
          response: sessionPlanningContext,
          agentUsed: ['system', 'facilitator'],
          toolsUsed: ['getClientData', 'getGroupData', 'sessionPlanningGuidance'],
          confidence: 0.95,
          metadata: { isAdministrative: true, taskType: 'sessionPlanning' }
        }
      };
    } catch (error) {
      console.error('Error in session planning:', error);
      return await agentService.callAgent('facilitator', content, sessionId);
    }
  };

  const sendMessage = async (content: string, isToolCall = false) => {
    if (!content.trim() || isLoading || !sessionId) return;

    // Add context for client-focused interactions
    const contextualContent = activeClientId && !isToolCall
      ? `[Clinical Context: Working with client ${activeClientId}]\n\n${content}`
      : content;

    const therapistMessage: TherapistMessage = {
      id: `therapist-${Date.now()}`,
      content,
      type: 'therapist',
      timestamp: new Date(),
      clientId: activeClientId
    };

    const loadingMessage: TherapistMessage = {
      id: `loading-${Date.now()}`,
      content: 'Maya is analyzing and preparing clinical guidance...',
      type: 'maya',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, therapistMessage, loadingMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let response: AgentCallResponse;
      
      // Check if this is an administrative tool call
      const adminToolKeywords = ['onboard', 'create group', 'manage group', 'user management', 'session planning', 'plan session'];
      const isAdminTool = adminToolKeywords.some(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isAdminTool) {
        // Handle administrative functions with enhanced context
        response = await handleAdministrativeTask(contextualContent, sessionId);
      } else {
        // Use multiple agents for comprehensive clinical assessment
        response = await agentService.callAgent(
          'facilitator', // Primary agent for therapeutic guidance
          contextualContent,
          sessionId
        );
      }
      
      // Get additional insights from other agents
      let clinicalInsights: ClinicalInsight[] = [];
      
      if (activeClientId || isToolCall) {
        try {
          // Run sentiment analysis for emotional assessment
          const sentimentResponse = await agentService.callAgent(
            'sentiment',
            contextualContent,
            sessionId
          );
          
          // Run insight agent for progress analysis
          const insightResponse = await agentService.callAgent(
            'insight',
            contextualContent,
            sessionId
          );

          clinicalInsights = extractClinicalInsights([response, sentimentResponse, insightResponse]);
        } catch (insightError) {
          console.warn('Additional clinical insights unavailable:', insightError);
        }
      }
      
      // Remove loading message and add Maya's response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        const mayaResponse: TherapistMessage = {
          id: `maya-${Date.now()}`,
          content: enhanceTherapistResponse(response.response, clinicalInsights),
          type: 'maya',
          timestamp: new Date(),
          agentUsed: Array.isArray(response.agentUsed) 
            ? response.agentUsed 
            : [response.agentUsed],
          confidence: response.confidence,
          clinicalInsights,
          clientId: activeClientId,
          riskLevel: assessRiskLevel(response.response, clinicalInsights)
        };
        return [...filtered, mayaResponse];
      });

      setCurrentInsights(clinicalInsights);

      // Handle crisis situations
      if (response.metadata?.needsCrisisIntervention) {
        toast.error('Crisis indicators detected. Immediate assessment and intervention may be required.', {
          duration: 15000,
          icon: '🚨'
        });
      }

    } catch (error) {
      console.error('Maya clinical consultation error:', error);
      
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        const errorMessage: TherapistMessage = {
          id: `error-${Date.now()}`,
          content: 'I apologize, but I\'m experiencing technical difficulties. For urgent clinical matters, please consult with supervisory staff or crisis protocols immediately.',
          type: 'system',
          timestamp: new Date()
        };
        return [...filtered, errorMessage];
      });

      toast.error('Clinical consultation system unavailable. Check crisis protocols if urgent.');
      setMayaAvailable(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolAction = (toolId: string) => {
    const tool = THERAPIST_TOOLS.find(t => t.id === toolId);
    if (tool) {
      if (tool.requiresClientId && !activeClientId) {
        toast.error('Please specify a client ID for this clinical tool.');
        return;
      }
      sendMessage(tool.prompt, true);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleToolSelect = (tool: any) => {
    if (tool.requiresClientId && !activeClientId) {
      toast.error('Please select a client first');
      return;
    }
    sendMessage(tool.prompt, true);
  };

  const enhanceTherapistResponse = (response: string, insights: ClinicalInsight[]): string => {
    if (insights.length === 0) return response;

    const urgentInsights = insights.filter(i => i.priority === 'urgent');
    const highPriorityInsights = insights.filter(i => i.priority === 'high');

    let enhancedResponse = response;

    if (urgentInsights.length > 0) {
      enhancedResponse += '\n\n**🚨 URGENT CLINICAL ATTENTION:**\n';
      urgentInsights.forEach(insight => {
        enhancedResponse += `• ${insight.summary}\n`;
      });
    }

    if (highPriorityInsights.length > 0) {
      enhancedResponse += '\n\n**⚠️ HIGH PRIORITY CONSIDERATIONS:**\n';
      highPriorityInsights.forEach(insight => {
        enhancedResponse += `• ${insight.summary}\n`;
      });
    }

    return enhancedResponse;
  };

  const extractClinicalInsights = (responses: AgentCallResponse[]): ClinicalInsight[] => {
    const insights: ClinicalInsight[] = [];
    
    responses.forEach(response => {
      const content = response.response.toLowerCase();
      
      // Risk assessment insights
      if (content.includes('crisis') || content.includes('suicide') || content.includes('danger')) {
        insights.push({
          type: 'risk',
          summary: 'Potential crisis indicators detected in communication',
          confidence: response.confidence,
          recommendations: ['Immediate risk assessment', 'Safety planning', 'Crisis protocol activation'],
          priority: 'urgent',
          evidence: ['Crisis-related language patterns']
        });
      }
      
      // Progress insights
      if (content.includes('progress') || content.includes('improvement') || content.includes('better')) {
        insights.push({
          type: 'progress',
          summary: 'Positive therapeutic progress indicators identified',
          confidence: response.confidence,
          recommendations: ['Continue current interventions', 'Reinforce progress', 'Expand successful strategies'],
          priority: 'medium',
          evidence: ['Positive language patterns', 'Progress-related content']
        });
      }
      
      // Emotional state insights
      if (response.agentUsed.includes('sentiment')) {
        insights.push({
          type: 'assessment',
          summary: 'Emotional state analysis completed',
          confidence: response.confidence,
          recommendations: ['Monitor emotional patterns', 'Validate emotional experiences', 'Adjust interventions accordingly'],
          priority: 'medium',
          evidence: ['Sentiment analysis data']
        });
      }
    });

    return insights;
  };

  const assessRiskLevel = (response: string, insights: ClinicalInsight[]): 'low' | 'medium' | 'high' | 'critical' => {
    const hasUrgentInsights = insights.some(i => i.priority === 'urgent');
    const hasRiskInsights = insights.some(i => i.type === 'risk');
    const content = response.toLowerCase();
    
    if (hasUrgentInsights || content.includes('crisis') || content.includes('immediate')) {
      return 'critical';
    }
    if (hasRiskInsights || content.includes('concern') || content.includes('monitor')) {
      return 'high';
    }
    if (insights.some(i => i.priority === 'high')) {
      return 'medium';
    }
    return 'low';
  };

  const renderMessage = (message: TherapistMessage) => {
    const isMaya = message.type === 'maya';
    const isSystem = message.type === 'system';
    const isTherapist = message.type === 'therapist';

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex gap-3 mb-4',
          isTherapist ? 'justify-end' : 'justify-start'
        )}
      >
        {(isMaya || isSystem) && (
          <div className="flex-shrink-0">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isSystem ? 'bg-gray-100' : 'bg-gradient-to-r from-blue-500 to-purple-500'
            )}>
              {isSystem ? (
                <Shield className="w-4 h-4 text-gray-600" />
              ) : (
                <Stethoscope className="w-4 h-4 text-white" />
              )}
            </div>
          </div>
        )}

        <div className={cn(
          'max-w-[85%] rounded-lg px-4 py-3',
          isTherapist 
            ? 'bg-blue-500 text-white'
            : isSystem
            ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
            : 'bg-gray-50 text-gray-900 border border-gray-200'
        )}>
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200" />
              </div>
              <span className="text-sm text-blue-600">Clinical analysis in progress...</span>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <div className="mb-2">{children}</div>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-3 italic">{children}</blockquote>
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Clinical metadata */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 text-xs">
            <div className="flex items-center gap-3">
              <span>{formatDistanceToNow(message.timestamp, { addSuffix: true })}</span>
              {message.clientId && (
                <span className="flex items-center gap-1 text-blue-600">
                  <UserCheck className="w-3 h-3" />
                  Client: {message.clientId}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {message.riskLevel && (
                <span className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  RISK_LEVEL_COLORS[message.riskLevel]
                )}>
                  {message.riskLevel.toUpperCase()} RISK
                </span>
              )}
              {message.confidence && (
                <span className="flex items-center gap-1 text-gray-500">
                  <Brain className="w-3 h-3" />
                  {Math.round(message.confidence * 100)}%
                </span>
              )}
            </div>
          </div>

          {/* Clinical insights */}
          {message.clinicalInsights && message.clinicalInsights.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-2">Clinical Insights:</div>
              <div className="space-y-2">
                {message.clinicalInsights.map((insight, index) => (
                  <div key={index} className={cn(
                    'p-2 rounded text-xs',
                    insight.priority === 'urgent' ? 'bg-red-50 border-l-2 border-red-400' :
                    insight.priority === 'high' ? 'bg-orange-50 border-l-2 border-orange-400' :
                    'bg-blue-50 border-l-2 border-blue-400'
                  )}>
                    <div className="font-medium">{insight.type.toUpperCase()}: {insight.summary}</div>
                    {insight.recommendations.length > 0 && (
                      <div className="mt-1 text-gray-600">
                        • {insight.recommendations.slice(0, 2).join(' • ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {isTherapist && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Maya - Clinical Assistant</h2>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                mayaAvailable ? 'bg-green-500' : 'bg-gray-300'
              )} />
              {mayaAvailable ? 'Clinical guidance available' : 'Reconnecting...'}
              {activeClientId && (
                <>
                  <span className="text-gray-400">|</span>
                  <span>Client: {activeClientId}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTools(!showTools)}
            className="text-gray-600"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Clinical Tools
            <ChevronDown className={cn(
              'w-4 h-4 ml-1 transition-transform',
              showTools && 'rotate-180'
            )} />
          </Button>
        </div>
      </div>

      {/* Clinical Tools Panel */}
      <AnimatePresence>
        {showTools && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b bg-gray-50"
          >
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {THERAPIST_TOOLS.map(tool => {
                  const Icon = tool.icon;
                  const isDisabled = tool.requiresClientId && !activeClientId;
                  
                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleToolAction(tool.id)}
                      disabled={isLoading || !mayaAvailable || isDisabled}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-lg text-center transition-colors',
                        'hover:bg-white hover:shadow-sm disabled:opacity-50',
                        isDisabled ? 'bg-gray-100 text-gray-400' : CATEGORY_COLORS[tool.category]
                      )}
                      title={isDisabled ? 'Requires active client context' : tool.label}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-xs font-medium leading-tight">{tool.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {!activeClientId && (
                <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                  <strong>Tip:</strong> Set a client ID to access personalized clinical tools and assessments.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Stethoscope className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Clinical Consultation Ready</h3>
              <p className="text-gray-600">Begin your professional consultation with Maya</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Interactive Form Modal */}
      <AnimatePresence>
        {activeForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              {activeForm.type === 'onboarding' && (
                <OnboardingForm
                  data={activeForm.data}
                  onSubmit={activeForm.onSubmit}
                  onCancel={activeForm.onCancel}
                  isProcessing={isProcessingAction}
                />
              )}
              {activeForm.type === 'groupCreation' && (
                <GroupCreationForm
                  onSubmit={activeForm.onSubmit}
                  onCancel={activeForm.onCancel}
                  isProcessing={isProcessingAction}
                />
              )}
              {activeForm.type === 'sessionPlanning' && (
                <SessionPlanningForm
                  data={activeForm.data}
                  onSubmit={activeForm.onSubmit}
                  onCancel={activeForm.onCancel}
                  isProcessing={isProcessingAction}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons for Form Triggers */}
      {messages.length > 0 && messages[messages.length - 1].metadata?.showForm && !activeForm && (
        <div className="border-t bg-gray-50 p-4">
          <div className="flex gap-3 justify-center">
            {messages[messages.length - 1].metadata?.taskType === 'onboarding' && (
              <Button
                onClick={() => handleToolSelect({ id: 'onboard-user' } as any)}
                className="bg-green-600 hover:bg-green-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Start Onboarding
              </Button>
            )}
            {messages[messages.length - 1].metadata?.taskType === 'groupCreation' && (
              <Button
                onClick={() => handleToolSelect({ id: 'create-group' } as any)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            )}
            {messages[messages.length - 1].metadata?.taskType === 'sessionPlanning' && (
              <Button
                onClick={() => handleToolSelect({ id: 'session-planning' } as any)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Plan Session
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <form onSubmit={handleInputSubmit} className="flex gap-3">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isLoading ? "Maya is preparing clinical guidance..." : "Describe your clinical question or case..."}
            disabled={isLoading || !mayaAvailable || isProcessingAction}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || !mayaAvailable || isProcessingAction}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isLoading || isProcessingAction ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          Maya provides clinical guidance to licensed professionals • HIPAA compliant • Not a replacement for clinical judgment
        </div>
      </div>
    </div>
  );
}