import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

const addClientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  initialNotes: z.string().optional()
});

type AddClientFormData = z.infer<typeof addClientSchema>;

interface AddClientModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddClientModal({ onClose, onSuccess }: AddClientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<AddClientFormData>({
    resolver: zodResolver(addClientSchema)
  });

  const onSubmit = async (data: AddClientFormData) => {
    setIsSubmitting(true);
    try {
      const emergencyContact = data.emergencyContactName ? {
        name: data.emergencyContactName,
        phone: data.emergencyContactPhone,
        relationship: data.emergencyContactRelation
      } : undefined;

      const response = await api.post<{ 
        client: any; 
        tempPassword: string; 
        message: string 
      }>('/therapist/clients', {
        ...data,
        emergencyContact
      });

      setTempPassword(response.tempPassword);
      toast.success('Client added successfully');
      
      // Show password for a moment before closing
      setTimeout(() => {
        onSuccess();
      }, 5000);
    } catch (error) {
      toast.error('Failed to add client');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserPlus className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-xl font-semibold">Add New Client</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {tempPassword ? (
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-green-800 mb-4">
                Client Added Successfully!
              </h3>
              <p className="text-gray-700 mb-4">
                Please share this temporary password with your client securely:
              </p>
              <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-4">
                <code className="text-2xl font-mono text-green-700">{tempPassword}</code>
              </div>
              <p className="text-sm text-gray-600">
                This modal will close automatically in a few seconds...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    {...register('firstName')}
                    type="text"
                    className="input"
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    {...register('lastName')}
                    type="text"
                    className="input"
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="input"
                    placeholder="john.doe@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    {...register('phoneNumber')}
                    type="tel"
                    className="input"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <input
                    {...register('emergencyContactName')}
                    type="text"
                    className="input"
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    {...register('emergencyContactPhone')}
                    type="tel"
                    className="input"
                    placeholder="+1 (555) 987-6543"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship
                  </label>
                  <input
                    {...register('emergencyContactRelation')}
                    type="text"
                    className="input"
                    placeholder="Spouse, Parent, Sibling, etc."
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Initial Notes</h3>
              <textarea
                {...register('initialNotes')}
                rows={4}
                className="input"
                placeholder="Any initial notes or observations about the client..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? 'Adding Client...' : 'Add Client'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}