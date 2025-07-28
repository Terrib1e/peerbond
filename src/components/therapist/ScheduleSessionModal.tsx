import { useState } from 'react';
import { X, Calendar, Clock, Video, Phone, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

const scheduleSessionSchema = z.object({
  scheduledDate: z.string().min(1, 'Date is required'),
  scheduledTime: z.string().min(1, 'Time is required'),
  duration: z.number().min(15).max(120),
  type: z.enum(['individual', 'group', 'crisis']),
  meetingType: z.enum(['video', 'phone', 'in_person']),
  notes: z.string().optional()
});

type ScheduleSessionFormData = z.infer<typeof scheduleSessionSchema>;

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

interface ScheduleSessionModalProps {
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScheduleSessionModal({ client, onClose, onSuccess }: ScheduleSessionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ScheduleSessionFormData>({
    resolver: zodResolver(scheduleSessionSchema),
    defaultValues: {
      duration: 60,
      type: 'individual',
      meetingType: 'video'
    }
  });

  const onSubmit = async (data: ScheduleSessionFormData) => {
    setIsSubmitting(true);
    try {
      const scheduledFor = new Date(`${data.scheduledDate}T${data.scheduledTime}`).toISOString();
      
      await api.post('/therapist/sessions', {
        clientId: client.id,
        scheduledFor,
        duration: data.duration,
        type: data.type,
        notes: data.notes
      });

      toast.success('Session scheduled successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to schedule session');
      setIsSubmitting(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Schedule Session</h2>
              <p className="text-sm text-gray-500 mt-1">
                with {client.firstName} {client.lastName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  {...register('scheduledDate')}
                  type="date"
                  min={today}
                  className="input pl-10"
                />
              </div>
              {errors.scheduledDate && (
                <p className="mt-1 text-sm text-red-600">{errors.scheduledDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  {...register('scheduledTime')}
                  type="time"
                  className="input pl-10"
                />
              </div>
              {errors.scheduledTime && (
                <p className="mt-1 text-sm text-red-600">{errors.scheduledTime.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <select
                {...register('duration', { valueAsNumber: true })}
                className="input"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Type
              </label>
              <select
                {...register('type')}
                className="input"
              >
                <option value="individual">Individual</option>
                <option value="group">Group</option>
                <option value="crisis">Crisis</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="relative">
                <input
                  {...register('meetingType')}
                  type="radio"
                  value="video"
                  className="sr-only peer"
                />
                <div className="p-3 border-2 rounded-lg cursor-pointer flex flex-col items-center peer-checked:border-primary-500 peer-checked:bg-primary-50">
                  <Video className="h-5 w-5 mb-1 text-gray-600" />
                  <span className="text-sm">Video</span>
                </div>
              </label>

              <label className="relative">
                <input
                  {...register('meetingType')}
                  type="radio"
                  value="phone"
                  className="sr-only peer"
                />
                <div className="p-3 border-2 rounded-lg cursor-pointer flex flex-col items-center peer-checked:border-primary-500 peer-checked:bg-primary-50">
                  <Phone className="h-5 w-5 mb-1 text-gray-600" />
                  <span className="text-sm">Phone</span>
                </div>
              </label>

              <label className="relative">
                <input
                  {...register('meetingType')}
                  type="radio"
                  value="in_person"
                  className="sr-only peer"
                />
                <div className="p-3 border-2 rounded-lg cursor-pointer flex flex-col items-center peer-checked:border-primary-500 peer-checked:bg-primary-50">
                  <MapPin className="h-5 w-5 mb-1 text-gray-600" />
                  <span className="text-sm">In-Person</span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="input"
              placeholder="Objectives, topics to discuss, preparation notes..."
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
              {isSubmitting ? 'Scheduling...' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}