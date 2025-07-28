import React, { useState } from 'react';
import { X, Users, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (groupData: {
    name: string;
    description: string;
    type: string;
    maxMembers: number;
    isPrivate: boolean;
  }) => void;
  isLoading?: boolean;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'general',
    maxMembers: 8,
    isPrivate: false
  });

  const groupTypes = [
    { value: 'recovery', label: 'Recovery Support', description: 'For addiction recovery and sobriety' },
    { value: 'anxiety', label: 'Anxiety Support', description: 'Managing anxiety and stress' },
    { value: 'depression', label: 'Depression Support', description: 'Mental health and mood support' },
    { value: 'wellness', label: 'General Wellness', description: 'Overall mental health and wellness' },
    { value: 'crisis', label: 'Crisis Support', description: 'Intensive support for crisis situations' },
    { value: 'general', label: 'General Support', description: 'Open discussion and peer support' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Group</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="p-2"
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
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter group name"
                required
              />
            </div>

            {/* Group Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the purpose and goals of this group"
                required
              />
            </div>

            {/* Group Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Group Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupTypes.map((type) => (
                  <div
                    key={type.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => handleInputChange('type', type.value)}
                  >
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Group Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Max Members */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Members
                </label>
                <select
                  value={formData.maxMembers}
                  onChange={(e) => handleInputChange('maxMembers', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {[4, 6, 8, 10, 12, 15, 20].map(num => (
                    <option key={num} value={num}>{num} members</option>
                  ))}
                </select>
              </div>

              {/* Privacy Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Privacy Setting
                </label>
                <div className="space-y-2">
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      !formData.isPrivate
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => handleInputChange('isPrivate', false)}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Public</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Anyone can discover and join this group
                    </div>
                  </div>
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.isPrivate
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => handleInputChange('isPrivate', true)}
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span className="font-medium">Private</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Members must be invited or assigned
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.name.trim() || !formData.description.trim()}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Create Group
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateGroupDialog;